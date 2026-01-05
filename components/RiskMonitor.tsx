import React, { useState, useMemo, useEffect } from 'react';
import { TicketData, PrizeTable, Play, User } from '../types';
// @ts-ignore
import { WAGER_LIMITS } from '../constants'; // Using @ts-ignore if tsconfig path issues, else normal import
import { calculatePotentialPayout } from '../utils/riskCalculator';

import GlobalLimitsModal from './GlobalLimitsModal';

interface RiskMonitorProps {
    tickets: TicketData[];
    prizeTable: PrizeTable;
    users: User[];
}

interface RiskRow {
    uniqueKey: string;
    ticketNumber: string;
    playIndex: number;
    userId: string;
    userName: string;
    transactionDate: string;
    track: string;
    betNumber: string;
    gameMode: string;
    straightRequest: number;
    boxRequest: number;
    comboRequest: number;
    totalWager: number;
    riskAmount: number; // Potential Payout
}

// Aggregation Key: Track|Draw|GameMode|BetNumber|WagerType
// Value: Total Amount Bet
interface GlobalLimitEntry {
    key: string;
    track: string;
    gameMode: string;
    betNumber: string;
    wagerType: 'Straight' | 'Box' | 'Combo';
    totalAmount: number;
    limit: number | null;
    isExceeded: boolean;
}

