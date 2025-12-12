import React from 'react';

interface TotalDisplayProps {
  baseTotal: number;
  trackMultiplier: number;
  dateMultiplier: number;
  grandTotal: number;
}

const TotalDisplay: React.FC<TotalDisplayProps> = ({ baseTotal, trackMultiplier, dateMultiplier, grandTotal }) => {
    return (
        <div className="bg-gradient-to-br from-neon-cyan to-neon-pink p-1 rounded-xl shadow-lg animate-fade-in">
            <div className="bg-light-card dark:bg-dark-card rounded-lg p-4 space-y-2">
                <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                    <span>Base Total: ${baseTotal.toFixed(2)}</span>
                    <span>Tracks: x{trackMultiplier}</span>
                    <span>Days: x{dateMultiplier}</span>
                </div>
                <div className="flex justify-between items-center border-t border-dashed pt-2 border-gray-300 dark:border-gray-600">
                    <h3 className="font-bold text-lg uppercase">Grand Total</h3>
                    <div 
                        key={grandTotal}
                        className={`text-2xl font-bold transition-transform duration-300 ease-out animate-pulse`}
                    >
                        ${grandTotal.toFixed(2)}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TotalDisplay;