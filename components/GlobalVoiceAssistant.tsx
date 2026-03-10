import React, { useEffect, useState } from 'react';
import { useLiveAudioContext } from '../contexts/LiveAudioContext';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

const MicIcon: React.FC<{ active?: boolean, speaking?: boolean }> = ({ active, speaking }) => (
    <svg viewBox="0 0 24 24" className={`w-10 h-10 transition-all duration-700 ${active ? 'scale-110 drop-shadow-[0_0_15px_rgba(255,215,0,0.8)]' : 'scale-100 opacity-80'}`} fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: '#FFD700', stopOpacity: 1 }} />
                <stop offset="50%" style={{ stopColor: '#FDB931', stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: '#C5A028', stopOpacity: 1 }} />
            </linearGradient>
            <filter id="glow">
                <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
                <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                </feMerge>
            </filter>
        </defs>
        {/* Mic Body */}
        <path
            d="M12 1C9.79086 1 8 2.79086 8 5V11C8 13.2091 9.79086 15 12 15C14.2091 15 16 13.2091 16 11V5C16 2.79086 14.2091 1 12 1Z"
            fill="url(#goldGradient)"
            filter={active ? "url(#glow)" : ""}
        />
        {/* Mic Stand */}
        <path
            d="M19 11C19 14.866 15.866 18 12 18C8.13401 18 5 14.866 5 11"
            stroke="url(#goldGradient)"
            strokeWidth="2"
            strokeLinecap="round"
        />
        <path
            d="M12 18V22M8 22H16"
            stroke="url(#goldGradient)"
            strokeWidth="2"
            strokeLinecap="round"
        />
    </svg>
);

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

            {/* Floating Action Button Container */}
            <div className="relative group">

                {/* Visual Effects Layer (Waves & Sparks) */}
                {isRecording && isConnected && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        {/* Sinuous Waves */}
                        <div className="absolute w-24 h-24 bg-yellow-400/20 rounded-full animate-ai-wave"></div>
                        <div className="absolute w-28 h-28 bg-yellow-300/10 rounded-full animate-ai-wave [animation-delay:0.5s]"></div>
                        <div className="absolute w-32 h-32 bg-amber-400/5 rounded-full animate-ai-wave [animation-delay:1s]"></div>

                        {/* Random Sparks */}
                        {[...Array(6)].map((_, i) => (
                            <div
                                key={i}
                                className="absolute w-1 h-1 bg-yellow-200 rounded-full animate-ai-spark shadow-[0_0_8px_white]"
                                style={{
                                    left: `${50 + (Math.random() - 0.5) * 80}%`,
                                    top: `${50 + (Math.random() - 0.5) * 80}%`,
                                    animationDelay: `${Math.random() * 2}s`
                                }}
                            />
                        ))}
                    </div>
                )}

                <button
                    onClick={toggleVoice}
                    className={`
                        relative flex items-center justify-center p-6 rounded-full transition-all duration-500 transform hover:scale-110 active:scale-95
                        backdrop-blur-xl border-2
                        ${isRecording
                            ? 'bg-gradient-to-br from-gray-900/80 to-black/90 border-yellow-500/50 shadow-[0_0_40px_rgba(255,191,0,0.3)]'
                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                        }
                    `}
                >
                    {/* Connecting Loader */}
                    {isRecording && !isConnected && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full z-20">
                            <Loader2 className="w-8 h-8 text-yellow-500 animate-spin" />
                        </div>
                    )}

                    {/* The Mic Icon */}
                    <MicIcon active={isRecording && isConnected} speaking={isSpeaking} />

                    {/* Pulse Ring when speaking */}
                    {isSpeaking && (
                        <div className="absolute inset-0 rounded-full border-4 border-yellow-500/40 animate-ping"></div>
                    )}

                    {/* Glossy Overlay */}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/5 to-white/10 pointer-events-none"></div>
                </button>
            </div>

            {/* AI Feedback Bubble */}
            <div
                className={`transition-all duration-500 transform origin-top-left ${(localFeedback || isSpeaking)
                    ? 'opacity-100 translate-x-2'
                    : 'opacity-0 -translate-x-4 pointer-events-none'
                    }`}
            >
                <div className="bg-gray-900/40 backdrop-blur-2xl border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.5)] rounded-2xl p-4 max-w-sm">
                    <div className="flex items-center gap-4">
                        {isSpeaking ? (
                            <div className="flex gap-1.5 items-end h-6">
                                {[0, 150, 300, 450].map(delay => (
                                    <span
                                        key={delay}
                                        className="w-1.5 bg-gradient-to-t from-yellow-600 to-yellow-300 rounded-full animate-music-bar"
                                        style={{ animationDelay: `${delay}ms` }}
                                    ></span>
                                ))}
                            </div>
                        ) : (
                            <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981] animate-pulse"></div>
                        )}
                        <p className="text-sm font-semibold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-gray-100 to-gray-400">
                            {isSpeaking ? "ANALYZING..." : (localFeedback ? localFeedback.toUpperCase() : "")}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