const RiskMonitor: React.FC<RiskMonitorProps> = ({ tickets, prizeTable, users }) => {
    // --- STATE ---
    const [riskLimit, setRiskLimit] = useState<number>(5000); // Default $5,000 limit
    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
    const [isLimitsModalOpen, setIsLimitsModalOpen] = useState(false);

    // --- DERIVED DATA: INDIVIDUAL PLAY RISKS ---
    const allRiskRows = useMemo(() => {
        const rows: RiskRow[] = [];
        tickets.forEach(ticket => {
            const user = users.find(u => u.id === ticket.userId);
            const userName = user ? user.name : 'Guest';

            ticket.plays.forEach((play, index) => {
                const isNyInvolved = ticket.tracks.some(t => t.toLowerCase().includes('new york'));
                const riskVal = calculatePotentialPayout(play, prizeTable, isNyInvolved ? 'New York' : 'Standard');
                const totalWager = (play.straightAmount || 0) + (play.boxAmount || 0) + (play.comboAmount || 0);

                rows.push({
                    uniqueKey: `${ticket.ticketNumber}_p${index}`,
                    ticketNumber: ticket.ticketNumber,
                    playIndex: index,
                    userId: ticket.userId || '',
                    userName,
                    transactionDate: ticket.transactionDateTime,
                    track: ticket.tracks.join(', '),
                    betNumber: play.betNumber,
                    gameMode: play.gameMode,
                    straightRequest: play.straightAmount || 0,
                    boxRequest: play.boxAmount || 0,
                    comboRequest: play.comboAmount || 0,
                    totalWager: totalWager,
                    riskAmount: riskVal
                });
            });
        });
        return rows.sort((a, b) => b.riskAmount - a.riskAmount);
    }, [tickets, prizeTable, users]);

    // --- DERIVED DATA: GLOBAL WAGER LIMITS ---
    const globalRiskStats = useMemo(() => {
        const aggregator = new Map<string, number>();
        const metaData = new Map<string, { track: string, gameMode: string, betNumber: string, wagerType: 'Straight' | 'Box' | 'Combo' }>();

        // 1. Aggregate All Tickets
        tickets.forEach(ticket => {
            ticket.plays.forEach(play => {
                const modeLimits = WAGER_LIMITS[play.gameMode];
                if (!modeLimits) return; // Skip if no limits defined (unlikely)

                // We need to check EACH track in the ticket separately because limits are per-track-event
                ticket.tracks.forEach(track => {
                    // Straight
                    if (play.straightAmount && play.straightAmount > 0) {
                        const key = `${track}|${play.gameMode}|${play.betNumber}|Straight`;
                        const current = aggregator.get(key) || 0;
                        aggregator.set(key, current + play.straightAmount);
                        if (!metaData.has(key)) metaData.set(key, { track, gameMode: play.gameMode, betNumber: play.betNumber, wagerType: 'Straight' });
                    }
                    // Box
                    if (play.boxAmount && play.boxAmount > 0) {
                        const key = `${track}|${play.gameMode}|${play.betNumber}|Box`;
                        const current = aggregator.get(key) || 0;
                        aggregator.set(key, current + play.boxAmount);
                        if (!metaData.has(key)) metaData.set(key, { track, gameMode: play.gameMode, betNumber: play.betNumber, wagerType: 'Box' });
                    }
                    // Combo
                    if (play.comboAmount && play.comboAmount > 0) {
                        const key = `${track}|${play.gameMode}|${play.betNumber}|Combo`;
                        const current = aggregator.get(key) || 0;
                        aggregator.set(key, current + play.comboAmount);
                        if (!metaData.has(key)) metaData.set(key, { track, gameMode: play.gameMode, betNumber: play.betNumber, wagerType: 'Combo' });
                    }
                });
            });
        });

        // 2. Compare against Limits
        const violations: GlobalLimitEntry[] = [];
        aggregator.forEach((total, key) => {
            const meta = metaData.get(key)!;
            const limits = WAGER_LIMITS[meta.gameMode];
            if (!limits) return;

            // Determine Limit Value
            let limitVal: number | null = null;
            if (meta.wagerType === 'Straight') limitVal = limits.straight;
            else if (meta.wagerType === 'Box') limitVal = limits.box;
            else if (meta.wagerType === 'Combo') limitVal = limits.combo;

            if (limitVal !== null && total >= limitVal) { // ">=" to alert when reached
                violations.push({
                    key,
                    ...meta,
                    totalAmount: total,
                    limit: limitVal,
                    isExceeded: total > limitVal
                });
            }
        });

        // Sort by how much they exceed (Highest % of Limit)
        return violations.sort((a, b) => {
            const aRatio = a.totalAmount / (a.limit || 1);
            const bRatio = b.totalAmount / (b.limit || 1);
            return bRatio - aRatio;
        });

    }, [tickets]);

    // Derived Filtered List for "Select High Risk" button
    const highRiskOnly = allRiskRows.filter(r => r.riskAmount > riskLimit);

    // --- HANDLERS ---
    const handleToggleRow = (key: string) => {
        const newSet = new Set(selectedRows);
        if (newSet.has(key)) newSet.delete(key);
        else newSet.add(key);
        setSelectedRows(newSet);
    };

    const handleSelectAllHighRisk = () => {
        const newSet = new Set(selectedRows);
        highRiskOnly.forEach(r => newSet.add(r.uniqueKey));
        setSelectedRows(newSet);
    };

    const handleDeselectAll = () => {
        setSelectedRows(new Set());
    };

    const handleRelocate = () => {
        if (selectedRows.size === 0) return alert("No plays selected.");

        const exportData = allRiskRows.filter(r => selectedRows.has(r.uniqueKey)).map(r => ({
            betNumber: r.betNumber,
            gameMode: r.gameMode,
            straightAmount: r.straightRequest > 0 ? r.straightRequest : null,
            boxAmount: r.boxRequest > 0 ? r.boxRequest : null,
            comboAmount: r.comboRequest > 0 ? r.comboRequest : null,
            // Track Relocation often implies moving to "Similar" tracks or just Re-firing.
            // But here we just load them into the Playground. The Playground defaults logic might apply. 
            // We should ideally pass the "Original Track" but the user wants to "Relocate" (Change track probably).
            // So loading the bet details is neutral.
        }));

        // Save to LocalStorage for the Relocation Page to pick up
        localStorage.setItem('RISK_RELOCATION_QUEUE', JSON.stringify(exportData));

        // Notify Parent (AdminDashboard) to switch view
        window.dispatchEvent(new CustomEvent('START_RELOCATION_MODE'));
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">

            {/* 1. GLOBAL LIMITS MONITOR PANEL */}
            {globalRiskStats.length > 0 && (
                <div className="bg-slate-900 border border-red-500/30 rounded-xl overflow-hidden shadow-2xl shadow-red-900/10">
                    <div className="bg-red-900/20 px-4 py-3 border-b border-red-500/30 flex items-center gap-3">
                        <div className="bg-red-500 text-white p-1 rounded animate-pulse">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" y2="13" /><line x1="12" y1="17" y2="17" /></svg>
                        </div>
                        <h3 className="font-bold text-red-100 uppercase tracking-widest text-sm">Global Wager Limits Hit</h3>
                        <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">{globalRiskStats.length} Alerts</span>
                    </div>
                    <div className="max-h-40 overflow-y-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-red-900/10 text-red-200 font-bold sticky top-0 backdrop-blur-md">
                                <tr>
                                    <th className="px-4 py-2">Track</th>
                                    <th className="px-4 py-2">Number</th>
                                    <th className="px-4 py-2">Type</th>
                                    <th className="px-4 py-2 text-right">Total Bet</th>
                                    <th className="px-4 py-2 text-right">Limit</th>
                                    <th className="px-4 py-2 text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-red-900/10 text-slate-300">
                                {globalRiskStats.map(stat => (
                                    <tr key={stat.key} className="hover:bg-red-900/5">
                                        <td className="px-4 py-2 font-medium text-slate-400">{stat.track}</td>
                                        <td className="px-4 py-2 font-bold text-white font-mono text-base">{stat.betNumber}</td>
                                        <td className="px-4 py-2">{stat.wagerType}</td>
                                        <td className="px-4 py-2 text-right font-mono font-bold text-white">${stat.totalAmount.toFixed(2)}</td>
                                        <td className="px-4 py-2 text-right font-mono text-slate-500">${stat.limit}</td>
                                        <td className="px-4 py-2 text-right">
                                            {stat.isExceeded
                                                ? <span className="text-red-500 font-bold animate-pulse">EXCEEDED</span>
                                                : <span className="text-amber-400 font-bold">AT LIMIT</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* 2. CONTROLS HEADER */}
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-lg flex flex-wrap items-center justify-between gap-4">
                {/* LEFT: LIMIT SETTING */}
                <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Risk Limit (Payout Threshold)</label>
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</span>
                                <input
                                    type="number"
                                    value={riskLimit}
                                    onChange={(e) => setRiskLimit(Number(e.target.value))}
                                    className="pl-6 w-32 bg-slate-900 border border-slate-600 rounded-lg py-2 text-white font-mono font-bold focus:border-red-500 focus:outline-none transition-colors"
                                />
                            </div>
                            <button
                                onClick={() => setIsLimitsModalOpen(true)}
                                className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-cyan-400 rounded-lg border border-slate-600 transition-colors"
                                title="Configure Global Wager Limits"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
                            </button>
                        </div>
                    </div>
                    <div className="h-10 w-px bg-slate-700 mx-2"></div>
                    <div className="flex flex-col">
                        <span className="text-xs text-slate-500 font-bold uppercase">High Risk Plays</span>
                        <span className="text-xl font-bold text-red-400">{highRiskOnly.length}</span>
                    </div>
                </div>

                {/* RIGHT: ACTIONS */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleDeselectAll}
                        className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
                    >
                        Clear Selection ({selectedRows.size})
                    </button>

                    <button
                        onClick={handleSelectAllHighRisk}
                        className="px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/50 hover:bg-red-500 hover:text-white rounded-lg font-bold text-sm transition-all flex items-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18" /><path d="M6 6l12 12" /></svg>
                        Select All &gt; {riskLimit.toLocaleString()}
                    </button>

                    <button
                        onClick={handleRelocate}
                        disabled={selectedRows.size === 0}
                        className={`px-6 py-2 rounded-lg font-bold text-sm shadow-lg flex items-center gap-2 transition-all ${selectedRows.size > 0
                            ? 'bg-neon-cyan text-black hover:brightness-110 hover:-translate-y-0.5'
                            : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                            }`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
                        Relocate Selected {selectedRows.size > 0 ? `(${selectedRows.size})` : ''}
                    </button>
                </div>
            </div>

            {/* 3. DETAILED RISK TABLE */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-lg">
                <div className="overflow-x-auto max-h-[600px]">
                    <table className="w-full text-sm text-left text-gray-300 whitespace-nowrap">
                        <thead className="bg-slate-900/90 text-xs uppercase font-bold text-gray-500 border-b border-slate-700 sticky top-0 z-10 backdrop-blur-sm">
                            <tr>
                                <th className="p-4 w-10 text-center">Select</th>
                                <th className="p-4">Ticket Info</th>
                                <th className="p-4">Track</th>
                                <th className="p-4">Number / Mode</th>
                                {/* Detailed Wager Columns */}
                                <th className="p-4 text-center bg-slate-900/50">Straight</th>
                                <th className="p-4 text-center bg-slate-900/50">Box</th>
                                <th className="p-4 text-center bg-slate-900/50">Combo</th>
                                <th className="p-4 text-right">Total Wager</th>
                                <th className="p-4 text-right">Potential Payout</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700 cursor-default">
                            {allRiskRows.map(row => {
                                const isHighRisk = row.riskAmount > riskLimit;
                                const isSelected = selectedRows.has(row.uniqueKey);

                                return (
                                    <tr
                                        key={row.uniqueKey}
                                        className={`transition-colors ${isSelected ? 'bg-blue-600/20' :
                                            isHighRisk ? 'bg-red-900/10 hover:bg-red-900/20' : 'hover:bg-slate-700/50'
                                            }`}
                                        onClick={() => handleToggleRow(row.uniqueKey)}
                                    >
                                        <td className="p-4 text-center">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => handleToggleRow(row.uniqueKey)}
                                                className="w-4 h-4 accent-neon-cyan cursor-pointer rounded"
                                            />
                                        </td>
                                        <td className="p-4">
                                            <div className="font-mono text-neon-cyan font-bold">{row.ticketNumber}</div>
                                            <div className="text-xs text-slate-500 flex items-center gap-1">
                                                <span>{new Date(row.transactionDate).toLocaleTimeString()}</span>
                                                <span>•</span>
                                                <span className="text-white">{row.userName}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 max-w-[150px] truncate text-slate-400" title={row.track}>
                                            {row.track}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xl font-black text-white font-mono tracking-wider">{row.betNumber}</span>
                                                <span className="text-[10px] uppercase font-bold bg-slate-700 px-1.5 py-0.5 rounded text-slate-300">{row.gameMode}</span>
                                            </div>
                                        </td>

                                        {/* WAGER DETAILS */}
                                        <td className="p-4 text-center font-mono text-slate-300 bg-slate-800/30">
                                            {row.straightRequest > 0 ? <span className="font-bold text-white">${row.straightRequest}</span> : '-'}
                                        </td>
                                        <td className="p-4 text-center font-mono text-slate-300 bg-slate-800/30">
                                            {row.boxRequest > 0 ? <span>${row.boxRequest}</span> : '-'}
                                        </td>
                                        <td className="p-4 text-center font-mono text-slate-300 bg-slate-800/30">
                                            {row.comboRequest > 0 ? <span>${row.comboRequest}</span> : '-'}
                                        </td>

                                        <td className="p-4 text-right font-mono text-slate-500 font-bold">
                                            ${row.totalWager.toFixed(2)}
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className={`flex items-center justify-end gap-2 font-bold font-mono text-base ${isHighRisk ? 'text-red-400' : 'text-green-400'}`}>
                                                {isHighRisk && (
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-pulse"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><line x1="12" x2="12" y1="9" y2="13" /><line x1="12" x2="12" y1="17" y2="17" /></svg>
                                                )}
                                                ${row.riskAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {allRiskRows.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="p-8 text-center text-slate-500 italic">
                                        No plays found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            {/* MODAL */}
            <GlobalLimitsModal
                isOpen={isLimitsModalOpen}
                onClose={() => setIsLimitsModalOpen(false)}
            />
        </div>
    );
};

export default RiskMonitor;
