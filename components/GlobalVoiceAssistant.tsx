import React, { useEffect, useState } from 'react';
import { useLiveAudioContext } from '../contexts/LiveAudioContext';
import { useAuth } from '../contexts/AuthContext';
import { Bot, Loader2, Zap } from 'lucide-react';

export const GlobalVoiceAssistant: React.FC = () => {
    const { user } = useAuth();
    const { isRecording, isConnected, isSpeaking, aiFeedback, toggleVoice, clearFeedback } = useLiveAudioContext();
    const [localFeedback, setLocalFeedback] = useState<string | null>(null);

    useEffect(() => {
        if (aiFeedback) {
            setLocalFeedback(aiFeedback);
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
        <div className="fixed top-20 left-6 z-[100] flex flex-col items-start gap-3">

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
                    boxShadow: isRecording ? '0 0 25px rgba(244, 63, 94, 0.6)' : '0 0 15px rgba(79, 70, 229, 0.3)'
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
                    <Zap className="w-7 h-7 text-white z-10 animate-pulse" />
                ) : (
                    <Bot className="w-7 h-7 text-white z-10" />
                )}

                {/* Status Indicator */}
                {isRecording && isConnected && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white dark:border-gray-900 shadow-lg"></div>
                )}
            </button>

            {/* AI Feedback Bubble (Now positioned below/beside the button for top-left layout) */}
            <div
                className={`transition-all duration-300 transform origin-top-left ${(localFeedback || isSpeaking)
                    ? 'opacity-100 scale-100 translate-y-0'
                    : 'opacity-0 scale-90 -translate-y-4 pointer-events-none'
                    }`}
            >
                <div className="bg-gray-800/90 backdrop-blur-md border border-gray-700 shadow-2xl rounded-2xl p-4 max-w-sm ml-2">
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
                        <p className="text-sm font-medium text-gray-200">
                            {isSpeaking ? "Analyzing..." : localFeedback}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
