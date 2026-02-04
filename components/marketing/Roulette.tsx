import React, { useEffect, useRef, useState } from 'react';
import { Ticket, Frown, DollarSign, AlertCircle, Sparkles } from 'lucide-react';

interface RouletteProps {
    targetAngle: number;
    isSpinning: boolean;
    onComplete: () => void;
}

// 8 Segments configuration matching casinoLogic.ts
// Colors updated to be vibrant and distinct
const SEGMENTS = [
    { index: 0, label: "FREE", sub: "TICKET", color: "#EAB308", icon: <Ticket size={24} className="text-black mb-1" /> }, // Gold
    { index: 1, label: "BAD", sub: "LUCK", color: "#EF4444", icon: <Frown size={24} className="text-white mb-1" /> }, // Red
    { index: 2, label: "15%", sub: "OFF", color: "#8B5CF6", icon: <DollarSign size={24} className="text-white mb-1" /> }, // Purple
    { index: 3, label: "TRY", sub: "AGAIN", color: "#374151", icon: <AlertCircle size={24} className="text-white mb-1" /> }, // Grey
    { index: 4, label: "50%", sub: "OFF", color: "#06B6D4", icon: <Sparkles size={24} className="text-black mb-1" /> }, // Cyan
    { index: 5, label: "NO", sub: "PRIZE", color: "#F97316", icon: <Frown size={24} className="text-white mb-1" /> }, // Orange
    { index: 6, label: "ALMOST", sub: "WON", color: "#EC4899", icon: <AlertCircle size={24} className="text-white mb-1" /> }, // Pink
    { index: 7, label: "SO", sub: "CLOSE", color: "#3B82F6", icon: <Frown size={24} className="text-white mb-1" /> }, // Blue
];

