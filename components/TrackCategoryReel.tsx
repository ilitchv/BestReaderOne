
import React, { useMemo, useState, useEffect } from 'react';
import Reel3D from './Reel3D';
import { RESULTS_CATALOG } from '../constants';
import { getTrackColorClasses } from '../utils/helpers';

interface TrackCategoryReelProps {
    categoryTracks: { name: string; id: string }[];
    selectedTracks: string[];
    onSelectionChange: (selected: string[]) => void;
    pulitoPositions: number[];
    onPulitoPositionsChange: (positions: number[]) => void;
    onTrackToggle: (trackId: string) => void;
    showModeReel: boolean;
}

const TrackCategoryReel: React.FC<TrackCategoryReelProps> = ({
    categoryTracks,
    selectedTracks,
    onSelectionChange,
    pulitoPositions,
    onPulitoPositionsChange,
    onTrackToggle,
    showModeReel
}) => {

    // --- TIMER LOGIC (Per Track) ---
    const [now, setNow] = useState(new Date());
    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const formatTime = (totalSeconds: number): string => {
        if (totalSeconds < 0) return "CLOSED";
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };

    const getTrackStatus = (trackId: string) => {
        const catalogItem = RESULTS_CATALOG.find(t => t.id === trackId);
        const closeTimeStr = catalogItem?.closeTime;
        if (!closeTimeStr) return { isExpired: false, remainingTime: "OPEN" };

        const [h, m, s] = closeTimeStr.split(':').map(Number);
        const closeDate = new Date(now);
        closeDate.setHours(h, m, s || 0, 0);

        const diff = Math.floor((closeDate.getTime() - now.getTime()) / 1000);
        return {
            isExpired: diff <= 0,
            remainingTime: diff <= 0 ? "CLOSED" : formatTime(diff)
        };
    };

    // --- MODE REEL DATA ---
    const modeItems = [
        { label: 'STANDARD', value: 'standard' },
        { label: 'PULITO', value: 'pulito' },
        { label: 'VENEZUELA', value: 'venezuela' },
    ];

    // --- LOCAL BROWSE STATE ---
    // Initial browse state should match active selection if possible, else first item.
    const [browsedTrackId, setBrowsedTrackId] = useState<string>(() => {
        return categoryTracks.find(t => selectedTracks.includes(t.id))?.id || categoryTracks[0].id;
    });

    const [browsedMode, setBrowsedMode] = useState<string>(() => {
        if (selectedTracks.includes('special/venezuela') || selectedTracks.includes('Venezuela')) return 'venezuela';
        if (selectedTracks.includes('special/pulito')) return 'pulito';
        return 'standard';
    });

    // --- REEL ITEMS ---
    // --- REEL ITEMS ---
    const trackItems = useMemo(() => {
        const filteredTracks = categoryTracks.filter(t =>
            !['special/pulito', 'special/venezuela', 'Pulito', 'Venezuela'].includes(t.id)
        );

        // Map first to get status/color
        const mapped = filteredTracks.map(t => {
            const { isExpired, remainingTime } = getTrackStatus(t.id);
            return {
                label: t.name.replace('New York', 'NY').replace('Georgia', 'GA').replace('Florida', 'FL'),
                value: t.id,
                extra: remainingTime,
                isExpired: isExpired,
                colorClass: getTrackColorClasses(t.id)
            };
        });

        // HIDE EXPIRED TRACKS
        return mapped.filter(item => !item.isExpired);

    }, [categoryTracks, now]);


    // --- INTERACTION HANDLERS ---

    // 1. SPIN (Browse Only)
    const handleTrackSpin = (val: string) => setBrowsedTrackId(val);
    const handleModeSpin = (val: string) => setBrowsedMode(val);

    // 2. CHECK (Confirm Selection)
    const handleTrackCheck = () => {
        // Delegate to Parent (TrackSelector) to handle exclusivity logic
        onTrackToggle(browsedTrackId);
    };

    const handleModeCheck = () => {
        // Toggle logic
        const currentModeArg = browsedMode;

        // Mode logic is specific but technically also "Track Toggles" for special IDs.
        // We can reuse onTrackToggle? NO, because Mode logic clears others.
        // Let's keep Mode Logic local or pass it?
        // Parent handleTrackToggle DOES handle special/pulito logic!
        // "if (trackId === 'special/pulito') ..."

        // So we can try mapping mode to ID.
        let targetId = '';
        if (currentModeArg === 'pulito') targetId = 'special/pulito';
        if (currentModeArg === 'venezuela') targetId = 'special/venezuela';

        if (targetId) {
            onTrackToggle(targetId);
        } else {
            // Standard = Clear Specials.
            // Parent toggle doesn't have "Clear All Specials".
            // So we might need to keep custom logic for Standard or use existing.
            // Existing logic:
            let newSelection = [...selectedTracks];
            newSelection = newSelection.filter(t => !['special/pulito', 'special/venezuela', 'Pulito', 'Venezuela'].includes(t));
            onSelectionChange(newSelection);
            onPulitoPositionsChange([]);
        }
    };

    // Calculate Active State for Checks
    const isTrackActive = selectedTracks.includes(browsedTrackId);

    // Mode Active Logic
    let isModeActive = false;
    if (browsedMode === 'standard') isModeActive = !selectedTracks.some(t => ['special/pulito', 'special/venezuela'].includes(t));
    else if (browsedMode === 'pulito') isModeActive = selectedTracks.includes('special/pulito');
    else if (browsedMode === 'venezuela') isModeActive = selectedTracks.includes('special/venezuela');

    return (
        <div className="animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex flex-col gap-4 p-4 bg-light-surface/50 dark:bg-dark-surface/50 rounded-lg">

                {/* TOP: TRACKS (Compact) */}
                <div className="w-full flex items-center gap-4">
                    <div className="flex-1">
                        <Reel3D
                            label="TRACK"
                            items={trackItems}
                            selectedValue={browsedTrackId}
                            onChange={handleTrackSpin}
                            height={100}
                            itemHeight={50}
                        />
                    </div>
                    {/* CHECK BUTTON */}
                    <button
                        onClick={handleTrackCheck}
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all bg-gradient-to-br ${isTrackActive
                            ? 'from-neon-cyan to-blue-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.6)] scale-105'
                            : 'from-gray-700 to-gray-800 text-gray-500 border border-gray-600 hover:border-gray-500'
                            }`}
                        title={isTrackActive ? "Selected" : "Select This Track"}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    </button>
                </div>

                {/* BOTTOM: MODE (Compact) */}
                {showModeReel && (
                    <div className="w-full flex justify-center items-center gap-4">
                        <div className="w-[180px]">
                            <Reel3D
                                label="MODE"
                                items={modeItems}
                                selectedValue={browsedMode}
                                onChange={handleModeSpin}
                                height={80}
                                itemHeight={40}
                            />
                        </div>
                        {/* CHECK BUTTON */}
                        <button
                            onClick={handleModeCheck}
                            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all bg-gradient-to-br ${isModeActive
                                ? 'from-neon-pink to-purple-500 text-white shadow-[0_0_15px_rgba(236,72,153,0.6)] scale-105'
                                : 'from-gray-700 to-gray-800 text-gray-500 border border-gray-600 hover:border-gray-500'
                                }`}
                            title={isModeActive ? "Active Mode" : "Set Mode"}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        </button>
                    </div>
                )}
            </div>

            {/* PULITO CONTROLS */}
            {(selectedTracks.includes('special/pulito') || browsedMode === 'pulito') && (
                <div className="mt-4 p-3 bg-slate-900/50 rounded-lg border border-slate-700 animate-in fade-in slide-in-from-top-2">
                    <div className="text-[10px] text-cyan-500 font-bold uppercase mb-2 text-center">Pulito Positions</div>
                    <div className="flex justify-center gap-2">
                        {[1, 2, 3, 4, 5, 6, 7].map(pos => {
                            const isActive = pulitoPositions.includes(pos);
                            return (
                                <button
                                    key={pos}
                                    onClick={() => {
                                        // 1. Auto-Select Pulito Mode if not active
                                        if (!selectedTracks.includes('special/pulito')) {
                                            let newSelection = [...selectedTracks];
                                            // Clear incompatible modes
                                            newSelection = newSelection.filter(t => !['special/venezuela', 'Pulito', 'Venezuela'].includes(t));
                                            newSelection.push('special/pulito');
                                            onSelectionChange(newSelection);
                                            // Also update local browse state to match if needed (though user already browsed to it)
                                        }

                                        // 2. Toggle Position
                                        const newPos = isActive
                                            ? pulitoPositions.filter(p => p !== pos)
                                            : [...pulitoPositions, pos].sort((a, b) => a - b);

                                        // If user is clicking a button, they likely want at least that one selected.
                                        // But allowed to toggle off to empty.
                                        onPulitoPositionsChange(newPos);
                                    }}
                                    className={`w-10 h-10 rounded-full font-bold text-sm transition-all ${isActive
                                        ? 'bg-cyan-500 text-black shadow-[0_0_10px_rgba(6,182,212,0.5)] scale-110'
                                        : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
                                        }`}
                                >
                                    {pos}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default TrackCategoryReel;
