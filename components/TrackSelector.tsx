import React, { useState, useMemo, useEffect } from 'react';
import { TRACK_CATEGORIES, CUTOFF_TIMES } from '../constants';
import { getTodayDateString } from '../utils/helpers';
import TrackButton from './TrackButton';
import { useSound } from '../hooks/useSound';

interface TrackSelectorProps {
  selectedTracks: string[];
  onSelectionChange: (selected: string[]) => void;
  selectedDates: string[];
  pulitoPositions: number[];
  onPulitoPositionsChange: (positions: number[]) => void;
}

const formatTime = (totalSeconds: number): string => {
    if (totalSeconds < 0) return "00:00:00";
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

// Pre-calculate ID sets with corrected Category Matching
// Matches "USA Regular States" and "USA New States"
const usaTrackIds = new Set(
    TRACK_CATEGORIES
        .filter(c => c.name.includes('USA')) 
        .flatMap(c => c.tracks.map(t => t.id))
);

// Matches "Santo Domingo"
const sdTrackIds = new Set(
    TRACK_CATEGORIES
        .find(c => c.name === 'Santo Domingo')
        ?.tracks.map(t => t.id) || []
);

const TrackSelector: React.FC<TrackSelectorProps> = ({ selectedTracks, onSelectionChange, selectedDates, pulitoPositions, onPulitoPositionsChange }) => {
    const [openCategory, setOpenCategory] = useState<string | null>(TRACK_CATEGORIES[0]?.name || null);
    const [now, setNow] = useState(new Date());
    const { playSound } = useSound();

    useEffect(() => {
        const timer = setInterval(() => {
            setNow(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const isTodaySelected = useMemo(() => selectedDates.includes(getTodayDateString()), [selectedDates]);

    // STRICT REGION LOGIC
    // Calculate active regions directly from the current selection
    const isAnyUsaSelected = useMemo(() => selectedTracks.some(id => usaTrackIds.has(id)), [selectedTracks]);
    const isAnySdSelected = useMemo(() => selectedTracks.some(id => sdTrackIds.has(id)), [selectedTracks]);

    const getTrackStatus = (trackId: string) => {
        const cutoff = CUTOFF_TIMES[trackId];
        if (!isTodaySelected || !cutoff) {
            return { isExpired: false, remainingTime: null };
        }
        
        const [hours, minutes] = cutoff.split(':').map(Number);
        const cutoffTime = new Date();
        cutoffTime.setHours(hours, minutes, 0, 0);
        
        const isExpired = now > cutoffTime;
        const remainingSeconds = Math.round((cutoffTime.getTime() - now.getTime()) / 1000);

        return {
            isExpired,
            remainingTime: isExpired ? null : formatTime(remainingSeconds),
        };
    };

    const handleTrackToggle = (trackId: string) => {
        playSound('click');
        let newSelection = [...selectedTracks];
        let newPulitoPositions = [...pulitoPositions];
        const isCurrentlySelected = newSelection.includes(trackId);

        // Identify the region of the clicked track
        const isClickingUsa = usaTrackIds.has(trackId);
        const isClickingSd = sdTrackIds.has(trackId);

        if (isCurrentlySelected) {
            newSelection = newSelection.filter(id => id !== trackId);
            if (trackId === 'Pulito') newPulitoPositions = [];
        } else {
            // Enforce Mutual Exclusivity on Selection
            if (isClickingUsa) {
                // If selecting a USA track, strictly remove ALL SD tracks
                newSelection = newSelection.filter(id => !sdTrackIds.has(id));
            }
            else if (isClickingSd) {
                // If selecting an SD track, strictly remove ALL USA tracks
                newSelection = newSelection.filter(id => !usaTrackIds.has(id));
            }

            newSelection.push(trackId);

            // Special logic for Pulito/Venezuela exclusivity
            if (trackId === 'Pulito') {
                newPulitoPositions = [1];
                const venezuelaIndex = newSelection.indexOf('Venezuela');
                if (venezuelaIndex > -1) newSelection.splice(venezuelaIndex, 1);
            }
            if (trackId === 'Venezuela') {
                const pulitoIndex = newSelection.indexOf('Pulito');
                if (pulitoIndex > -1) {
                    newSelection.splice(pulitoIndex, 1);
                    newPulitoPositions = [];
                }
            }
        }
        onSelectionChange(newSelection);
        onPulitoPositionsChange(newPulitoPositions);
    };

    const handlePulitoPositionToggle = (position: number) => {
        playSound('click');
        let newPositions = [...pulitoPositions];
        if (newPositions.includes(position)) {
            if (newPositions.length > 1) {
                newPositions = newPositions.filter(p => p !== position);
            }
        } else {
            newPositions.push(position);
        }
        onPulitoPositionsChange(newPositions.sort((a, b) => a - b));
    };

    const toggleCategory = (categoryName: string) => {
        playSound('pop');
        setOpenCategory(prev => prev === categoryName ? null : categoryName);
    };

    const isPulitoDisabled = selectedTracks.includes('Venezuela');
    const isVenezuelaDisabled = selectedTracks.includes('Pulito');

    return (
        <div className="bg-light-card dark:bg-dark-card p-4 rounded-xl shadow-lg animate-fade-in">
            <h2 className="font-bold text-lg mb-3">Select Tracks ({selectedTracks.length})</h2>
            <div className="space-y-3">
                {TRACK_CATEGORIES.map(category => {
                    const isCategoryOpen = openCategory === category.name;
                    const buttonClasses = `w-full flex justify-between items-center p-3 text-left font-bold transition-all duration-300 ease-in-out rounded-lg ${
                        isCategoryOpen
                        ? 'bg-light-surface dark:bg-dark-surface text-gray-800 dark:text-gray-200'
                        : 'bg-gradient-to-br from-neon-cyan to-neon-pink text-black shadow-md hover:shadow-lg hover:opacity-95'
                    }`;

                    return (
                        <div key={category.name}>
                            <button 
                                className={buttonClasses}
                                onClick={() => toggleCategory(category.name)}
                            >
                                <span>{category.name}</span>
                                <svg className={`w-5 h-5 transition-transform duration-300 ${isCategoryOpen ? 'rotate-180' : ''}`} data-lucide="chevron-down" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                            </button>
                            <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isCategoryOpen ? 'max-h-[1000px] mt-2' : 'max-h-0'}`}>
                                 <div className="p-2 grid grid-cols-3 sm:grid-cols-4 gap-2 bg-light-surface/50 dark:bg-dark-surface/50 rounded-lg">
                                    {category.tracks.map(track => {
                                        const { isExpired, remainingTime } = getTrackStatus(track.id);
                                        
                                        const isUsaTrack = usaTrackIds.has(track.id);
                                        const isSdTrack = sdTrackIds.has(track.id);
                                        
                                        // Lock logic based on calculated state
                                        let isDisabledByCategory = false;
                                        
                                        // If any USA selected, disable SD tracks
                                        if (isAnyUsaSelected && isSdTrack) isDisabledByCategory = true;
                                        
                                        // If any SD selected, disable USA tracks
                                        if (isAnySdSelected && isUsaTrack) isDisabledByCategory = true;

                                        const isDisabled = isExpired || 
                                                           (track.id === 'Pulito' && isPulitoDisabled) || 
                                                           (track.id === 'Venezuela' && isVenezuelaDisabled) ||
                                                           isDisabledByCategory;

                                        return (
                                           <TrackButton
                                                key={track.id}
                                                trackId={track.id}
                                                trackName={track.name}
                                                isSelected={selectedTracks.includes(track.id)}
                                                onClick={() => handleTrackToggle(track.id)}
                                                isExpired={isExpired}
                                                isDisabled={isDisabled}
                                                remainingTime={remainingTime}
                                                pulitoPositions={track.id === 'Pulito' ? pulitoPositions : undefined}
                                                onPulitoPositionClick={track.id === 'Pulito' ? handlePulitoPositionToggle : undefined}
                                           />
                                    )})}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default TrackSelector;