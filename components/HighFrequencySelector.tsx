import React, { useState, useEffect, useMemo, useRef } from 'react';
import Reel3D from './Reel3D';
import { useSound } from '../hooks/useSound';

interface HighFrequencySelectorProps {
    selectedTracks: string[];
    onSelectionChange: (selected: string[]) => void;
}

const GAMES = [
    { label: 'Top Pick', value: 'special/top-pick', color: 'bg-green-500' },
    { label: 'Instant Cash', value: 'special/instant-cash', color: 'bg-yellow-500' }
];

const HighFrequencySelector: React.FC<HighFrequencySelectorProps> = ({ selectedTracks, onSelectionChange }) => {
    const { playSound } = useSound();

    // Parse initial state from selectedTracks
    // Format expected: "special/top-pick" OR "special/top-pick/10:00 AM" (if we want time specific)
    // For now, the track ID in constants.ts is just the base ID "special/top-pick".
    // BUT the user wants to select specific times.
    // If constants.ts only has the base ID, verify logic in TrackSelector might need exact match?
    // TrackSelector uses `usaTrackIds` etc. which are derived from constants.
    // If we generate a dynamic ID like "special/top-pick/10:00 AM", it won't match the known list.
    // However, the TrackSelector passes whatever string we give it up to the parent App/Ticket.
    // The Ticket component likely just displays the name. 
    // We should ensure the "name" can be resolved.
    // Actually, simply passing a dynamic ID is fine as long as the backend just stores it.
    // The UI display on ticket might be raw ID if not in constants map. 

    // Internal State
    const [selectedGame, setSelectedGame] = useState<string>(GAMES[0].value);
    const [selectedTime, setSelectedTime] = useState<string>("");

    // Initialize from props if exists
    useEffect(() => {
        const currentId = selectedTracks.find(t => t.includes('special/top-pick') || t.includes('special/instant-cash'));
        if (currentId) {
            // Check if it has time part? 
            // e.g. "special/top-pick/10:00 AM"
            if (currentId.includes('/')) {
                // Split carefully. Base IDs also have slashes.
                // special/top-pick has 1 slash.
                // Extended: special/top-pick/10:00 AM matches?
                // Actually the base ID is 'special/top-pick'. it has 1 slash.
                // So if we split by '/'
                // [special, top-pick] length 2.
                // [special, top-pick, 10:00 AM] length 3.

                const parts = currentId.split('/');
                if (parts.length >= 3) {
                    const gameId = parts[0] + '/' + parts[1];
                    const timePart = parts.slice(2).join('/'); // In case time has slashes? usually just "10:00 AM"
                    setSelectedGame(gameId);
                    setSelectedTime(timePart);
                } else {
                    // Just base ID selected
                    setSelectedGame(currentId);
                }
            }
        } else {
            // Default?
            // Maybe select nothing internally until user interacts?
            // Or default to first.
        }
    }, []); // Run once on mount? Or dependent on selectedTracks?
    // If selectedTracks changes externally (e.g. clear all), we should reflect that.
    useEffect(() => {
        if (selectedTracks.length === 0) {
            // Reset?
            // Keep reels where they are but "deselect"? 
            // We'll leave them.
        }
    }, [selectedTracks]);

    // Generate Times
    const timeOptions = useMemo(() => {
        const times = [];
        const isInstantCash = selectedGame === 'special/instant-cash';

        if (isInstantCash) {
            // Instant Cash: 10:00 AM to 10:00 PM (Start 10, End 22), 30 min intervals
            // "El primero es a las 10 am y el ultimo resulta ser a las 10p.m"
            const startHour = 10;
            const endHour = 22;

            for (let h = startHour; h <= endHour; h++) {
                const period = h < 12 ? 'AM' : 'PM';
                const displayH = h <= 12 ? h : h - 12;
                const hourStr = displayH === 0 ? 12 : displayH;

                // :00
                times.push(`${hourStr}:00 ${period}`);

                // :30 (Only if not the very last hour if strict? User said "ultimo es 10pm", implies 10:30 is NOT valid)
                // If h == 22 (10 PM), we include 10:00 PM. Do we include 10:30 PM?
                // User said "ultimo es a las 10p.m". So exclude 10:30 PM.
                if (h < endHour) {
                    times.push(`${hourStr}:30 ${period}`);
                }
            }
        } else {
            // Top Pick: 24 Hours (12 AM to 11 PM), Hourly
            // "Las 24 horas del dia, desde las 12 am hast las 11p.m"
            for (let h = 0; h <= 23; h++) {
                const period = h < 12 ? 'AM' : 'PM';
                const displayH = h % 12 === 0 ? 12 : h % 12;

                times.push(`${displayH}:00 ${period}`);
            }
        }
        return times.map(t => ({ label: t, value: t }));
    }, [selectedGame]);

    // Auto-select first time if current time invalid for new game
    useEffect(() => {
        const valid = timeOptions.some(t => t.value === selectedTime);
        if (!valid && timeOptions.length > 0) {
            // Try to find closest time to "Now"?
            // For now just pick the first one or stay empty
            setSelectedTime(timeOptions[0].value);
        }
    }, [timeOptions, selectedTime]);


    const handleGameChange = (val: string) => {
        playSound('click');
        setSelectedGame(val);
        // Time options will update, effect above will fix time selection
    };

    const handleTimeChange = (val: string) => {
        playSound('click');
        setSelectedTime(val);

        // IMMEDIATE UPDATE to Parent
        // Validate we have a game and time
        if (selectedGame && val) {
            const fullId = `${selectedGame}/${val}`;
            // Exclusive selection logic happens in parent, but here we just emit THIS selection.
            // Wait, parent expects an ARRAY.
            // If we want to replace current HF selection or append?
            // Usually TrackSelector handles exclusivity categories.
            // We just call onSelectionChange([fullId]).
            // The parent will replace the previous selection list with this new list.
            onSelectionChange([fullId]);
        }
    };

    return (
        <div className="grid grid-cols-2 gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-700">
            {/* GAME REEL */}
            <div className="relative">
                <div className="text-center text-xs text-cyan-400 font-bold mb-2 tracking-widest uppercase">
                    GAME
                </div>
                <Reel3D
                    label=""
                    height={180}
                    itemHeight={50}
                    items={GAMES}
                    selectedValue={selectedGame}
                    onChange={handleGameChange}
                />
            </div>

            {/* TIME REEL */}
            <div className="relative">
                <div className="text-center text-xs text-cyan-400 font-bold mb-2 tracking-widest uppercase">
                    DRAW TIME
                </div>
                <Reel3D
                    label=""
                    height={180}
                    itemHeight={50}
                    items={timeOptions}
                    selectedValue={selectedTime}
                    onChange={handleTimeChange}
                />
            </div>

            <div className="col-span-2 text-center mt-2">
                <div className="text-xs text-gray-500">
                    Selected: <span className="text-cyan-300 font-mono font-bold">{selectedGame === 'special/instant-cash' ? 'Instant Cash' : 'Top Pick'} @ {selectedTime}</span>
                </div>
            </div>
        </div>
    );
};

export default HighFrequencySelector;
