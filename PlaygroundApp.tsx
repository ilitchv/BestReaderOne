
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
import SmartPaperModal from './components/SmartPaperModal';
import { getTodayDateString, calculateRowTotal, fileToBase64, determineGameMode, isTrackExpired, isRepetitiveNumber } from './utils/helpers';
import { interpretTicketImage, interpretNaturalLanguagePlays } from './services/geminiService';
import type { Play, WizardPlay, ImageInterpretationResult, CopiedWagers, ServerHealth, TicketData } from './types';
import { MAX_PLAYS, RESULTS_CATALOG } from './constants';
import { localDbService } from './services/localDbService';
import { useSound } from './hooks/useSound';
import { useAuth } from './contexts/AuthContext';
import { useLiveAudioContext } from './contexts/LiveAudioContext';

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
            let parsed = saved ? JSON.parse(saved) : [];

            // --- SANITATION: Filter out ghosts (Legacy IDs) ---
            const VALID_IDS = new Set(RESULTS_CATALOG.map(c => c.id));
            // Whitelist Special Keys / Indicators
            ['Venezuela', 'Pulito', 'special/venezuela', 'special/pulito', 'New York Horses'].forEach(k => VALID_IDS.add(k));

            // Filter parsed to only include valid IDs
            parsed = parsed.filter((t: string) => VALID_IDS.has(t));

            // Smart Default Logic if storage is empty (or emptied by sanitation)
            if (parsed.length === 0) {
                const now = new Date();
                const currentHour = now.getHours();
                const currentMinute = now.getMinutes();

                // Logic: Cutoff is roughly 2:14 PM (14:14) for NY Midday
                // If it's before 14:14, select Midday. Otherwise Evening.
                if (currentHour < 14 || (currentHour === 14 && currentMinute < 14)) {
                    return ['usa/ny/Midday'];
                } else {
                    return ['usa/ny/Evening'];
                }
            }
            return parsed;
        } catch (e) { return ['usa/ny/Evening']; }
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

            // --- TRACK FILTERING LOGIC ---
            const today = getTodayDateString();
            const isForToday = initialTicket.betDates.includes(today);

            let filteredTracks = initialTicket.tracks;
            if (isForToday) {
                const now = new Date();
                filteredTracks = initialTicket.tracks.filter(t => !isTrackExpired(t, now));
                console.log(`🔄 Playback: Filtered ${initialTicket.tracks.length - filteredTracks.length} expired tracks.`);
            }

            setSelectedTracks(filteredTracks);
            setSelectedDates(initialTicket.betDates);
            // Reset others
            setPulitoPositions([]);
            setTicketNumber('');
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
    const [isSmartPaperOpen, setIsSmartPaperOpen] = useState(false);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [voiceShareTrigger, setVoiceShareTrigger] = useState(0);

    // Payment Flow State
    const [isPaymentRequired, setIsPaymentRequired] = useState(false);

    // Ticket State
    const [ticketNumber, setTicketNumber] = useState('');
    const [isTicketConfirmed, setIsTicketConfirmed] = useState(false);
    const [ticketImageBlob, setTicketImageBlob] = useState<Blob | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaveStatus, setLastSaveStatus] = useState<'success' | 'error' | null>(null);
    const [serverHealth, setServerHealth] = useState<'online' | 'offline'>('online');

    // Theme (Passed to Header)
    const [theme, setTheme] = useState<'light' | 'dark'>('dark');
    const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

    // Sound Hook
    const { isMuted, toggleMute } = useSound();

    // View Mode (Persisted)
    const [trackViewMode, setTrackViewMode] = useState<'grid' | 'reel'>(() => {
        return (localStorage.getItem('trackViewMode') as 'grid' | 'reel') || 'grid';
    });

    // Save View Mode Preference
    useEffect(() => {
        localStorage.setItem('trackViewMode', trackViewMode);
    }, [trackViewMode]);

    // --- GLOBAL VOICE AGENT INTEGRATION ---
    const { registerFunctionCallback, unregisterFunctionCallback, toggleVoice } = useLiveAudioContext();

    // Helper to map natural language track names to IDs
    const resolveTrackName = (input: string): string | null => {
        const query = input.toLowerCase().trim()
            .replace(/\bny\b/g, 'new york')
            .replace(/\bga\b/g, 'georgia')
            .replace(/\btx\b/g, 'texas')
            .replace(/\bfl\b/g, 'florida')
            .replace(/\bnj\b/g, 'new jersey')
            .replace(/\bmd\b/g, 'maryland')
            .replace(/\bsc\b/g, 'south carolina')
            .replace(/\bmi\b/g, 'michigan')
            .replace(/\bpa\b/g, 'pennsylvania')
            .replace(/\btn\b/g, 'tennessee')
            .replace(/\bct\b/g, 'connecticut')
            .replace(/\bde\b/g, 'delaware')
            .replace(/\bma\b/g, 'massachusetts')
            .replace(/\bva\b/g, 'virginia')
            .replace(/\bnc\b/g, 'north carolina');

        // Direct matches for special IDs
        if (query === 'venezuela') return 'special/venezuela';
        if (query === 'pulito') return 'special/pulito';
        if (query.includes('horses') || query.includes('races') || query === 'ny horses') return 'special/ny-horses';

        // Exact combined match search (Lottery + Draw)
        let match = RESULTS_CATALOG.find(item => {
            const full = `${item.lottery} ${item.draw}`.toLowerCase();
            return query === full || query === item.lottery.toLowerCase();
        });

        // Fallback: Partial match checking both lottery and draw
        if (!match) {
            match = RESULTS_CATALOG.find(item => {
                const lottery = item.lottery.toLowerCase();
                const draw = item.draw.toLowerCase();
                return query.includes(lottery) && query.includes(draw);
            });
        }

        // Second Fallback: Just the lottery name (e.g., "New York") - Pick the first visible one
        if (!match) {
            match = RESULTS_CATALOG.find(item => item.lottery.toLowerCase() === query);
        }

        return match ? match.id : null;
    };

    useEffect(() => {
        const handleAddPlaysGlobal = (args: any) => {
            if (args && args.plays && args.plays.length > 0) {
                const mappedPlays: Play[] = args.plays.map((p: any, i: number) => ({
                    id: Date.now() + i + Math.random(),
                    betNumber: p.betNumber,
                    gameMode: p.gameMode || "Pick 3",
                    straightAmount: p.straightAmount || null,
                    boxAmount: p.boxAmount || null,
                    comboAmount: p.comboAmount || null
                }));
                setPlays(prev => [...mappedPlays, ...prev]);
                return `Successfully added ${mappedPlays.length} plays to the top of the slate.`;
            }
            return "Failed: No valid plays provided.";
        };

        const handleSetDate = (args: any) => {
            if (args && args.dates && args.dates.length > 0) {
                setSelectedDates(args.dates);
                return `Successfully set dates to: ${args.dates.join(', ')}`;
            }
            return "Failed: No dates provided.";
        };

        const handleToggleTrack = (args: any) => {
            if (args && args.tracks && args.tracks.length > 0) {
                const resolvedTracks: string[] = [];
                const failedTracks: string[] = [];

                args.tracks.forEach((trackInput: string) => {
                    const id = resolveTrackName(trackInput);
                    if (id) {
                        resolvedTracks.push(id);
                    } else {
                        failedTracks.push(trackInput);
                    }
                });

                if (resolvedTracks.length === 0) {
                    return `Failed to find any tracks matching: ${args.tracks.join(', ')}`;
                }

                setSelectedTracks(prev => {
                    let newTracks = [...prev];
                    resolvedTracks.forEach((trackId: string) => {
                        if (newTracks.includes(trackId)) {
                            newTracks = newTracks.filter(t => t !== trackId);
                        } else {
                            newTracks.push(trackId);
                        }
                    });
                    return newTracks;
                });

                let msg = `Successfully toggled: ${resolvedTracks.join(', ')}.`;
                if (failedTracks.length > 0) {
                    msg += ` Could not recognize: ${failedTracks.join(', ')}.`;
                }
                return msg;
            }
            return "Failed: No tracks provided.";
        };

        const handleApplyGlobalWager = (args: any) => {
            const strAmt = args.straightAmount;
            const boxAmt = args.boxAmount;
            const comAmt = args.comboAmount;

            setPlays(prevPlays => {
                return prevPlays.map(play => {
                    let newPlay = { ...play };
                    if (strAmt !== undefined) newPlay.straightAmount = strAmt;
                    if (boxAmt !== undefined) newPlay.boxAmount = boxAmt;
                    if (comAmt !== undefined) newPlay.comboAmount = comAmt;
                    return newPlay;
                });
            });
            return "Successfully modified global wagers for all existing plays.";
        };

        const handleGenerateTicketVoice = (args: any) => {
            if (args.confirm) {
                handleGenerateTicket();
                return "Successfully opened the ticket generation view.";
            }
            return "Ticket generation cancelled.";
        };

        const handleDeletePlays = (args: any) => {
            if (args.indices && Array.isArray(args.indices)) {
                // Indices from agent are 1-based.
                const oneBasedIndices = args.indices as number[];
                let countDeleted = 0;

                setPlays(prevPlays => {
                    const playsToDelete = oneBasedIndices
                        .map(i => prevPlays[i - 1]) // get the play object at that 1-based index
                        .filter(Boolean) // remove undefined (out of bounds)
                        .map(p => p.id); // extract IDs

                    countDeleted = playsToDelete.length;

                    if (playsToDelete.length > 0) {
                        return prevPlays.filter(p => !playsToDelete.includes(p.id));
                    }
                    return prevPlays;
                });
                return `Successfully deleted ${countDeleted} plays.`;
            }
            return "Failed to delete: No indices provided.";
        };

        const handleClearAllPlays = () => {
            setPlays([]);
            return "Successfully cleared all plays from the screen.";
        };

        const handleOpenToolModal = (args: any) => {
            if (args.toolName) {
                // Close all existing first
                setIsOcrOpen(false);
                setIsWizardOpen(false);
                setIsChatbotOpen(false);
                setIsSmartPaperOpen(false);
                setIsCalculatorOpen(false);
                setIsTicketModalOpen(false);

                const tool = args.toolName.toLowerCase();
                if (tool === 'wizard') setIsWizardOpen(true);
                else if (tool === 'calculator') setIsCalculatorOpen(true);
                else if (tool === 'ocr') setIsOcrOpen(true);
                else if (tool === 'chatbot') setIsSmartPaperOpen(true);

                return `Successfully opened the ${tool} modal.`;
            }
            return "Failed: No tool name provided.";
        };

        const handleCloseCurrentModal = () => {
            setIsOcrOpen(false);
            setIsWizardOpen(false);
            setIsChatbotOpen(false);
            setIsSmartPaperOpen(false);
            setIsCalculatorOpen(false);
            setIsTicketModalOpen(false);
            setIsValidationErrorOpen(false);
            return "Successfully closed all open windows.";
        };

        const handleCheckoutTicket = () => {
            handleGenerateTicket();
            return "The ticket summary is open. Please choose your payment method: Wallet, Bitcoin, or Shopify.";
        };

        const handleShareTicket = () => {
            if (!isTicketConfirmed) {
                return "Failed to share: The ticket must be paid and confirmed first.";
            }
            if (!ticketImageBlob) {
                return "Sharing is not ready yet. Please wait a moment for the ticket image to generate.";
            }
            // Trigger custom event for TicketModal to handle it
            window.dispatchEvent(new CustomEvent('voice-ui-click', { detail: { element: 'share' } }));
            return "Attempting to open share dialog...";
        };

        const handleShutdownAgent = () => {
            // We use the toggleVoice from context to stop it
            toggleVoice();
            return "Understood. The voice assistant is now turning off. Goodbye!";
        };

        const handleGetTicketStatus = () => {
            const formattedTotal = `$${grandTotal.toFixed(2)}`;
            const playsCount = plays.length;
            const tracksCount = effectiveTrackCount;

            if (isTicketConfirmed && ticketNumber) {
                if (ticketImageBlob) {
                    return `Ticket #${ticketNumber} is PAID and the image is READY. You can use the Share button now.`;
                }
                return `Ticket #${ticketNumber} is PAID, but the image is still generating. Wait a second to share.`;
            } else if (isTicketModalOpen) {
                return `The ticket is open for REVIEW but NOT PAID. Total: ${formattedTotal}. Choose a payment method in the modal.`;
            } else {
                return `You are in the editor. You have ${playsCount} plays across ${tracksCount} lotteries. The current total is ${formattedTotal}. Use 'generate the ticket' to pay.`;
            }
        };

        const handleSetRowWager = (args: any) => {
            const rowNum = args.rowNumber;
            const strAmt = args.straightAmount;
            const boxAmt = args.boxAmount;
            const comAmt = args.comboAmount;

            if (!rowNum || rowNum < 1 || rowNum > plays.length) {
                return `Failed: Row number ${rowNum} is out of range. You have ${plays.length} plays.`;
            }

            // In the UI, row X is plays[plays.length - X]
            const targetIndex = plays.length - rowNum;
            const targetPlay = plays[targetIndex];

            setPlays(prevPlays => {
                return prevPlays.map((p, idx) => {
                    if (idx === targetIndex) {
                        let newPlay = { ...p };
                        if (strAmt !== undefined) newPlay.straightAmount = strAmt;
                        if (boxAmt !== undefined) newPlay.boxAmount = boxAmt;
                        if (comAmt !== undefined) newPlay.comboAmount = comAmt;
                        return newPlay;
                    }
                    return p;
                });
            });

            return `Successfully updated wagers for Row ${rowNum} (${targetPlay.betNumber}).`;
        };

        const handleReadSlatePlays = () => {
            if (plays.length === 0) return "You have no plays on the slate currently.";

            const playReadout = plays.slice(0, 50).map((p, i) => {
                const total = calculateRowTotal(p.betNumber, p.gameMode, p.straightAmount, p.boxAmount, p.comboAmount);
                // The displayed row number is plays.length - i
                const rowId = plays.length - i;
                let detail = `Row ${rowId}: ${p.gameMode} with number ${p.betNumber}`;
                if (p.straightAmount) detail += `, straight $${p.straightAmount}`;
                if (p.boxAmount) detail += `, box $${p.boxAmount}`;
                if (p.comboAmount) detail += `, combo $${p.comboAmount}`;
                detail += `. Total for this row is $${total}.`;
                return detail;
            }).reverse().join('\n'); // Reverse so it reads in row order 1, 2, 3...

            return `Here are your current plays (listing the first ${Math.min(50, plays.length)}):\n${playReadout}`;
        };

        const handleClickUiElement = (args: any) => {
            if (!args.elementName) return "Failed: No element name provided.";
            const element = args.elementName.toLowerCase();

            // Dispatch custom event for UI components to listen to
            window.dispatchEvent(new CustomEvent('voice-ui-click', { detail: { element } }));

            if (element === 'confirm_and_pay') {
                return "Attempting to confirm and pay for the ticket...";
            } else if (element === 'upload_image') {
                return "Opening file selector for image upload...";
            }

            return `Triggered click for ${element}.`;
        };

        const handleSetTheme = (args: any) => {
            if (args.theme === 'light') {
                setTheme('light');
                return "Switched theme to light mode.";
            }
            if (args.theme === 'dark') {
                setTheme('dark');
                return "Switched theme to dark mode.";
            }
            return "Failed to switch theme: invalid theme selected.";
        };

        const handleWizardGenerateRandom = (args: any) => {
            const { gameMode = 'Pick 3', count = 5, straightAmount, boxAmount, comboAmount } = args;
            const newPlays: Play[] = [];
            for (let i = 0; i < count; i++) {
                let numStr = '';
                switch (gameMode) {
                    case 'Pick 3': numStr = String(Math.floor(Math.random() * 1000)).padStart(3, '0'); break;
                    case 'Win 4': numStr = String(Math.floor(Math.random() * 10000)).padStart(4, '0'); break;
                    case 'Pick 2': numStr = String(Math.floor(Math.random() * 100)).padStart(2, '0'); break;
                    case 'Venezuela': numStr = String(Math.floor(Math.random() * 100)).padStart(2, '0'); break;
                    case 'Pale-RD':
                    case 'Palé':
                        const n1 = String(Math.floor(Math.random() * 100)).padStart(2, '0');
                        const n2 = String(Math.floor(Math.random() * 100)).padStart(2, '0');
                        numStr = `${n1}-${n2}`;
                        break;
                    case 'Pulito': numStr = String(Math.floor(Math.random() * 100)).padStart(2, '0'); break;
                    default: numStr = String(Math.floor(Math.random() * 1000)).padStart(3, '0'); break;
                }

                let detectedMode = determineGameMode(numStr, selectedTracks, pulitoPositions);
                const isUSA = selectedTracks.some(t => ["New York", "Georgia", "New Jersey", "Florida", "Connecticut", "Pensilvania", "Brooklyn", "Front", "Pulito", "Horses"].some(s => t.includes(s)));
                if (isUSA && (gameMode === 'Pale-RD' || detectedMode === 'Pale-RD')) detectedMode = 'Palé';

                if (numStr) {
                    const isSingleAction = detectedMode.startsWith('Single Action');
                    const isRepetitive = isRepetitiveNumber(numStr);
                    const finalBox = (isSingleAction || isRepetitive) ? null : boxAmount;
                    const finalCombo = (isSingleAction || isRepetitive) ? null : comboAmount;

                    newPlays.push({
                        id: Date.now() + i + Math.random(),
                        betNumber: numStr,
                        gameMode: detectedMode !== '-' ? detectedMode : gameMode,
                        straightAmount,
                        boxAmount: finalBox,
                        comboAmount: finalCombo
                    });
                }
            }
            setPlays(prev => [...newPlays.reverse(), ...prev]);
            return `Successfully generated ${count} random plays for ${gameMode}.`;
        };

        const handleWizardGenerateSequence = (args: any) => {
            const { startNumber, endNumber, straightAmount, boxAmount, comboAmount } = args;
            if (!startNumber || !endNumber) return "Failed: Must provide start and end numbers.";

            const s = parseInt(startNumber);
            const e = parseInt(endNumber);
            if (isNaN(s) || isNaN(e) || s > e) return "Failed: Invalid sequence range.";

            let count = e - s + 1;
            let end = e;
            if (count > MAX_PLAYS) {
                end = s + MAX_PLAYS - 1;
                count = MAX_PLAYS;
            }
            const pad = startNumber.length;
            const newPlays: Play[] = [];

            for (let i = s; i <= end; i++) {
                const numStr = String(i).padStart(pad, '0');
                const mode = determineGameMode(numStr, selectedTracks, pulitoPositions);
                const isSingleAction = mode.startsWith('Single Action');
                const isRepetitive = isRepetitiveNumber(numStr);
                const finalBox = (isSingleAction || isRepetitive) ? null : boxAmount;
                const finalCombo = (isSingleAction || isRepetitive) ? null : comboAmount;

                newPlays.push({
                    id: Date.now() + i + Math.random(),
                    betNumber: numStr,
                    gameMode: mode !== '-' ? mode : 'Pick 3',
                    straightAmount,
                    boxAmount: finalBox,
                    comboAmount: finalCombo
                });
            }
            setPlays(prev => [...newPlays.reverse(), ...prev]);
            return `Successfully generated a sequence of ${count} plays from ${startNumber} to ${String(end).padStart(pad, '0')}.`;
        };

        const handleSetViewMode = (args: any) => {
            if (args.mode === 'grid') {
                setTrackViewMode('grid');
                return "Successfully changed track view mode to grid.";
            } else if (args.mode === 'reel') {
                setTrackViewMode('reel');
                return "Successfully changed track view mode to reel.";
            }
            return "Failed to change view mode. Allowed values are 'grid' or 'reel'.";
        };

        const handleNavigateToTab = (args: any) => {
            if (args.tabName) {
                window.dispatchEvent(new CustomEvent('open-track-category', { detail: args.tabName }));
                return `Opened the ${args.tabName} tab in the track selector.`;
            }
            return "Failed: No tab name provided.";
        };

        const handleScrollUi = (args: any) => {
            const dir = args.direction;
            if (dir === 'bottom') {
                window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                return "Scrolling to the bottom of the page.";
            } else if (dir === 'top') {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return "Scrolling to the top of the page.";
            } else if (dir === 'down') {
                window.scrollBy({ top: 400, behavior: 'smooth' });
                return "Scrolling down.";
            } else if (dir === 'up') {
                window.scrollBy({ top: -400, behavior: 'smooth' });
                return "Scrolling up.";
            }
            return `Failed: Invalid scroll direction ${dir}.`;
        };

        const handleRequestHumanHelp = async (args: any) => {
            const reason = args.reason || "User requested assistance.";
            try {
                // We'll implement the actual API call later once the backend is ready
                // For now, we simulate success and log to console
                console.log("🆘 HUMAN HELP REQUESTED:", reason);

                // Dispatch event so UI can show a notification if needed
                window.dispatchEvent(new CustomEvent('voice-support-request', { detail: { reason } }));

                const payload = {
                    userId: user?.id || 'guest',
                    userName: user?.email || 'Guest',
                    reason,
                    timestamp: new Date().toISOString()
                };

                await fetch('/api/support/request', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                return "I've notified a supervisor. They will help you as soon as possible.";
            } catch (e) {
                return "I've logged your request for a human supervisor.";
            }
        };

        const handleWriteToSmartPaper = (args: any) => {
            const text = args.text;
            if (!text) return "Failed: No text provided.";
            window.dispatchEvent(new CustomEvent('voice-smart-paper-update', { detail: text }));
            return `Digitizing on board: ${text}`;
        };

        registerFunctionCallback("add_plays_to_slate", handleAddPlaysGlobal);
        registerFunctionCallback("set_date", handleSetDate);
        registerFunctionCallback("toggle_track", handleToggleTrack);
        registerFunctionCallback("apply_global_wager", handleApplyGlobalWager);
        registerFunctionCallback("generate_ticket", handleGenerateTicketVoice);

        registerFunctionCallback("delete_plays", handleDeletePlays);
        registerFunctionCallback("clear_all_plays", handleClearAllPlays);
        registerFunctionCallback("open_tool_modal", handleOpenToolModal);
        registerFunctionCallback("close_current_modal", handleCloseCurrentModal);
        registerFunctionCallback("checkout_ticket", handleCheckoutTicket);
        registerFunctionCallback("share_ticket", handleShareTicket);
        registerFunctionCallback("read_slate_plays", handleReadSlatePlays);
        registerFunctionCallback("shutdown_agent", handleShutdownAgent);
        registerFunctionCallback("get_ticket_status", handleGetTicketStatus);
        registerFunctionCallback("set_row_wager", handleSetRowWager);
        registerFunctionCallback("click_ui_element", handleClickUiElement);
        registerFunctionCallback("set_theme", handleSetTheme);

        registerFunctionCallback("navigate_to_tab", handleNavigateToTab);
        registerFunctionCallback("set_view_mode", handleSetViewMode);
        registerFunctionCallback("wizard_generate_random", handleWizardGenerateRandom);
        registerFunctionCallback("wizard_generate_sequence", handleWizardGenerateSequence);

        registerFunctionCallback("scroll_ui", handleScrollUi);
        registerFunctionCallback("request_human_help", handleRequestHumanHelp);
        registerFunctionCallback("write_to_smart_paper", handleWriteToSmartPaper);

        return () => {
            unregisterFunctionCallback("add_plays_to_slate");
            unregisterFunctionCallback("set_date");
            unregisterFunctionCallback("toggle_track");
            unregisterFunctionCallback("apply_global_wager");
            unregisterFunctionCallback("generate_ticket");

            unregisterFunctionCallback("delete_plays");
            unregisterFunctionCallback("clear_all_plays");
            unregisterFunctionCallback("open_tool_modal");
            unregisterFunctionCallback("close_current_modal");
            unregisterFunctionCallback("checkout_ticket");
            unregisterFunctionCallback("share_ticket");
            unregisterFunctionCallback("read_slate_plays");
            unregisterFunctionCallback("click_ui_element");
            unregisterFunctionCallback("set_theme");

            unregisterFunctionCallback("navigate_to_tab");
            unregisterFunctionCallback("set_view_mode");
            unregisterFunctionCallback("wizard_generate_random");
            unregisterFunctionCallback("wizard_generate_sequence");

            unregisterFunctionCallback("scroll_ui");
            unregisterFunctionCallback("request_human_help");
            unregisterFunctionCallback("write_to_smart_paper");
        };
    }, [registerFunctionCallback, unregisterFunctionCallback, setPlays, setSelectedDates, setSelectedTracks, setIsTicketModalOpen, plays, selectedTracks, selectedDates, pulitoPositions]);

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
        setPlays(prev => [newPlay, ...prev]);
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
        setIsPaymentRequired(false);
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

        setPlays(prev => [...newPlays, ...prev]);
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
        setPlays(prev => [...newPlays, ...prev]);
        setIsWizardOpen(false);
    };

    // --- TICKET GENERATION ---
    const handleApplySmartPaper = (newPlays: Play[], newTracks: string[]) => {
        if (newPlays.length > 0) {
            setPlays(prev => [...newPlays, ...prev]);
        }
        if (newTracks.length > 0) {
            setSelectedTracks(prev => Array.from(new Set([...prev, ...newTracks])));
        }
        setIsSmartPaperOpen(false);
    };

    const handleGenerateTicket = async () => {
        const errors: string[] = [];
        const warnings: string[] = [];

        // --- VALIDATION: Ensure at least one REAL track is selected ---
        // 'Venezuela' and 'Pulito' are indicators, not tracks. 'New York Horses' is a valid track.
        const validTracks = selectedTracks.filter(t => !['Venezuela', 'Pulito'].includes(t));

        if (selectedTracks.length === 0) {
            errors.push("Select at least one track.");
        } else if (validTracks.length === 0) {
            errors.push("Invalid Selection: You must select at least one actual Lottery (e.g., New York, Florida) alongside 'Venezuela' or 'Pulito'.");
        }
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
            const isPulitoSelected = selectedTracks.includes('Pulito') || selectedTracks.includes('special/pulito');
            if (p.betNumber.length === 2 && isPulitoSelected && pulitoPositions.length > 0) {
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

        // --- 5. SERVER-SIDE RISK VALIDATION (ACTIVE ENFORCEMENT) ---
        if (errors.length === 0 && validPlays.length > 0) {
            try {
                const riskRes = await fetch('/api/risk/validate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        tracks: selectedTracks,
                        betDates: selectedDates,
                        plays: validPlays
                    })
                });

                if (riskRes.ok) {
                    const riskData = await riskRes.json();
                    if (!riskData.allowed) {
                        // Process Failures
                        riskData.failures.forEach((f: any) => {
                            // Professional "Sold Out" Message
                            errors.push(`SOLD OUT: Number ${f.number} (${f.type}) on ${f.track} has reached the global limit of $${f.limit}.`);
                        });
                    }
                }
            } catch (e) {
                console.error("Risk validation failed (network)", e);
                // Optional: warnings.push("Network warning: Could not verify global risk limits.");
            }
        }

        if (errors.length > 0) {
            setValidationErrors(errors);
            setIsValidationErrorOpen(true);
            return;
        }

        if (validPlays.length < plays.length) {
            if (!confirm(`Found ${plays.length - validPlays.length} invalid plays. Proceed with only valid plays?`)) return;
        }

        // --- FIX: RESET STATE BEFORE OPENING ---
        setIsTicketConfirmed(false);
        setTicketNumber('');
        setIsPaymentRequired(false);
        setLastSaveStatus(null);
        // ---------------------------------------

        setIsTicketModalOpen(true);
    };

    const handleSaveTicketToDb = async (ticketData: any) => {
        setIsSaving(true);
        setLastSaveStatus(null);

        // --- OPTIMIZATION: Remove Image for DB Storage ---
        // We create a lightweight payload without the Base64 image string to save space/bandwidth
        const { ticketImage, ...ticketDataForDb } = ticketData;

        // INJECT USER ID (Or Guest ID if null)
        const GUEST_ID = 'guest-session';
        const finalTicketData = {
            ...ticketDataForDb,
            userId: user ? user.id : GUEST_ID,
            userEmail: user ? user.email : undefined // For Backend Auto-Recovery
        };

        // --- MODULE 3: FRONTEND VALIDATION ---
        console.log("📤 Sending Ticket to DB...");
        console.log(`   > UserID: ${finalTicketData.userId}`);
        console.log(`   > Email: ${finalTicketData.userEmail || 'N/A'}`);

        // Save locally (redundancy) - also lightweight
        localDbService.saveTicket(finalTicketData);

        try {
            const res = await fetch('/api/tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(finalTicketData)
            });
            const data = await res.json();

            // SUCCESS or SILENT FAILURE (200 OK)
            if (res.ok) {
                // Check if it's a "Silent Error" (handled insufficiency)
                if (data.silent) {
                    if (data.code === 'INSUFFICIENT_FUNDS') {
                        setIsPaymentRequired(true);
                        // We don't log error, effectively silencing the console spam
                    }
                    return;
                }

                // --- SUCCESS: Payment Confirmed / Balance OK ---
                setLastSaveStatus('success');
                setIsPaymentRequired(false); // <--- UNLOCK UI: Explicitly clear payment lock

                // --- BEAST LEDGER TRANSACTION ---
                // We record the WAGER in the immutable ledger immediately after server confirmation
                await localDbService.addToLedger({
                    action: 'WAGER',
                    userId: user ? user.id : GUEST_ID,
                    amount: -finalTicketData.grandTotal, // Negative amount for wager
                    details: `Ticket Purchase #${finalTicketData.ticketNumber}`
                });
                console.log("🔗 Wager recorded in Beast Ledger");

            } else {
                // REAL ERRORS (400, 500, etc.)
                // REAL ERRORS (400, 500, etc.)
                if ((res.status === 400 || res.status === 402) && (data.message === 'Insufficient funds' || data.message.includes('funds') || data.code === 'INSUFFICIENT_FUNDS')) {
                    setIsPaymentRequired(true);
                    setLastSaveStatus('error');
                } else {
                    setLastSaveStatus('error');
                    console.error("Server Error:", JSON.stringify(data, null, 2));
                }
            }
        } catch (error: any) {
            // Silence "Insufficient Funds" errors if they slipped through as 400s
            // (Typically handled by the silent check above, but for catch-all safety)
            if (error?.message?.includes('funds') || error?.message?.includes('Insufficient')) {
                // Do nothing (silent)
            } else {
                console.error("Save failed", error);
            }
            setLastSaveStatus('error');
        } finally {
            setIsSaving(false);
        }
    };

    // Calculate totals
    const baseTotal = plays.reduce((sum, p) => sum + calculateRowTotal(p.betNumber, p.gameMode, p.straightAmount, p.boxAmount, p.comboAmount), 0);

    // Grand Total Logic Refinement for Single Action
    // FIX: 'Venezuela' and 'Pulito' are indicators, NEVER multiplier tracks.
    // NOTE: IDs are 'special/venezuela' and 'special/pulito' in constants
    let effectiveTrackCount = selectedTracks.filter(t => !['Venezuela', 'special/venezuela', 'Pulito', 'special/pulito'].includes(t)).length;

    const isSingleActionPresent = plays.some(p => p.gameMode.startsWith('Single Action'));
    const isPulitoSelected = selectedTracks.includes('special/pulito') || selectedTracks.includes('Pulito');
    const otherUsaTracksCount = selectedTracks.filter(t => !t.includes('Pulito') && !t.includes('Venezuela')).length;

    if (isSingleActionPresent && isPulitoSelected && otherUsaTracksCount > 0) {
        effectiveTrackCount -= 1; // Discount Pulito as it's acting as position modifier
    }

    const trackMultiplier = Math.max(1, effectiveTrackCount);
    const grandTotal = baseTotal * trackMultiplier * Math.max(1, selectedDates.length);

    const handleCloseTicketModal = () => {
        setIsTicketModalOpen(false);
        // Robust State Reset (But Preserve Plays for Reuse)
        setTicketNumber('');
        setIsTicketConfirmed(false);
        setIsPaymentRequired(false);
        setLastSaveStatus(null);
        setTicketImageBlob(null);
    };

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
                    viewMode={trackViewMode}
                    userRole={user?.role}
                />

                {/* Actions */}
                <ActionsPanel
                    onAddPlay={handleAddPlay}
                    onDeleteSelected={handleDeleteSelected}
                    onReset={handleReset}
                    onOpenOcr={() => setIsOcrOpen(true)}
                    onOpenWizard={() => setIsWizardOpen(true)}
                    onOpenChatbot={() => setIsChatbotOpen(true)}
                    onOpenSmartPaper={() => setIsSmartPaperOpen(true)}
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
                                <svg data-lucide="volume-x" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><line x1="23" x2="17" y1="9" y2="15" /><line x1="17" x2="23" y1="9" y2="15" /></svg>
                            ) : (
                                <svg data-lucide="volume-2" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /></svg>
                            )}
                        </button>
                        <button
                            onClick={() => setIsCalculatorOpen(true)}
                            className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-neon-cyan transition-colors"
                            title="Prize Calculator"
                        >
                            <svg data-lucide="calculator" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" /><line x1="8" x2="16" y1="6" y2="6" /><line x1="16" x2="16" y1="14" y2="14" /><path d="M16 10h.01" /><path d="M12 10h.01" /><path d="M8 10h.01" /><path d="M12 14h.01" /><path d="M8 14h.01" /><path d="M12 18h.01" /><path d="M8 18h.01" /></svg>
                        </button>

                        {/* VIEW MODE TOGGLE */}
                        <button
                            onClick={() => setTrackViewMode(prev => prev === 'grid' ? 'reel' : 'grid')}
                            className={`p-2 rounded-full transition-colors ${trackViewMode === 'reel' ? 'bg-neon-cyan text-black shadow-lg shadow-cyan-500/50' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-neon-cyan'}`}
                            title="Toggle View Mode"
                        >
                            {trackViewMode === 'grid' ? (
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><circle cx="15.5" cy="8.5" r="1.5" /><circle cx="15.5" cy="15.5" r="1.5" /><circle cx="8.5" cy="15.5" r="1.5" /></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="7" x="3" y="3" rx="1" /><rect width="7" height="7" x="14" y="3" rx="1" /><rect width="7" height="7" x="14" y="14" rx="1" /><rect width="7" height="7" x="3" y="14" rx="1" /></svg>
                            )}
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
                onClose={handleCloseTicketModal} // UPDATED HERE
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
                cashierId={user?.email || "ADMIN"}
                onSaveTicket={handleSaveTicketToDb}
                isSaving={isSaving}
                serverHealth={serverHealth}
                lastSaveStatus={lastSaveStatus}
                isPaymentRequired={isPaymentRequired}
                userId={user ? user.id : 'guest-session'}
                voiceShareTrigger={voiceShareTrigger}
                onVoiceShareDone={() => setVoiceShareTrigger(0)}
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
            <SmartPaperModal
                isOpen={isSmartPaperOpen}
                onClose={() => setIsSmartPaperOpen(false)}
                onApply={handleApplySmartPaper}
                currentLanguage={language}
            />
        </div>
    );
};

export default PlaygroundApp;
