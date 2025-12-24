import React, { useEffect, useState } from 'react';
import type { LotteryResult } from '../types';
import { getTrackColorClasses, getAbbreviation, formatWinningResult } from '../utils/helpers';
import { localDbService } from '../services/localDbService';
import { getLotteryLogo } from './LotteryLogos';
import { TRACK_CATEGORIES, RESULTS_CATALOG } from '../constants';

const ResultsDashboard: React.FC = () => {
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

    return (
        <div className="mt-8 max-w-6xl mx-auto px-4">
            {/* Dynamic Tabs */}
            <div className="flex flex-wrap justify-center gap-4 mb-8">
                {TRACK_CATEGORIES.map(category => (
                    <button
                        key={category.name}
                        onClick={() => setActiveTab(category.name)}
                        className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 flex items-center gap-2 border ${activeTab === category.name
                            ? 'bg-blue-600 text-white border-blue-400 shadow-[0_0_15px_rgba(37,99,235,0.4)]'
                            : 'bg-slate-900 text-gray-400 border-slate-700 hover:border-slate-500'
                            }`}
                    >
                        {category.name.includes('Santo') ? <span className="text-lg">🇩🇴</span> : <span className="text-lg">🇺🇸</span>}
                        {category.name}
                    </button>
                ))}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
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
                        const displayLotteryName = catalogItem?.lottery || track.name;
                        const displayDrawName = catalogItem?.draw || (track.name.includes(' ') ? track.name.split(' ').pop() : 'Draw');
                        const closeTime = catalogItem?.closeTime || '';

                        // Use consistent color/abbr logic
                        const colorClass = getTrackColorClasses(track.id || track.name);
                        const abbr = getAbbreviation(track.id || track.name);
                        const LogoComponent = getLotteryLogo(displayLotteryName); // Use cleanly extracted name

                        return (
                            <div key={track.id} className="relative bg-[#151e32] border border-slate-700 rounded-xl overflow-hidden hover:border-slate-500 hover:-translate-y-1 transition-all duration-300 shadow-lg group">

                                {/* HEADER */}
                                <div className={`h-14 ${colorClass} relative overflow-hidden p-3 flex items-center justify-between`}>
                                    <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent"></div>
                                    <div className="relative z-10 flex items-center gap-3 w-full">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-inner shrink-0 overflow-hidden ${LogoComponent ? 'bg-white p-0.5' : 'bg-black/30 backdrop-blur-md border border-white/10 text-white font-bold text-sm'}`}>
                                            {LogoComponent ? LogoComponent : abbr}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <h3 className="font-bold text-white text-sm leading-tight truncate drop-shadow-md w-full">
                                                {displayLotteryName}
                                            </h3>
                                            <span className="text-[10px] text-white/80 font-mono uppercase tracking-wide truncate">
                                                {displayDrawName}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* NUMBERS */}
                                <div className="p-5 flex flex-col items-center justify-center bg-[#0b1121] min-h-[110px] relative">
                                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:14px_14px] opacity-20"></div>
                                    <div className="relative z-10">
                                        <span className="text-3xl sm:text-4xl font-black text-white tracking-widest drop-shadow-[0_0_15px_rgba(255,255,255,0.15)] font-mono">
                                            {res.numbers || '---'}
                                        </span>
                                    </div>
                                </div>

                                {/* FOOTER */}
                                <div className="bg-[#020617] border-t border-slate-700 p-3">
                                    <div className="grid grid-cols-2 w-full text-[10px] text-slate-400 mb-3 h-[36px] items-center">

                                        {/* LEFT COLUMN: SWAPPER (CLOSE <-> UPDATED) */}
                                        <div className="relative flex flex-col justify-center h-full">

                                            {/* 1. CLOSE TIME (Default Visible) */}
                                            <div className="flex flex-col absolute left-0 top-0 bottom-0 justify-center transition-opacity duration-300 opacity-100 group-hover:opacity-0 pointer-events-none w-full">
                                                <span className="uppercase tracking-wider text-[9px] font-bold text-slate-500">Close</span>
                                                <span className="text-slate-300 font-mono">{closeTime || '-'}</span>
                                            </div>

                                            {/* 2. UPDATED TIME (Hover Visible) */}
                                            <div className="flex flex-col absolute left-0 top-0 bottom-0 justify-center transition-opacity duration-300 opacity-0 group-hover:opacity-100 w-full">
                                                <span className="uppercase tracking-wider text-[9px] font-bold text-slate-500">Updated</span>
                                                <span className="text-slate-300 font-medium whitespace-nowrap overflow-hidden text-ellipsis">{res.scrapedAt ? formatTimestamp(res.scrapedAt) : '-'}</span>
                                            </div>

                                        </div>

                                        {/* RIGHT COLUMN: DATE + DRAW TIME (FIXED) */}
                                        <div className="flex flex-col items-end justify-center h-full">
                                            <span className="uppercase tracking-wider text-[9px] font-bold text-slate-500">Date</span>
                                            <span className="text-slate-500 font-mono truncate max-w-[120px]" title={`${res.drawDate} ${catalogItem?.drawTime || ''}`}>
                                                {formatDate(res.drawDate)} {catalogItem?.drawTime ? `• ${catalogItem.drawTime}` : ''}
                                            </span>
                                        </div>

                                    </div>
                                    <button
                                        onClick={(e) => { e.preventDefault(); handleOpenHistory(track.id, displayLotteryName); }}
                                        className="block w-full text-center py-1.5 rounded bg-slate-800/50 hover:bg-slate-800 text-[10px] font-bold text-neon-cyan border border-slate-700 hover:border-neon-cyan/50 transition-all uppercase tracking-wide"
                                    >
                                        View History
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* HISTORY MODAL (Unchanged Structure) */}
            {isHistoryOpen && historyTarget && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[100] backdrop-blur-sm" onClick={() => setIsHistoryOpen(false)}>
                    <div className="bg-slate-900 w-full max-w-md rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
                            <h3 className="text-white font-bold flex items-center gap-2">
                                <span className="text-neon-cyan">History:</span> {historyTarget.name}
                            </h3>
                            <button onClick={() => setIsHistoryOpen(false)} className="text-slate-400 hover:text-white">✕</button>
                        </div>
                        <div className="p-6 flex flex-col gap-4">
                            <div>
                                <label className="text-xs uppercase font-bold text-slate-500 mb-1 block">Select Date</label>
                                <input
                                    type="date"
                                    value={historyDate}
                                    max={new Date().toISOString().split('T')[0]}
                                    onChange={(e) => setHistoryDate(e.target.value)}
                                    className="w-full bg-black border border-slate-700 rounded-lg p-3 text-white focus:border-neon-cyan outline-none"
                                />
                            </div>
                            <div className="min-h-[150px] flex items-center justify-center border border-dashed border-slate-700 rounded-xl bg-slate-800/20">
                                {loadingHistory ? (
                                    <div className="flex flex-col items-center gap-2 text-neon-cyan animate-pulse">
                                        <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                        <span className="text-xs font-bold">Fetching History...</span>
                                    </div>
                                ) : historyResult ? (
                                    <div className="text-center w-full">
                                        <p className="text-slate-500 text-xs uppercase mb-2">Results for {formatDate(historyResult.drawDate)}</p>
                                        <p className="text-4xl font-black text-white tracking-widest font-mono mb-4">{historyResult.numbers}</p>
                                        <div className="flex justify-center gap-4 text-[10px] text-slate-400 border-t border-slate-700 pt-3 mx-6">
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