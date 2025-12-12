
import React from 'react';
import { getTrackColorClasses } from '../utils/helpers';

interface TrackButtonProps {
    trackId: string;
    trackName: string;
    isSelected: boolean;
    onClick: () => void;
    isExpired: boolean;
    remainingTime: string | null;
    isDisabled?: boolean;
    pulitoPositions?: number[];
    onPulitoPositionClick?: (position: number) => void;
}

const TrackButton: React.FC<TrackButtonProps> = ({ trackId, trackName, isSelected, onClick, isExpired, remainingTime, isDisabled, pulitoPositions = [], onPulitoPositionClick }) => {
    const colorClasses = getTrackColorClasses(trackId);
    const isInteractive = trackId === 'Pulito';
    const finalDisabled = isDisabled;

    // --- GALACTIC 3D STYLE (COMPACT VERSION) ---
    const galacticBase = "group relative flex items-center justify-center rounded-lg text-white font-bold transition-all duration-150 ease-out h-11 w-full isolate";
    
    const galacticNormal = `
        transform hover:-translate-y-0.5
        border-t border-white/60 dark:border-white/30
        border-b-[4px] border-black/20 dark:border-black/50
        shadow-sm
        hover:shadow-md
    `;
    
    const galacticPressed = `
        translate-y-[4px] 
        border-b-0 
        shadow-inner
        ring-2 ring-offset-1 ring-offset-light-card dark:ring-offset-black ring-neon-cyan
    `;

    const glassOverlay = "absolute inset-0 rounded-lg bg-gradient-to-b from-white/30 via-transparent to-black/10 pointer-events-none";
    const disabledClasses = "opacity-50 cursor-not-allowed grayscale filter";

    let buttonClasses = "";
    let innerContentClasses = "z-10 flex items-center justify-center w-full px-1";

    // CRITICAL FIX: If selected, do NOT disable interactions, allowing user to deselect expired tracks
    const effectiveDisabled = finalDisabled && !isSelected;

    if (effectiveDisabled) {
        buttonClasses = `${galacticBase} ${colorClasses} ${disabledClasses} border-b-[2px] border-black/20 translate-y-[2px] shadow-none`;
    } else if (isSelected) {
         buttonClasses = `${galacticBase} ${colorClasses} ${galacticPressed} brightness-110`;
    } else {
         buttonClasses = `${galacticBase} ${colorClasses} ${galacticNormal} active:translate-y-[4px] active:border-b-0 active:shadow-none`;
    }

    if (isExpired) buttonClasses += " brightness-50 saturate-50";

    const renderStandardButton = () => (
        <button
            onClick={onClick}
            disabled={effectiveDisabled}
            className={buttonClasses}
            aria-label={`Select track: ${trackName}${isExpired ? ' (Closed)' : ''}${isDisabled ? ' (Disabled)' : ''}`}
            aria-pressed={isSelected}
        >
            <div className={glassOverlay}></div>
            
            <div className={innerContentClasses}>
                <span className="text-[11px] sm:text-xs text-center leading-none drop-shadow-md text-shadow-sm truncate w-full">{trackName}</span>
            </div>
            
            {/* Time/Status Badge - Bottom Right */}
            {remainingTime !== null && !isExpired && (
                <span className="absolute bottom-0.5 right-0.5 text-[9px] font-mono bg-black/70 px-1 rounded z-20 backdrop-blur-sm border border-white/10 shadow-sm leading-none">
                    {remainingTime}
                </span>
            )}

             {isExpired && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg z-20">
                    <span className="text-[10px] font-bold text-white/90 -rotate-12 border border-red-500 px-1 bg-red-900/50">CLOSED</span>
                </span>
            )}
            
            {/* Selection Indicator - Large Checkbox Style */}
            {isSelected && (
                 <div className="absolute top-0.5 right-0.5 w-4 h-4 bg-neon-cyan rounded-sm shadow-[0_0_6px_theme(colors.neon-cyan)] flex items-center justify-center z-20 animate-in zoom-in duration-200">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                 </div>
            )}
        </button>
    );

    const renderInteractiveButton = () => {
        const positions = pulitoPositions;
        const onPositionClick = onPulitoPositionClick;

        if (!isSelected) {
            return renderStandardButton();
        }

        return (
            <div
                onClick={onClick}
                className={`${buttonClasses} cursor-pointer relative block`}
                role="button"
                aria-pressed={true}
            >
                <div className={glassOverlay}></div>
                
                <div className="absolute top-1 left-1.5 z-10">
                    <span className="text-[10px] font-bold leading-none drop-shadow-md text-white/90">{trackName}</span>
                </div>

                <div className="absolute top-0.5 right-0.5 w-4 h-4 bg-neon-cyan rounded-sm shadow-[0_0_6px_theme(colors.neon-cyan)] flex items-center justify-center z-20">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>

                <div className="absolute bottom-1 left-0 w-full flex justify-center gap-0.5 z-20 px-0.5">
                    {[1, 2, 3, 4, 5, 6, 7].map(pos => {
                        const isPositionSelected = positions?.includes(pos);
                        return (
                            <button
                                key={pos}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onPositionClick?.(pos);
                                }}
                                className={`flex-1 h-5 text-[8px] sm:text-[9px] rounded-sm flex items-center justify-center font-bold transition-all duration-200 shadow-sm border ${
                                    isPositionSelected 
                                    ? 'bg-neon-cyan text-black border-neon-cyan shadow-[0_0_5px_theme(colors.neon-cyan)] z-30 scale-110' 
                                    : 'bg-black/40 text-white border-white/30 hover:bg-white/20'
                                }`}
                            >
                                {pos}
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    };

    return isInteractive ? renderInteractiveButton() : renderStandardButton();
};

export default TrackButton;
