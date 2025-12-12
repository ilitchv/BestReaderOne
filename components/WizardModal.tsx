import React, { useState, useEffect, useRef } from 'react';
import type { WizardPlay } from '../types';
import { determineGameMode, calculateRowTotal, expandBetSequence, isRepetitiveNumber } from '../utils/helpers';
import { MAX_PLAYS } from '../constants';
import { interpretBatchHandwriting } from '../services/geminiService';

interface WizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddPlays: (plays: WizardPlay[]) => void;
  selectedTracks: string[];
  pulitoPositions: number[];
}

const WIZARD_STORAGE_KEY = 'beastReaderWizardState';

const WizardModal: React.FC<WizardModalProps> = ({ isOpen, onClose, onAddPlays, selectedTracks, pulitoPositions }) => {
    const [plays, setPlays] = useState<WizardPlay[]>([]);
    
    // --- MANUAL ENTRY STATE ---
    const [betNumber, setBetNumber] = useState('');
    const [straight, setStraight] = useState<number | null>(null);
    const [box, setBox] = useState<number | null>(null);
    const [combo, setCombo] = useState<number | null>(null);
    const [locks, setLocks] = useState({ straight: false, box: false, combo: false });

    // --- UI STATE ---
    const [activeGenerator, setActiveGenerator] = useState<string | null>(null);

    // --- GENERATOR STATES ---
    const [qpMode, setQpMode] = useState('Pick 3');
    const [qpCount, setQpCount] = useState(5);
    
    const [runDownStart, setRunDownStart] = useState('');
    const [runDownEnd, setRunDownEnd] = useState('');
    
    const [seqStart, setSeqStart] = useState('');
    const [seqEnd, setSeqEnd] = useState('');

    // --- MAGIC SLATE STATE (BATCH EDITION) ---
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [slateTheme, setSlateTheme] = useState<'dark' | 'light'>('dark');
    const [paths, setPaths] = useState<any[]>([]); 
    const [currentPath, setCurrentPath] = useState<any[]>([]);
    const [snapshots, setSnapshots] = useState<string[]>([]); // Array of Base64 images
    const [isProcessingBatch, setIsProcessingBatch] = useState(false);
    
    // --- REFS FOR FOCUS ---
    const modalRef = useRef<HTMLDivElement>(null);
    const straightRef = useRef<HTMLInputElement>(null);
    const boxRef = useRef<HTMLInputElement>(null);
    const comboRef = useRef<HTMLInputElement>(null);
    const betInputRef = useRef<HTMLInputElement>(null);
    const addButtonRef = useRef<HTMLButtonElement>(null);
    const addPlaysFooterBtnRef = useRef<HTMLButtonElement>(null);

    // --- INITIALIZATION & PERSISTENCE ---
    useEffect(() => {
        if (isOpen) {
            const saved = localStorage.getItem(WIZARD_STORAGE_KEY);
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    const savedLocks = parsed.locks || { straight: false, box: false, combo: false };
                    setLocks(savedLocks);
                    if (savedLocks.straight) setStraight(parsed.values?.straight ?? null);
                    if (savedLocks.box) setBox(parsed.values?.box ?? null);
                    if (savedLocks.combo) setCombo(parsed.values?.combo ?? null);
                } catch (e) { console.error("Error loading wizard state", e); }
            }
            setTimeout(() => straightRef.current?.focus(), 50);
        } else {
            setPlays([]);
            setBetNumber('');
            setActiveGenerator(null);
            setRunDownStart(''); setRunDownEnd('');
            setSeqStart(''); setSeqEnd('');
            setPaths([]); 
            setSnapshots([]);
        }
    }, [isOpen]);

    useEffect(() => {
        const stateToSave = { locks, values: { straight, box, combo } };
        localStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify(stateToSave));
    }, [locks, straight, box, combo]);

    // --- FOCUS TRAP ---
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen || e.key !== 'Tab') return;
            if (e.shiftKey) {
                if (document.activeElement === straightRef.current) {
                    e.preventDefault();
                    addPlaysFooterBtnRef.current?.focus();
                }
            } else {
                if (document.activeElement === addPlaysFooterBtnRef.current) {
                    e.preventDefault();
                    straightRef.current?.focus();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);


    const toggleLock = (field: 'straight' | 'box' | 'combo') => {
        setLocks(prev => ({ ...prev, [field]: !prev[field] }));
    };

    // --- MANUAL ADD LOGIC ---
    const handleAddNext = () => {
        if (!betNumber) return;
        const gameMode = determineGameMode(betNumber, selectedTracks, pulitoPositions);
        if (gameMode === '-') {
            alert(`Invalid bet number format.`);
            setTimeout(() => betInputRef.current?.focus(), 10);
            return;
        }

        // --- FILTER INVALID WAGERS ---
        // If Single Action or Repetitive Number, clear Box/Combo
        const isSingleAction = gameMode.startsWith('Single Action');
        const isRepetitive = isRepetitiveNumber(betNumber);
        
        const finalBox = (isSingleAction || isRepetitive) ? null : box;
        const finalCombo = (isSingleAction || isRepetitive) ? null : combo;

        setPlays(prev => [{ betNumber, gameMode, straight, box: finalBox, combo: finalCombo }, ...prev]);
        setBetNumber('');
        setTimeout(() => betInputRef.current?.focus(), 10);
    };

    // --- NAVIGATION (ENTER LOOP) ---
    const handleWagerKeyDown = (e: React.KeyboardEvent, nextRef: React.RefObject<HTMLInputElement>) => {
        if (e.key === 'Enter') { e.preventDefault(); nextRef.current?.focus(); nextRef.current?.select(); }
    };
    const handleInputKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') { e.preventDefault(); addButtonRef.current?.focus(); }
    };
    const handleAddButtonKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') { /* Click fires automatically on Enter */ }
    };

    // --- GENERATORS ---
    const handleQuickPick = () => {
        const newPlays: WizardPlay[] = [];
        for (let i = 0; i < qpCount; i++) {
            let numStr = '';
            switch(qpMode) {
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
            }
            let detectedMode = determineGameMode(numStr, selectedTracks, pulitoPositions);
            const isUSA = selectedTracks.some(t => ["New York", "Georgia", "New Jersey", "Florida", "Connecticut", "Pensilvania", "Brooklyn", "Front", "Pulito", "Horses"].some(s => t.includes(s)));
            if (isUSA && (qpMode === 'Pale-RD' || detectedMode === 'Pale-RD')) detectedMode = 'Palé';
            
            if(numStr) {
                // --- FILTER INVALID WAGERS ---
                const isSingleAction = detectedMode.startsWith('Single Action');
                const isRepetitive = isRepetitiveNumber(numStr);
                const finalBox = (isSingleAction || isRepetitive) ? null : box;
                const finalCombo = (isSingleAction || isRepetitive) ? null : combo;

                newPlays.push({ betNumber: numStr, gameMode: detectedMode !== '-' ? detectedMode : qpMode, straight, box: finalBox, combo: finalCombo });
            }
        }
        setPlays(prev => [...newPlays.reverse(), ...prev]);
    };

    const handlePositionalRunDown = () => {
        if (!runDownStart || !runDownEnd) return alert("Enter start and end.");
        if (runDownStart.length !== runDownEnd.length) return alert("Lengths must match.");
        const newPlays: WizardPlay[] = [];
        for (let i = 0; i <= 9; i++) {
            let numStr = '';
            for (let charIdx = 0; charIdx < runDownStart.length; charIdx++) {
                const startChar = runDownStart[charIdx];
                const endChar = runDownEnd[charIdx];
                numStr += (startChar === endChar) ? startChar : String(i);
            }
            const mode = determineGameMode(numStr, selectedTracks, pulitoPositions);
            
            // --- FILTER INVALID WAGERS ---
            const isSingleAction = mode.startsWith('Single Action');
            const isRepetitive = isRepetitiveNumber(numStr);
            const finalBox = (isSingleAction || isRepetitive) ? null : box;
            const finalCombo = (isSingleAction || isRepetitive) ? null : combo;

            newPlays.push({ betNumber: numStr, gameMode: mode !== '-' ? mode : 'Pick 3', straight, box: finalBox, combo: finalCombo });
        }
        setPlays(prev => [...newPlays.reverse(), ...prev]);
    };

    const handleSequentialRange = () => {
        if (!seqStart || !seqEnd) return alert("Enter start and end.");
        const s = parseInt(seqStart);
        const e = parseInt(seqEnd);
        if (isNaN(s) || isNaN(e) || s > e) return alert("Invalid range.");
        let count = e - s + 1;
        let end = e;
        if (count > MAX_PLAYS) {
            alert(`Limit exceeded. Generating first ${MAX_PLAYS}.`);
            end = s + MAX_PLAYS - 1;
        }
        const newPlays: WizardPlay[] = [];
        const pad = seqStart.length;
        for (let i = s; i <= end; i++) {
            const numStr = String(i).padStart(pad, '0');
            const mode = determineGameMode(numStr, selectedTracks, pulitoPositions);
            
            // --- FILTER INVALID WAGERS ---
            const isSingleAction = mode.startsWith('Single Action');
            const isRepetitive = isRepetitiveNumber(numStr);
            const finalBox = (isSingleAction || isRepetitive) ? null : box;
            const finalCombo = (isSingleAction || isRepetitive) ? null : combo;

            newPlays.push({ betNumber: numStr, gameMode: mode !== '-' ? mode : 'Pick 3', straight, box: finalBox, combo: finalCombo });
        }
        setPlays(prev => [...newPlays.reverse(), ...prev]);
    };

    // --- MAGIC SLATE (BATCH LOGIC) ---
    
    const getCanvasContext = () => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        return canvas.getContext('2d');
    };

    const redrawCanvas = (currentPaths: any[] = paths) => {
        const ctx = getCanvasContext();
        const canvas = canvasRef.current;
        if (!ctx || !canvas) return;

        ctx.fillStyle = slateTheme === 'dark' ? '#1a1a1a' : '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = slateTheme === 'dark' ? '#00ffff' : '#000080';

        currentPaths.forEach(path => {
            if (path.length < 2) return;
            ctx.beginPath();
            ctx.moveTo(path[0].x, path[0].y);
            for (let i = 1; i < path.length; i++) {
                ctx.lineTo(path[i].x, path[i].y);
            }
            ctx.stroke();
        });
    };

    // Resize canvas (XL Height: 320px)
    useEffect(() => {
        if (activeGenerator === 'HW' && canvasRef.current) {
            const parent = canvasRef.current.parentElement;
            if (parent) {
                canvasRef.current.width = parent.clientWidth;
                canvasRef.current.height = 320; 
                redrawCanvas();
            }
        }
    }, [activeGenerator, slateTheme, paths]);

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        setIsDrawing(true);
        const rect = canvas.getBoundingClientRect();
        const x = ('touches' in e ? e.touches[0].clientX : e.clientX) - rect.left;
        const y = ('touches' in e ? e.touches[0].clientY : e.clientY) - rect.top;
        setCurrentPath([{ x, y }]);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        const ctx = getCanvasContext();
        if (!canvas || !ctx) return;
        e.preventDefault(); 

        const rect = canvas.getBoundingClientRect();
        const x = ('touches' in e ? e.touches[0].clientX : e.clientX) - rect.left;
        const y = ('touches' in e ? e.touches[0].clientY : e.clientY) - rect.top;

        const newPath = [...currentPath, { x, y }];
        setCurrentPath(newPath);

        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = slateTheme === 'dark' ? '#00ffff' : '#000080';
        
        const lastPoint = currentPath[currentPath.length - 1];
        ctx.beginPath();
        ctx.moveTo(lastPoint.x, lastPoint.y);
        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const stopDrawing = () => {
        if (isDrawing && currentPath.length > 0) {
            setPaths(prev => [...prev, currentPath]);
        }
        setIsDrawing(false);
        setCurrentPath([]);
    };

    const handleUndoSlate = (e: React.MouseEvent) => {
        e.stopPropagation();
        const newPaths = paths.slice(0, -1);
        setPaths(newPaths);
        redrawCanvas(newPaths);
    };

    const handleClearSlate = (e: React.MouseEvent) => {
        e.stopPropagation();
        setPaths([]);
        redrawCanvas([]);
    };
    
    const toggleSlateTheme = (e: React.MouseEvent) => {
        e.stopPropagation();
        setSlateTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    // --- BATCH PROCESSOR LOGIC ---
    const handleSnapshot = () => {
        const canvas = canvasRef.current;
        if (canvas && paths.length > 0) {
            // 1. Create High Contrast for AI (White BG)
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = canvas.width;
            tempCanvas.height = canvas.height;
            const ctx = tempCanvas.getContext('2d');
            if (ctx) {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
                ctx.lineWidth = 4; // Thick stroke
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.strokeStyle = '#000000';
                paths.forEach(path => {
                    if (path.length < 2) return;
                    ctx.beginPath();
                    ctx.moveTo(path[0].x, path[0].y);
                    for (let i = 1; i < path.length; i++) {
                        ctx.lineTo(path[i].x, path[i].y);
                    }
                    ctx.stroke();
                });
                
                // 2. Save to Snapshots Queue
                const base64 = tempCanvas.toDataURL('image/jpeg', 0.8).split(',')[1];
                setSnapshots(prev => [...prev, base64]);
                
                // 3. Auto-Clear
                setPaths([]);
                redrawCanvas([]);
            }
        }
    };

    const handleRemoveSnapshot = (index: number) => {
        setSnapshots(prev => prev.filter((_, i) => i !== index));
    };

    const handleProcessBatch = async () => {
        if (snapshots.length === 0 || isProcessingBatch) return;
        setIsProcessingBatch(true);

        try {
            // 1. Stitch Images Vertically
            // We'll use a canvas to stack them
            // Assuming consistent width/height from the snapshots (since they come from same canvas)
            // For robustness, we load them to get dimensions
            const loadedImages = await Promise.all(snapshots.map(src => {
                return new Promise<HTMLImageElement>((resolve) => {
                    const img = new Image();
                    img.src = `data:image/jpeg;base64,${src}`;
                    img.onload = () => resolve(img);
                });
            }));

            const width = loadedImages[0].width;
            const totalHeight = loadedImages.reduce((acc, img) => acc + img.height, 0);
            
            const stitchCanvas = document.createElement('canvas');
            stitchCanvas.width = width;
            stitchCanvas.height = totalHeight;
            const ctx = stitchCanvas.getContext('2d');
            
            if (ctx) {
                let yOffset = 0;
                loadedImages.forEach(img => {
                    ctx.drawImage(img, 0, yOffset);
                    yOffset += img.height;
                    // Draw a divider line to help AI distinguish "pages"
                    ctx.beginPath();
                    ctx.moveTo(0, yOffset);
                    ctx.lineTo(width, yOffset);
                    ctx.lineWidth = 2;
                    ctx.strokeStyle = '#cccccc';
                    ctx.stroke();
                });

                // 2. Send Stitched Image to AI
                const finalBase64 = stitchCanvas.toDataURL('image/jpeg', 0.8).split(',')[1];
                const aiResults = await interpretBatchHandwriting(finalBase64);

                // 3. Process Results (Expansion + Cents Heuristic)
                const newPlays: WizardPlay[] = aiResults.flatMap(r => {
                    const expanded = expandBetSequence(r.betNumber);
                    const normalizeAmount = (amt: number | null) => {
                        if (amt === null) return null;
                        // Cents Heuristic: >=10 implies cents
                        if (amt >= 10 && Number.isInteger(amt)) return amt / 100;
                        return amt;
                    };
                    const s = normalizeAmount(r.straightAmount);
                    const b = normalizeAmount(r.boxAmount);
                    const c = normalizeAmount(r.comboAmount);

                    return expanded.map(numStr => {
                        const gameMode = determineGameMode(numStr, selectedTracks, pulitoPositions) !== '-' ? determineGameMode(numStr, selectedTracks, pulitoPositions) : 'Pick 3';
                        
                        // Filter logic for batch processing too
                        const isSingleAction = gameMode.startsWith('Single Action');
                        const isRepetitive = isRepetitiveNumber(numStr);
                        const finalBox = (isSingleAction || isRepetitive) ? null : b;
                        const finalCombo = (isSingleAction || isRepetitive) ? null : c;

                        return {
                            betNumber: numStr,
                            gameMode,
                            straight: s,
                            box: finalBox,
                            combo: finalCombo
                        };
                    });
                });

                setPlays(prev => [...newPlays.reverse(), ...prev]);
                setSnapshots([]); // Clear batch on success
            }
        } catch (e) {
            console.error(e);
            alert("AI processing failed. Please try again.");
        } finally {
            setIsProcessingBatch(false);
        }
    };

    const handleSubmitAll = () => {
        if (plays.length > 0) onAddPlays([...plays].reverse()); 
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 animate-fade-in" onClick={onClose}>
            <div ref={modalRef} className="bg-light-card dark:bg-dark-card rounded-xl shadow-lg w-full max-w-6xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-neon-cyan flex items-center gap-2">
                        <svg data-lucide="magic-wand-2" width="24" height="24" stroke="currentColor" fill="none" strokeWidth="2"><path d="M15 4V2"/><path d="M15 16v-2"/><path d="M8 9h2"/><path d="M20 9h2"/><path d="M17.8 11.8 19 13"/><path d="M15 9h.01"/><path d="M17.8 6.2 19 5"/><path d="m3 21 9-9"/><path d="M12.2 6.2 11 5"/></svg>
                        Quick Entry Wizard
                    </h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                        <svg data-lucide="x" width="24" height="24" stroke="currentColor" fill="none" strokeWidth="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    </button>
                </div>

                <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto">
                    <div className="lg:col-span-5 space-y-4">
                        {/* MANUAL ENTRY */}
                        <div className="bg-light-surface dark:bg-dark-surface p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                            <label className="font-bold text-xs uppercase text-gray-500 block mb-2">1. Manual Entry</label>
                            <div className="grid grid-cols-3 gap-3 mb-3">
                                {['straight', 'box', 'combo'].map(field => (
                                    <div key={field} className="flex flex-col gap-1">
                                        <input 
                                            ref={field === 'straight' ? straightRef : field === 'box' ? boxRef : comboRef}
                                            type="number" placeholder={field.charAt(0).toUpperCase() + field.slice(1)} 
                                            value={(field === 'straight' ? straight : field === 'box' ? box : combo) ?? ''} 
                                            onChange={e => {
                                                const val = e.target.value === '' ? null : +e.target.value;
                                                if(field==='straight') setStraight(val);
                                                if(field==='box') setBox(val);
                                                if(field==='combo') setCombo(val);
                                            }} 
                                            onKeyDown={e => handleWagerKeyDown(e, field==='straight'?boxRef : field==='box'?comboRef : betInputRef)} 
                                            className="w-full bg-light-card dark:bg-dark-card p-2 rounded-lg border-2 border-transparent focus:border-neon-cyan focus:outline-none text-center text-sm font-mono"
                                        />
                                        <button onClick={() => toggleLock(field as any)} className={`w-full flex justify-center py-1 rounded transition-colors ${(locks as any)[field] ? 'text-neon-cyan bg-neon-cyan/10' : 'text-gray-400 hover:text-gray-500'}`}>
                                            {(locks as any)[field] ? '🔒' : '🔓'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <input 
                                    ref={betInputRef} type="text" placeholder="123..." 
                                    value={betNumber} onChange={e => setBetNumber(e.target.value)} 
                                    onKeyDown={handleInputKeyDown} 
                                    className="w-32 bg-light-card dark:bg-dark-card p-2 rounded-lg border-2 border-transparent focus:border-neon-cyan focus:outline-none font-mono text-lg text-center"
                                />
                                <button ref={addButtonRef} onClick={handleAddNext} onKeyDown={handleAddButtonKeyDown} className="flex-grow px-4 py-2 rounded-lg bg-neon-cyan text-black font-bold hover:scale-105 transition-transform focus:ring-2 focus:ring-white focus:outline-none shadow-neon-sm">
                                    ADD
                                </button>
                            </div>
                        </div>

                        {/* GENERATORS */}
                        <div className="space-y-2">
                            {/* RANDOM */}
                            <div className={`rounded-lg overflow-hidden border ${activeGenerator === 'QP' ? 'border-neon-pink bg-neon-pink/5' : 'border-neon-pink/30 bg-neon-pink/5'}`}>
                                <button onClick={() => setActiveGenerator(prev => prev === 'QP' ? null : 'QP')} className={`w-full flex justify-between p-2 font-bold text-sm ${activeGenerator === 'QP' ? 'text-neon-pink' : 'text-gray-500 dark:text-gray-300'}`}>
                                    <span>Random Generator</span>
                                    <span className={`transition-transform ${activeGenerator === 'QP' ? 'rotate-180' : ''}`}>▼</span>
                                </button>
                                {activeGenerator === 'QP' && (
                                    <div className="p-4 bg-light-surface dark:bg-dark-surface animate-fade-in border-t border-neon-pink/20">
                                        <div className="grid grid-cols-2 gap-2">
                                            <select value={qpMode} onChange={e => setQpMode(e.target.value)} className="bg-light-card dark:bg-dark-card p-2 rounded border-2 border-transparent focus:border-neon-pink text-sm"><option>Pick 3</option><option>Win 4</option><option value="Pick 2">Pick 2</option><option value="Palé">Palé (USA)</option><option value="Pale-RD">Pale-RD</option><option>Pulito</option><option>Venezuela</option></select>
                                            <input type="number" value={qpCount} onChange={e => setQpCount(+e.target.value)} className="bg-light-card dark:bg-dark-card p-2 rounded border-2 border-transparent focus:border-neon-pink text-sm" />
                                            <button onClick={handleQuickPick} className="col-span-2 bg-neon-pink text-black font-bold py-2 rounded">Generate</button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* RUN DOWN */}
                            <div className={`rounded-lg overflow-hidden border ${activeGenerator === 'RD' ? 'border-neon-green bg-neon-green/5' : 'border-neon-green/30 bg-neon-green/5'}`}>
                                <button onClick={() => setActiveGenerator(prev => prev === 'RD' ? null : 'RD')} className={`w-full flex justify-between p-2 font-bold text-sm ${activeGenerator === 'RD' ? 'text-neon-green' : 'text-gray-500 dark:text-gray-300'}`}>
                                    <span>Run Down (Positional)</span>
                                    <span className={`transition-transform ${activeGenerator === 'RD' ? 'rotate-180' : ''}`}>▼</span>
                                </button>
                                {activeGenerator === 'RD' && (
                                    <div className="p-4 bg-light-surface dark:bg-dark-surface animate-fade-in border-t border-neon-green/20">
                                        <div className="grid grid-cols-2 gap-2 mb-2">
                                            <input type="text" value={runDownStart} onChange={e => setRunDownStart(e.target.value)} className="bg-light-card dark:bg-dark-card p-2 rounded border-2 border-transparent focus:border-neon-green text-center" placeholder="Start" />
                                            <input type="text" value={runDownEnd} onChange={e => setRunDownEnd(e.target.value)} className="bg-light-card dark:bg-dark-card p-2 rounded border-2 border-transparent focus:border-neon-green text-center" placeholder="End" />
                                        </div>
                                        <button onClick={handlePositionalRunDown} className="w-full bg-neon-green text-black font-bold py-2 rounded">Generate 10 Plays</button>
                                    </div>
                                )}
                            </div>

                            {/* SEQUENTIAL */}
                            <div className={`rounded-lg overflow-hidden border ${activeGenerator === 'SQ' ? 'border-blue-400 bg-blue-400/5' : 'border-blue-400/30 bg-blue-400/5'}`}>
                                <button onClick={() => setActiveGenerator(prev => prev === 'SQ' ? null : 'SQ')} className={`w-full flex justify-between p-2 font-bold text-sm ${activeGenerator === 'SQ' ? 'text-blue-400' : 'text-gray-500 dark:text-gray-300'}`}>
                                    <span>Sequential Range</span>
                                    <span className={`transition-transform ${activeGenerator === 'SQ' ? 'rotate-180' : ''}`}>▼</span>
                                </button>
                                {activeGenerator === 'SQ' && (
                                    <div className="p-4 bg-light-surface dark:bg-dark-surface animate-fade-in border-t border-blue-400/20">
                                        <div className="grid grid-cols-2 gap-2 mb-2">
                                            <input type="text" value={seqStart} onChange={e => setSeqStart(e.target.value)} className="bg-light-card dark:bg-dark-card p-2 rounded border-2 border-transparent focus:border-blue-400 text-center" placeholder="Start" />
                                            <input type="text" value={seqEnd} onChange={e => setSeqEnd(e.target.value)} className="bg-light-card dark:bg-dark-card p-2 rounded border-2 border-transparent focus:border-blue-400 text-center" placeholder="End" />
                                        </div>
                                        <button onClick={handleSequentialRange} className="w-full bg-blue-500 text-white font-bold py-2 rounded">Generate Sequence</button>
                                    </div>
                                )}
                            </div>

                            {/* MAGIC SLATE (BATCH) */}
                            <div className={`rounded-lg overflow-hidden border ${activeGenerator === 'HW' ? 'border-neon-cyan bg-gradient-to-r from-neon-cyan/10 to-neon-pink/10' : 'border-gray-600 bg-gray-800/30'}`}>
                                <div className="w-full flex justify-between items-center p-1.5">
                                    <button onClick={() => setActiveGenerator(prev => prev === 'HW' ? null : 'HW')} className={`flex-grow text-left font-bold text-xs ${activeGenerator === 'HW' ? 'text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan to-neon-pink' : 'text-gray-500 dark:text-gray-300'}`}>
                                        Magic Slate <span className={`inline-block ml-1 transition-transform ${activeGenerator === 'HW' ? 'rotate-180' : ''}`}>▼</span>
                                    </button>
                                    {activeGenerator === 'HW' && (
                                        <div className="flex gap-1 items-center">
                                            <button onClick={toggleSlateTheme} className="p-1 rounded hover:bg-white/10 hover:text-yellow-400 transition-colors" title="Toggle Theme">
                                                {slateTheme === 'dark' ? (
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
                                                ) : (
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
                                                )}
                                            </button>
                                            <button onClick={handleUndoSlate} className="p-1 rounded hover:bg-white/10 hover:text-neon-cyan transition-colors" title="Undo">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"/></svg>
                                            </button>
                                            <button onClick={handleClearSlate} className="p-1 rounded hover:bg-red-500/20 text-red-400 hover:text-red-500 transition-colors" title="Clear">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                                            </button>
                                        </div>
                                    )}
                                </div>
                                
                                {activeGenerator === 'HW' && (
                                    <div className="relative bg-light-surface dark:bg-dark-surface animate-fade-in border-t border-white/10">
                                        <div className="relative w-full h-[320px] touch-none bg-black/50">
                                            <canvas 
                                                ref={canvasRef} 
                                                onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing}
                                                onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing}
                                                className="w-full h-full cursor-crosshair block"
                                            />
                                        </div>
                                        
                                        {/* Batch Staging Area */}
                                        <div className="p-2 bg-black/20 border-t border-white/5 flex flex-col gap-2">
                                            {snapshots.length > 0 && (
                                                <div className="flex gap-2 overflow-x-auto p-2 min-h-[60px] bg-black/40 rounded-lg no-scrollbar">
                                                    {snapshots.map((snap, i) => (
                                                        <div key={i} className="relative group flex-shrink-0 h-12 w-12 border border-neon-cyan/30 rounded overflow-hidden">
                                                            <img src={`data:image/jpeg;base64,${snap}`} className="w-full h-full object-cover" alt="snap" />
                                                            <button onClick={() => handleRemoveSnapshot(i)} className="absolute inset-0 bg-red-500/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white font-bold">✕</button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="flex justify-between gap-2">
                                                <button onClick={handleSnapshot} className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs font-bold flex items-center justify-center gap-2 border border-white/10">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
                                                    SNAPSHOT
                                                </button>
                                                <button 
                                                    onClick={handleProcessBatch} 
                                                    disabled={snapshots.length === 0 || isProcessingBatch} 
                                                    className="flex-1 px-3 py-2 bg-gradient-to-r from-neon-cyan to-blue-600 text-white rounded text-xs font-bold flex items-center justify-center gap-2 shadow-neon-sm disabled:opacity-50 disabled:grayscale hover:brightness-110 transition-all"
                                                >
                                                    {isProcessingBatch ? (
                                                        <span className="animate-pulse">PROCESSING...</span>
                                                    ) : (
                                                        <>
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                                                            PROCESS BATCH ({snapshots.length})
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: REVIEWS */}
                    <div className="lg:col-span-7 flex flex-col h-full">
                        <div className="flex justify-between items-center mb-2">
                            <label className="font-bold">Review ({plays.length})</label>
                            {plays.length > 0 && <button onClick={() => setPlays([])} className="text-xs text-red-500 hover:underline">Clear</button>}
                        </div>
                        <div className="bg-light-surface dark:bg-dark-surface rounded-lg p-2 flex-grow overflow-y-auto border border-gray-200 dark:border-gray-700 shadow-inner h-[300px]">
                            {plays.length === 0 ? <p className="text-center text-gray-500 pt-20">No plays yet.</p> : 
                            <table className="w-full text-sm">
                                <thead className="sticky top-0 bg-light-surface dark:bg-dark-surface z-10 border-b">
                                    <tr className="text-left text-xs text-gray-500 uppercase">
                                        <th className="p-2 text-center">#</th><th className="p-2">Bet</th><th className="p-2">Mode</th>
                                        <th className="p-2 text-right">Str</th><th className="p-2 text-right">Box</th><th className="p-2 text-right">Com</th>
                                        <th className="p-2 text-right">Tot</th><th className="w-8"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {plays.map((p, i) => (
                                        <tr key={i} className="border-b border-gray-200 dark:border-gray-700 last:border-0 hover:bg-black/5 dark:hover:bg-white/5">
                                            {/* LIFO Index Logic: Total - Index */}
                                            <td className="p-2 text-center text-xs text-gray-400">{plays.length - i}</td>
                                            <td className="p-2 font-mono font-bold text-neon-cyan">{p.betNumber}</td>
                                            <td className="p-2 text-xs opacity-70">{p.gameMode}</td>
                                            <td className="p-2 text-right font-mono text-xs">{p.straight || '-'}</td>
                                            <td className="p-2 text-right font-mono text-xs">{p.box || '-'}</td>
                                            <td className="p-2 text-right font-mono text-xs">{p.combo || '-'}</td>
                                            <td className="p-2 text-right font-bold">${calculateRowTotal(p.betNumber, p.gameMode, p.straight, p.box, p.combo).toFixed(2)}</td>
                                            <td className="p-2 text-center"><button onClick={() => setPlays(prev => prev.filter((_, idx) => idx !== i))} className="text-red-500">✕</button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>}
                        </div>
                    </div>
                </div>

                <div className="p-4 mt-auto border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600">Cancel</button>
                    <button ref={addPlaysFooterBtnRef} onClick={handleSubmitAll} disabled={plays.length === 0} className="px-6 py-2 rounded-lg bg-neon-cyan text-black font-bold disabled:opacity-50 hover:opacity-90 shadow-neon-sm">Add {plays.length} Plays</button>
                </div>
            </div>
        </div>
    );
};

export default WizardModal;