
import React, { useState, useEffect, useRef } from 'react';
import { getTrackColorClasses, getAbbreviation, formatWinningResult } from '../utils/helpers';
import ThemeToggle from './ThemeToggle';
import { localDbService } from '../services/localDbService';
import { WinningResult, CatalogItem } from '../types';
import { getLotteryLogo } from './LotteryLogos';
import { RESULTS_CATALOG } from '../constants';

interface OcrRow {
    source: string;
    targetId: string;
    value: string;
}

interface ResultsPageProps {
    onBack: () => void;
    theme: 'light' | 'dark';
    toggleTheme: () => void;
}

// --- CONSTANTS & STORAGE ---
const LS = {
    CATALOG: 'br_catalog',
    VIS: 'br_visibility',
    OCR_PREFIX: 'br_ocr_preview::',
    DATE: 'br_selected_date',
    THEME: 'br_theme',
    PIN_OK: 'br_admin_pin_ok',
    LOGOS: 'br_logos'
};

// --- HELPERS ---
const readJSON = (key: string, fallback: any) => {
    try { const t = localStorage.getItem(key); return t ? JSON.parse(t) : fallback; }
    catch(e) { return fallback; }
};
const writeJSON = (key: string, val: any) => localStorage.setItem(key, JSON.stringify(val));
const todayStr = () => new Date().toISOString().slice(0,10);
const ocrKey = (date: string) => LS.OCR_PREFIX + date;

