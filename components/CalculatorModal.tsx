import React, { useState, useEffect } from 'react';
import { DEFAULT_PRIZE_TABLE, GAME_RULES_TEXT } from '../constants';
import { localDbService } from '../services/localDbService';

interface CalculatorModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const CalculatorModal: React.FC<CalculatorModalProps> = ({ isOpen, onClose }) => {
    const [game, setGame] = useState('Pick 3');
    const [type, setType] = useState('STRAIGHT');
    const [wager, setWager] = useState<string>('1'); // Store as string to allow decimal input
    const [isNY, setIsNY] = useState(true);
    const [activeRule, setActiveRule] = useState<number | null>(null);
    const prizeTable = localDbService.getPrizeTable();

    // --- SIMULATOR STATE ---
    const [simBet, setSimBet] = useState('');
    const [simMode, setSimMode] = useState('Pick 3');
    const [simStr, setSimStr] = useState('');
    const [simBox, setSimBox] = useState('');
    const [simCom, setSimCom] = useState('');
    const [simRes1, setSimRes1] = useState('');
    const [simRes2, setSimRes2] = useState('');
    const [simRes3, setSimRes3] = useState('');
    const [simResP3, setSimResP3] = useState('');
    const [simResP4, setSimResP4] = useState('');

    // --- AUTO-FILL EFFECTS ---
    useEffect(() => {
        const p3 = simResP3.replace(/\D/g, '');
        if (p3.length >= 2) {
            setSimRes1(p3.slice(-2)); // 1st = Pick 3 Last 2
        }
    }, [simResP3]);

    useEffect(() => {
        const p4 = simResP4.replace(/\D/g, '');
        if (p4.length >= 2) {
            setSimRes2(p4.slice(0, 2)); // 2nd = Pick 4 First 2
        }
        if (p4.length >= 4) {
            setSimRes3(p4.slice(-2));   // 3rd = Pick 4 Last 2
        }
    }, [simResP4]);

    if (!isOpen) return null;

    const getCalculatedPayout = () => {
        const gameTable = prizeTable[game];
        if (!gameTable) return 0;
        
        let multiplier = gameTable[type] || 0;
        
        // Apply Rules Logic (Win 4 Half Rule)
        if (game === 'Win 4' && !isNY) {
            multiplier = multiplier / 2;
        }
        
        const wagerVal = parseFloat(wager);
        return isNaN(wagerVal) ? 0 : wagerVal * multiplier;
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[70] animate-fade-in" onClick={onClose}>
            <div className="bg-gray-900 w-full max-w-lg rounded-2xl border border-gray-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div className="relative bg-gradient-to-r from-gray-800 to-gray-900 p-4 border-b border-gray-700 flex justify-between items-center">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-neon-cyan via-purple-500 to-blue-500"></div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2 mt-1">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neon-cyan"><rect width="16" height="20" x="4" y="2" rx="2"/><line x1="8" x2="16" y1="6" y2="6"/><line x1="16" x2="16" y1="14" y2="14"/><path d="M16 10h.01"/><path d="M12 10h.01"/><path d="M8 10h.01"/><path d="M12 14h.01"/><path d="M8 14h.01"/><path d="M12 18h.01"/><path d="M8 18h.01"/></svg>
                        Prize Calculator
                    </h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    </button>
                </div>

                <div className="overflow-y-auto p-5 space-y-6">
                    {/* Calculator Inputs */}
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Game Mode</label>
                                <select value={game} onChange={e => { setGame(e.target.value); setType(Object.keys(prizeTable[e.target.value] || {})[0]); }} className="w-full bg-gray-800 border border-gray-600 rounded-lg p-2.5 text-sm text-white focus:border-neon-cyan outline-none transition-colors">
                                    {Object.keys(prizeTable).map(g => <option key={g} value={g}>{g}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Bet Type</label>
                                <select value={type} onChange={e => setType(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-lg p-2.5 text-sm text-white focus:border-neon-cyan outline-none transition-colors">
                                    {Object.keys(prizeTable[game] || {}).map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 items-end">
                            <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Wager Amount</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-gray-400 font-mono">$</span>
                                    <input 
                                        type="number" 
                                        step="0.01" 
                                        min="0"
                                        value={wager} 
                                        onChange={e => setWager(e.target.value)} 
                                        className="w-full bg-gray-800 border border-gray-600 rounded-lg p-2.5 pl-7 text-white font-mono focus:border-neon-cyan outline-none transition-colors" 
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                            <label className="flex items-center justify-between bg-gray-800 px-3 py-2.5 rounded-lg border border-gray-600 cursor-pointer hover:bg-gray-700 transition-colors">
                                <span className="text-xs font-bold text-gray-300">Is New York?</span>
                                <input type="checkbox" checked={isNY} onChange={e => setIsNY(e.target.checked)} className="w-5 h-5 accent-neon-cyan rounded cursor-pointer" />
                            </label>
                        </div>

                        {/* DISPLAY */}
                        <div className="mt-2 p-5 bg-black/60 rounded-xl border border-neon-cyan/30 shadow-[inset_0_0_30px_rgba(0,255,255,0.05)] text-center relative overflow-hidden group">
                            <div className="absolute inset-0 bg-neon-cyan/5 group-hover:bg-neon-cyan/10 transition-colors"></div>
                            <p className="text-[10px] text-neon-cyan font-mono uppercase mb-1 tracking-widest relative z-10">Estimated Payout</p>
                            <p className="text-4xl font-black text-green-400 font-mono tracking-wider drop-shadow-[0_0_8px_rgba(74,222,128,0.4)] relative z-10">
                                ${getCalculatedPayout().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                        </div>
                    </div>

                    {/* RULES ACCORDION */}
                    <div className="border-t border-gray-700 pt-4">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Reference Guide</h4>
                        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                            <div className="divide-y divide-gray-700 max-h-[250px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
                                {GAME_RULES_TEXT.map((rule, idx) => (
                                    <div key={idx} className="group">
                                        <button 
                                            onClick={() => setActiveRule(activeRule === idx ? null : idx)}
                                            className="w-full flex justify-between items-center p-3 text-left hover:bg-gray-700/50 transition-colors"
                                        >
                                            <span className="text-xs font-bold text-gray-300 group-hover:text-white transition-colors">{rule.title}</span>
                                            <svg className={`w-3 h-3 text-gray-500 transform transition-transform ${activeRule === idx ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                        </button>
                                        {activeRule === idx && (
                                            <div className="p-3 bg-black/20 text-[11px] text-gray-400 font-mono leading-relaxed whitespace-pre-line border-l-2 border-neon-cyan ml-3 mb-1 animate-fade-in">
                                                {rule.content}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CalculatorModal;