
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useSound } from '../hooks/useSound';

interface ReelItem {
    label: string;
    value: string;
    extra?: React.ReactNode;
    isExpired?: boolean;
    colorClass?: string;
}


interface Reel3DProps {
    items: ReelItem[];
    selectedValue: string;
    onChange: (value: string) => void;
    height?: number; // Total height of the viewport
    itemHeight?: number; // Height of each face
    label?: string; // Top label (e.g. "STATE")
}

const Reel3D: React.FC<Reel3DProps> = ({
    items,
    selectedValue,
    onChange,
    height = 200,
    itemHeight = 60,
    label
}) => {
    const { playSound } = useSound();
    const viewportRef = useRef<HTMLDivElement>(null);
    const spinnerRef = useRef<HTMLDivElement>(null);

    // Physics State
    const [currentAngle, setCurrentAngle] = useState(0);
    const isDragging = useRef(false);
    const startY = useRef(0);
    const startAngle = useRef(0);
    const velocity = useRef(0);
    const animationFrameId = useRef<number | null>(null);
    const lastTickIndex = useRef<number>(0);

    // Geometry
    // We duplicate items to ensure we have enough faces for a nice cylinder if count is low
    // Minimum 12 faces looks good for a circle
    const getDisplayItems = () => {
        let display = [...items];
        while (display.length < 12) {
            display = [...display, ...display];
        }
        return display;
    };

    const displayItems = getDisplayItems();
    const count = displayItems.length;
    const cellAngle = 360 / count;
    const radius = Math.round((itemHeight / 2) / Math.tan(Math.PI / count));

    // Initialize Angle based on selectedValue
    useEffect(() => {
        // Only if not dragging to avoid conflicts
        if (!isDragging.current) {
            // Find index of selected value (first occurrence)
            const index = displayItems.findIndex(i => i.value === selectedValue);
            if (index !== -1) {
                // We want this index to be at the FRONT (0 degrees or aligned)
                // Angle 0 puts item 0 at front.
                // Item i is at angle i * cellAngle. 
                // To bring item i to front (0), we rotate cylinder by -i * cellAngle.
                const target = -index * cellAngle;

                // Minimize rotation (find shortest path) could be fancy, but direct set is safe for init
                // For transitions, we might want to respect current loops.
                // But for now, direct jump or smooth if close.
                setCurrentAngle(target);
                lastTickIndex.current = index;
            }
        }
    }, [selectedValue, items]); // Intentionally not including displayItems/cellAngle to avoid recalc loops

    // --- PHYSICS ENGINE ---

    const updateSpinner = (angle: number) => {
        // Audio Feedback
        const rawIndex = Math.round(angle / cellAngle);
        if (rawIndex !== lastTickIndex.current) {
            playSound('click');
            lastTickIndex.current = rawIndex;
        }
        setCurrentAngle(angle);
    };

    const applyInertia = () => {
        velocity.current *= 0.95; // Friction
        const newAngle = currentAngle + velocity.current;
        updateSpinner(newAngle);

        if (Math.abs(velocity.current) > 0.1) {
            // Keep spinning
            // Update state safely (in next frame)
            // We use functional update in a ref-based loop conceptually, 
            // but here we are driving a render loop.
            // Actually, for 60fps React render might be heavy if items are complex.
            // But for simple text, it's fine. 
            // Better: update DOM ref directly for performance, then sync state on stop.
            // Let's try mixed approach: Logic here, but `setCurrentAngle` triggers render.
            // `setCurrentAngle` inside frame is React-way.

            // However, `currentAngle` in this closure is stale if not careful.
            // We need to pass the *calculated* angle back into the next frame call?
            // Actually, let's use a mutable ref for the 'live' angle during physics to avoid closure staleness,
            // then set state to update view.
            animationFrameId.current = requestAnimationFrame(runInertiaLoop);
        } else {
            snapToGrid();
        }
    };

    // Helper loop that reads from state implies we need refs for the accumulated angle
    const liveAngle = useRef(currentAngle);
    useEffect(() => { liveAngle.current = currentAngle; }, [currentAngle]);

    const runInertiaLoop = () => {
        velocity.current *= 0.95;
        liveAngle.current += velocity.current;
        updateSpinner(liveAngle.current);

        if (Math.abs(velocity.current) > 0.1) {
            animationFrameId.current = requestAnimationFrame(runInertiaLoop);
        } else {
            snapToGrid(liveAngle.current);
        }
    };

    const snapToGrid = (finalAngle?: number) => {
        const angle = finalAngle !== undefined ? finalAngle : liveAngle.current;
        const index = Math.round(angle / cellAngle);
        const targetAngle = index * cellAngle;

        // Animated Snap handled by CSS transition usually, but here we are driving values.
        // Let's just set it. 
        setCurrentAngle(targetAngle);

        // Determine selected item
        // Normalized index
        let normIndex = (-index) % count;
        if (normIndex < 0) normIndex += count;

        const selectedItem = displayItems[normIndex];
        if (selectedItem && selectedItem.value !== selectedValue) {
            onChange(selectedItem.value);
        }
    };

    // --- HANDLERS ---

    const handleStart = (msgY: number) => {
        if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
        isDragging.current = true;
        startY.current = msgY;
        startAngle.current = liveAngle.current;
        velocity.current = 0;
    };

    const handleMove = (msgY: number) => {
        if (!isDragging.current) return;
        const deltaY = msgY - startY.current;
        // Sensitivity factor 
        const newAngle = startAngle.current + (deltaY * 0.5);
        liveAngle.current = newAngle;
        updateSpinner(newAngle);

        // Track velocity
        velocity.current = deltaY * 0.1; // Simple instantaneous velocity
        // Reset start to smooth velocity calculation? 
        // Or just keep simple (total delta vs frame delta). 
        // Lets use frame delta for better physics:
        startY.current = msgY;
        startAngle.current = newAngle;
    };

    const handleEnd = () => {
        if (!isDragging.current) return;
        isDragging.current = false;
        animationFrameId.current = requestAnimationFrame(runInertiaLoop);
    };


    // Mouse
    const onMouseDown = (e: React.MouseEvent) => handleStart(e.clientY);
    const onMouseMove = (e: React.MouseEvent) => handleMove(e.clientY);
    const onMouseUp = () => handleEnd();
    const onMouseLeave = () => handleEnd();

    // Touch
    const onTouchStart = (e: React.TouchEvent) => handleStart(e.touches[0].clientY);
    const onTouchMove = (e: React.TouchEvent) => handleMove(e.touches[0].clientY);
    const onTouchEnd = () => handleEnd();

    return (
        <div className="relative overflow-hidden bg-gradient-to-b from-slate-900 to-slate-800 rounded-xl border border-slate-700 shadow-inner"
            style={{ height: `${height}px` }}
        >
            {label && (
                <div className="absolute top-0 left-0 w-full text-center py-1 z-20 bg-black/20 text-[10px] font-bold text-cyan-500 uppercase tracking-widest backdrop-blur-sm pointer-events-none">
                    {label}
                </div>
            )}

            {/* Selection Highlight / Lens */}
            <div className="absolute top-1/2 left-0 w-full h-[60px] -mt-[30px] z-10 pointer-events-none bg-cyan-500/10 border-y border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.1)]"></div>

            {/* Gradient Masks */}
            <div className="absolute top-0 left-0 w-full h-1/3 bg-gradient-to-b from-slate-900 to-transparent z-10 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-slate-900 to-transparent z-10 pointer-events-none"></div>

            {/* 3D Viewport */}
            <div
                ref={viewportRef}
                className="w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing touch-none"
                style={{ perspective: '800px' }}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onMouseLeave={onMouseLeave}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
            >
                <div
                    ref={spinnerRef}
                    className="relative w-full"
                    style={{
                        height: `${itemHeight}px`,
                        transformStyle: 'preserve-3d',
                        transform: `rotateX(${currentAngle}deg)`
                    }}
                >
                    {displayItems.map((item, i) => {
                        const angle = i * cellAngle;
                        const isSelected = item.value === selectedValue;

                        return (
                            <div
                                key={i}
                                className={`absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center backface-hidden
                                    ${isSelected ? 'scale-110' : 'scale-90'}
                                    ${item.colorClass ? 'text-white' : (isSelected ? 'text-white' : 'text-slate-500')}
                                    ${item.isExpired ? 'opacity-50 grayscale' : ''}
                                    transition-all duration-300
                                `}
                                style={{
                                    transform: `rotateX(${angle}deg) translateZ(${radius}px)`,
                                    backfaceVisibility: 'hidden'
                                }}
                            >
                                {/* GLASS BACKGROUND (Brand Color) */}
                                {item.colorClass && (
                                    <div className={`absolute inset-0 m-1 rounded-lg ${item.colorClass} opacity-40 backdrop-blur-[2px] border border-white/10 shadow-sm z-0`}></div>
                                )}

                                <span className={`relative z-10 text-sm sm:text-base uppercase tracking-wider truncate px-4 ${isSelected ? 'font-bold' : ''} drop-shadow-md`}>
                                    {item.label}
                                </span>
                                {item.extra && (
                                    <div className={`relative z-10 text-[10px] font-mono mt-0.5 ${isSelected || item.colorClass ? 'text-cyan-200' : 'text-slate-600'}`}>
                                        {item.extra}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default Reel3D;
