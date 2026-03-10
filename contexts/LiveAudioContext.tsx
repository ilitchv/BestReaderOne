/// <reference types="vite/client" />
import React, { createContext, useContext, useState, useRef, useCallback, useEffect, ReactNode } from 'react';

interface LiveAudioContextType {
    isRecording: boolean;
    isConnected: boolean;
    isSpeaking: boolean;
    aiFeedback: string | null;
    startRecording: () => Promise<void>;
    stopRecording: () => void;
    toggleVoice: () => void;
    clearFeedback: () => void;
    registerFunctionCallback: (functionName: string, callback: (args: any) => void) => void;
    unregisterFunctionCallback: (functionName: string) => void;
}

const LiveAudioContext = createContext<LiveAudioContextType | undefined>(undefined);

export const useLiveAudioContext = () => {
    const context = useContext(LiveAudioContext);
    if (!context) {
        throw new Error("useLiveAudioContext must be used within a LiveAudioProvider");
    }
    return context;
};

export const LiveAudioProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [aiFeedback, setAiFeedback] = useState<string | null>(null);

    const wsRef = useRef<WebSocket | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const audioWorkletNodeRef = useRef<AudioWorkletNode | null>(null);
    const audioQueueRef = useRef<Float32Array[]>([]);
    const isPlayingRef = useRef(false);

    // Dynamic registry for function callbacks from different components
    const functionCallbacksRef = useRef<Record<string, (args: any) => void>>({});
    const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

    const resetInactivityTimer = useCallback(() => {
        if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = setTimeout(() => {
            console.log("[GlobalVoice] Auto-shutdown: 60s inactivity reached.");
            stopRecording();
            disconnectFromAgent();
            setAiFeedback("Sleeping (Auto-Shutdown)");
        }, 60000); // 60 seconds
    }, []);

    const registerFunctionCallback = useCallback((functionName: string, callback: (args: any) => void) => {
        functionCallbacksRef.current[functionName] = callback;
    }, []);

    const unregisterFunctionCallback = useCallback((functionName: string) => {
        delete functionCallbacksRef.current[functionName];
    }, []);

    const clearFeedback = useCallback(() => setAiFeedback(null), []);

    const connectToAgent = useCallback(async () => {
        return new Promise<void>((resolve, reject) => {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = import.meta.env.VITE_WS_URL || `${protocol}//${window.location.host}/api/voice-agent`;

            console.log(`[GlobalVoice] Attempting Handshake: ${wsUrl}`);
            const ws = new WebSocket(wsUrl);

            ws.onopen = () => {
                console.log("[GlobalVoice] Connected to Voice Agent API.");
                setIsConnected(true);
                wsRef.current = ws;
                resetInactivityTimer();
                resolve();
            };

            ws.onmessage = async (event) => {
                try {
                    const data = JSON.parse(event.data);

                    if (data.type === 'audio' && data.base64) {
                        setIsSpeaking(true);
                        resetInactivityTimer(); // Reset timer when AI speaks
                        await playAudioChunk(data.base64);
                    } else if (data.type === 'function_call' && data.call) {
                        // Execute registered callbacks
                        if (data.call.functionCalls && data.call.functionCalls.length > 0) {
                            const responses: any[] = [];

                            for (const funcCall of data.call.functionCalls) {
                                const handler = functionCallbacksRef.current[funcCall.name];
                                if (handler) {
                                    console.log(`[GlobalVoice] Executing callback for: ${funcCall.name}`);
                                    try {
                                        // Wait for the handler to complete and fetch its descriptive result string
                                        const resultMsg = await Promise.resolve(handler(funcCall.args));
                                        responses.push({
                                            id: funcCall.id,
                                            name: funcCall.name,
                                            response: { result: resultMsg || "Action executed." }
                                        });
                                    } catch (err: any) {
                                        responses.push({
                                            id: funcCall.id,
                                            name: funcCall.name,
                                            response: { error: err.message || "Failed to execute action." }
                                        });
                                    }
                                } else {
                                    console.warn(`[GlobalVoice] Unhandled tool call: ${funcCall.name}`);
                                    responses.push({
                                        id: funcCall.id,
                                        name: funcCall.name,
                                        response: { error: `Tool ${funcCall.name} not found or unimplemented in UI.` }
                                    });
                                }
                            }

                            // Send all gathered responses back to Gemini so it has state feedback
                            if (responses.length > 0 && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                                wsRef.current.send(JSON.stringify({
                                    toolResponse: { functionResponses: responses }
                                }));
                            }
                        }
                        resetInactivityTimer(); // Reset timer when AI executes a function
                    } else if (data.type === 'server_error') {
                        setAiFeedback(`Error: ${data.message}`);
                    }
                } catch (e) {
                    console.error("[GlobalVoice] Error parsing WS message", e);
                }
            };

            ws.onclose = () => {
                console.log("[GlobalVoice] Disconnected from Voice Agent API.");
                setIsConnected(false);
                setIsSpeaking(false);
                wsRef.current = null;
                if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
            };

            ws.onerror = (err) => {
                const wsUrlAttempt = ws.url;
                console.error(`[GlobalVoice] Handshake Failed for ${wsUrlAttempt}:`, err);
                const wsError = `WebSocket handshake failed at ${wsUrlAttempt}. Ensure backend is running and SSL is valid.`;
                reject(new Error(wsError));
            };
        });
    }, [resetInactivityTimer]);

    const disconnectFromAgent = useCallback(() => {
        if (wsRef.current) {
            wsRef.current.close();
        }
    }, []);

    // ==========================================
    // 2. AUDIO CAPTURE & STREAMING
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

            await audioCtx.audioWorklet.addModule('/audio-processor.js');
            const workletNode = new AudioWorkletNode(audioCtx, 'pcm-processor');
            audioWorkletNodeRef.current = workletNode;

            workletNode.port.onmessage = (event) => {
                if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                    const base64Audio = arrayBufferToBase64(event.data);
                    wsRef.current.send(JSON.stringify({
                        realtimeInput: { mediaChunks: [{ mimeType: "audio/pcm;rate=16000", data: base64Audio }] }
                    }));
                    // Removed resetInactivityTimer() here to prevent infinite loop of resets
                }
            };

            source.connect(workletNode);
            workletNode.connect(audioCtx.destination);

            setIsRecording(true);
            setAiFeedback("Listening...");
        } catch (error: any) {
            console.error("[GlobalVoice] startRecording Error:", error);

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

            setAiFeedback(`Microphone Error: ${userFriendlyMsg}`);
            setIsRecording(false);

            // Cleanup on error
            if (mediaStreamRef.current) {
                mediaStreamRef.current.getTracks().forEach(t => t.stop());
                mediaStreamRef.current = null;
            }
        }
    }, [connectToAgent, resetInactivityTimer]);

    const stopRecording = useCallback(() => {
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }

        if (audioWorkletNodeRef.current) {
            audioWorkletNodeRef.current.disconnect();
            audioWorkletNodeRef.current = null;
        }

        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }

        setIsRecording(false);
        setAiFeedback("Voice Session Paused.");
        disconnectFromAgent();
    }, [disconnectFromAgent]);

    const toggleVoice = useCallback(() => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    }, [isRecording, startRecording, stopRecording]);

    // ==========================================
    // 3. AUDIO PLAYBACK FROM AI
    // ==========================================
    const nextStartTimeRef = useRef(0);

    const playAudioChunk = async (base64Audio: string) => {
        try {
            const binaryString = window.atob(base64Audio);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

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
            console.error("[GlobalVoice] Playback error:", error);
        }
    };

    const processAudioQueue = async () => {
        if (audioQueueRef.current.length === 0) {
            isPlayingRef.current = false;
            setIsSpeaking(false);
            return;
        }

        isPlayingRef.current = true;
        const playbackCtx = audioContextRef.current || new (window.AudioContext || window.AudioContext)({ sampleRate: 24000 });

        // Ensure Context is alive
        if (playbackCtx.state === 'suspended') {
            await playbackCtx.resume();
        }

        // Loop through all queued items without waiting for onended
        while (audioQueueRef.current.length > 0) {
            const float32Data = audioQueueRef.current.shift()!;
            const audioBuffer = playbackCtx.createBuffer(1, float32Data.length, 24000);
            audioBuffer.getChannelData(0).set(float32Data);

            const source = playbackCtx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(playbackCtx.destination);

            let startTime = nextStartTimeRef.current;
            if (startTime < playbackCtx.currentTime) {
                // Add 100ms jitter buffer to absorb network delays causing stuttering
                startTime = playbackCtx.currentTime + 0.1;
            }

            source.start(startTime);
            nextStartTimeRef.current = startTime + audioBuffer.duration;

            // Only attach onended to the *last* scheduled item to know when to stop "speaking"
            if (audioQueueRef.current.length === 0) {
                source.onended = () => {
                    if (audioQueueRef.current.length === 0) {
                        isPlayingRef.current = false;
                        setIsSpeaking(false);
                    } else {
                        processAudioQueue(); // In case more arrived while finishing
                    }
                };
            }
        }
    };

    const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    };

    useEffect(() => {
        return () => {
            stopRecording();
            disconnectFromAgent();
        };
    }, [stopRecording, disconnectFromAgent]);

    return (
        <LiveAudioContext.Provider value={{
            isRecording,
            isConnected,
            isSpeaking,
            aiFeedback,
            startRecording,
            stopRecording,
            toggleVoice,
            clearFeedback,
            registerFunctionCallback,
            unregisterFunctionCallback
        }}>
            {children}
        </LiveAudioContext.Provider>
    );
};
