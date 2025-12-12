
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Header from './components/Header';
import TrackSelector from './components/TrackSelector';
import DatePicker from './components/DatePicker';
import PlaysTable from './components/PlaysTable';
import TotalDisplay from './components/TotalDisplay';
import ActionsPanel from './components/ActionsPanel';
import OcrModal from './components/OcrModal';
import WizardModal from './components/WizardModal';
import ChatbotModal from './components/ChatbotModal';
import TicketModal from './components/TicketModal';
import CalculatorModal from './components/CalculatorModal';
import ValidationErrorModal from './components/ValidationErrorModal';
import { getTodayDateString, calculateRowTotal, fileToBase64, determineGameMode } from './utils/helpers';
import { interpretTicketImage, interpretNaturalLanguagePlays } from './services/geminiService';
import type { Play, WizardPlay, ImageInterpretationResult, CopiedWagers, ServerHealth, TicketData } from './types';
import { MAX_PLAYS } from './constants';
import { localDbService } from './services/localDbService';
import { useSound } from './hooks/useSound';
import { useAuth } from './contexts/AuthContext';

interface PlaygroundAppProps {
    onClose: () => void;
    onHome?: () => void;
    language: 'en' | 'es' | 'ht';
    initialTicket?: TicketData | null;
}

// Storage Keys
const STORAGE_KEYS = {
    PLAYS: 'br_plays_state',
    TRACKS: 'br_tracks_state',
    DATES: 'br_dates_state',
    PULITO: 'br_pulito_state'
};

