import React, { useEffect, useState } from 'react';
import type { LotteryResult } from '../types';
import { getTrackColorClasses, getAbbreviation, formatWinningResult } from '../utils/helpers';
import { localDbService } from '../services/localDbService';
import { getLotteryLogo } from './LotteryLogos';
import { TRACK_CATEGORIES, RESULTS_CATALOG } from '../constants';

const ResultsDashboard: React.FC<{ zoomScale?: number; theme?: string }> = ({ zoomScale = 1, theme = 'dark' }) => {
    const [results, setResults] = useState<LotteryResult[]>([]);
    const [loading, setLoading] = useState(true);
    // Default to first category
    const [activeTab, setActiveTab] = useState<string>(TRACK_CATEGORIES[0].name);

    // History Modal State
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [historyTarget, setHistoryTarget] = useState<{ id: string, name: string } | null>(null);
    const [historyDate, setHistoryDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [historyResult, setHistoryResult] = useState<LotteryResult | null>(null);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Manual Entry State
    const [manualTarget, setManualTarget] = useState<{ id: string, name: string } | null>(null);
    const [manualStep, setManualStep] = useState<'auth' | 'input' | null>(null);
    const [adminPin, setAdminPin] = useState('');
    const [manualNumbers, setManualNumbers] = useState('');
    const [manualError, setManualError] = useState('');

    // Advanced Manual Entry State (Time & Close Config)
    const [manualTime, setManualTime] = useState('');
    const [showConfig, setShowConfig] = useState(false);
    const [configType, setConfigType] = useState<'GENERAL' | 'PER_DIGIT'>('GENERAL');
    const [generalCloseTime, setGeneralCloseTime] = useState('');
    const [digitCloseTimes, setDigitCloseTimes] = useState<{ [key: string]: string }>({});

    useEffect(() => {
        const fetchResults = async () => {
            try {
                // 1. Load Local Data
                const rawLocal = localDbService.getResults();
                const localData: LotteryResult[] = rawLocal.map(r => ({
                    resultId: r.lotteryId,
                    // Basic default, accurate mapping happens via ID in UI anyway
                    country: r.lotteryId.startsWith('rd') ? 'SD' : 'USA',
                    lotteryName: r.lotteryName,
                    drawName: r.lotteryId.split('/').pop() || 'Draw',
                    numbers: formatWinningResult(r),
                    drawDate: r.date,
                    scrapedAt: r.createdAt
                }));

                // 2. Fetch API Data
                let remoteData: LotteryResult[] = [];
                try {
                    const res = await fetch('/api/results');
                    if (res.ok) {
                        const rawData = await res.json();
                        remoteData = rawData;
                    }
                } catch (e) {
                    console.warn("API offline, using local data only.");
                }

                // 3. Merge Strategy: Group by ResultID (Strict)
                // We do NOT deduplicate by name anymore, because we want 'NY Midday' and 'NY Evening' to both show.
                // We rely on 'resultId' uniqueness.

                const allData = [...localData, ...remoteData];
                const groupedById = new Map<string, LotteryResult[]>();

                allData.forEach(r => {
                    // Normalization
                    if (!r.resultId) return;

                    if (!groupedById.has(r.resultId)) groupedById.set(r.resultId, []);
                    groupedById.get(r.resultId)?.push(r);
                });

                const latestMap = new Map<string, LotteryResult>();

                groupedById.forEach((group, id) => {
                    // Sort Descending (Newest First)
                    group.sort((a, b) => new Date(b.drawDate).getTime() - new Date(a.drawDate).getTime());

                    // Find first VALID result (non-placeholder)
                    const valid = group.find(r => {
                        const nums = formatWinningResult(r); // ensure string format
                        if (!nums) return false;
                        if (nums.includes('---')) return false;
                        if (nums.includes('—')) return false;
                        if (nums.trim() === '-') return false;
                        if (nums.trim() === '') return false;
                        return true;
                    });

                    // Use valid if found, else falling back to the very latest date (even if empty)
                    // But normalize the numbers string for display
                    const best = valid ? { ...valid, numbers: formatWinningResult(valid) } : { ...group[0], numbers: formatWinningResult(group[0]) };

                    latestMap.set(id, best);
                });

                setResults(Array.from(latestMap.values()));

            } catch (error) {
                console.error("Failed to load results", error);
            } finally {
                setLoading(false);
            }
        };

        fetchResults();
        const interval = setInterval(fetchResults, 60000);
        return () => clearInterval(interval);
    }, []);

    // Filter Logic: STRICT Whitelist based on Active Tab's Categories
    const currentCategory = TRACK_CATEGORIES.find(c => c.name === activeTab);
    const allowedIds = new Set(currentCategory ? currentCategory.tracks.map(t => t.id) : []);

    const filteredResults = results.filter(r => allowedIds.has(r.resultId));

    // Sort the filtered results to match the ORDER in the catalog (User friendly order)
    filteredResults.sort((a, b) => {
        const catTracks = currentCategory?.tracks || [];
        const indexA = catTracks.findIndex(t => t.id === a.resultId);
        const indexB = catTracks.findIndex(t => t.id === b.resultId);
        return indexA - indexB;
    });

    // --- History Logic (Unchanged) ---
    useEffect(() => {
        if (isHistoryOpen && historyTarget && historyDate) {
            const fetchHistory = async () => {
                setLoadingHistory(true);
                setHistoryResult(null);
                try {
                    const localAll = localDbService.getResults();
                    const foundLocal = localAll.find(r => r.lotteryId === historyTarget.id && r.date === historyDate);

                    if (foundLocal) {
                        setHistoryResult({
                            ...foundLocal,
                            resultId: foundLocal.lotteryId,
                            numbers: formatWinningResult(foundLocal),
                            drawDate: foundLocal.date,
                            scrapedAt: foundLocal.createdAt,
                            country: 'USA',
                            drawName: foundLocal.lotteryName, // fallback
                        } as LotteryResult);
                    } else {
                        const res = await fetch(`/api/results?resultId=${encodeURIComponent(historyTarget.id)}&date=${historyDate}`);
                        if (res.ok) {
                            const data: LotteryResult[] = await res.json();
                            if (data.length > 0) {
                                setHistoryResult(data[0]);
                            }
                        }
                    }
                } catch (e) {
                    console.error("History fetch error", e);
                } finally {
                    setLoadingHistory(false);
                }
            };
            fetchHistory();
        }
    }, [isHistoryOpen, historyTarget, historyDate]);

    const handleOpenHistory = (resultId: string, lotteryName: string) => {
        setHistoryTarget({ id: resultId, name: lotteryName });
        setHistoryDate(new Date().toISOString().split('T')[0]);
        setIsHistoryOpen(true);
    };

    // Manual Entry Handlers
    const handleManualClick = (trackId: string, name: string) => {
        // Only for NY Horses or if extended later
        if (trackId.includes('ny-horses') || name.includes('Horses')) {
            setManualTarget({ id: trackId, name });
            setManualStep('auth');
            setAdminPin('');
            setManualError('');
        }
    };

    const handleAdminAuth = (e: React.FormEvent) => {
        e.preventDefault();
        if (adminPin === '198312') {
            setManualStep('input');
            setManualError('');
            // Pre-fill if exists?
            const existing = results.find(r => r.resultId === manualTarget?.id);
            if (existing) setManualNumbers(existing.numbers.replace(/-/g, ''));
            else setManualNumbers('');
        } else {
            setManualError('Invalid PIN');
        }
    };

    const handleManualSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualTarget) return;

        // Format: 1234 -> 123-4
        // Format: 123 -> 123
        const clean = manualNumbers.replace(/[^0-9]/g, '');
        let formatted = clean;

        if (clean.length === 4) {
            formatted = `${clean.slice(0, 3)}-${clean.slice(3)}`;
        } else if (clean.length === 3) {
            formatted = clean; // Keep as solid group "123"
        } else {
            // Fallback for other lengths: "1-2-3-4-5"? Or just keep raw?
            // Let's keep it clean for now or split all if not standard.
            // If user wants specific format, they type it? No, we suppressed manual typing of hyphens.
            // Let's standard split if weird length to ensure balls.
            if (clean.length > 4) formatted = clean.split('').join('-');
        }

        try {
            // 1. Save Result
            const res = await fetch('/api/results/manual', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    resultId: manualTarget.id,
                    lotteryName: manualTarget.name,
                    drawName: 'Midday',
                    numbers: formatted,
                    drawDate: new Date().toISOString().split('T')[0],
                    drawTime: manualTime, // Send User Time
                    country: 'Special'
                })
            });

            // 2. Save Config (if expanded)
            if (showConfig) {
                await fetch('/api/config/daily-close', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        trackId: manualTarget.id,
                        date: new Date().toISOString().split('T')[0],
                        closingType: configType,
                        generalTime: generalCloseTime,
                        digitTimes: digitCloseTimes
                    })
                });
            }

            if (res.ok) {
                // Optimistic Update
                const newResult = await res.json();
                setResults(prev => {
                    const idx = prev.findIndex(r => r.resultId === manualTarget.id);
                    if (idx >= 0) {
                        const copy = [...prev];
                        copy[idx] = newResult.result;
                        return copy;
                    }
                    return [newResult.result, ...prev];
                });
                setManualStep(null);
                setManualTarget(null);
                // Reset State
                setManualTime('');
                setShowConfig(false);
                setGeneralCloseTime('');
                setDigitCloseTimes({});
            }
        } catch (error) {
            console.error(error);
            setManualError('Failed to save');
        }
    };

    const formatDate = (isoString: string) => {
        try {
            // Fix Timezone: "2025-12-22" -> UTC Midnight -> Prev Day in EST.
            // Force it to Noon to stay in same day.
            const safeDate = isoString.includes('T') ? isoString : `${isoString}T12:00:00`;
            const date = new Date(safeDate);
            return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        } catch (e) { return isoString; }
    };

    const formatTimestamp = (isoString: string | undefined) => {
        if (!isoString) return '--:--';
        try {
            const date = new Date(isoString);
            return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        } catch (e) { return '--:--'; }
    };

    const SkeletonCard = () => (
        <div className="animate-pulse bg-slate-800 border border-slate-700 rounded-xl p-4 h-48 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-slate-700/20 to-transparent"></div>
            <div className="h-10 w-full bg-slate-700/50 rounded mb-4"></div>
            <div className="h-16 w-2/3 bg-slate-700/50 rounded self-center"></div>
            <div className="h-8 w-full bg-slate-700/50 rounded mt-4"></div>
        </div>
    );

    // Base min-width for grid cards
    const BASE_CARD_WIDTH = 220;
    // Dynamic width based on zoom scale. 
    // Example: scale 1 = 220px. Scale 0.5 = 110px. Scale 2 = 440px.
    const minCardWidth = Math.max(140, Math.floor(BASE_CARD_WIDTH * zoomScale));

    return (
        <div className="mt-8 max-w-[95vw] mx-auto px-4">
            {/* Dynamic Tabs */}
            <div className="flex flex-wrap justify-center gap-4 mb-8">
                {TRACK_CATEGORIES.map(category => (
                    <button
                        key={category.name}
                        onClick={() => setActiveTab(category.name)}
                        className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 flex items-center gap-2 border ${activeTab === category.name
                            ? 'bg-blue-600 text-white border-blue-400 shadow-[0_0_15px_rgba(37,99,235,0.4)]'
                            : (theme === 'dark' ? 'bg-slate-900 text-gray-400 border-slate-700 hover:border-slate-500' : 'bg-[#cbbda8] text-slate-800 border-[#b0a08a] hover:bg-[#c0b09a]')
                            }`}
                    >
                        {category.name.includes('Santo') ? <span className="text-lg">🇩🇴</span> : <span className="text-lg">🇺🇸</span>}
                        {category.name}
                    </button>
                ))}
            </div>

            {/* Grid - Fully Responsive with Auto-Fill & Square Aspect */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(auto-fill, minmax(${minCardWidth}px, 1fr))`,
                    gap: '12px'
                }}
                className="w-full transition-all duration-300 ease-in-out pb-20"
            >
                {loading ? (
                    <>
                        <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
                    </>
                ) : (
                    currentCategory?.tracks.filter(t => !t.hideInDashboard).map((track) => {
                        // Find matching result or use placeholder
                        const res = results.find(r => r.resultId === track.id) || {
                            resultId: track.id,
                            country: 'USA', // precise country logic could be improved but sufficient for display
                            lotteryName: track.name.split(' ').slice(0, -1).join(' '), // Approximate name from "New York Midday" -> "New York"
                            drawName: track.name.split(' ').pop() || 'Draw',
                            numbers: '---',
                            drawDate: new Date().toISOString().split('T')[0],
                            scrapedAt: undefined
                        } as LotteryResult;

                        // Use Catalog Metadata for pretty display if available
                        const catalogItem = RESULTS_CATALOG.find(c => c.id === track.id);

                        // 1. SMART ABBREVIATION
                        let displayLotteryName = catalogItem?.lottery || track.name;
                        if (displayLotteryName.includes('New York Horses')) displayLotteryName = 'NY Horses';

                        const displayDrawName = catalogItem?.draw || (track.name.includes(' ') ? track.name.split(' ').pop() : 'Draw');
                        const closeTime = catalogItem?.closeTime || '';

                        // Use consistent color/abbr logic
                        const colorClass = getTrackColorClasses(track.id || track.name);
                        const abbr = getAbbreviation(track.id || track.name);
                        const LogoComponent = getLotteryLogo(displayLotteryName); // Use cleanly extracted name

                        // Dynamic Font Sizing Math
                        const isCompact = zoomScale < 0.6;

                        const isManualCapable = displayLotteryName.includes('NY Horses');

                        // Parse Numbers
                        const rawNumbers = res.numbers || '---';
                        const parts = rawNumbers.split('-'); // ["1", "2", "3"]

                        // Determine Grouping for Colors/Separators
                        // Scenario: Pick 3 (3 nums) vs Win 4 (4 nums).
                        // Usually distinct tracks. But if we had "123-4567" (Double Results)...
                        // Logic: If parts.length > 4? Or assume standard tracks are single group.
                        // User Request: "Distinguish Pick 3 vs Pick 4".
                        // If this track is purely Pick 3, all Bone. If purely Win 4, all White.
                        // IF it is a Combined result (rare here, but possible), split.
                        // Let's assume standard behavior:
                        // - NY Horses is usually 3 or 4 digits.
                        // - "Pick 3" words in name -> Bone.
                        // - "Win 4" words in name -> White.
                        // - Else -> White.

                        const isPick3 = displayLotteryName.toLowerCase().includes('pick 3') || displayLotteryName.toLowerCase().includes('numbers');
                        const isWin4 = displayLotteryName.toLowerCase().includes('win 4') || displayLotteryName.toLowerCase().includes('win4');

                        // Ball Color Logic
                        const getBallGradient = (idx: number, total: number) => {
                            // Robust Data-Driven Logic
                            // If we have 7 balls, it's usually Pick 3 + Pick 4 -> First 3 are Blue.
                            if (total === 7) return idx < 3 ? 'radial-gradient(circle at 30% 30%, #bfdbfe, #3b82f6)' : 'radial-gradient(circle at 30% 30%, #ffffff, #94a3b8)';

                            // If we have 3 balls, it's Pick 3 -> All Blue.
                            if (total === 3) return 'radial-gradient(circle at 30% 30%, #bfdbfe, #3b82f6)';

                            // Fallback to name check if weird length
                            if (isPick3) return 'radial-gradient(circle at 30% 30%, #bfdbfe, #3b82f6)';

                            return 'radial-gradient(circle at 30% 30%, #ffffff, #94a3b8)'; // Default White
                        };

                        return (
                            <div
                                key={track.id}
                                className={`relative aspect-square border rounded-2xl overflow-hidden hover:-translate-y-1 transition-all duration-300 shadow-md group flex flex-col 
                                    ${theme === 'dark' ? 'bg-[#151e32]' : 'bg-[#e2d9c8]'} 
                                    ${isManualCapable ? 'cursor-pointer hover:border-neon-cyan/60 border-neon-cyan/20' : (theme === 'dark' ? 'border-slate-700/50 hover:border-slate-500' : 'border-neutral-300 hover:border-neutral-400')}`}
                                onClick={() => isManualCapable && handleManualClick(track.id, displayLotteryName)}
                            >

                                {/* HEADER */}
                                <div className={`h-[32%] ${colorClass} relative overflow-hidden px-1 flex items-center justify-center shrink-0`}>
                                    <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent"></div>

                                    {/* Logo Absolute Top Left (Pinned) */}
                                    <div className="absolute left-2 top-2 z-20">
                                        <div
                                            className={`rounded-lg flex items-center justify-center shadow-inner overflow-hidden ${LogoComponent ? 'bg-white p-0.5' : 'bg-black/30 backdrop-blur-md border border-white/10 text-white font-bold'}`}
                                            style={{
                                                width: isCompact ? '20px' : '32px',
                                                height: isCompact ? '20px' : '32px',
                                                fontSize: isCompact ? '9px' : '12px'
                                            }}
                                        >
                                            {LogoComponent ? LogoComponent : abbr}
                                        </div>
                                    </div>

                                    {/* Text Info - CENTERED & LARGE - NO TRUNCATE */}
                                    <div className="relative z-10 flex flex-col items-center justify-center w-full px-2 pt-2">
                                        <h3 className="font-extrabold text-white leading-none tracking-tight drop-shadow-md text-center w-full break-words"
                                            style={{ fontSize: isCompact ? '0.9rem' : '1.4rem', lineHeight: 1.1 }}>
                                            {displayLotteryName.replace('Lottery', '').replace('Lotería', '').trim()}
                                        </h3>
                                        <span className="text-white/95 font-bold font-mono uppercase tracking-widest mt-0.5 text-center"
                                            style={{ fontSize: isCompact ? '0.6rem' : '0.9rem' }}>
                                            {displayDrawName}
                                        </span>
                                    </div>
                                </div>

                                {/* NUMBERS (3D BALLS) */}
                                <div className={`flex-1 flex flex-col items-center justify-center relative p-1 overflow-hidden ${theme === 'dark' ? 'bg-[#0b1121]' : 'bg-transparent'}`}>
                                    <div className={`absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:14px_14px] ${theme === 'dark' ? 'opacity-20' : 'opacity-5'}`}></div>

                                    <div className="relative z-10 flex flex-wrap items-center justify-center gap-2 content-center h-full w-full">

                                        {/* Santo Domingo / 3-Pair Logic */}
                                        {(displayLotteryName.includes("Santo") || (parts.length === 3 && parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 2)) ? (
                                            <div className="flex flex-nowrap items-center justify-center gap-1 w-full h-full pb-1">
                                                {parts.map((part, pIdx) => (
                                                    <div key={pIdx} className="flex flex-col items-center justify-center" style={{ width: '30%' }}>
                                                        {/* Ball Container */}
                                                        <div className="flex gap-0.5 items-center justify-center mb-0.5" style={{ transform: `scale(${zoomScale < 0.6 ? 0.8 : 1})` }}>
                                                            {part.split('').map((char, cIdx) => (
                                                                <div
                                                                    key={`${pIdx}-${cIdx}`}
                                                                    className="rounded-full flex items-center justify-center font-black text-slate-900 relative shadow-[0_2px_4px_rgba(0,0,0,0.4)]"
                                                                    style={{
                                                                        width: isCompact ? '20px' : '34px',
                                                                        height: isCompact ? '20px' : '34px',
                                                                        fontSize: isCompact ? '12px' : '18px',
                                                                        background: 'radial-gradient(circle at 30% 30%, #ffffff, #94a3b8)',
                                                                        boxShadow: 'inset -2px -2px 4px rgba(0,0,0,0.25), 2px 4px 6px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1)',
                                                                    }}
                                                                >
                                                                    {char}
                                                                    <div className="absolute top-[15%] left-[20%] w-[20%] h-[20%] bg-gradient-to-br from-white to-transparent rounded-full opacity-80 blur-[0.5px]"></div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        {/* Position Label */}
                                                        <span className={`font-bold uppercase tracking-wider text-center leading-none ${pIdx === 0 ? 'text-yellow-400' : pIdx === 1 ? 'text-slate-300' : 'text-orange-400'}`}
                                                            style={{ fontSize: isCompact ? '0.45rem' : '0.6rem' }}>
                                                            {pIdx === 0 ? '1st' : pIdx === 1 ? '2nd' : '3rd'}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            /* Standard Logic for Others */
                                            parts.map((part, pIdx) => (
                                                <div key={pIdx} className="flex gap-1 items-center" style={{ transform: `scale(${zoomScale < 0.5 ? 0.8 : 1})` }}>
                                                    {/* Separator if not first group? */}
                                                    {pIdx > 0 && <div className="w-1 h-1 rounded-full bg-slate-600 mx-1"></div>}

                                                    {part.split('').map((char, cIdx) => (
                                                        <div
                                                            key={`${pIdx}-${cIdx}`}
                                                            className="rounded-full flex items-center justify-center font-black text-slate-900 relative hover:scale-110 hover:rotate-12 transition-transform duration-300 cursor-default shadow-[0_4px_8px_rgba(0,0,0,0.4)]"
                                                            style={{
                                                                width: isCompact ? '24px' : '40px',
                                                                height: isCompact ? '24px' : '40px',
                                                                fontSize: isCompact ? '14px' : '22px',
                                                                background: getBallGradient(pIdx, parts.length),
                                                                boxShadow: 'inset -2px -2px 4px rgba(0,0,0,0.25), 2px 4px 6px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1)',
                                                            }}
                                                        >
                                                            {char}
                                                            <div className="absolute top-[15%] left-[20%] w-[20%] h-[20%] bg-gradient-to-br from-white to-transparent rounded-full opacity-80 blur-[0.5px]"></div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ))
                                        )}
                                        {rawNumbers === '---' && (
                                            <span className="text-slate-700 font-black opacity-50" style={{ fontSize: isCompact ? '1.5rem' : '2.5rem' }}>---</span>
                                        )}
                                    </div>
                                    {isManualCapable && (
                                        <div className="absolute bottom-1 right-1 text-[8px] text-neon-cyan/50 uppercase tracking-widest font-bold pointer-events-none">
                                            Admin Edit
                                        </div>
                                    )}
                                </div>

                                {/* FOOTER (Synced with Body Color) */}
                                <div className={`${theme === 'dark' ? 'bg-[#020617] border-t border-slate-700/50' : 'bg-transparent border-t border-black/5'} p-2 shrink-0 h-[20%] flex items-center justify-between relative overflow-hidden`}>
                                    <div className="relative flex-1 h-full flex flex-col justify-center">
                                        <div className="flex flex-col absolute left-0 justify-center transition-all duration-300 opacity-100 translate-y-0 group-hover:-translate-y-full group-hover:opacity-0 pointer-events-none w-full">
                                            <span className={`uppercase tracking-wider font-bold leading-none mb-0.5 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}`} style={{ fontSize: '0.5rem' }}>Draw Date</span>
                                            <span className={`font-mono font-bold leading-none ${theme === 'dark' ? 'text-slate-300' : 'text-slate-900'}`} style={{ fontSize: isCompact ? '0.7rem' : '0.8rem' }}>
                                                {formatDate(res.drawDate)}
                                            </span>
                                        </div>
                                        <div className="flex flex-col absolute left-0 justify-center transition-all duration-300 opacity-0 translate-y-full group-hover:translate-y-0 group-hover:opacity-100 w-full">
                                            <span className={`uppercase tracking-wider font-bold leading-none mb-0.5 ${theme === 'dark' ? 'text-neon-cyan' : 'text-blue-700'}`} style={{ fontSize: '0.5rem' }}>Updated At</span>
                                            <span className={`font-mono font-bold leading-none whitespace-nowrap overflow-hidden text-ellipsis ${theme === 'dark' ? 'text-white' : 'text-black'}`} style={{ fontSize: isCompact ? '0.7rem' : '0.8rem' }}>
                                                {res.scrapedAt ? formatTimestamp(res.scrapedAt).split(',')[1] : '-'}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleOpenHistory(track.id, displayLotteryName); }}
                                        className={`px-3 h-[80%] rounded-full font-bold border transition-all uppercase tracking-wide flex items-center justify-center shrink-0 ml-1 shadow-lg
                                            ${theme === 'dark'
                                                ? 'bg-slate-800 hover:bg-neon-cyan hover:text-black text-neon-cyan border-slate-700'
                                                : 'bg-black/5 hover:bg-blue-600 hover:text-white text-blue-800 border-black/10'}`}
                                        style={{ fontSize: isCompact ? '0.55rem' : '0.7rem' }}
                                    >
                                        History
                                    </button>
                                </div>

                            </div>
                        );
                    })
                )}
            </div>

            {/* MANUAL ENTRY MODAL */}
            {manualStep && manualTarget && (
                <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-[100] backdrop-blur-md" onClick={() => setManualStep(null)}>
                    <div className="bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-700 shadow-2xl p-6 flex flex-col gap-4 relative" onClick={e => e.stopPropagation()}>

                        <button onClick={() => setManualStep(null)} className="absolute top-4 right-4 text-slate-500 hover:text-white">✕</button>

                        <h3 className="text-xl font-bold text-white text-center">
                            {manualStep === 'auth' ? 'Admin Access' : `Update: ${manualTarget.name}`}
                        </h3>

                        {manualStep === 'auth' ? (
                            <form onSubmit={handleAdminAuth} className="flex flex-col gap-4">
                                <div className="text-center text-sm text-slate-400">Enter Admin PIN to edit results.</div>
                                <input
                                    type="password"
                                    placeholder="PIN"
                                    value={adminPin}
                                    onChange={e => setAdminPin(e.target.value)}
                                    className="w-full bg-black border border-slate-700 rounded-lg p-3 text-white text-center tracking-[1em] font-bold outline-none focus:border-neon-cyan"
                                    autoFocus
                                />
                                {manualError && <p className="text-red-500 text-xs text-center">{manualError}</p>}
                                <button type="submit" className="w-full py-3 rounded-lg bg-neon-cyan text-black font-bold uppercase tracking-wider hover:bg-white transition-all">
                                    Authenticate
                                </button>
                            </form>
                        ) : (
                            <form onSubmit={handleManualSave} className="flex flex-col gap-4 max-h-[80vh] overflow-y-auto pr-2 custom-scrollbar">
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs uppercase text-slate-500 font-bold">Winning Numbers</label>
                                    <input
                                        type="text"
                                        placeholder="1234"
                                        value={manualNumbers}
                                        onChange={e => setManualNumbers(e.target.value)}
                                        maxLength={8}
                                        className="w-full bg-black border border-slate-700 rounded-lg p-3 text-2xl text-white text-center font-black tracking-widest outline-none focus:border-neon-cyan"
                                        autoFocus
                                    />
                                </div>

                                <div className="flex flex-col gap-1">
                                    <label className="text-xs uppercase text-slate-500 font-bold">Time of Result (HH:mm)</label>
                                    <input
                                        type="time"
                                        value={manualTime}
                                        onChange={e => setManualTime(e.target.value)}
                                        className="w-full bg-black border border-slate-700 rounded-lg p-2 text-white text-center outline-none focus:border-neon-cyan"
                                    />
                                </div>

                                <div className="border-t border-slate-700 pt-2 mt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowConfig(!showConfig)}
                                        className="text-xs font-bold text-neon-cyan hover:text-white uppercase tracking-wider w-full text-left flex justify-between items-center py-2"
                                    >
                                        <span>⚙️ Set Daily Close Time</span>
                                        <span>{showConfig ? '▲' : '▼'}</span>
                                    </button>
                                </div>

                                {showConfig && (
                                    <div className="flex flex-col gap-3 bg-slate-800/50 p-3 rounded-lg border border-slate-700 animate-in fade-in zoom-in-95 duration-200">
                                        <div className="flex gap-2 bg-slate-900 p-1 rounded-md">
                                            <button
                                                type="button"
                                                onClick={() => setConfigType('GENERAL')}
                                                className={`flex-1 py-1 px-2 rounded text-[10px] uppercase font-bold transition-all ${configType === 'GENERAL' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                                            >
                                                General
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setConfigType('PER_DIGIT')}
                                                className={`flex-1 py-1 px-2 rounded text-[10px] uppercase font-bold transition-all ${configType === 'PER_DIGIT' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                                            >
                                                Per Horse
                                            </button>
                                        </div>

                                        {configType === 'GENERAL' ? (
                                            <div>
                                                <label className="text-[10px] uppercase text-slate-500 font-bold block mb-1">General Closing Time</label>
                                                <input
                                                    type="time"
                                                    value={generalCloseTime}
                                                    onChange={e => setGeneralCloseTime(e.target.value)}
                                                    className="w-full bg-black border border-slate-600 rounded p-2 text-white text-sm outline-none focus:border-neon-cyan"
                                                />
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 gap-2">
                                                {[1, 2, 3, 4].map(num => (
                                                    <div key={num}>
                                                        <label className="text-[10px] uppercase text-slate-500 font-bold block mb-1">Horse #{num}</label>
                                                        <input
                                                            type="time"
                                                            value={digitCloseTimes[num.toString()] || ''}
                                                            onChange={e => setDigitCloseTimes({ ...digitCloseTimes, [num.toString()]: e.target.value })}
                                                            className="w-full bg-black border border-slate-600 rounded p-2 text-white text-xs outline-none focus:border-neon-cyan"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="flex justify-between text-xs text-slate-500 px-2 mt-2">
                                    <span>Today's Date:</span>
                                    <span className="text-white font-mono">{new Date().toISOString().split('T')[0]}</span>
                                </div>
                                <button type="submit" className="w-full py-3 rounded-lg bg-green-500 text-black font-bold uppercase tracking-wider hover:bg-green-400 transition-all shadow-[0_0_20px_rgba(34,197,94,0.4)]">
                                    Update Result & Settings
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* HISTORY MODAL */}
            {isHistoryOpen && historyTarget && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[100] backdrop-blur-sm" onClick={() => setIsHistoryOpen(false)}>
                    <div className={`${theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'} w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden flex flex-col`} onClick={e => e.stopPropagation()}>
                        <div className={`p-4 border-b flex justify-between items-center ${theme === 'dark' ? 'border-slate-700 bg-slate-800/50' : 'border-slate-100 bg-slate-50'}`}>
                            <h3 className={`${theme === 'dark' ? 'text-white' : 'text-slate-900'} font-bold flex items-center gap-2`}>
                                <span className={theme === 'dark' ? 'text-neon-cyan' : 'text-blue-600'}>History:</span> {historyTarget.name}
                            </h3>
                            <button onClick={() => setIsHistoryOpen(false)} className={`${theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-black'}`}>✕</button>
                        </div>
                        <div className="p-6 flex flex-col gap-4">
                            <div>
                                <label className="text-xs uppercase font-bold text-slate-500 mb-1 block">Select Date</label>
                                <input
                                    type="date"
                                    value={historyDate}
                                    max={new Date().toISOString().split('T')[0]}
                                    onChange={(e) => setHistoryDate(e.target.value)}
                                    className={`w-full border rounded-lg p-3 outline-none ${theme === 'dark' ? 'bg-black border-slate-700 text-white focus:border-neon-cyan' : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'}`}
                                />
                            </div>
                            <div className={`min-h-[150px] flex items-center justify-center border border-dashed rounded-xl ${theme === 'dark' ? 'border-slate-700 bg-slate-800/20' : 'border-slate-300 bg-slate-50'}`}>
                                {loadingHistory ? (
                                    <div className={`flex flex-col items-center gap-2 animate-pulse ${theme === 'dark' ? 'text-neon-cyan' : 'text-blue-600'}`}>
                                        <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                        <span className="text-xs font-bold">Fetching History...</span>
                                    </div>
                                ) : historyResult ? (
                                    <div className="text-center w-full">
                                        <p className="text-slate-500 text-xs uppercase mb-2">Results for {formatDate(historyResult.drawDate)}</p>

                                        {/* History Balls Renderer */}
                                        {/* History Balls Renderer */}
                                        <div className="flex justify-center items-center mb-4 flex-wrap gap-y-2">
                                            {(() => {
                                                const raw = historyResult.numbers || '';
                                                const parts = raw.split(/[-\s]+/).filter(Boolean);

                                                // If 'parts' are chunks like "123" "4567", use length of chunks
                                                // If 'parts' are digits "1" "2" ... check total length
                                                // In the screenshot we saw 7 balls.

                                                // Flatten just in case mixed
                                                const allChars = parts.join('').split('');
                                                const totalChars = allChars.length;

                                                const isMixed7 = totalChars === 7;
                                                const isPurePick3 = totalChars === 3;

                                                return (
                                                    <div className="flex gap-1.5 flex-wrap justify-center">
                                                        {allChars.map((char, i) => {
                                                            // Separator after 3rd ball ONLY if it's a mixed 7-ball game
                                                            const showSeparator = isMixed7 && i === 3;

                                                            let useBlue = false;
                                                            if (isMixed7 && i < 3) useBlue = true;
                                                            if (isPurePick3) useBlue = true;
                                                            // Also support explicit name fallback
                                                            if ((historyTarget.name || '').toLowerCase().includes('pick 3') && i < 3) useBlue = true;

                                                            return (
                                                                <React.Fragment key={i}>
                                                                    {showSeparator && (
                                                                        <div className={`w-px h-8 mx-2 ${theme === 'dark' ? 'bg-slate-600' : 'bg-slate-300'}`}></div>
                                                                    )}
                                                                    <div
                                                                        className={`w-10 h-10 rounded-full font-black flex items-center justify-center shadow-[0_3px_5px_rgba(0,0,0,0.3)] text-xl text-slate-900 border border-black/10`}
                                                                        style={{
                                                                            background: useBlue
                                                                                ? 'radial-gradient(circle at 30% 30%, #bfdbfe, #3b82f6)'
                                                                                : 'radial-gradient(circle at 30% 30%, #ffffff, #94a3b8)',
                                                                            boxShadow: 'inset -2px -2px 4px rgba(0,0,0,0.25), 2px 4px 6px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1)'
                                                                        }}
                                                                    >
                                                                        {char}
                                                                    </div>
                                                                </React.Fragment>
                                                            );
                                                        })}
                                                    </div>
                                                );
                                            })()}
                                        </div>

                                        <div className={`flex justify-center gap-4 text-[10px] border-t pt-3 mx-6 ${theme === 'dark' ? 'text-slate-400 border-slate-700' : 'text-slate-500 border-slate-200'}`}>
                                            <span>Updated: {formatTimestamp(historyResult.scrapedAt)}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center text-slate-500">
                                        <p className="text-lg mb-1">🚫</p>
                                        <p className="text-xs font-bold">No results found for this date.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ResultsDashboard;