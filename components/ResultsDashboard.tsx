import React, { useEffect, useState } from 'react';
import type { LotteryResult } from '../types';
import { getTrackColorClasses, getAbbreviation, formatWinningResult } from '../utils/helpers';
import { localDbService } from '../services/localDbService';
import { getLotteryLogo } from './LotteryLogos';
import { RESULTS_CATALOG } from '../constants';

const ResultsDashboard: React.FC = () => {
    const [results, setResults] = useState<LotteryResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'USA' | 'SD'>('USA');
    
    // History Modal State
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [historyTarget, setHistoryTarget] = useState<{id: string, name: string} | null>(null);
    const [historyDate, setHistoryDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [historyResult, setHistoryResult] = useState<LotteryResult | null>(null);
    const [loadingHistory, setLoadingHistory] = useState(false);

    useEffect(() => {
        const fetchResults = async () => {
            try {
                // 1. Load Local Data First (Instant)
                const localData = localDbService.getResults();
                
                // Convert WinningResult (Local DB) to LotteryResult (UI/API Type)
                const localAsLotteryResult: LotteryResult[] = localData.map(r => {
                    // Smart Country Detection
                    const catalogMatch = RESULTS_CATALOG.find(c => c.id === r.lotteryId);
                    let detectedCountry: 'USA' | 'SD' | 'SPECIAL' = 'USA';
                    
                    if (catalogMatch) {
                        if (catalogMatch.section === 'rd') detectedCountry = 'SD';
                        else if (catalogMatch.section === 'special') detectedCountry = 'SPECIAL';
                        else detectedCountry = 'USA';
                    } else if (r.lotteryId.startsWith('rd') || r.lotteryName.includes('Real') || r.lotteryName.includes('Nacional')) {
                        detectedCountry = 'SD';
                    }

                    return {
                        resultId: r.lotteryId,
                        country: detectedCountry,
                        lotteryName: r.lotteryName,
                        drawName: r.lotteryId.split('/').pop() || 'Draw',
                        numbers: formatWinningResult(r),
                        drawDate: r.date,
                        scrapedAt: r.createdAt,
                        lastDrawTime: '',
                        closeTime: ''
                    };
                });

                // 2. Try Fetching API
                let remoteData: LotteryResult[] = [];
                try {
                    const res = await fetch('/api/results');
                    if (res.ok) {
                        remoteData = await res.json();
                    }
                } catch (e) {
                    console.warn("API offline, using local data only.");
                }

                // 3. Merge Data (Prefer API if available, fallback to local)
                const mergedMap = new Map<string, LotteryResult>();
                
                // Populate with local first
                localAsLotteryResult.forEach(item => {
                    const key = `${item.resultId}_${item.drawDate}`;
                    mergedMap.set(key, item);
                });

                // Overwrite/Add with remote
                remoteData.forEach(item => {
                    const key = `${item.resultId}_${item.drawDate}`;
                    mergedMap.set(key, item);
                });

                // Filter for LATEST date per ResultID
                const latestMap = new Map<string, LotteryResult>();
                Array.from(mergedMap.values()).forEach(item => {
                    const existing = latestMap.get(item.resultId);
                    if (!existing || new Date(item.drawDate) > new Date(existing.drawDate)) {
                        latestMap.set(item.resultId, item);
                    }
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

    // Effect to fetch history when modal is open or date changes
    useEffect(() => {
        if (isHistoryOpen && historyTarget && historyDate) {
            const fetchHistory = async () => {
                setLoadingHistory(true);
                setHistoryResult(null);
                try {
                    // Try Local DB First
                    const localAll = localDbService.getResults();
                    const foundLocal = localAll.find(r => r.lotteryId === historyTarget.id && r.date === historyDate);
                    
                    if (foundLocal) {
                         setHistoryResult({
                            resultId: foundLocal.lotteryId,
                            country: foundLocal.lotteryId.startsWith('rd') ? 'SD' : 'USA',
                            lotteryName: foundLocal.lotteryName,
                            drawName: foundLocal.lotteryId.split('/').pop() || 'Draw',
                            numbers: formatWinningResult(foundLocal),
                            drawDate: foundLocal.date,
                            scrapedAt: foundLocal.createdAt,
                        });
                    } else {
                        // Try Remote API if not in local
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

    const filteredResults = results.filter(r => r.country === activeTab);

    const formatDate = (isoString: string) => {
        try {
            const date = new Date(isoString);
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

    const handleOpenHistory = (resultId: string, lotteryName: string) => {
        setHistoryTarget({ id: resultId, name: lotteryName });
        setHistoryDate(new Date().toISOString().split('T')[0]); // Reset to today
        setIsHistoryOpen(true);
    };

    // Skeleton Loader
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
            {/* Tabs */}
            <div className="flex justify-center gap-4 mb-8">
                <button 
                    onClick={() => setActiveTab('USA')}
                    className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 flex items-center gap-2 border ${activeTab === 'USA' ? 'bg-blue-600 text-white border-blue-400 shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'bg-slate-900 text-gray-400 border-slate-700 hover:border-slate-500'}`}
                >
                    <span className="text-lg">🇺🇸</span> USA Results
                </button>
                <button 
                    onClick={() => setActiveTab('SD')}
                    className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 flex items-center gap-2 border ${activeTab === 'SD' ? 'bg-red-600 text-white border-red-400 shadow-[0_0_15px_rgba(220,38,38,0.4)]' : 'bg-slate-900 text-gray-400 border-slate-700 hover:border-slate-500'}`}
                >
                    <span className="text-lg">🇩🇴</span> Santo Domingo
                </button>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                {loading ? (
                    <>
                        <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
                    </>
                ) : filteredResults.length === 0 ? (
                    <div className="col-span-full text-center p-12 text-gray-500 border border-dashed border-slate-700 rounded-xl bg-slate-900/50">
                        <p className="text-sm uppercase tracking-widest">No results available</p>
                    </div>
                ) : (
                    filteredResults.map((res) => {
                        const colorClass = getTrackColorClasses(res.resultId || res.lotteryName);
                        const abbr = getAbbreviation(res.resultId || res.lotteryName);
                        const LogoComponent = getLotteryLogo(res.lotteryName);
                        
                        return (
                            <div key={res.resultId} className="relative bg-[#151e32] border border-slate-700 rounded-xl overflow-hidden hover:border-slate-500 hover:-translate-y-1 transition-all duration-300 shadow-lg group">
                                
                                {/* HEADER: Gradient Background */}
                                <div className={`h-14 ${colorClass} relative overflow-hidden p-3 flex items-center justify-between`}>
                                    {/* Glass sheen */}
                                    <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent"></div>
                                    
                                    <div className="relative z-10 flex items-center gap-3 w-full">
                                        {/* Badge / Logo Container */}
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-inner shrink-0 overflow-hidden ${LogoComponent ? 'bg-white p-0.5' : 'bg-black/30 backdrop-blur-md border border-white/10 text-white font-bold text-sm'}`}>
                                            {LogoComponent ? (
                                                LogoComponent
                                            ) : (
                                                abbr
                                            )}
                                        </div>
                                        
                                        {/* Title Block */}
                                        <div className="flex flex-col min-w-0">
                                            <h3 className="font-bold text-white text-sm leading-tight truncate drop-shadow-md w-full">
                                                {res.lotteryName}
                                            </h3>
                                            <span className="text-[10px] text-white/80 font-mono uppercase tracking-wide truncate">
                                                {res.drawName}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* BODY: Winning Numbers */}
                                <div className="p-5 flex flex-col items-center justify-center bg-[#0b1121] min-h-[110px] relative">
                                    {/* Subtle grid background */}
                                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:14px_14px] opacity-20"></div>
                                    
                                    <div className="relative z-10">
                                        <span className="text-3xl sm:text-4xl font-black text-white tracking-widest drop-shadow-[0_0_15px_rgba(255,255,255,0.15)] font-mono">
                                            {res.numbers}
                                        </span>
                                    </div>
                                </div>

                                {/* FOOTER: Metadata Grid */}
                                <div className="bg-[#020617] border-t border-slate-700 p-3">
                                    <div className="grid grid-cols-2 gap-y-2 text-[10px] text-slate-400 mb-3">
                                        <div className="flex flex-col">
                                            <span className="uppercase tracking-wider text-[9px] font-bold text-slate-500">Actualizado</span>
                                            <span className="text-slate-300 font-medium">{formatTimestamp(res.scrapedAt)}</span>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="uppercase tracking-wider text-[9px] font-bold text-slate-500">ID</span>
                                            <span className="text-slate-500 font-mono truncate max-w-[80px] opacity-60" title={res.resultId}>{res.resultId.split('/').pop()}</span>
                                        </div>
                                        <div className="flex flex-col border-t border-slate-800 pt-2">
                                            <span className="uppercase tracking-wider text-[9px] font-bold text-slate-500">Sorteo</span>
                                            <span className="text-slate-300 font-mono">{res.lastDrawTime || '--:--'}</span>
                                        </div>
                                        <div className="flex flex-col items-end border-t border-slate-800 pt-2">
                                            <span className="uppercase tracking-wider text-[9px] font-bold text-slate-500">Cierre</span>
                                            <span className="text-slate-300 font-mono">{res.closeTime || '--:--'}</span>
                                        </div>
                                    </div>

                                    <button 
                                        onClick={(e) => { e.preventDefault(); handleOpenHistory(res.resultId, res.lotteryName); }} 
                                        className="block w-full text-center py-1.5 rounded bg-slate-800/50 hover:bg-slate-800 text-[10px] font-bold text-neon-cyan border border-slate-700 hover:border-neon-cyan/50 transition-all uppercase tracking-wide"
                                    >
                                        Ver Historial
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* HISTORY MODAL */}
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