const PlaygroundApp: React.FC<PlaygroundAppProps> = ({ onClose, onHome, language, initialTicket }) => {
    // --- AUTH CONTEXT ---
    const { user } = useAuth();

    // --- STATE INITIALIZATION WITH PERSISTENCE ---
    const [plays, setPlays] = useState<Play[]>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEYS.PLAYS);
            return saved ? JSON.parse(saved) : [];
        } catch (e) { return []; }
    });

    const [selectedTracks, setSelectedTracks] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEYS.TRACKS);
            return saved ? JSON.parse(saved) : [];
        } catch (e) { return []; }
    });

    const [selectedDates, setSelectedDates] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEYS.DATES);
            return saved ? JSON.parse(saved) : [getTodayDateString()];
        } catch (e) { return [getTodayDateString()]; }
    });

    const [pulitoPositions, setPulitoPositions] = useState<number[]>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEYS.PULITO);
            return saved ? JSON.parse(saved) : [];
        } catch (e) { return []; }
    });
    
    // --- PLAYBACK INITIALIZATION ---
    useEffect(() => {
        if (initialTicket) {
            // Overwrite state with ticket data
            setPlays(initialTicket.plays);
            setSelectedTracks(initialTicket.tracks);
            setSelectedDates(initialTicket.betDates);
            // Reset others
            setPulitoPositions([]); // Ticket data doesn't explicitly store pulito pos array, could infer but reset is safer
            setTicketNumber(''); // New ticket generated from playback
            setIsTicketConfirmed(false);
        }
    }, [initialTicket]);

    const [selectedPlayIds, setSelectedPlayIds] = useState<number[]>([]);
    const [lastAddedPlayId, setLastAddedPlayId] = useState<number | null>(null);
    const [copiedWagers, setCopiedWagers] = useState<CopiedWagers | null>(null);
    
    // Modals
    const [isOcrOpen, setIsOcrOpen] = useState(false);
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [isChatbotOpen, setIsChatbotOpen] = useState(false);
    const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
    const [isValidationErrorOpen, setIsValidationErrorOpen] = useState(false);
    const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);

    // Ticket State
    const [ticketNumber, setTicketNumber] = useState('');
    const [isTicketConfirmed, setIsTicketConfirmed] = useState(false);
    const [ticketImageBlob, setTicketImageBlob] = useState<Blob | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaveStatus, setLastSaveStatus] = useState<'success' | 'error' | null>(null);
    const [serverHealth, setServerHealth] = useState<ServerHealth>('checking');

    // Theme (Passed to Header)
    const [theme, setTheme] = useState<'light' | 'dark'>('dark');
    const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

    // Sound Hook
    const { isMuted, toggleMute } = useSound();

    // Sync theme with document
    useEffect(() => {
        const root = document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
    }, [theme]);

    // --- PERSISTENCE EFFECTS ---
    useEffect(() => { localStorage.setItem(STORAGE_KEYS.PLAYS, JSON.stringify(plays)); }, [plays]);
    useEffect(() => { localStorage.setItem(STORAGE_KEYS.TRACKS, JSON.stringify(selectedTracks)); }, [selectedTracks]);
    useEffect(() => { localStorage.setItem(STORAGE_KEYS.DATES, JSON.stringify(selectedDates)); }, [selectedDates]);
    useEffect(() => { localStorage.setItem(STORAGE_KEYS.PULITO, JSON.stringify(pulitoPositions)); }, [pulitoPositions]);

    // --- REACTIVE GAME MODE UPDATE ---
    // This ensures if user selects 'Pulito' track, existing 'Pick 2' plays update automatically
    useEffect(() => {
        setPlays(currentPlays => {
            let hasChanges = false;
            const updatedPlays = currentPlays.map(p => {
                const newMode = determineGameMode(p.betNumber, selectedTracks, pulitoPositions);
                if (newMode !== '-' && newMode !== p.gameMode) {
                    hasChanges = true;
                    return { ...p, gameMode: newMode };
                }
                return p;
            });
            return hasChanges ? updatedPlays : currentPlays;
        });
    }, [selectedTracks, pulitoPositions]);

    const addPlayButtonRef = useRef<HTMLButtonElement>(null);

    // Initial Server Health Check
    useEffect(() => {
        const checkHealth = async () => {
            try {
                const res = await fetch('/api/health');
                if (res.ok) setServerHealth('online');
                else setServerHealth('offline');
            } catch {
                setServerHealth('offline');
            }
        };
        checkHealth();
    }, []);

    const handleAddPlay = useCallback(() => {
        if (plays.length >= MAX_PLAYS) return;
        const newId = Date.now();
        const newPlay: Play = {
            id: newId,
            betNumber: '',
            gameMode: 'Pick 3',
            straightAmount: null,
            boxAmount: null,
            comboAmount: null
        };
        setPlays(prev => [...prev, newPlay]);
        setLastAddedPlayId(newId);
    }, [plays.length]);

    const handleDeleteSelected = () => {
        if (selectedPlayIds.length === 0) return;
        setPlays(prev => prev.filter(p => !selectedPlayIds.includes(p.id)));
        setSelectedPlayIds([]);
    };

    const handleReset = () => {
        // Clear State
        setPlays([]);
        setSelectedTracks([]);
        setPulitoPositions([]);
        setSelectedDates([getTodayDateString()]);
        setSelectedPlayIds([]);
        setTicketNumber('');
        setIsTicketConfirmed(false);
        setTicketImageBlob(null);
        setCopiedWagers(null);
        setLastAddedPlayId(null);
        setLastSaveStatus(null);
        setValidationErrors([]);
        setIsValidationErrorOpen(false);

        // Clear Storage
        localStorage.removeItem(STORAGE_KEYS.PLAYS);
        localStorage.removeItem(STORAGE_KEYS.TRACKS);
        localStorage.removeItem(STORAGE_KEYS.DATES);
        localStorage.removeItem(STORAGE_KEYS.PULITO);
    };

    const updatePlay = (id: number, updatedPlay: Partial<Play>) => {
        setPlays(prev => prev.map(p => {
            if (p.id !== id) return p;
            
            const merged = { ...p, ...updatedPlay };
            
            // Auto-detect game mode if betNumber changed
            if (updatedPlay.betNumber !== undefined) {
                const mode = determineGameMode(updatedPlay.betNumber, selectedTracks, pulitoPositions);
                if (mode !== '-') merged.gameMode = mode;
            }
            return merged;
        }));
    };

    const deletePlay = (id: number) => {
        setPlays(prev => prev.filter(p => p.id !== id));
        setSelectedPlayIds(prev => prev.filter(pid => pid !== id));
    };

    const handleCopyWagers = (play: Play) => {
        setCopiedWagers({
            straightAmount: play.straightAmount,
            boxAmount: play.boxAmount,
            comboAmount: play.comboAmount
        });
    };

    const handlePasteWagers = () => {
        if (!copiedWagers || selectedPlayIds.length === 0) return;
        setPlays(prev => prev.map(p => {
            if (selectedPlayIds.includes(p.id)) {
                return { ...p, ...copiedWagers };
            }
            return p;
        }));
    };

    // --- IMPORT HANDLERS ---
    const handleAddOcrResults = (result: ImageInterpretationResult) => {
        const newPlays = result.plays.map(p => ({
            id: Date.now() + Math.random(),
            betNumber: p.betNumber,
            gameMode: determineGameMode(p.betNumber, selectedTracks, pulitoPositions) !== '-' ? determineGameMode(p.betNumber, selectedTracks, pulitoPositions) : 'Pick 3',
            straightAmount: p.straightAmount,
            boxAmount: p.boxAmount,
            comboAmount: p.comboAmount
        }));
        
        if (result.detectedDate) {
            if (!selectedDates.includes(result.detectedDate)) {
                setSelectedDates(prev => [...prev, result.detectedDate!].sort());
            }
        }
        
        setPlays(prev => [...prev, ...newPlays]);
    };

    const handleAddWizardPlays = (wizardPlays: WizardPlay[]) => {
        const newPlays = wizardPlays.map(p => ({
            id: Date.now() + Math.random(),
            betNumber: p.betNumber,
            gameMode: p.gameMode,
            straightAmount: p.straight,
            boxAmount: p.box,
            comboAmount: p.combo
        }));
        setPlays(prev => [...prev, ...newPlays]);
        setIsWizardOpen(false);
    };

    // --- TICKET GENERATION ---
    const handleGenerateTicket = () => {
        const errors: string[] = [];
        if (selectedTracks.length === 0) errors.push("Select at least one track.");
        if (selectedDates.length === 0) errors.push("Select at least one date.");
        if (plays.length === 0) errors.push("Add at least one play.");
        
        const validPlays = plays.filter(p => 
            p.betNumber && p.gameMode !== '-' && 
            calculateRowTotal(p.betNumber, p.gameMode, p.straightAmount, p.boxAmount, p.comboAmount) > 0
        );
        
        // Validation Checks
        plays.forEach((p, idx) => {
            // 1. Single Action Generic Check
            if (p.gameMode === 'Single Action') {
                errors.push(`Play #${idx + 1}: Single Action requires specific positions. Select 'Pulito' and at least one position (1-7).`);
            }

            // 2. Pulito 2-digit position check
            if (p.betNumber.length === 2 && selectedTracks.includes('Pulito') && pulitoPositions.length > 0) {
                const invalidPositions = pulitoPositions.filter(pos => pos > 4);
                if (invalidPositions.length > 0) {
                    errors.push(`Play #${idx + 1}: 2-digit plays (Pulito) are restricted to positions 1-4.`);
                }
            }

            // 3. Block "Pick 2" temporary mode
            if (p.gameMode === 'Pick 2') {
                errors.push(`Play #${idx + 1}: "Pick 2" is a temporary mode. Please select 'Venezuela' or 'Pulito' track to define the specific game type.`);
            }
        });

        // 4. Horses vs Venezuela Incompatibility Check
        if (selectedTracks.includes('New York Horses') && plays.some(p => p.gameMode === 'Venezuela')) {
            errors.push("Error: El track 'New York Horses' no admite jugadas tipo 'Venezuela'. Por favor elimine las jugadas de Venezuela o deseleccione Horses.");
        }
        
        if (validPlays.length === 0 && plays.length > 0) errors.push("No valid plays found (check amounts or bet numbers).");

        if (errors.length > 0) {
            setValidationErrors(errors);
            setIsValidationErrorOpen(true);
            return;
        }

        if (validPlays.length < plays.length) {
            if(!confirm(`Found ${plays.length - validPlays.length} invalid plays. Proceed with only valid plays?`)) return;
        }
        
        setIsTicketModalOpen(true);
    };

    const handleSaveTicketToDb = async (ticketData: any) => {
        setIsSaving(true);
        setLastSaveStatus(null);
        
        // --- OPTIMIZATION: Remove Image for DB Storage ---
        // We create a lightweight payload without the Base64 image string to save space/bandwidth
        const { ticketImage, ...ticketDataForDb } = ticketData;

        // INJECT USER ID (Or 'guest-session' if null)
        const finalTicketData = {
            ...ticketDataForDb,
            userId: user ? user.id : 'guest-session'
        };

        // Save locally (redundancy) - also lightweight
        localDbService.saveTicket(finalTicketData);

        try {
            const res = await fetch('/api/tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(finalTicketData)
            });
            if (res.ok) {
                setLastSaveStatus('success');
            } else {
                setLastSaveStatus('error');
            }
        } catch (error) {
            console.error("Save failed", error);
            setLastSaveStatus('error');
        } finally {
            setIsSaving(false);
        }
    };

    // Calculate totals
    const baseTotal = plays.reduce((sum, p) => sum + calculateRowTotal(p.betNumber, p.gameMode, p.straightAmount, p.boxAmount, p.comboAmount), 0);
    
    // Grand Total Logic Refinement for Single Action
    let effectiveTrackCount = selectedTracks.length;
    
    const isSingleActionPresent = plays.some(p => p.gameMode.startsWith('Single Action'));
    const isPulitoSelected = selectedTracks.includes('Pulito');
    const otherUsaTracksCount = selectedTracks.filter(t => t !== 'Pulito' && t !== 'Venezuela').length;

    if (isSingleActionPresent && isPulitoSelected && otherUsaTracksCount > 0) {
        effectiveTrackCount -= 1; // Discount Pulito as it's acting as position modifier
    }

    const trackMultiplier = Math.max(1, effectiveTrackCount);
    const grandTotal = baseTotal * trackMultiplier * Math.max(1, selectedDates.length);

    return (
        <div className="min-h-screen bg-light-bg dark:bg-dark-bg text-gray-900 dark:text-gray-100 flex flex-col transition-colors duration-300">
            <Header theme={theme} toggleTheme={toggleTheme} onClose={onClose} onHome={onHome} />
            
            <main className="flex-grow p-2 sm:p-4 overflow-y-auto space-y-4 max-w-7xl mx-auto w-full">
                
                {/* DatePicker */}
                <DatePicker selectedDates={selectedDates} onDatesChange={setSelectedDates} />

                {/* Tracks */}
                <TrackSelector 
                    selectedTracks={selectedTracks} 
                    onSelectionChange={setSelectedTracks} 
                    selectedDates={selectedDates}
                    pulitoPositions={pulitoPositions}
                    onPulitoPositionsChange={setPulitoPositions}
                />

                {/* Actions */}
                <ActionsPanel 
                    onAddPlay={handleAddPlay}
                    onDeleteSelected={handleDeleteSelected}
                    onReset={handleReset}
                    onOpenOcr={() => setIsOcrOpen(true)}
                    onOpenWizard={() => setIsWizardOpen(true)}
                    onOpenChatbot={() => setIsChatbotOpen(true)}
                    onGenerateTicket={handleGenerateTicket}
                    isTicketGenerationDisabled={plays.length === 0}
                    onPasteWagers={handlePasteWagers}
                    hasCopiedWagers={!!copiedWagers}
                    hasSelectedPlays={selectedPlayIds.length > 0}
                    addPlayButtonRef={addPlayButtonRef}
                />

                {/* UTILITIES ROW */}
                <div className="flex justify-between items-center px-1 py-1 bg-light-surface/50 dark:bg-dark-surface/50 rounded-lg border border-gray-200 dark:border-gray-800">
                    <div className="flex gap-2">
                        <button
                            onClick={toggleMute}
                            className={`p-2 rounded-full transition-colors ${isMuted ? 'bg-red-500/20 text-red-500' : 'bg-neon-cyan/20 text-neon-cyan'}`}
                            title={isMuted ? "Unmute" : "Mute"}
                        >
                            {isMuted ? (
                                <svg data-lucide="volume-x" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" x2="17" y1="9" y2="15"/><line x1="17" x2="23" y1="9" y2="15"/></svg>
                            ) : (
                                <svg data-lucide="volume-2" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
                            )}
                        </button>
                        <button
                            onClick={() => setIsCalculatorOpen(true)}
                            className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-neon-cyan transition-colors"
                            title="Prize Calculator"
                        >
                            <svg data-lucide="calculator" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="20" x="4" y="2" rx="2"/><line x1="8" x2="16" y1="6" y2="6"/><line x1="16" x2="16" y1="14" y2="14"/><path d="M16 10h.01"/><path d="M12 10h.01"/><path d="M8 10h.01"/><path d="M12 14h.01"/><path d="M8 14h.01"/><path d="M12 18h.01"/><path d="M8 18h.01"/></svg>
                        </button>
                    </div>
                    
                    <div className="flex items-center gap-2 pr-2">
                        <div className={`w-2 h-2 rounded-full ${serverHealth === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                        <span className="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400">
                            {serverHealth === 'online' ? 'System Online' : 'System Offline'}
                        </span>
                    </div>
                </div>

                {/* Plays Table */}
                <PlaysTable 
                    plays={plays}
                    updatePlay={updatePlay}
                    deletePlay={deletePlay}
                    selectedPlayIds={selectedPlayIds}
                    setSelectedPlayIds={setSelectedPlayIds}
                    onCopyWagers={handleCopyWagers}
                    lastAddedPlayId={lastAddedPlayId}
                    focusAddPlayButton={() => addPlayButtonRef.current?.focus()}
                    selectedTracks={selectedTracks}
                    pulitoPositions={pulitoPositions}
                />

                {/* Total Display - MOVED HERE (Restored Position) */}
                <TotalDisplay 
                    baseTotal={baseTotal} 
                    trackMultiplier={trackMultiplier} 
                    dateMultiplier={selectedDates.length} 
                    grandTotal={grandTotal} 
                />

            </main>

            {/* Modals */}
            <OcrModal 
                isOpen={isOcrOpen} 
                onClose={() => setIsOcrOpen(false)} 
                onSuccess={handleAddOcrResults}
                interpretTicketImage={interpretTicketImage}
                fileToBase64={fileToBase64}
            />

            <WizardModal
                isOpen={isWizardOpen}
                onClose={() => setIsWizardOpen(false)}
                onAddPlays={handleAddWizardPlays}
                selectedTracks={selectedTracks}
                pulitoPositions={pulitoPositions}
            />

            <ChatbotModal
                isOpen={isChatbotOpen}
                onClose={() => setIsChatbotOpen(false)}
                onSuccess={handleAddOcrResults}
                interpretTicketImage={interpretTicketImage}
                interpretNaturalLanguagePlays={interpretNaturalLanguagePlays}
                fileToBase64={fileToBase64}
                language={language}
            />

            <TicketModal
                isOpen={isTicketModalOpen}
                onClose={() => setIsTicketModalOpen(false)}
                plays={plays.filter(p => calculateRowTotal(p.betNumber, p.gameMode, p.straightAmount, p.boxAmount, p.comboAmount) > 0)}
                selectedTracks={selectedTracks}
                selectedDates={selectedDates}
                grandTotal={grandTotal}
                isConfirmed={isTicketConfirmed}
                setIsConfirmed={setIsTicketConfirmed}
                ticketNumber={ticketNumber}
                setTicketNumber={setTicketNumber}
                ticketImageBlob={ticketImageBlob}
                setTicketImageBlob={setTicketImageBlob}
                terminalId="TERM-001"
                cashierId="ADMIN"
                onSaveTicket={handleSaveTicketToDb}
                isSaving={isSaving}
                serverHealth={serverHealth}
                lastSaveStatus={lastSaveStatus}
            />

            <ValidationErrorModal
                isOpen={isValidationErrorOpen}
                onClose={() => setIsValidationErrorOpen(false)}
                errors={validationErrors}
            />

            <CalculatorModal 
                isOpen={isCalculatorOpen}
                onClose={() => setIsCalculatorOpen(false)}
            />
        </div>
    );
};

export default PlaygroundApp;