export const RouletteWheel: React.FC<RouletteProps> = ({ targetAngle, isSpinning, onComplete }) => {
    const [currentAngle, setCurrentAngle] = useState(0);
    const requestRef = useRef<number>();
    const startTimeRef = useRef<number>();
    const startAngleRef = useRef<number>(0);

    // Animation Config
    const duration = 5000; // 5 seconds spin

    const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

    useEffect(() => {
        if (isSpinning) {
            startTimeRef.current = performance.now();
            // Normalize current angle to avoid huge numbers if played repeatedly
            startAngleRef.current = currentAngle % 360;

            const animate = (time: number) => {
                const timeElapsed = time - (startTimeRef.current || 0);
                const progress = Math.min(timeElapsed / duration, 1);
                const ease = easeOutCubic(progress);

                // Important: targetAngle from logic is relative. 
                // We add it to current to ensure smooth forward rotation
                const delta = targetAngle - startAngleRef.current;

                // If the target is "negative" relative to modulo, we might spin backwards visually
                // But logic sends positive big number (5 spins). 
                // Let's just trust logic sends absolute target from 0.
                // Actually, to keep it simple, we just interpolate to targetAngle provided by logic
                // But we must handle the state continuity.

                // Better approach: Logic gave us a target like 1780.
                // We just lerp to it.
                const nextAngle = startAngleRef.current + (targetAngle * ease);

                // Haptic
                const prevSegment = Math.floor(currentAngle / 45);
                const nextSegment = Math.floor(nextAngle / 45);
                if (nextSegment > prevSegment && navigator.vibrate) {
                    navigator.vibrate(2);
                }

                setCurrentAngle(nextAngle);

                if (progress < 1) {
                    requestRef.current = requestAnimationFrame(animate);
                } else {
                    onComplete();
                }
            };

            requestRef.current = requestAnimationFrame(animate);
        }
        return () => cancelAnimationFrame(requestRef.current!);
    }, [isSpinning, targetAngle]);

    return (
        <div className="relative w-80 h-80 md:w-96 md:h-96 filter drop-shadow-2xl scale-100">
            {/* Outer Glow */}
            <div className="absolute inset-0 bg-cyan-500/20 blur-[60px] rounded-full" />

            {/* 3D Bezel */}
            <div className="absolute -inset-3 rounded-full bg-gradient-to-b from-gray-700 via-gray-900 to-gray-800 shadow-2xl flex items-center justify-center border-4 border-gray-800">
                {/* Neon Ring */}
                <div className="absolute inset-[-2px] rounded-full border-[2px] border-cyan-400 opacity-50 shadow-[0_0_15px_rgba(6,182,212,0.8)]" />

                {/* Decorative Dots */}
                {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
                    <div
                        key={deg}
                        className="absolute w-3 h-3 rounded-full bg-yellow-400 shadow-[0_0_5px_#EAB308]"
                        style={{ transform: `rotate(${deg}deg) translate(0, -170px)` }}
                    />
                ))}
            </div>

            {/* ROTATING CONTAINER */}
            <div
                className="w-full h-full rounded-full relative overflow-hidden shadow-inner border-4 border-gray-900"
                style={{
                    transform: `rotate(${currentAngle}deg)`,
                    transition: isSpinning ? 'none' : 'transform 1s ease-out'
                }}
            >
                {/* SEGMENTS BACKGROUND - Using Conic Gradient for perfect fill */}
                <div
                    className="w-full h-full absolute inset-0"
                    style={{
                        background: `conic-gradient(
                            #EAB308 0deg 45deg,
                            #EF4444 45deg 90deg,
                            #8B5CF6 90deg 135deg,
                            #374151 135deg 180deg,
                            #06B6D4 180deg 225deg,
                            #F97316 225deg 270deg,
                            #EC4899 270deg 315deg,
                            #3B82F6 315deg 360deg
                        )`
                    }}
                />

                {/* SEGMENT CONTENT (Text & Icons) */}
                {SEGMENTS.map((seg) => (
                    <div
                        key={seg.index}
                        className="absolute top-0 left-0 w-full h-full flex flex-col items-center pt-6 pointer-events-none"
                        style={{
                            transform: `rotate(${seg.index * 45 + 22.5}deg)`, // Rotate to center of slice
                        }}
                    >
                        {/* Text Container - Rotated slightly to read vertically-ish */}
                        <div className="flex flex-col items-center justify-start h-1/2 w-16">
                            <div className="transform translate-y-2">
                                {seg.icon}
                            </div>
                            <span className={`text-[12px] font-black uppercase leading-none mt-1 ${seg.index === 0 || seg.index === 4 ? 'text-black' : 'text-white'} drop-shadow-md`}>
                                {seg.label}
                            </span>
                            <span className={`text-[10px] font-bold uppercase leading-none ${seg.index === 0 || seg.index === 4 ? 'text-black/70' : 'text-white/80'}`}>
                                {seg.sub}
                            </span>
                        </div>
                    </div>
                ))}

                {/* Separator Lines */}
                <div className="absolute inset-0 rounded-full"
                    style={{
                        background: `repeating-conic-gradient(
                            transparent 0deg 44.5deg,
                            rgba(0,0,0,0.4) 44.5deg 45deg
                        )`
                    }}
                />

                {/* Inner Shadow Gradient */}
                <div className="absolute inset-0 bg-[radial-gradient(circle,transparent_50%,rgba(0,0,0,0.4)_100%)] pointer-events-none" />
            </div>

            {/* CENTER HUB */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-yellow-400 border-4 border-gray-900 shadow-[0_0_20px_rgba(0,0,0,0.5)] flex items-center justify-center z-10">
                <div className="w-full h-full rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 flex items-center justify-center animate-pulse-fast">
                    <span className="text-2xl font-black text-yellow-900 drop-shadow-sm">$</span>
                </div>
            </div>

            {/* POINTER (Triangle at Top) */}
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[25px] border-t-yellow-400 filter drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] z-20"></div>
        </div>
    );
};
