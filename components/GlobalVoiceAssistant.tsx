import React, { useEffect, useState } from 'react';
import { useLiveAudioContext } from '../contexts/LiveAudioContext';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

const MicIcon: React.FC<{ active?: boolean, speaking?: boolean }> = ({ active, speaking }) => (
    <svg viewBox="0 0 24 24" className={`w-full h-full p-1 transition-all duration-700 ${active ? 'scale-110 drop-shadow-[0_0_15px_rgba(255,215,0,0.8)]' : 'scale-100 opacity-80'}`} fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: '#FFE066', stopOpacity: 1 }} />
                <stop offset="30%" style={{ stopColor: '#FFD700', stopOpacity: 1 }} />
                <stop offset="70%" style={{ stopColor: '#FDB931', stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: '#A67C00', stopOpacity: 1 }} />
            </linearGradient>
            <linearGradient id="innerShadow" x1="100%" y1="0%" x2="0%" y2="0%">
                <stop offset="0%" style={{ stopColor: '#000000', stopOpacity: 0.6 }} />
                <stop offset="100%" style={{ stopColor: 'transparent', stopOpacity: 0 }} />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                </feMerge>
            </filter>
        </defs>
        {/* Mic Body - Filled with Gradient */}
        <path
            d="M12 1C9.79086 1 8 2.79086 8 5V11C8 13.2091 9.79086 15 12 15C14.2091 15 16 13.2091 16 11V5C16 2.79086 14.2091 1 12 1Z"
            fill="url(#goldGradient)"
            filter={active ? "url(#glow)" : ""}
        />
        {/* Inner shadow overlay for 3D effect */}
        <path
            d="M12 1C9.79086 1 8 2.79086 8 5V11C8 13.2091 9.79086 15 12 15C14.2091 15 16 13.2091 16 11V5C16 2.79086 14.2091 1 12 1Z"
            fill="url(#innerShadow)"
        />
        {/* Mic Stand */}
        <path
            d="M19 11C19 14.866 15.866 18 12 18C8.13401 18 5 14.866 5 11"
            stroke="url(#goldGradient)"
            strokeWidth="2.5"
            strokeLinecap="round"
        />
        <path
            d="M12 18V22M8 22H16"
            stroke="url(#goldGradient)"
            strokeWidth="2.5"
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
            // Don't auto-hide persistent status messages quickly
            if (aiFeedback === "Listening..." || aiFeedback === "Voice Session Paused.") {
                const timer = setTimeout(() => {
                    setLocalFeedback(null);
                    clearFeedback();
                }, 3000);
                return () => clearTimeout(timer);
            } else if (aiFeedback.includes("Error") || aiFeedback.includes("Sleeping")) {
                const timer = setTimeout(() => {
                    setLocalFeedback(null);
                    clearFeedback();
                }, 5000);
                return () => clearTimeout(timer);
            }
        }
    }, [aiFeedback, clearFeedback]);

    if (!user || (!user.isVoiceAgentEnabled && user.role !== 'admin')) {
        return null;
    }

    return (
        <div className="fixed top-16 right-4 sm:top-20 sm:left-6 sm:right-auto z-[100] flex flex-col sm:items-start items-end gap-2 sm:gap-3 pointer-events-none">

            {/* Floating Action Button Container */}
            <div className="relative group pointer-events-auto">

                {/* Visual Effects Layer (Waves & Sparks) */}
                {isRecording && isConnected && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        {/* Upgraded Sinuous Waves - Adjusted size for responsiveness */}
                        <div className="absolute w-[200%] h-[200%] bg-yellow-400/20 rounded-full animate-ai-wave"></div>
                        <div className="absolute w-[250%] h-[250%] bg-yellow-300/10 rounded-full animate-ai-wave [animation-delay:0.5s]"></div>
                        <div className="absolute w-[300%] h-[300%] bg-amber-400/5 rounded-full animate-ai-wave [animation-delay:1s]"></div>

                        {/* More intense sparks */}
                        {[...Array(8)].map((_, i) => (
                            <div
                                key={i}
                                className="absolute w-1.5 h-1.5 bg-yellow-100 rounded-full animate-ai-spark shadow-[0_0_12px_#FFF]"
                                style={{
                                    left: `${50 + (Math.random() - 0.5) * 120}%`,
                                    top: `${50 + (Math.random() - 0.5) * 120}%`,
                                    animationDelay: `${Math.random() * 2}s`,
                                    animationDuration: `${1 + Math.random()}s`
                                }}
                            />
                        ))}
                    </div>
                )}

                <button
                    onClick={toggleVoice}
                    className={`
                        relative flex items-center justify-center rounded-full transition-all duration-500 transform hover:scale-105 active:scale-95
                        backdrop-blur-xl border-2
                        w-14 h-14 sm:w-20 sm:h-20
                        ${isRecording
                            ? 'bg-gradient-to-br from-gray-900/90 to-black border-yellow-500/60 shadow-[0_0_50px_rgba(255,215,0,0.4)]'
                            : 'bg-gray-900/50 border-gray-600/50 shadow-lg hover:bg-gray-800/80 hover:border-yellow-500/30'
                        }
                    `}
                >
                    {/* Connecting Loader */}
                    {isRecording && !isConnected && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full z-20">
                            <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-500 animate-spin" />
                        </div>
                    )}

                    {/* The Mic Icon Container */}
                    <div className="w-8 h-8 sm:w-12 sm:h-12 flex items-center justify-center z-10">
                        <MicIcon active={isRecording && isConnected} speaking={isSpeaking} />
                    </div>

                    {/* High-amplitude Pulse Ring when speaking */}
                    {isSpeaking && (
                        <div className="absolute inset-0 rounded-full border-4 border-yellow-400/50 animate-ping [animation-duration:1s]"></div>
                    )}

                    {/* Premium Glossy Overlay */}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/10 to-white/20 pointer-events-none"></div>
                </button>
            </div>

            {/* AI Feedback Bubble */}
            <div
                className={`transition-all duration-500 transform sm:origin-top-left origin-top-right pointer-events-auto ${(localFeedback || isSpeaking)
                    ? 'opacity-100 sm:translate-x-2 -translate-x-2'
                    : 'opacity-0 sm:-translate-x-4 translate-x-4 pointer-events-none'
                    }`}
            >
                <div className="bg-gray-900/80 backdrop-blur-2xl border border-yellow-500/20 shadow-[0_10px_40px_rgba(255,215,0,0.15)] rounded-2xl p-3 sm:p-4 max-w-[250px] sm:max-w-sm">
                    <div className="flex items-center gap-3 sm:gap-4">
                        {isSpeaking ? (
                            <div className="flex gap-1 sm:gap-1.5 items-end h-4 sm:h-6 shrink-0">
                                {[0, 150, 300, 450].map(delay => (
                                    <span
                                        key={delay}
                                        className="w-1 sm:w-1.5 bg-gradient-to-t from-yellow-600 to-yellow-300 rounded-full animate-music-bar"
                                        style={{ animationDelay: `${delay}ms` }}
                                    ></span>
                                ))}
                            </div>
                        ) : (
                            <div className="w-2 h-2 sm:w-3 sm:h-3 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981] animate-pulse"></div>
                        )}
                        <p className="text-xs sm:text-sm font-semibold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-gray-100 to-yellow-100/80 line-clamp-2">
                            {isSpeaking ? "ANALYZING..." : (localFeedback ? localFeedback.toUpperCase() : "")}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
