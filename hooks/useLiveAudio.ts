import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Custom hook to handle real-time audio interaction with the Gemini Live API Backend Bridge.
 * @param onFunctionCall - Callback triggered when the AI calls a function (e.g., adding plays)
 * @param onMessage - Callback for general AI status or text feedback messages
 */
export const useLiveAudio = (onFunctionCall: (callInfo: any) => void, onMessage: (msg: string) => void) => {
    const [isRecording, setIsRecording] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false); // Indicates if AI is currently talking

    const wsRef = useRef<WebSocket | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const audioWorkletNodeRef = useRef<AudioWorkletNode | null>(null);
    const audioQueueRef = useRef<Float32Array[]>([]); // Queue for playback chunks
    const isPlayingRef = useRef(false);

    // ==========================================
    // 1. WEBSOCKET SETUP
    // ==========================================
    const connectToAgent = useCallback(async () => {
        return new Promise<void>((resolve, reject) => {
            const isVercel = window.location.host.includes('vercel.app');
            let wsUrl = '';

            if (isVercel) {
                wsUrl = `ws://localhost:8081/api/voice-agent`;
                console.warn("[LiveAudio] Vercel detected. Falling back to localhost backend.");
            } else {
                const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                wsUrl = `${protocol}//${window.location.host}/api/voice-agent`;
            }

            console.log(`[LiveAudio] Attempting Handshake: ${wsUrl}`);
            const ws = new WebSocket(wsUrl);
            ws.onopen = () => {
                console.log(`[LiveAudio] Connected to Voice Agent at: ${wsUrl}`);
                setIsConnected(true);
                wsRef.current = ws;
                resolve();
            };

            ws.onmessage = async (event) => {
                try {
                    const data = JSON.parse(event.data);

                    // Handle incoming audio from Gemini
                    if (data.type === 'audio' && data.base64) {
                        setIsSpeaking(true);
                        await playAudioChunk(data.base64);
                    }
                    // Handle tool/function calls from Gemini
                    else if (data.type === 'function_call' && data.call) {
                        onFunctionCall(data.call);
                    }
                    // Handle generic text/errors
                    else if (data.type === 'server_error') {
                        onMessage(`Error: ${data.message}`);
                    }
                } catch (e) {
                    console.error("[LiveAudio] Error parsing WS message", e);
                }
            };

            ws.onclose = () => {
                console.log("[LiveAudio] Disconnected from Voice Agent API.");
                setIsConnected(false);
                setIsSpeaking(false);
                wsRef.current = null;
            };

            ws.onerror = (err) => {
                console.error("[LiveAudio] WS Error:", err);
                reject(err);
            };
        });
    }, [onFunctionCall, onMessage]);

    const disconnectFromAgent = useCallback(() => {
        if (wsRef.current) {
            wsRef.current.close();
        }
    }, []);

    // ==========================================
    // 2. AUDIO CAPTURE & STREAMING TO AI (PCM)
    // ==========================================
    const startRecording = useCallback(async () => {
        try {
            // Mobile Security: getUserMedia requires a secure context (HTTPS or localhost)
            if (!window.isSecureContext && window.location.hostname !== 'localhost') {
                throw new Error("Microphone access requires a Secure Context (HTTPS). Please use an HTTPS tunnel or domain.");
            }

            if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
                await connectToAgent();
            }

            // Access Microphone
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { channelCount: 1, sampleRate: 16000 }
            });
            mediaStreamRef.current = stream;

            // Use webkitAudioContext for older iOS/Safari compatibility if needed
            const AudioCtxClass = (window.AudioContext || (window as any).webkitAudioContext);
            const audioCtx = new AudioCtxClass({ sampleRate: 16000 });
            audioContextRef.current = audioCtx;

            // Mobile: AudioContext often starts suspended
            if (audioCtx.state === 'suspended') {
                await audioCtx.resume();
            }

            const source = audioCtx.createMediaStreamSource(stream);

            // Load the PCM Worklet Processor from the public folder
            await audioCtx.audioWorklet.addModule('/audio-processor.js');
            const workletNode = new AudioWorkletNode(audioCtx, 'pcm-processor');
            audioWorkletNodeRef.current = workletNode;

            workletNode.port.onmessage = (event) => {
                // event.data is the Int16Array PCM buffer from the microphone
                if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                    const pcmData = event.data;
                    const base64Audio = arrayBufferToBase64(pcmData);

                    // Send strictly formatted JSON matching Gemini Live expects
                    wsRef.current.send(JSON.stringify({
                        realtimeInput: {
                            mediaChunks: [{
                                mimeType: "audio/pcm;rate=16000",
                                data: base64Audio
                            }]
                        }
                    }));
                }
            };

            // Connect nodes
            source.connect(workletNode);
            workletNode.connect(audioCtx.destination);

            setIsRecording(true);
            onMessage("Listening...");

        } catch (error: any) {
            console.error("[LiveAudio] startRecording Error:", error);

            let userFriendlyMsg = "Unknown Microphone Error";
            if (error instanceof Error) {
                if (error.name === 'NotAllowedError') userFriendlyMsg = "Permission Denied. Please allow microphone access.";
                else if (error.name === 'NotFoundError') userFriendlyMsg = "No microphone found on this device.";
                else if (error.name === 'NotReadableError') userFriendlyMsg = "Microphone is busy or locked by another app.";
                else if (error.name === 'SecurityError') userFriendlyMsg = "Security Block: HTTPS is required for mobile microphones.";
                else userFriendlyMsg = `${error.name}: ${error.message}`;
            } else {
                userFriendlyMsg = String(error);
            }

            onMessage(`Microphone Error: ${userFriendlyMsg}`);
            setIsRecording(false);

            // Cleanup
            if (mediaStreamRef.current) {
                mediaStreamRef.current.getTracks().forEach(t => t.stop());
                mediaStreamRef.current = null;
            }
        }
    }, [connectToAgent, onMessage]);

    const stopRecording = useCallback(() => {
        // Stop microphone tracks
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }

        // Clean up audio nodes
        if (audioWorkletNodeRef.current) {
            audioWorkletNodeRef.current.disconnect();
            audioWorkletNodeRef.current = null;
        }

        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }

        setIsRecording(false);
        onMessage("Voice Session Paused.");
        disconnectFromAgent();
    }, [onMessage, disconnectFromAgent]);

    // ==========================================
    // 3. AUDIO PLAYBACK FROM AI (Base64 PCM)
    // ==========================================
    const playAudioChunk = async (base64Audio: string) => {
        try {
            const binaryString = window.atob(base64Audio);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            // Convert PCM 16-bit to Float32 for Web Audio API playback
            const int16Array = new Int16Array(bytes.buffer);
            const float32Array = new Float32Array(int16Array.length);
            for (let i = 0; i < int16Array.length; i++) {
                float32Array[i] = int16Array[i] / 32768.0;
            }

            audioQueueRef.current.push(float32Array);
            if (!isPlayingRef.current) {
                processAudioQueue();
            }
        } catch (error) {
            console.error("[LiveAudio] Playback error:", error);
        }
    };

    const processAudioQueue = async () => {
        if (audioQueueRef.current.length === 0) {
            isPlayingRef.current = false;
            setIsSpeaking(false);
            return;
        }

        isPlayingRef.current = true;

        // Ensure playback context exists (can reuse recording one or create playback specific one)
        const playbackCtx = new (window.AudioContext || window.AudioContext)({ sampleRate: 24000 }); // Gemini outputs 24kHz

        const float32Data = audioQueueRef.current.shift()!;
        const audioBuffer = playbackCtx.createBuffer(1, float32Data.length, 24000);
        audioBuffer.getChannelData(0).set(float32Data);

        const source = playbackCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(playbackCtx.destination);
        source.start();

        source.onended = () => {
            processAudioQueue(); // Play next chunk
        };
    };

    // Helper: ArrayBuffer to Base64
    const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    };

    // ==========================================
    // 4. FUNCTION CALL RESPONDER
    // ==========================================
    // Expose this so the component can send back the result of the function call to the AI
    const sendFunctionCallResult = useCallback((functionCallId: string, result: any) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                toolResponse: {
                    functionResponses: [{
                        id: functionCallId,
                        name: "add_plays_to_slate",
                        response: result // e.g., { status: "Success", playsAdded: 3 }
                    }]
                }
            }));
        }
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopRecording();
            disconnectFromAgent();
        };
    }, [stopRecording, disconnectFromAgent]);

    return {
        isRecording,
        isConnected,
        isSpeaking,
        startRecording,
        stopRecording,
        sendFunctionCallResult,
    };
};
