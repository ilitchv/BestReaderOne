import React, { useRef, useEffect } from 'react';
import type { Play } from '../types';
import { MAX_PLAYS, WAGER_LIMITS, GAME_MODE_LENGTHS, TERMINAL_GAME_MODES } from '../constants';
import { calculateRowTotal, determineGameMode, isRepetitiveNumber } from '../utils/helpers';

interface PlaysTableProps {
  plays: Play[];
  updatePlay: (id: number, updatedPlay: Partial<Play>) => void;
  deletePlay: (id: number) => void;
  selectedPlayIds: number[];
  setSelectedPlayIds: (ids: number[]) => void;
  onCopyWagers: (play: Play) => void;
  lastAddedPlayId: number | null;
  focusAddPlayButton: () => void;
  selectedTracks: string[];
  pulitoPositions: number[];
}

const PlaysTable: React.FC<PlaysTableProps> = ({ 
    plays, updatePlay, deletePlay, selectedPlayIds, setSelectedPlayIds, onCopyWagers,
    lastAddedPlayId, focusAddPlayButton, selectedTracks, pulitoPositions
}) => {
  const inputsRef = useRef<{ [id: number]: { [key: string]: HTMLInputElement | null } }>({});
  const rowRefs = useRef<{ [id: number]: HTMLTableRowElement | null }>({});

  // Effect for auto-focusing and auto-scrolling on a new play
  useEffect(() => {
    if (lastAddedPlayId) {
        const timeout = setTimeout(() => {
            const inputElement = inputsRef.current[lastAddedPlayId]?.betNumber;
            const rowElement = rowRefs.current[lastAddedPlayId];
            
            if (rowElement) {
                const rect = rowElement.getBoundingClientRect();
                const isVisible = rect.top >= 0 && rect.bottom <= window.innerHeight;
                if (!isVisible) {
                    rowElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }
            if (inputElement) {
                inputElement.focus();
                inputElement.select();
            }
        }, 100);
        return () => clearTimeout(timeout);
    }
  }, [lastAddedPlayId]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedPlayIds(plays.map(p => p.id));
    } else {
      setSelectedPlayIds([]);
    }
  };

  const handleSelectRow = (id: number) => {
    if (selectedPlayIds.includes(id)) {
      setSelectedPlayIds(selectedPlayIds.filter(playId => playId !== id));
    } else {
      setSelectedPlayIds([...selectedPlayIds, id]);
    }
  };

  const handleInputChange = (id: number, field: keyof Play, value: string | number | null) => {
    updatePlay(id, { [field]: value });

    // Auto-tab from Bet Number ONLY on terminal game modes with exact length matches
    if (field === 'betNumber' && typeof value === 'string') {
        const gameMode = determineGameMode(value, selectedTracks, pulitoPositions);
        const expectedLength = GAME_MODE_LENGTHS[gameMode];
        
        if (TERMINAL_GAME_MODES.includes(gameMode) && expectedLength && value.length === expectedLength) {
            inputsRef.current[id]?.straightAmount?.focus();
        }
    }
  };

  const focusNextEmptyRowOrAddButton = (currentPlayId: number) => {
    const currentIndex = plays.findIndex(p => p.id === currentPlayId);

    if (currentIndex > -1 && currentIndex < plays.length - 1) {
        // Search for the next play that has an empty betNumber
        const nextEmptyPlay = plays.slice(currentIndex + 1).find(p => !p.betNumber.trim());
        if (nextEmptyPlay) {
            const inputToFocus = inputsRef.current[nextEmptyPlay.id]?.betNumber;
            if (inputToFocus) {
                inputToFocus.focus();
                return; // Stop here
            }
        }
    }

    // If no empty row is found, or we are on the last row, focus the add button
    focusAddPlayButton();
  };
  
  const handleNavigation = (e: React.KeyboardEvent, playId: number, currentField: 'betNumber' | 'straightAmount' | 'boxAmount' | 'comboAmount') => {
      const currentIndex = plays.findIndex(p => p.id === playId);
      const isLastPlay = currentIndex === plays.length - 1;

      // 1. Handle ENTER (Convenience Logic)
      if (e.key === 'Enter') {
          e.preventDefault();
          const fieldOrder: ('betNumber' | 'straightAmount' | 'boxAmount' | 'comboAmount')[] = ['betNumber', 'straightAmount', 'boxAmount', 'comboAmount'];
          
          if (currentField === 'comboAmount') {
              focusNextEmptyRowOrAddButton(playId);
              return;
          }
          
          const fieldIndex = fieldOrder.indexOf(currentField);
          // Try to focus next field in same row
          for (let i = fieldIndex + 1; i < fieldOrder.length; i++) {
            const nextField = fieldOrder[i];
            const nextInput = inputsRef.current[playId]?.[nextField];
            if (nextInput && !nextInput.disabled) {
                nextInput.focus();
                return;
            }
          }
          // End of row
          focusNextEmptyRowOrAddButton(playId);
          return;
      }

      // 2. Handle TAB (Grand Loop Logic)
      if (e.key === 'Tab' && !e.shiftKey) {
          // Only intervene if we are at the very end of the list
          if (isLastPlay && currentField === 'comboAmount') {
              e.preventDefault();
              // THE GRAND LOOP: Jump back to the Date Picker
              document.getElementById('main-date-picker-btn')?.focus();
          }
          // Otherwise, let Tab behave naturally (traverse row by row)
      }
  };
  
  const renderInput = (play: Play, field: 'straightAmount' | 'boxAmount' | 'comboAmount') => {
    // 1. Check for Single Action (1 digit)
    const isSingleAction = play.gameMode.startsWith('Single Action');
    
    // 2. Check for Repetitive Numbers (Doubles, Triples, Quads like 22, 777, 5555)
    // Using the helper defined in utils
    const isRepetitive = isRepetitiveNumber(play.betNumber);

    // 3. Define Disabled Logic
    let isDisabled = false;

    if (field === 'boxAmount') {
        // Box disabled for Single Action OR Repetitive Numbers (Box of 22 is just 22)
        isDisabled = isSingleAction || isRepetitive;
    } else if (field === 'comboAmount') {
        // Combo disabled for Single Action OR Repetitive Numbers
        // (Allowed for Mixed Pairs e.g. 12, disabled for 22)
        isDisabled = isSingleAction || isRepetitive;
    }

    // Always disabled if no game mode detected
    if (play.gameMode === '-') isDisabled = true;

    // --- Original Logic for Limits ---
    let gameModeForLimits = play.gameMode;
    if (gameModeForLimits.startsWith('Pulito')) {
        gameModeForLimits = 'Pulito';
    }

    const limits = WAGER_LIMITS[gameModeForLimits];
    const limitKey = field.replace('Amount', '') as 'straight' | 'box' | 'combo';
    const limit = limits ? limits[limitKey] : null;

    const currentValue = play[field] ?? 0;
    const isOverLimit = limit !== null && currentValue > limit;

    const baseClasses = "w-full bg-light-surface dark:bg-dark-surface p-1.5 rounded-md border-2 text-center text-gray-900 dark:text-gray-200 focus:outline-none transition-colors";
    const borderClasses = isOverLimit 
        ? 'border-red-500' 
        : 'border-transparent focus:border-neon-cyan';
    
    // Grey out if disabled to give visual feedback
    const disabledClasses = isDisabled ? "opacity-30 cursor-not-allowed bg-gray-200 dark:bg-gray-800" : "";
    
    const tooltipText = isOverLimit && limit !== null ? `Max wager is $${limit.toFixed(2)}` : '';

    return (
        <input
            ref={el => { if (!inputsRef.current[play.id]) inputsRef.current[play.id] = {}; inputsRef.current[play.id][field] = el; }}
            type="number"
            value={play[field] ?? ''}
            onChange={(e) => handleInputChange(play.id, field, e.target.value === '' ? null : +e.target.value)}
            onKeyDown={(e) => handleNavigation(e, play.id, field)}
            className={`${baseClasses} ${borderClasses} ${disabledClasses}`}
            placeholder="$"
            min="0"
            max={limit ?? undefined}
            disabled={isDisabled}
            title={tooltipText}
        />
    );
  };

  return (
    <div className="bg-light-card dark:bg-dark-card p-4 rounded-xl shadow-lg animate-fade-in">
      <h2 className="font-bold text-lg mb-3">Plays ({plays.length} / {MAX_PLAYS})</h2>
      <div className="overflow-x-auto max-h-[50vh] overflow-y-auto">
        <table className="w-full text-sm text-left">
          <thead className="sticky top-0 bg-light-card dark:bg-dark-card z-10">
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="p-2 w-10">
                <input
                  type="checkbox"
                  onChange={handleSelectAll}
                  checked={selectedPlayIds.length > 0 && selectedPlayIds.length === plays.length}
                  className="w-4 h-4 rounded text-neon-cyan bg-gray-300 border-gray-400 focus:ring-neon-cyan focus:ring-2"
                />
              </th>
              <th className="p-2 text-gray-500 dark:text-gray-400 uppercase text-xs font-semibold">#</th>
              <th className="p-2 min-w-[75px] text-gray-500 dark:text-gray-400 uppercase text-xs font-semibold">
                  <span className="hidden sm:inline">Bet Number</span>
                  <span className="sm:hidden">Bet</span>
              </th>
              <th className="p-2 text-gray-500 dark:text-gray-400 uppercase text-xs font-semibold">Mode</th>
              <th className="p-2 min-w-[65px] text-gray-500 dark:text-gray-400 uppercase text-xs font-semibold">
                  <span className="hidden sm:inline">Straight</span>
                  <span className="sm:hidden">Str</span>
              </th>
              <th className="p-2 min-w-[65px] text-gray-500 dark:text-gray-400 uppercase text-xs font-semibold">Box</th>
              <th className="p-2 min-w-[65px] text-gray-500 dark:text-gray-400 uppercase text-xs font-semibold">
                   <span className="hidden sm:inline">Combo</span>
                  <span className="sm:hidden">Com</span>
              </th>
              <th className="p-2 text-right text-gray-500 dark:text-gray-400 uppercase text-xs font-semibold">Total</th>
              <th className="p-2 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {plays.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center p-8 text-gray-500">
                  No plays added yet. Use the action buttons to add some!
                </td>
              </tr>
            ) : (
              plays.map((play, index) => {
                const isInvalid = !play.betNumber.trim() || play.gameMode === '-' || calculateRowTotal(play.betNumber, play.gameMode, play.straightAmount, play.boxAmount, play.comboAmount) <= 0;
                return (
                <tr key={play.id} ref={el => { rowRefs.current[play.id] = el; }} className={`border-b border-gray-200 dark:border-gray-700 last:border-b-0 hover:bg-light-surface/50 dark:hover:bg-dark-surface/50 transition-colors ${isInvalid ? 'bg-red-500/10' : ''}`}>
                  <td className="p-2">
                    <input
                      type="checkbox"
                      checked={selectedPlayIds.includes(play.id)}
                      onChange={() => handleSelectRow(play.id)}
                      className="w-4 h-4 rounded text-neon-cyan bg-gray-300 border-gray-400 focus:ring-neon-cyan focus:ring-2"
                    />
                  </td>
                  <td className="p-2 text-gray-500">{index + 1}</td>
                  <td className="p-2">
                    <input
                      ref={el => { if (!inputsRef.current[play.id]) inputsRef.current[play.id] = {}; inputsRef.current[play.id].betNumber = el; }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9xX\-]*"
                      value={play.betNumber}
                      onChange={(e) => handleInputChange(play.id, 'betNumber', e.target.value)}
                      onKeyDown={(e) => handleNavigation(e, play.id, 'betNumber')}
                      className="w-full bg-light-surface dark:bg-dark-surface p-1.5 rounded-md border-2 border-transparent focus:border-neon-cyan focus:outline-none text-gray-900 dark:text-gray-200"
                      placeholder="e.g. 123"
                    />
                  </td>
                  <td className="p-2 font-mono text-xs text-gray-700 dark:text-gray-300">
                    {play.gameMode === 'Single Action' ? 'Sing. Act.' : play.gameMode}
                  </td>
                  <td className="p-2">{renderInput(play, 'straightAmount')}</td>
                  <td className="p-2">{renderInput(play, 'boxAmount')}</td>
                  <td className="p-2">{renderInput(play, 'comboAmount')}</td>
                  <td className="p-1 text-right">
                    <button
                        onClick={() => onCopyWagers(play)}
                        className="w-full h-full p-1.5 rounded-md font-bold text-center hover:bg-neon-cyan/20 dark:hover:bg-neon-cyan/10 transition-colors flex items-center justify-center gap-2 group text-gray-900 dark:text-gray-200"
                        title="Copy wagers from this row"
                    >
                        <span>${calculateRowTotal(play.betNumber, play.gameMode, play.straightAmount, play.boxAmount, play.comboAmount).toFixed(2)}</span>
                        <svg data-lucide="copy" className="w-3 h-3 text-gray-400 dark:text-gray-500 group-hover:text-neon-cyan transition-colors" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                    </button>
                  </td>
                  <td className="p-1 text-center align-middle">
                    <button 
                        onClick={() => deletePlay(play.id)} 
                        className="p-1.5 rounded-md text-red-500 hover:bg-red-500/10 hover:text-red-400 transition-all flex items-center justify-center mx-auto"
                        title="Delete Row"
                    >
                      <svg data-lucide="x-circle" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
                    </button>
                  </td>
                </tr>
              )})
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PlaysTable;