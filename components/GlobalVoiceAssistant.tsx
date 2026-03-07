import React, { useEffect, useState } from 'react';
import { useLiveAudioContext } from '../contexts/LiveAudioContext';
import { useAuth } from '../contexts/AuthContext';
import { Mic, MicOff, Loader2 } from 'lucide-react';

export const GlobalVoiceAssistant: React.FC = () => {
    const { user } = useAuth();
    const { isRecording, isConnected, isSpeaking, aiFeedback, toggleVoice, clearFeedback } = useLiveAudioContext();
    const [localFeedback, setLocalFeedback] = useState<string | null>(null);

    useEffect(() => {
        if (aiFeedback) {
            setLocalFeedback(aiFeedback);
            // Auto clear simple status messages after 3 seconds, but keep longer feedback
            if (aiFeedback === "Listening..." || aiFeedback === "Voice Session Paused.") {
                const timer = setTimeout(() => {
                    setLocalFeedback(null);
                    clearFeedback();
                }, 3000);
                return () => clearTimeout(timer);
            }
        }
    }, [aiFeedback, clearFeedback]);

    if (!user || (!user.isVoiceAgentEnabled && user.role !== 'admin')) {
        return null;
    }

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">

            {/* AI Feedback Bubble */}
            <div
                className={`transition-all duration-300 transform origin-bottom-right ${(localFeedback || isSpeaking)
                    ? 'opacity-100 scale-100 translate-y-0'
                    : 'opacity-0 scale-90 translate-y-4 pointer-events-none'
                    }`}
            >
                {/* Always render, but control visibility with CSS classes above */}
                <div className="bg-gray-800 border border-gray-700 shadow-xl rounded-2xl p-4 max-w-sm">
                    <div className="flex items-center gap-3">
                        {isSpeaking ? (
                            <div className="flex gap-1">
                                <span className="w-1.5 h-4 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                <span className="w-1.5 h-6 bg-sky-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                <span className="w-1.5 h-4 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                            </div>
                        ) : (
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        )}
                        <p className="text-sm text-gray-200">
                            {isSpeaking ? "Agent is speaking..." : localFeedback}
                        </p>
                    </div>
                </div>
            </div>

            {/* Floating Action Button */}
            <button
                onClick={toggleVoice}
                className={`
                    relative flex items-center justify-center p-4 rounded-full shadow-2xl transition-all duration-300 focus:outline-none focus:ring-4
                    ${isRecording
                        ? 'bg-rose-500 hover:bg-rose-600 focus:ring-rose-500/50 shadow-rose-500/30'
                        : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-600/50 shadow-indigo-600/30'
                    }
                `}
                style={{
                    boxShadow: isRecording ? '0 0 20px rgba(244, 63, 94, 0.4)' : '0 0 15px rgba(79, 70, 229, 0.3)'
                }}
            >
                {/* Connecting Loader */}
                {isRecording && !isConnected && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full">
                        <Loader2 className="w-5 h-5 text-white animate-spin" />
                    </div>
                )}

                {/* Ping Animation while connected and recording */}
                {isRecording && isConnected && (
                    <span className="absolute flex h-full w-full inset-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-40"></span>
                    </span>
                )}

                {isRecording ? (
                    <Mic className="w-7 h-7 text-white z-10" />
                ) : (
                    <MicOff className="w-7 h-7 text-white z-10" />
                )}
            </button>
        </div>
    );
};
