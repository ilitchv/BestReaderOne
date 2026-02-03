
import React, { useState, useEffect, useRef } from 'react';
import { getTrackColorClasses, getAbbreviation, formatWinningResult } from '../utils/helpers';
import ThemeToggle from './ThemeToggle';
import { localDbService } from '../services/localDbService';
import { WinningResult, CatalogItem } from '../types';
import { getLotteryLogo } from './LotteryLogos';
import { RESULTS_CATALOG } from '../constants';
import HighFrequencyAccordion from './HighFrequencyAccordion';



interface ResultsPageProps {
    onBack: () => void;
    theme: 'light' | 'dark';
    toggleTheme: () => void;
}

// --- CONSTANTS & STORAGE ---
const LS = {
    VIS: 'br_visibility',
    DATE: 'br_selected_date',
};

const readJSON = (key: string, fallback: any) => {
    try { const t = localStorage.getItem(key); return t ? JSON.parse(t) : fallback; }
    catch (e) { return fallback; }
};
const todayStr = () => {
    // Return YYYY-MM-DD in LOCAL time, not UTC.
    const d = new Date();
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().slice(0, 10);
};

const ResultsPage: React.FC<ResultsPageProps> = ({ onBack, theme, toggleTheme }) => {
    const [catalog, setCatalog] = useState<CatalogItem[]>(RESULTS_CATALOG);
    const [selectedDate, setSelectedDate] = useState<string>(todayStr());

    // Data Source
    const [dbResults, setDbResults] = useState<WinningResult[]>([]);

    // Visibility
    const [visibility, setVisibility] = useState<{ [id: string]: boolean }>({});

    // New Result Modal State
    const [isAddResultOpen, setIsAddResultOpen] = useState(false);
    const [manualTarget, setManualTarget] = useState<{ id: string, name: string } | null>(null);
    const [manualStep, setManualStep] = useState<'auth' | 'input' | null>(null);
    const [manualPin, setManualPin] = useState('');
    const [manualNumbers, setManualNumbers] = useState('');
    const [manualTime, setManualTime] = useState('');
    const [manualError, setManualError] = useState('');

    // New Result Date State - Default to Today
    const [newResultDate, setNewResultDate] = useState(todayStr());

    // History Modal State
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [historyTarget, setHistoryTarget] = useState<{ id: string, name: string } | null>(null);
    const [historyData, setHistoryData] = useState<WinningResult[]>([]);

    const [isAutoScrolling, setIsAutoScrolling] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-Expand High Frequency (Link Logic)
    const [isHFOpen, setIsHFOpen] = useState(false);

    useEffect(() => {
        const shouldExpand = localStorage.getItem('br_auto_expand_hf');
        if (shouldExpand === 'true') {
            setIsHFOpen(true);
            localStorage.removeItem('br_auto_expand_hf');
            // Slight delay to ensure render, then scroll
            setTimeout(() => {
                const el = document.getElementById('hf-section');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 500);
        }
    }, []);

    // Initial Load
    useEffect(() => {
        const storedVis = readJSON(LS.VIS, {});
        // Default visibility if empty: All true
        if (Object.keys(storedVis).length === 0) {
            const defVis: any = {};
            RESULTS_CATALOG.forEach(c => defVis[c.id] = true);
            setVisibility(defVis);
        } else {
            setVisibility(storedVis);
        }

        loadMergedResults();
    }, [selectedDate]); // Reload on date change

    // Auto Scroll Logic
    useEffect(() => {
        let interval: any;
        if (isAutoScrolling) {
            interval = setInterval(() => {
                const el = scrollRef.current;
                if (!el) return;

                // Check if scrollable
                if (el.scrollHeight <= el.clientHeight) return;

                // Scroll
                el.scrollTop += 1; // Keep slow/smooth

                // Loop when reaching bottom (with slight buffer)
                // If current scroll position + view height is close to total height
                if (Math.ceil(el.scrollTop + el.clientHeight) >= el.scrollHeight - 2) {
                    el.scrollTop = 0;
                }
            }, 20); // 20ms interval = 50fps
        }
        return () => clearInterval(interval);
    }, [isAutoScrolling, dbResults]); // Re-bind if data changes

    // Data Loading
    const loadMergedResults = async () => {
        try {
            const isToday = selectedDate === todayStr();

            // 1. Local Data
            const localAll = localDbService.getResults();
            let localFiltered = localAll;
            if (!isToday) {
                localFiltered = localAll.filter(r => r.date === selectedDate);
            }

            const localAdapted: WinningResult[] = localFiltered.map(r => ({
                id: r.id || `${r.lotteryId}_${r.date}`,
                date: r.date,
                lotteryId: r.lotteryId,
                lotteryName: r.lotteryName,
                first: '', second: '', third: '', pick3: '', pick4: '',
                numbers: formatWinningResult(r),
                createdAt: r.createdAt || new Date().toISOString()
            }));

            // 2. API Data
            let remoteAdapted: WinningResult[] = [];
            try {
                // If Today, we want LATEST results (dashboard mode), so don't filter by date strictly in fetch
                // But efficient API usage might require some limit. For now, fetch all or specific query if supported.
                // We'll fetch simply `/api/results` without date if Today, which returns sorted latest.
                // Prevent Browser Caching of API Response
                const ts = Date.now();
                const url = isToday
                    ? `/api/results?_t=${ts}`
                    : `/api/results?date=${selectedDate}&_t=${ts}`;

                const res = await fetch(url);
                if (res.ok) {
                    const rawData: any[] = await res.json();
                    remoteAdapted = rawData.map(item => {
                        const tempObj = {
                            country: item.country || 'USA',
                            resultId: item.resultId,
                            lotteryName: item.lotteryName,
                            drawDate: item.drawDate,
                            scrapedAt: item.createdAt,
                            numbers: item.numbers,
                            first: item.first, second: item.second, third: item.third, pick3: item.pick3, pick4: item.pick4
                        };
                        return {
                            id: item._id || `${item.resultId}_${item.drawDate}`,
                            date: item.drawDate,
                            lotteryId: item.resultId,
                            lotteryName: item.lotteryName,
                            first: item.first, second: item.second, third: item.third, pick3: item.pick3, pick4: item.pick4,
                            numbers: formatWinningResult(tempObj as any),
                            createdAt: item.updatedAt || item.createdAt || new Date().toISOString()
                        };
                    });
                }
            } catch (e) {
                console.warn("Start fetch failed or API offline:", e);
            }

            // 3. Merge Strategy
            // If TODAY: Group by LotteryID and find LATEST VALID result.
            // If PAST: Specific date match.

            if (isToday) {
                const mapIdToResults = new Map<string, WinningResult[]>();
                [...localAdapted, ...remoteAdapted].forEach(r => {
                    if (!mapIdToResults.has(r.lotteryId)) mapIdToResults.set(r.lotteryId, []);
                    mapIdToResults.get(r.lotteryId)?.push(r);
                });

                const bestResults: WinningResult[] = [];
                mapIdToResults.forEach((group) => {
                    // Sort Descending (Newest First) - prioritizing createdAt for same-day updates
                    group.sort((a, b) => {
                        const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
                        if (dateDiff !== 0) return dateDiff;
                        // If dates are equal, use update time (createdAt)
                        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
                    });

                    // Find first VALID result (non-placeholder)
                    const valid = group.find(r => {
                        if (!r.numbers) return false;
                        if (r.numbers.includes('---')) return false;
                        if (r.numbers.includes('—')) return false;
                        if (r.numbers === 'Pending') return false;
                        return true;
                    });

                    if (valid) bestResults.push(valid);
                    else bestResults.push(group[0]); // Fallback to latest even if pending
                });
                setDbResults(bestResults);

            } else {
                // Strict Date Mode
                const mergedMap = new Map<string, WinningResult>();
                localAdapted.forEach(r => mergedMap.set(r.lotteryId, r));
                // Remote overwrites if exists (assuming API is truth for past dates)
                remoteAdapted.forEach(r => mergedMap.set(r.lotteryId, r));
                setDbResults(Array.from(mergedMap.values()));
            }

        } catch (e) {
            console.error("Failed to load results", e);
        }
    };

    // Helper to get result string
    const getResultForTrack = (trackId: string) => {
        const r = dbResults.find(r => r.lotteryId === trackId);
        if (!r) return 'Pending';
        if (!r.numbers || r.numbers === '') return 'Pending';
        return r.numbers;
    };

    const handleOpenHistory = async (resultId: string) => {
        const item = catalog.find(c => c.id === resultId);
        setHistoryTarget({ id: resultId, name: item?.lottery || 'Unknown' });

        try {
            const res = await fetch(`/api/results?resultId=${encodeURIComponent(resultId)}&limit=20`);
            if (res.ok) {
                const data = await res.json();
                setHistoryData(data);
            }
        } catch (e) {
            console.error(e);
        }
        setIsHistoryOpen(true);
    };

    const playSound = (type: string) => {
        // Placeholder
    };

    // Zoom State (Ported from Homepage)
    const [zoomScale, setZoomScale] = useState(1);
    const handleZoomIn = () => setZoomScale(prev => Math.min(prev + 0.1, 2.5));
    const handleZoomOut = () => setZoomScale(prev => Math.max(prev - 0.1, 0.1)); // Limit 10%

    // Dynamic min-width based on zoom
    const minCardWidth = Math.max(140, Math.floor(220 * zoomScale));

    const isCompact = zoomScale < 0.6;

    return (
        <div className={`h-screen flex flex-col font-sans selection:bg-neon-cyan selection:text-black animate-fade-in relative z-10 transition-colors duration-500 ${theme === 'dark' ? 'bg-[#0f172a] text-white' : 'bg-slate-50 text-slate-900'}`}>
            {/* Header */}
            <div className={`${theme === 'dark' ? 'bg-slate-900/80 border-slate-700' : 'bg-white/80 border-slate-200'} backdrop-blur-md border-b shrink-0 z-50 shadow-md`}>
                <div className="max-w-[1920px] mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={onBack} className={`p-2 rounded-full transition-colors group ${theme === 'dark' ? 'hover:bg-slate-800' : 'hover:bg-slate-200'}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${theme === 'dark' ? 'text-gray-400 group-hover:text-white' : 'text-slate-500 group-hover:text-black'} transition-colors`}><path d="m15 18-6-6 6-6" /></svg>
                        </button>
                        <div>
                            <h1 className={`text-2xl font-black italic tracking-tighter uppercase flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                <span className={theme === 'dark' ? 'text-neon-cyan' : 'text-blue-600'}>Ultimate</span> Dashboard
                                <span className="text-red-500 text-sm align-top">v2.1</span>
                            </h1>
                            <div className="flex items-center gap-2">
                                <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest leading-none">Global Lottery Feed</p>
                                <button
                                    onClick={() => { localStorage.clear(); window.location.reload(); }}
                                    className="text-[10px] bg-red-500/10 text-red-500 px-2 rounded hover:bg-red-500 hover:text-white transition-colors uppercase font-bold"
                                >
                                    Clear Cache
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* ZOOM CONTROLS */}
                        <div className={`flex items-center rounded-lg p-1 border hidden md:flex ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-300'}`}>
                            <button onClick={handleZoomOut} className={`p-1.5 rounded hover:bg-black/10 transition-colors ${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-slate-500 hover:text-black'}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                            </button>
                            <span className={`text-[10px] font-bold font-mono px-2 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>{Math.round(zoomScale * 100)}%</span>
                            <button onClick={handleZoomIn} className={`p-1.5 rounded hover:bg-black/10 transition-colors ${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-slate-500 hover:text-black'}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                            </button>
                        </div>

                        {/* Date Selector */}
                        <div className={`flex items-center rounded-lg p-1 border ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-300'}`}>
                            <button onClick={() => {
                                const d = new Date(selectedDate);
                                d.setDate(d.getDate() - 1);
                                setSelectedDate(d.toISOString().slice(0, 10));
                            }} className={`p-1 rounded hover:bg-black/10 transition-colors ${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-slate-500 hover:text-black'}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                            </button>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className={`bg-transparent border-none text-xs font-bold uppercase p-2 outline-none cursor-pointer w-32 text-center ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}
                            />
                            <button onClick={() => {
                                const d = new Date(selectedDate);
                                d.setDate(d.getDate() + 1);
                                setSelectedDate(d.toISOString().slice(0, 10));
                            }} className={`p-1 rounded hover:bg-black/10 transition-colors ${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-slate-500 hover:text-black'}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                            </button>
                        </div>

                        <button
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-2 ${isAutoScrolling
                                ? 'bg-red-500/10 border-red-500 text-red-500'
                                : (theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 border-slate-300 text-slate-600 hover:bg-slate-200')}`}
                            onClick={() => setIsAutoScrolling(!isAutoScrolling)}
                        >
                            {isAutoScrolling ? (
                                <><span className="animate-pulse">●</span> Auto Scroll ON</>
                            ) : (
                                <>Auto Scroll OFF</>
                            )}
                        </button>

                        <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
                    </div>
                </div>
            </div>

            {/* Main Grid Content - FLEX 1 & OVERFLOW AUTO is critical for scroll */}
            <div className={`flex-1 overflow-y-auto custom-scrollbar p-6 ${theme === 'dark' ? 'bg-[#0f172a]' : 'bg-slate-50'}`} ref={scrollRef}>
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(auto-fill, minmax(${minCardWidth}px, 1fr))`,
                        gap: '12px'
                    }}
                    className="max-w-[1920px] mx-auto pb-20 transition-all duration-300 ease-in-out"
                >
                    {catalog.map((it) => {
                        // 1. Visibility Check
                        if (!visibility[it.id]) return null;

                        // 2. Custom Exclusions (Legacy Game Modes)
                        if (['Pulito', 'Venezuela'].includes(it.lottery)) return null;

                        // 3. Data Adaptation
                        const trackId = it.id;
                        const res = dbResults.find(r => r.lotteryId === trackId && r.date === selectedDate) ||
                            (selectedDate === todayStr() ? dbResults.filter(r => r.lotteryId === trackId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] : null);

                        const resultStr = getResultForTrack(trackId);
                        const colorClass = getTrackColorClasses(trackId) || 'bg-slate-700';
                        const abbr = getAbbreviation(it.lottery);
                        const LogoComponent = getLotteryLogo(it.lottery);

                        // Parse Numbers
                        const rawClean = resultStr.replace(/[^0-9-\s]/g, '');
                        const isPending = resultStr === 'Pending' || !resultStr || resultStr.trim() === '';
                        const parts = isPending ? [] : rawClean.split(/[-\s]+/).filter(Boolean);

                        const isPick3 = it.lottery.toLowerCase().includes('pick 3') || it.lottery.toLowerCase().includes('numbers');
                        const isWin4 = it.lottery.toLowerCase().includes('win 4') || it.lottery.toLowerCase().includes('win4');

                        const getBallGradient = (idx: number) => {
                            // Data-Driven: Checks "parts" (groups) or implicit indices.
                            // In this component, "parts" is an array of strings like ["9", "2", "6", "7", "9", "2", "9"] OR ["926", "7929"]

                            // Calculate TOTAL digits to guess game type
                            const totalDigits = parts.reduce((acc, p) => acc + p.length, 0);

                            // Mixed 7 (3+4)
                            if (totalDigits === 7) {
                                // We need to know where we are.
                                // If parts are split by digit: idx is just the ball index.
                                // If parts are grouped, gIdx is the group.
                                // This function is called as getBallGradient(gIdx) in the mapped code where "parts" is the groups.
                                // Wait, the existing code maps parts (groups), then splits digits.
                                // Just return BLUE if it's the FIRST group and that group is 3 digits.
                                // OR if parts are single digits, return Blue for first 3.

                                // Actually, let's look at how it's called:
                                // parts.map((group, gIdx) => ... group.split('').map(...) )
                                // It passes 'gIdx' to this function.

                                // Scenario A: ["9", "2", "6", "7"...] -> gIdx 0, 1, 2 should be blue.
                                if (parts.length === 7) return idx < 3 ? 'radial-gradient(circle at 30% 30%, #bfdbfe, #3b82f6)' : 'radial-gradient(circle at 30% 30%, #ffffff, #94a3b8)';

                                // Scenario B: ["926", "7929"] -> gIdx 0 should be blue.
                                if (parts.length === 2 && parts[0].length === 3) return idx === 0 ? 'radial-gradient(circle at 30% 30%, #bfdbfe, #3b82f6)' : 'radial-gradient(circle at 30% 30%, #ffffff, #94a3b8)';
                            }

                            // Pure Pick 3
                            if (totalDigits === 3) return 'radial-gradient(circle at 30% 30%, #bfdbfe, #3b82f6)';

                            if (isPick3) return 'radial-gradient(circle at 30% 30%, #bfdbfe, #3b82f6)';
                            return 'radial-gradient(circle at 30% 30%, #ffffff, #94a3b8)';
                        };

                        const isManualCapable = ['BK Paper', '3-5-7', 'Extra', 'New York Horses'].some(n => it.lottery.includes(n));

                        return (
                            <div
                                key={it.id}
                                className={`relative aspect-square border rounded-2xl overflow-hidden hover:-translate-y-1 transition-all duration-300 shadow-md group flex flex-col 
                                    ${theme === 'dark' ? 'bg-[#151e32]' : 'bg-[#e2d9c8]'} 
                                    ${isManualCapable ? 'cursor-pointer hover:border-neon-cyan/60 border-neon-cyan/20' : (theme === 'dark' ? 'border-slate-700/50 hover:border-slate-500' : 'border-neutral-300 hover:border-neutral-400')}`}
                                onClick={() => isManualCapable && (() => {
                                    setManualTarget({ id: it.id, name: it.lottery });
                                    setManualStep('auth');
                                    setIsAddResultOpen(true);
                                })()}
                            >

                                {/* HEADER */}
                                <div className={`h-[35%] ${colorClass} relative overflow-hidden px-1 flex items-center justify-center shrink-0`}>
                                    <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent"></div>

                                    {/* Logo Absolute Top Left (Pinned) */}
                                    <div className="absolute left-2 top-2 z-20">
                                        <div
                                            className={`rounded-lg flex items-center justify-center shadow-inner overflow-hidden ${LogoComponent ? 'bg-white p-0.5' : 'bg-black/30 backdrop-blur-md border border-white/10 text-white font-bold'}`}
                                            style={{
                                                width: isCompact ? '20px' : '32px',
                                                height: isCompact ? '20px' : '32px',
                                                fontSize: isCompact ? '8px' : '10px'
                                            }}
                                        >
                                            {LogoComponent ? LogoComponent : <span className="text-xs">{abbr}</span>}
                                        </div>
                                    </div>

                                    {/* Text Info - CENTERED & LARGE - NO TRUNCATE */}
                                    <div className="relative z-10 flex flex-col items-center justify-center w-full px-2 pt-2">
                                        <h3 className="font-extrabold text-white leading-none tracking-tight drop-shadow-md text-center w-full break-words"
                                            style={{ fontSize: isCompact ? '1.0rem' : '1.6rem', lineHeight: 1.1 }}>
                                            {it.lottery.replace('Lottery', '').replace('Lotería', '').trim()}
                                        </h3>
                                        <span className="text-white/95 font-bold font-mono uppercase tracking-widest mt-0.5 text-center text-sm"
                                            style={{ fontSize: isCompact ? '0.6rem' : '0.8rem' }}>
                                            {it.draw}
                                        </span>
                                    </div>
                                </div>

                                {/* NUMBERS (3D BALLS) */}
                                <div className={`flex-1 flex flex-col items-center justify-center relative p-1 overflow-hidden ${theme === 'dark' ? 'bg-[#0b1121]' : 'bg-slate-50'}`}>
                                    <div className={`absolute inset-0 opacity-20 pointer-events-none ${theme === 'dark' ? 'bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)]' : 'bg-[linear-gradient(to_right,#cbd5e1_1px,transparent_1px),linear-gradient(to_bottom,#cbd5e1_1px,transparent_1px)]'}`} style={{ backgroundSize: '14px 14px' }}></div>

                                    <div className="relative z-10 flex flex-wrap items-center justify-center gap-1 content-center h-full w-full">

                                        {/* PENDING STATE */}
                                        {isPending ? (
                                            <span className={`font-black opacity-30 text-5xl ${theme === 'dark' ? 'text-slate-700' : 'text-slate-300'}`}>---</span>
                                        ) : (
                                            /* Santo Domingo / 3-Pair Logic */
                                            (it.lottery.includes("Santo") || (parts.length === 3 && parts[0].length === 2 && parts[1].length === 2)) ? (
                                                <div className="flex flex-nowrap items-center justify-center gap-1 w-full pb-1">
                                                    {["1st", "2nd", "3rd"].map((label, idx) => (
                                                        <div key={idx} className="flex flex-col items-center justify-center">
                                                            <div
                                                                className={`rounded-full flex items-center justify-center font-black text-slate-900 relative shadow-[0_2px_4px_rgba(0,0,0,0.4)]`}
                                                                style={{
                                                                    width: isCompact ? '26px' : '50px',
                                                                    height: isCompact ? '26px' : '50px',
                                                                    fontSize: isCompact ? '14px' : '24px',
                                                                    background: idx === 0 ? 'radial-gradient(circle at 30% 30%, #bfdbfe, #3b82f6)' : 'radial-gradient(circle at 30% 30%, #ffffff, #94a3b8)',
                                                                    boxShadow: 'inset -2px -2px 4px rgba(0,0,0,0.25), 2px 4px 6px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1)',
                                                                }}
                                                            >
                                                                {parts[idx] || '--'}
                                                                <div className="absolute top-[15%] left-[20%] w-[20%] h-[20%] bg-gradient-to-br from-white to-transparent rounded-full opacity-80 blur-[0.5px]"></div>
                                                            </div>
                                                            <span className={`font-bold uppercase tracking-wider mt-0.5 ${idx === 0 ? 'text-blue-500' : 'text-slate-400'}`} style={{ fontSize: isCompact ? '0.5rem' : '0.65rem' }}>{label}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                /* Standard USA Cards */
                                                parts.map((group, gIdx) => (
                                                    <div key={gIdx} className="flex gap-1 items-center">
                                                        {gIdx > 0 && <div className="w-px h-8 bg-slate-400 mx-1"></div>}
                                                        {group.split('').map((digit, dIdx) => (
                                                            <div
                                                                key={`${gIdx}-${dIdx}`}
                                                                className="rounded-full flex items-center justify-center font-black text-slate-900 relative hover:scale-110 hover:rotate-12 transition-transform duration-300 cursor-default shadow-[0_3px_6px_rgba(0,0,0,0.4)]"
                                                                style={{
                                                                    width: isCompact ? '24px' : '45px',
                                                                    height: isCompact ? '24px' : '45px',
                                                                    fontSize: isCompact ? '14px' : '26px',
                                                                    background: getBallGradient(gIdx),
                                                                    boxShadow: 'inset -2px -2px 4px rgba(0,0,0,0.25), 2px 4px 6px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1)',
                                                                }}
                                                            >
                                                                {digit}
                                                                <div className="absolute top-[15%] left-[20%] w-[20%] h-[20%] bg-gradient-to-br from-white to-transparent rounded-full opacity-80 blur-[0.5px]"></div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ))
                                            )
                                        )}
                                    </div>

                                    {isManualCapable && (
                                        <div className={`absolute bottom-1 right-1 text-[9px] uppercase tracking-widest font-bold pointer-events-none ${theme === 'dark' ? 'text-neon-cyan/50' : 'text-blue-600/50'}`}>
                                            Editable
                                        </div>
                                    )}
                                </div>

                                {/* FOOTER (Homepage Style) */}
                                <div className={`border-t p-2 shrink-0 h-[18%] flex items-center justify-between relative overflow-hidden group ${theme === 'dark' ? 'bg-[#020617] border-slate-700/50' : 'bg-slate-100 border-slate-200'}`}>
                                    <div className="relative flex-1 h-full flex flex-col justify-center">
                                        {/* Default Layer: Draw Date */}
                                        <div className="flex flex-col absolute left-0 justify-center transition-all duration-300 opacity-100 translate-y-0 group-hover:-translate-y-full group-hover:opacity-0 pointer-events-none w-full">
                                            <span className={`uppercase tracking-wider font-bold leading-none mb-1 text-[10px] ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Draw Date</span>
                                            <span className={`font-mono font-bold leading-none text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                                {res ? new Date(res.date.includes('T') ? res.date : `${res.date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : selectedDate}
                                            </span>
                                        </div>
                                        {/* Hover Layer: Updated At */}
                                        <div className="flex flex-col absolute left-0 justify-center transition-all duration-300 opacity-0 translate-y-full group-hover:translate-y-0 group-hover:opacity-100 w-full">
                                            <span className={`uppercase tracking-wider font-bold leading-none mb-1 text-[10px] ${theme === 'dark' ? 'text-neon-cyan' : 'text-blue-600'}`}>Updated At</span>
                                            <span className={`font-mono font-bold leading-none text-sm ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                                                {res ? new Date(res.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                            </span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleOpenHistory(it.id); }}
                                        className={`px-3 h-[80%] rounded-full font-bold border transition-all uppercase tracking-wide flex items-center justify-center shrink-0 ml-2 shadow-sm text-[10px] ${theme === 'dark' ? 'bg-slate-800 hover:bg-neon-cyan hover:text-black text-neon-cyan border-slate-700' : 'bg-white hover:bg-blue-600 hover:text-white text-blue-600 border-slate-300'}`}
                                    >
                                        History
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Independent High Frequency Games */}
                <div className="max-w-[1920px] mx-auto pb-10" id="hf-section">
                    <HighFrequencyAccordion
                        results={dbResults}
                        theme={theme}
                        externalOpen={isHFOpen}
                        onToggle={setIsHFOpen}
                    />

                    {/* Version Tag */}
                    <div className={`text-center mt-8 text-xs font-mono opacity-40 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                        v2.2 (GA-12:15)
                    </div>
                </div>
            </div>

            {/* MANUAL RESULT MODAL W/ AUTH & DATE TIME */}
            {isAddResultOpen && manualStep === 'auth' && (
                <div className="fixed inset-0 bg-black/90 z-[300] flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl w-full max-w-sm text-center">
                        <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/30">
                            <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Admin Edit</h3>
                        <p className="text-sm text-gray-400 mb-6">Enter PIN to manage results for <br /><span className="text-white font-bold">{manualTarget?.name}</span></p>

                        <input
                            type="password"
                            autoFocus
                            maxLength={6}
                            value={manualPin}
                            onChange={e => setManualPin(e.target.value)}
                            className="bg-black border-2 border-slate-700 rounded-xl px-4 py-3 text-center text-2xl tracking-[0.5em] text-white focus:border-neon-cyan outline-none w-full mb-4 font-mono"
                            placeholder="••••••"
                        />
                        {manualError && <p className="text-red-500 text-sm mb-4 animate-pulse">{manualError}</p>}

                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => { setIsAddResultOpen(false); setManualPin(''); setManualError(''); }} className="py-3 rounded-xl bg-slate-800 text-gray-400 font-bold hover:bg-slate-700">Cancel</button>
                            <button
                                onClick={() => {
                                    if (manualPin === '198312') {
                                        setManualStep('input');
                                        setManualError('');
                                        // Prefill logic
                                        const r = dbResults.find(res => res.lotteryId === manualTarget?.id && res.date === newResultDate);
                                        if (r) {
                                            const raw = (r.first ? `${r.first}${r.second}${r.third}` : r.pick3 || r.pick4 || '');
                                            setManualNumbers(raw.replace(/\D/g, ''));
                                            const time = new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
                                            setManualTime(time);
                                        } else {
                                            setManualNumbers('');
                                            setManualTime('');
                                        }
                                    } else {
                                        setManualError('Invalid PIN');
                                        setManualPin('');
                                    }
                                }}
                                className="py-3 rounded-xl bg-neon-cyan text-black font-bold hover:brightness-110 shadow-lg"
                            >
                                Unlock
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isAddResultOpen && manualStep === 'input' && (
                <div className="fixed inset-0 bg-black/90 z-[300] flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">Update Result</h3>
                            <button onClick={() => setIsAddResultOpen(false)} className="text-gray-500 hover:text-white">✕</button>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                                <label className="text-xs text-gray-500 uppercase font-bold mb-1 block">Track</label>
                                <div className="text-neon-cyan font-bold text-lg">{manualTarget?.name}</div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-gray-500 uppercase font-bold mb-1 block">Date</label>
                                    <input type="date" value={newResultDate} onChange={e => setNewResultDate(e.target.value)} className="w-full bg-black border border-slate-600 rounded-lg p-3 text-white outline-none focus:border-neon-cyan" />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 uppercase font-bold mb-1 block">Time (HH:MM)</label>
                                    <input type="time" value={manualTime} onChange={e => setManualTime(e.target.value)} className="w-full bg-black border border-slate-600 rounded-lg p-3 text-white outline-none focus:border-neon-cyan" />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs text-gray-500 uppercase font-bold mb-1 block">Winning Numbers</label>
                                <input
                                    type="text"
                                    value={manualNumbers}
                                    onChange={e => {
                                        const val = e.target.value.replace(/[^0-9]/g, '');
                                        setManualNumbers(val);
                                    }}
                                    className="w-full bg-black border-2 border-slate-600 rounded-xl p-4 text-center text-3xl font-mono text-white tracking-[0.2em] focus:border-neon-cyan outline-none"
                                    placeholder="000"
                                />
                                <p className="text-center text-xs text-gray-500 mt-2">Enter digits continuously (e.g. 123 or 102030)</p>
                            </div>

                            <button
                                onClick={async () => {
                                    if (!manualTarget) return;
                                    // Submit Logic
                                    const clean = manualNumbers;
                                    let formatted = clean;
                                    // Heuristic Formatting
                                    if (clean.length === 4) formatted = `${clean.slice(0, 3)}-${clean.slice(3)}`;
                                    if (clean.length === 6) formatted = `${clean.slice(0, 2)}-${clean.slice(2, 4)}-${clean.slice(4, 6)}`;

                                    try {
                                        const res = await fetch('/api/results/manual', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                resultId: manualTarget.id,
                                                lotteryName: manualTarget.name,
                                                drawName: 'Manual',
                                                numbers: formatted,
                                                drawDate: newResultDate,
                                                drawTime: manualTime,
                                                country: 'Special'
                                            })
                                        });

                                        if (res.ok) {
                                            playSound('success');
                                            loadMergedResults();
                                            setIsAddResultOpen(false);
                                            setManualStep(null);
                                        } else {
                                            const err = await res.json();
                                            alert(`Error: ${err.error || 'Failed to save'}`);
                                        }
                                    } catch (e) {
                                        console.error(e);
                                        alert("Network error");
                                    }
                                }}
                                className="w-full py-3 bg-gradient-to-r from-neon-cyan to-blue-600 text-black font-bold rounded-xl shadow-lg mt-2 hover:brightness-110"
                            >
                                SAVE RESULT
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* HISTORY MODAL */}
            {isHistoryOpen && (
                <div className="fixed inset-0 bg-black/80 z-[250] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setIsHistoryOpen(false)}>
                    <div className={`${theme === 'dark' ? 'bg-slate-900 border-slate-600' : 'bg-white border-slate-200'} w-full max-w-md rounded-xl border shadow-2xl flex flex-col max-h-[80vh]`} onClick={e => e.stopPropagation()}>
                        <div className={`p-4 border-b flex justify-between items-center ${theme === 'dark' ? 'border-slate-700 bg-slate-900/50' : 'border-slate-200 bg-slate-50'}`}>
                            <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>History: <span className={theme === 'dark' ? 'text-neon-cyan ml-2' : 'text-blue-600 ml-2'}>{historyTarget?.name}</span></h3>
                            <button onClick={() => setIsHistoryOpen(false)} className={`${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-slate-400 hover:text-black'}`}>✕</button>
                        </div>
                        <div className="overflow-y-auto p-4 space-y-3 custom-scrollbar">
                            {historyData.length === 0 ? (
                                <p className="text-center text-gray-500 py-8">No history found for this track.</p>
                            ) : (
                                historyData.map(res => (
                                    <div key={res.id} className={`${theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'} border rounded-lg p-3 flex justify-between items-center`}>
                                        <div>
                                            <div className="text-sm font-bold uppercase text-gray-500">
                                                {(() => {
                                                    const raw = res.date || res.drawDate || '2000-01-01';
                                                    const safe = raw.includes('T') ? raw : `${raw}T12:00:00`;
                                                    return new Date(safe).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                                                })()}
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            {(res.first || res.numbers) ? (
                                                <div className={`font-mono font-bold text-lg tracking-widest ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                                    {res.numbers || `${res.first}-${res.second}-${res.third}`}
                                                </div>
                                            ) : (
                                                <span className="text-gray-500 text-xs italic">Partial</span>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ResultsPage;
