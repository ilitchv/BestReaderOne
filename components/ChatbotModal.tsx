
import React, { useState, useEffect, useRef } from 'react';
import type { OcrResult, ChatMessage as ChatMessageType, ImageInterpretationResult } from '../types';
import ChatMessage from './ChatMessage';
import { useSound } from '../hooks/useSound';
import { convertNumberWordsToDigits } from '../utils/helpers';

interface ChatbotModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (result: ImageInterpretationResult) => void;
    interpretTicketImage: (base64Image: string) => Promise<ImageInterpretationResult>;
    interpretNaturalLanguagePlays: (prompt: string) => Promise<OcrResult[]>;
    fileToBase64: (file: File) => Promise<string>;
    language?: 'en' | 'es' | 'ht';
}

// Check for SpeechRecognition API
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
const hasSpeechRecognition = !!SpeechRecognition;

const ChatbotModal: React.FC<ChatbotModalProps> = ({ isOpen, onClose, onSuccess, interpretTicketImage, interpretNaturalLanguagePlays, fileToBase64, language = 'en' }) => {
    const [messages, setMessages] = useState<ChatMessageType[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    
    // Local state for the active voice language (defaults to app language)
    const [voiceLang, setVoiceLang] = useState<'en' | 'es' | 'ht'>(language);

    const recognitionRef = useRef<any>(null);
    const chatBodyRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const { playSound } = useSound();

    // Localized Greeting
    const getGreeting = () => {
        switch(language) {
            case 'es': return "¡Hola! ¿Cómo puedo ayudarte hoy? Puedes escribir, hablar o subir una foto.";
            case 'ht': return "Bonjou! Kijan mwen ka ede w jodi a? Ou ka ekri, pale oswa voye foto yon bòlèt.";
            default: return "Hello! How can I help you add plays today? You can type, speak, or upload an image of a ticket.";
        }
    };

    useEffect(() => {
        if (isOpen) {
            setMessages([{
                id: Date.now(),
                user: 'bot',
                text: getGreeting()
            }]);
            // Sync voice lang with app lang on open
            setVoiceLang(language);
        } else {
            // Cleanup on close
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
            setIsRecording(false);
            setInputValue('');
        }
    }, [isOpen, language]);

    useEffect(() => {
        // Scroll to bottom of chat
        if (chatBodyRef.current) {
            chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
        }
    }, [messages]);

    // Auto-resize textarea on input change
    useEffect(() => {
        if (textareaRef.current) {
            // Reset height to auto to calculate the new scrollHeight correctly if text was deleted
            textareaRef.current.style.height = 'auto';
            // Set new height based on content, capped at 40vh (massive increase from 120px)
            const maxHeight = window.innerHeight * 0.4; 
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, maxHeight)}px`;
        }
    }, [inputValue]);
    
    // Setup Speech Recognition with Dynamic Language
    useEffect(() => {
        if (!hasSpeechRecognition) return;
        
        // If already recording, stop to reset language
        if (isRecording && recognitionRef.current) {
            recognitionRef.current.stop();
            setIsRecording(false);
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        
        // Set Language based on Local State Selection
        if (voiceLang === 'es') {
            recognition.lang = 'es-DO'; 
        } else if (voiceLang === 'ht') {
            recognition.lang = 'ht';
        } else {
            recognition.lang = 'en-US';
        }

        recognition.onresult = (event: any) => {
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                }
            }
            if(finalTranscript) {
                // Apply Number Conversion Logic Here
                const processedTranscript = convertNumberWordsToDigits(finalTranscript);
                setInputValue(prev => prev + (prev ? ' ' : '') + processedTranscript);
            }
        };
        
        recognition.onend = () => {
            setIsRecording(false);
        };

        recognitionRef.current = recognition;

        return () => {
            try { recognition.stop(); } catch(e) {}
        };
    }, [voiceLang]); // Re-run setup when voice language changes

    const handleSendMessage = async (text: string, imageFile?: File) => {
        if ((!text.trim() && !imageFile) || isLoading) return;

        playSound('sent'); // Play Sent sound
        setIsLoading(true);
        setInputValue('');
        
        // Reset height immediately after sending
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }

        const userMessageText = text.trim() || (imageFile ? `Analyzing image: ${imageFile.name}` : '');
        const userMessage: ChatMessageType = { id: Date.now(), user: 'user', text: userMessageText };
        const loadingMessage: ChatMessageType = { id: Date.now() + 1, user: 'bot', isLoading: true };
        
        setMessages(prev => [...prev, userMessage, loadingMessage]);

        try {
            let result: ImageInterpretationResult;
            let botText = "Here is what I found:";
            let noResultText = "Sorry, I couldn't detect any valid plays. Please try rephrasing or use a clearer image.";

            if (language === 'es') {
                botText = "Aquí está lo que encontré:";
                noResultText = "Lo siento, no detecté jugadas válidas. Intenta reformular o usa una imagen más clara.";
            } else if (language === 'ht') {
                botText = "Men sa mwen jwenn:";
                noResultText = "Padon, mwen pa t 'kapab detekte okenn jwèt valab. Tanpri eseye ankò.";
            }

            if (imageFile) {
                const base64 = await fileToBase64(imageFile);
                result = await interpretTicketImage(base64);
            } else {
                // For natural language, we wrap it in the new structure
                const plays = await interpretNaturalLanguagePlays(text);
                result = { plays, detectedTracks: [], detectedDate: null };
            }

            if (result.plays.length === 0) {
                botText = noResultText;
            }

            const botResponse: ChatMessageType = { id: Date.now() + 2, user: 'bot', text: botText, interpretationResult: result };
            setMessages(prev => [...prev.slice(0, -1), botResponse]);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            const errorResponse: ChatMessageType = { id: Date.now() + 2, user: 'bot', text: errorMessage };
            setMessages(prev => [...prev.slice(0, -1), errorResponse]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLoadResult = (result: ImageInterpretationResult) => {
        onSuccess(result);
        onClose();
    };

    const handleMicClick = () => {
        if (!hasSpeechRecognition) return;
        if (isRecording) {
            recognitionRef.current?.stop();
            setIsRecording(false);
            playSound('mic_stop'); // Play STOP sound
        } else {
            recognitionRef.current?.start();
            setIsRecording(true);
            playSound('mic_start'); // Play START sound
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleSendMessage('', file);
        }
        // Reset file input to allow selecting the same file again
        if(fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage(inputValue);
        }
    };

    if (!isOpen) return null;

    const showSendButton = inputValue.trim().length > 0;

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in" onClick={onClose}>
            <div className="bg-light-card dark:bg-dark-card rounded-xl shadow-2xl w-full max-w-2xl h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center flex-shrink-0">
                    <h2 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan to-neon-pink flex items-center gap-2">
                       <svg data-lucide="bot" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
                        AI Bet Assistant
                    </h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                       <svg data-lucide="x" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    </button>
                </div>

                <div ref={chatBodyRef} className="flex-grow p-4 space-y-4 overflow-y-auto flex flex-col">
                    {messages.map(msg => <ChatMessage key={msg.id} message={msg} onLoadResult={handleLoadResult} />)}
                </div>
                
                <div className="p-3 sm:p-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 bg-light-card dark:bg-dark-card rounded-b-xl">
                    
                    {/* --- LANGUAGE TOGGLES --- */}
                    <div className="flex justify-center gap-2 mb-2">
                        <button 
                            onClick={() => { setVoiceLang('en'); playSound('click'); }} 
                            className={`px-3 py-1 text-[10px] font-bold rounded-full border transition-all ${voiceLang === 'en' ? 'bg-neon-cyan text-black border-neon-cyan shadow-[0_0_10px_rgba(0,255,255,0.4)]' : 'bg-transparent text-gray-500 border-gray-600 hover:border-gray-400'}`}
                        >
                            🇺🇸 EN
                        </button>
                        <button 
                            onClick={() => { setVoiceLang('es'); playSound('click'); }} 
                            className={`px-3 py-1 text-[10px] font-bold rounded-full border transition-all ${voiceLang === 'es' ? 'bg-neon-cyan text-black border-neon-cyan shadow-[0_0_10px_rgba(0,255,255,0.4)]' : 'bg-transparent text-gray-500 border-gray-600 hover:border-gray-400'}`}
                        >
                            🇩🇴 ES
                        </button>
                        <button 
                            onClick={() => { setVoiceLang('ht'); playSound('click'); }} 
                            className={`px-3 py-1 text-[10px] font-bold rounded-full border transition-all ${voiceLang === 'ht' ? 'bg-neon-cyan text-black border-neon-cyan shadow-[0_0_10px_rgba(0,255,255,0.4)]' : 'bg-transparent text-gray-500 border-gray-600 hover:border-gray-400'}`}
                        >
                            🇭🇹 HT
                        </button>
                    </div>

                    <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(inputValue);}} className="flex items-end gap-2 bg-light-surface dark:bg-dark-surface p-2 rounded-xl shadow-inner border border-gray-200 dark:border-gray-700">
                        <input type="file" ref={fileInputRef} accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
                        
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-500 dark:text-gray-400 hover:text-neon-cyan transition-colors" title="Take Photo / Upload">
                           <svg data-lucide="camera" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
                        </button>
                        
                        <div className="flex-grow relative">
                            {/* Removed fake equalizer overlay to allow real-time text visibility */}
                            <textarea 
                                ref={textareaRef}
                                rows={1}
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={voiceLang === 'es' ? "Escribe o di '5 directo al 123'..." : voiceLang === 'ht' ? "Ekri oswa di '5 dola sou 123'..." : "Type or say '5 straight on 123'..."}
                                className="w-full bg-transparent focus:outline-none resize-none py-2 max-h-[40vh] overflow-y-auto text-sm leading-relaxed scrollbar-hide"
                                disabled={isLoading}
                                style={{ minHeight: '36px' }}
                            />
                        </div>
                        
                        <div className="flex gap-2 mb-0.5">
                            {showSendButton ? (
                                <button 
                                    type="submit" 
                                    disabled={isLoading} 
                                    className="p-2 rounded-full bg-gradient-to-r from-neon-cyan to-blue-600 text-white hover:scale-110 transition-all shadow-[0_0_10px_theme(colors.neon-cyan)] active:scale-95 border border-white/20 animate-fade-in" 
                                    title="Send"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4 20-7z"/><path d="M22 2 11 13"/></svg>
                                </button>
                            ) : hasSpeechRecognition && (
                                <button 
                                    type="button" 
                                    onClick={handleMicClick} 
                                    className={`p-2 transition-all rounded-full ${isRecording ? 'bg-red-500 text-white animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'text-gray-500 dark:text-gray-400 hover:text-neon-cyan hover:bg-gray-200 dark:hover:bg-white/10'}`} 
                                    title={isRecording ? "Stop Recording" : "Record Voice"}
                                >
                                    {isRecording ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
                                    ) : (
                                        <svg data-lucide="mic" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
                                    )}
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ChatbotModal;
