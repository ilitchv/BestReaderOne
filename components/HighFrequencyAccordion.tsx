import React, { useState } from 'react';
import { WinningResult } from '../types';

interface HighFrequencyAccordionProps {
    results: WinningResult[];
    theme: 'light' | 'dark';
}

const HighFrequencyAccordion: React.FC<HighFrequencyAccordionProps> = ({ results, theme }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'Top Pick' | 'Instant Cash'>('Top Pick');

    // Filter for our special lotteries
    const specialResults = results.filter(r =>
        (r.lotteryId && r.lotteryId.startsWith('special/top-pick')) ||
        (r.lotteryId && r.lotteryId.startsWith('special/instant-cash'))
    );

    const activeResults = specialResults.filter(r => {
        if (activeTab === 'Top Pick') return r.lotteryId?.includes('top-pick');
        if (activeTab === 'Instant Cash') return r.lotteryId?.includes('instant-cash');
        return false;
    });

    // Helper to parse the JSON stored in 'numbers' field
    const getParsedDraws = (jsonStr: string) => {
        try {
            return JSON.parse(jsonStr);
        } catch (e) {
            return [];
        }
    };

    return (
        <div className={`mt-6 border rounded-xl overflow-hidden transition-all duration-300 ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700' : 'bg-white border-slate-200'}`}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full p-4 flex items-center justify-between font-bold text-lg uppercase tracking-wider hover:bg-black/5 transition-colors ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}
            >
                <span className="flex items-center gap-2">
                    High Frequency Games
                    <span className={`px-2 py-0.5 text-[10px] rounded-full ${theme === 'dark' ? 'bg-neon-cyan text-black' : 'bg-blue-600 text-white'}`}>
                        LIVE
                    </span>
                </span>
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                >
                    <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
            </button>

            {isOpen && (
                <div className="border-t border-slate-700/50">
                    {/* TABS */}
                    <div className="flex border-b border-slate-700/50">
                        {['Top Pick', 'Instant Cash'].map(tab => {
                            const logoPath = tab === 'Top Pick'
                                ? '/lottery-logos/top-pick.png'
                                : '/lottery-logos/instant-cash.png';

                            return (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab as any)}
                                    className={`flex-1 py-3 text-sm font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2
                                        ${activeTab === tab
                                            ? (theme === 'dark' ? 'bg-slate-800 text-neon-cyan border-b-2 border-neon-cyan' : 'bg-slate-100 text-blue-600 border-b-2 border-blue-600')
                                            : (theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-black')
                                        }`}
                                >
                                    <img src={logoPath} alt={tab} className="w-6 h-6 object-contain" />
                                    {tab}
                                </button>
                            );
                        })}
                    </div>

                    {/* CONTENT */}
                    <div className={`p-4 max-h-[85vh] overflow-y-auto custom-scrollbar ${theme === 'dark' ? 'bg-[#0f172a]' : 'bg-slate-50'}`}>
                        {activeResults.length === 0 ? (
                            <div className="text-center py-8 text-gray-500 italic">
                                No results found for today.
                            </div>
                        ) : (
                            activeResults.map((res, idx) => {
                                const draws = getParsedDraws(res.numbers); // Array of objects
                                // Structure: [{ time: "...", draws: { "Pick 3": "123", ... } }]

                                return (
                                    <div key={res.id || idx} className="space-y-4">
                                        {/* Sort draws by time descending? They come from scraper in order found (usually ascending or mixed). Let's render as is. */}
                                        {Array.isArray(draws) && draws
                                            .sort((a: any, b: any) => {
                                                // Parse Time (e.g., 10:30 AM) to sort descending
                                                const parseTime = (t: string) => {
                                                    const d = new Date();
                                                    const [time, period] = t.split(' ');
                                                    let [hours, minutes] = time.split(':').map(Number);
                                                    if (period === 'PM' && hours !== 12) hours += 12;
                                                    if (period === 'AM' && hours === 12) hours = 0;
                                                    d.setHours(hours, minutes, 0, 0);
                                                    return d.getTime();
                                                };
                                                return parseTime(b.time) - parseTime(a.time);
                                            })
                                            .map((draw: any, dIdx: number) => {
                                                // Handle Instant Cash "All" -> Split into P2, P3, P4, P5
                                                let displayDraws = { ...draw.draws };
                                                if (activeTab === 'Instant Cash' && displayDraws['All']) {
                                                    const allNums = String(displayDraws['All']).replace(/-/g, '').replace(/,/g, '');
                                                    // Expected 14 digits: P2(2) + P3(3) + P4(4) + P5(5) = 14
                                                    if (allNums.length >= 14) {
                                                        displayDraws = {
                                                            'Pick 2': allNums.slice(0, 2),
                                                            'Pick 3': allNums.slice(2, 5),
                                                            'Pick 4': allNums.slice(5, 9),
                                                            'Pick 5': allNums.slice(9, 14)
                                                        };
                                                    }
                                                }

                                                return (
                                                    <div key={dIdx} className={`p-6 rounded-xl border flex flex-col items-center gap-6 shadow-sm w-full ${theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>

                                                        {/* TIME HEADER - Centered & Prominent */}
                                                        <div className={`w-full text-center border-b pb-3 mb-2 ${theme === 'dark' ? 'border-slate-800' : 'border-slate-100'}`}>
                                                            <span className={`font-mono font-black text-2xl tracking-widest ${theme === 'dark' ? 'text-neon-cyan' : 'text-blue-600'}`}>
                                                                {(() => {
                                                                    // Safety check for date
                                                                    let dateStr = "";
                                                                    if (res.date) {
                                                                        const dateObj = new Date(res.date + 'T12:00:00');
                                                                        if (!isNaN(dateObj.getTime())) {
                                                                            // User requested: "Jan 8 2026"
                                                                            dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).replace(',', '');
                                                                        }
                                                                    }
                                                                    // Fallback if dateStr is empty (Invalid Date fix)
                                                                    if (!dateStr) {
                                                                        // Try to use current date if it matches today? 
                                                                        // Or just show strictly the time if date fails.
                                                                        // Let's default to the provided time, maybe prepend "Today" if we want, but safer to just show time if date is bad.
                                                                        return draw.time;
                                                                    }
                                                                    return `${dateStr} ${draw.time}`;
                                                                })()}
                                                            </span>
                                                        </div>

                                                        {/* DRAWS ROW - Centered & Full Width */}
                                                        <div className="flex flex-wrap gap-8 md:gap-12 justify-center items-end w-full">
                                                            {/* Filter and Map for Cleaner Separation Logic */}
                                                            {['Pick 2', 'Pick 3', 'Pick 4', 'Pick 5', 'Pick 6'].filter(k => displayDraws[k]).map((game, gIdx) => {
                                                                const nums = String(displayDraws[game]);
                                                                const digits = nums.includes('-') ? nums.split('-') : nums.split('');

                                                                return (
                                                                    <React.Fragment key={game}>
                                                                        {/* SEPARATOR (except first item) */}
                                                                        {gIdx > 0 && (
                                                                            <div className={`hidden md:block w-px h-20 self-center ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
                                                                        )}

                                                                        <div className="flex flex-col items-center gap-4">
                                                                            {/* GAME TITLE */}
                                                                            <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest shadow-sm ${theme === 'dark' ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                                                                                {game}
                                                                            </div>

                                                                            {/* BALLS */}
                                                                            <div className="flex gap-3">
                                                                                {digits.map((digit, i) => (
                                                                                    <div
                                                                                        key={i}
                                                                                        className={`
                                                                                            w-14 h-14 rounded-full flex items-center justify-center font-black text-3xl shadow-[0_4px_6px_-1px_rgba(0,0,0,0.3),_inset_0_-4px_4px_rgba(0,0,0,0.1)] transform hover:scale-105 transition-transform
                                                                                            ${theme === 'dark'
                                                                                                ? 'bg-[radial-gradient(circle_at_30%_30%,_#f0f9ff,_#94a3b8)] text-slate-900 border border-slate-400'
                                                                                                : 'bg-[radial-gradient(circle_at_30%_30%,_#ffffff,_#cbd5e1)] text-slate-900 border border-slate-300'
                                                                                            }
                                                                                        `}
                                                                                    >
                                                                                        {digit}
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    </React.Fragment>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default HighFrequencyAccordion;