const ResultsPage: React.FC<ResultsPageProps> = ({ onBack, theme, toggleTheme }) => {
    const [catalog, setCatalog] = useState<CatalogItem[]>([]);
    const [selectedDate, setSelectedDate] = useState<string>(todayStr());
    
    // Data Source: Local DB Service now manages results
    const [dbResults, setDbResults] = useState<WinningResult[]>([]);
    
    const [isAdminOpen, setIsAdminOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'results'|'catalog'|'visibility'>('results');
    const [visibility, setVisibility] = useState<{[id:string]:boolean}>({});
    
    // New Result Modal State
    const [isAddResultOpen, setIsAddResultOpen] = useState(false);
    const [newResultDate, setNewResultDate] = useState(todayStr());
    const [newResultTrack, setNewResultTrack] = useState('');
    const [newResult1st, setNewResult1st] = useState('');
    const [newResult2nd, setNewResult2nd] = useState('');
    const [newResult3rd, setNewResult3rd] = useState('');
    const [newResultP3, setNewResultP3] = useState('');
    const [newResultP4, setNewResultP4] = useState('');

    // History Modal State
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [historyTargetId, setHistoryTargetId] = useState<string | null>(null);
    const [historyData, setHistoryData] = useState<WinningResult[]>([]);

    const scrollRef = useRef<HTMLDivElement>(null);
    const scrollInterval = useRef<any>(null);
    const [isAutoScrolling, setIsAutoScrolling] = useState(false);

    // Initialization & Data Loading
    useEffect(() => {
        // Catalog - Use Shared Constant
        let cat = readJSON(LS.CATALOG, null);
        if (!cat || !Array.isArray(cat) || cat.length < 5) {
            cat = RESULTS_CATALOG;
            writeJSON(LS.CATALOG, cat);
        }
        setCatalog(cat);

        // Vis
        let vis = readJSON(LS.VIS, null);
        if (!vis) { vis={}; cat.forEach((c:any)=>vis[c.id]=true); writeJSON(LS.VIS,vis); }
        setVisibility(vis);

        // Load Results from Local DB
        loadResultsFromDb();
        
        const d = readJSON(LS.DATE, todayStr()) || todayStr();
        setSelectedDate(d);
    }, []);

    const loadResultsFromDb = () => {
        const allResults = localDbService.getResults();
        setDbResults(allResults);
    };

    // Date Change
    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const nd = e.target.value;
        setSelectedDate(nd);
        writeJSON(LS.DATE, nd);
    };

    // Add Manual Result
    const handleSaveResult = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newResultTrack || !newResultDate) return;
        
        const trackObj = catalog.find(t => t.id === newResultTrack);
        if (!trackObj) return;

        const newResult: WinningResult = {
            id: `${newResultDate}_${newResultTrack}`,
            date: newResultDate,
            lotteryId: newResultTrack,
            lotteryName: trackObj.lottery,
            first: newResult1st,
            second: newResult2nd,
            third: newResult3rd,
            pick3: newResultP3,
            pick4: newResultP4,
            createdAt: new Date().toISOString()
        };

        localDbService.saveResult(newResult);
        loadResultsFromDb(); // Refresh
        setIsAddResultOpen(false);
        
        // Reset Form (Keep date)
        setNewResult1st(''); setNewResult2nd(''); setNewResult3rd(''); setNewResultP3(''); setNewResultP4('');
    };

    // Open History
    const handleOpenHistory = (trackId: string) => {
        const all = localDbService.getResults();
        const trackHistory = all.filter(r => r.lotteryId === trackId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setHistoryData(trackHistory);
        setHistoryTargetId(trackId);
        setIsHistoryOpen(true);
    };

    // Visibility
    const handleVisChange = (id: string, val: boolean) => {
        const nv = { ...visibility, [id]: val };
        setVisibility(nv);
        writeJSON(LS.VIS, nv);
    };

    // Helper to find result for current view
    const getResultForTrack = (trackId: string): string => {
        const res = dbResults.find(r => r.lotteryId === trackId && r.date === selectedDate);
        return formatWinningResult(res);
    };

    // AutoScroll
    useEffect(() => {
        const el = scrollRef.current;
        if(isAutoScrolling && el) {
            let dir = 1;
            scrollInterval.current = setInterval(() => {
                el.scrollBy({top: 0.6*dir, behavior:'auto'});
                if((el.scrollTop + el.clientHeight) >= el.scrollHeight-2) dir = -1;
                if(el.scrollTop <= 0) dir = 1;
            }, 16);
        } else {
            clearInterval(scrollInterval.current);
        }
        return () => clearInterval(scrollInterval.current);
    }, [isAutoScrolling]);

    return (
        <div className="fixed inset-0 z-[100] bg-light-bg dark:bg-dark-bg overflow-y-auto font-sans text-gray-900 dark:text-gray-200 transition-colors duration-300" ref={scrollRef}>
            {/* Topbar */}
            <div className="sticky top-0 z-50 bg-white/90 dark:bg-dark-bg/90 backdrop-blur-md border-b border-gray-200 dark:border-slate-800 px-4 py-3 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-neon-cyan to-neon-green rounded-xl flex items-center justify-center text-black font-black text-lg shadow-[0_0_15px_theme(colors.neon-cyan)]">BR</div>
                    <div>
                        <div className="font-black text-xl text-gray-900 dark:text-white tracking-tight">Beast Reader</div>
                        <div className="text-[10px] text-gray-500 dark:text-slate-400 uppercase tracking-widest">Ultimate Dashboard</div>
                    </div>
                </div>
                
                <div className="flex gap-3 items-center">
                    {/* Date Display */}
                    <div className="hidden sm:block px-3 py-1.5 rounded-lg border bg-gray-100 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-xs font-bold text-gray-600 dark:text-slate-300">
                        {selectedDate}
                    </div>

                    <button className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${isAutoScrolling ? 'bg-red-500/10 border-red-500 text-red-500' : 'bg-gray-100 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'}`} onClick={() => setIsAutoScrolling(!isAutoScrolling)}>
                        {isAutoScrolling ? '⏹ Stop' : '⬇ Auto'}
                    </button>
                    
                    <button className="px-3 py-1.5 rounded-lg text-xs font-bold bg-neon-cyan text-black border border-neon-cyan shadow-[0_0_10px_rgba(0,255,255,0.3)] hover:brightness-110" onClick={() => setIsAdminOpen(true)}>
                        Admin
                    </button>
                    
                    <ThemeToggle theme={theme} toggleTheme={toggleTheme} />

                    <button className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500/10 text-red-500 border border-red-500/50 hover:bg-red-500 hover:text-white transition-colors" onClick={onBack}>
                        Exit
                    </button>
                </div>
            </div>

            {/* Grid */}
            <div className="p-6 max-w-[1600px] mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                {['usa','rd','special'].map(sec => {
                    const items = catalog.filter(c => c.section === sec && visibility[c.id]);
                    if(!items.length) return null;
                    
                    const sectionTitle = sec === 'usa' ? 'USA Lotteries' : sec === 'rd' ? 'Santo Domingo' : 'Special Draws';
                    
                    return (
                        <React.Fragment key={sec}>
                            <div className="col-span-full mt-6 mb-2">
                                <h3 className="text-xl font-black text-neon-cyan uppercase tracking-widest border-l-4 border-neon-cyan pl-3">{sectionTitle}</h3>
                            </div>
                            {items.map(it => {
                                const colorClass = getTrackColorClasses(it.id);
                                const abbr = getAbbreviation(it.lottery);
                                const resultText = getResultForTrack(it.id);
                                const LogoComponent = getLotteryLogo(it.lottery);
                                
                                return (
                                    <div key={it.id} className="relative bg-white dark:bg-dark-card border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden hover:border-neon-cyan/50 dark:hover:border-slate-500 hover:-translate-y-1 transition-all duration-300 shadow-lg group">
                                        {/* Header */}
                                        <div className={`h-14 ${colorClass} relative overflow-hidden p-3 flex items-center justify-between`}>
                                            <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none"></div>
                                            <div className="relative z-10 flex items-center gap-3 w-full">
                                                {/* Badge / Logo Container */}
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-inner shrink-0 overflow-hidden ${LogoComponent ? 'bg-white p-0.5' : 'bg-black/30 backdrop-blur-md border border-white/10 text-white font-bold text-sm'}`}>
                                                    {LogoComponent ? (
                                                        LogoComponent
                                                    ) : (
                                                        abbr
                                                    )}
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <h3 className="font-bold text-white text-sm leading-tight truncate drop-shadow-md w-full">{it.lottery}</h3>
                                                    <span className="text-[10px] text-white/80 font-mono uppercase tracking-wide truncate">{it.draw}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Body */}
                                        <div className="p-5 flex flex-col items-center justify-center bg-gray-50 dark:bg-dark-bg min-h-[110px] relative transition-colors">
                                            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ccc_1px,transparent_1px),linear-gradient(to_bottom,#ccc_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:14px_14px] opacity-20 pointer-events-none"></div>
                                            <div className="relative z-10">
                                                <span className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white tracking-widest drop-shadow-sm dark:drop-shadow-[0_0_15px_rgba(255,255,255,0.15)] font-mono">
                                                    {resultText}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Footer */}
                                        <div className="bg-gray-100 dark:bg-[#020617] border-t border-gray-200 dark:border-slate-800 p-3 flex justify-between items-center text-[10px] text-gray-500 font-mono transition-colors">
                                            <span>CLOSE: {it.closeTime}</span>
                                            <button onClick={() => handleOpenHistory(it.id)} className="flex items-center gap-1 text-neon-cyan hover:underline">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                                History
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </React.Fragment>
                    );
                })}
            </div>

            {/* Admin Drawer */}
            {isAdminOpen && (
                <div className="fixed inset-0 z-[200] bg-black/80 flex justify-end backdrop-blur-sm animate-fade-in">
                    <div className="w-full max-w-4xl bg-slate-900 h-full shadow-2xl border-l border-slate-700 flex flex-col p-6 animate-slide-in-right text-gray-300">
                        <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
                            <h2 className="text-2xl font-bold text-white">Admin Panel</h2>
                            <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded text-white font-bold text-sm" onClick={() => setIsAdminOpen(false)}>Close</button>
                        </div>
                        
                        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 border-b border-slate-800">
                            {['results','catalog','visibility'].map(t => (
                                <button 
                                    key={t} 
                                    className={`px-4 py-2 rounded-lg text-sm font-bold capitalize transition-colors whitespace-nowrap ${activeTab===t ? 'bg-neon-cyan text-black' : 'bg-slate-800 text-gray-400 hover:text-white'}`} 
                                    onClick={()=>setActiveTab(t as any)}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>

                        <div className="mb-6 flex justify-between items-end">
                            <div>
                                <label className="block text-xs text-slate-500 uppercase font-bold mb-2">Working Date</label>
                                <input type="date" className="bg-slate-950 border border-slate-700 text-white rounded p-2 focus:border-neon-cyan outline-none" value={selectedDate} onChange={handleDateChange} />
                            </div>
                            <button onClick={() => { setIsAddResultOpen(true); setNewResultDate(selectedDate); }} className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded text-sm flex items-center gap-2">
                                <span>+</span> Add Manual Result
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                            {activeTab === 'results' && (
                                <table className="w-full text-left text-sm text-gray-300">
                                    <thead className="text-xs uppercase text-slate-500 border-b border-slate-800">
                                        <tr><th className="py-2">Lottery</th><th className="py-2">Local DB Value</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {catalog.filter(c => visibility[c.id]).map(c => (
                                            <tr key={c.id} className="hover:bg-slate-800/50">
                                                <td className="py-2 pr-4">{c.lottery} <span className="text-slate-500 text-xs">({c.draw})</span></td>
                                                <td className="py-2 font-mono text-neon-cyan">
                                                    {getResultForTrack(c.id)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            {activeTab === 'catalog' && (
                                <div>
                                    <p className="text-xs text-gray-500 mb-4">Catalog configuration is read-only in this mode.</p>
                                    <table className="w-full text-left text-xs text-gray-300">
                                        <thead className="text-slate-500 uppercase border-b border-slate-800"><tr><th className="py-2">Name</th><th className="py-2">Draw</th><th className="py-2">Time</th><th className="py-2">Close</th></tr></thead>
                                        <tbody className="divide-y divide-slate-800">
                                            {catalog.map((c) => (
                                                <tr key={c.id}>
                                                    <td className="py-2">{c.lottery}</td>
                                                    <td className="py-2">{c.draw}</td>
                                                    <td className="py-2">{c.drawTime}</td>
                                                    <td className="py-2">{c.closeTime}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {activeTab === 'visibility' && (
                                <table className="w-full text-left text-sm text-gray-300">
                                    <thead className="text-slate-500 uppercase border-b border-slate-800"><tr><th className="py-2">ID</th><th className="py-2 text-center">Visible</th></tr></thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {catalog.map(c => (
                                            <tr key={c.id} className="hover:bg-slate-800/50">
                                                <td className="py-2 font-mono text-xs text-gray-400">{c.id}</td>
                                                <td className="py-2 text-center"><input type="checkbox" checked={!!visibility[c.id]} onChange={e => handleVisChange(c.id, e.target.checked)} className="w-4 h-4 accent-neon-cyan" /></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* MANUAL RESULT MODAL */}
            {isAddResultOpen && (
                <div className="fixed inset-0 bg-black/90 z-[250] flex items-center justify-center p-4">
                    <div className="bg-slate-800 w-full max-w-md p-6 rounded-xl border border-slate-600 shadow-2xl">
                        <h3 className="text-xl font-bold text-white mb-6">Add Result to Local DB</h3>
                        <form onSubmit={handleSaveResult} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] uppercase text-gray-400 font-bold mb-1">Date</label>
                                    <input type="date" required value={newResultDate} onChange={e=>setNewResultDate(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white outline-none focus:border-neon-cyan" />
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase text-gray-400 font-bold mb-1">Lottery</label>
                                    <select required value={newResultTrack} onChange={e=>setNewResultTrack(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white outline-none focus:border-neon-cyan">
                                        <option value="">Select...</option>
                                        {catalog.filter(c => visibility[c.id]).map(t => <option key={t.id} value={t.id}>{t.lottery} - {t.draw}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 space-y-4">
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-center text-xs font-bold text-blue-400 mb-1">1st</label>
                                        <input type="text" maxLength={2} required value={newResult1st} onChange={e=>setNewResult1st(e.target.value)} className="w-full bg-black border border-slate-600 rounded p-2 text-center text-xl font-bold text-white focus:border-blue-500 outline-none" placeholder="00" />
                                    </div>
                                    <div>
                                        <label className="block text-center text-xs font-bold text-gray-400 mb-1">2nd</label>
                                        <input type="text" maxLength={2} value={newResult2nd} onChange={e=>setNewResult2nd(e.target.value)} className="w-full bg-black border border-slate-600 rounded p-2 text-center text-lg text-gray-300 focus:border-gray-500 outline-none" placeholder="00" />
                                    </div>
                                    <div>
                                        <label className="block text-center text-xs font-bold text-gray-400 mb-1">3rd</label>
                                        <input type="text" maxLength={2} value={newResult3rd} onChange={e=>setNewResult3rd(e.target.value)} className="w-full bg-black border border-slate-600 rounded p-2 text-center text-lg text-gray-300 focus:border-gray-500 outline-none" placeholder="00" />
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-700">
                                    <div>
                                        <label className="block text-xs text-purple-400 mb-1">Pick 3</label>
                                        <input type="text" maxLength={3} value={newResultP3} onChange={e=>setNewResultP3(e.target.value)} className="w-full bg-black border border-slate-600 rounded p-2 text-center text-white font-mono focus:border-purple-500 outline-none" placeholder="000" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-orange-400 mb-1">Pick 4</label>
                                        <input type="text" maxLength={4} value={newResultP4} onChange={e=>setNewResultP4(e.target.value)} className="w-full bg-black border border-slate-600 rounded p-2 text-center text-white font-mono focus:border-orange-500 outline-none" placeholder="0000" />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setIsAddResultOpen(false)} className="px-4 py-2 rounded bg-slate-700 text-white hover:bg-slate-600 transition-colors">Cancel</button>
                                <button type="submit" className="px-6 py-2 rounded bg-neon-cyan text-black font-bold hover:brightness-110 transition-all shadow-[0_0_10px_rgba(0,255,255,0.3)]">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* HISTORY MODAL */}
            {isHistoryOpen && (
                <div className="fixed inset-0 bg-black/90 z-[250] flex items-center justify-center p-4" onClick={() => setIsHistoryOpen(false)}>
                    <div className="bg-slate-800 w-full max-w-md rounded-xl border border-slate-600 shadow-2xl flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-slate-700 bg-slate-900/50 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-white">History</h3>
                            <button onClick={() => setIsHistoryOpen(false)} className="text-gray-400 hover:text-white">✕</button>
                        </div>
                        <div className="overflow-y-auto p-4 space-y-3">
                            {historyData.length === 0 ? (
                                <p className="text-center text-gray-500 py-8">No history found for this track.</p>
                            ) : (
                                historyData.map(res => (
                                    <div key={res.id} className="bg-slate-900 border border-slate-700 rounded-lg p-3 flex justify-between items-center">
                                        <div>
                                            <div className="text-xs text-gray-500 font-bold uppercase">{res.date}</div>
                                            <div className="text-xs text-gray-400">{res.lotteryName}</div>
                                        </div>
                                        <div className="font-mono font-bold text-neon-cyan text-lg">
                                            {formatWinningResult(res)}
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
