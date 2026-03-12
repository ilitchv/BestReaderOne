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
    amtDropped: number;
    remWager: number;
    riskAmount: number;
    probability: number; // NEW
    isExpired: boolean;
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
    const [riskLimit, setRiskLimit] = useState<number>(() => {
        const saved = localStorage.getItem('RiskMonitor_RiskLimit');
        return saved ? Number(saved) : 5000;
    });

    useEffect(() => {
        localStorage.setItem('RiskMonitor_RiskLimit', riskLimit.toString());
    }, [riskLimit]);

    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
    const [isLimitsModalOpen, setIsLimitsModalOpen] = useState(false);

    const [filterTab, setFilterTab] = useState<'active' | 'expired'>('active');
    const [trackFilter, setTrackFilter] = useState<string>('all');
    const [autopilotEnabled, setAutopilotEnabled] = useState(false); // NEW

    // --- DERIVED DATA: INDIVIDUAL PLAY RISKS ---
    const allRiskRows = useMemo(() => {
        const rows: RiskRow[] = [];
        const droppedAvailable = new Map<string, { straight: number, box: number, combo: number }>();

        // 1. Gather all relocated/dropped amounts first
        tickets.forEach(ticket => {
            if (ticket.isRelocation) {
                ticket.plays.forEach(play => {
                    const key = `${play.gameMode}|${play.betNumber}`;
                    const current = droppedAvailable.get(key) || { straight: 0, box: 0, combo: 0 };
                    droppedAvailable.set(key, {
                        straight: current.straight + (play.straightAmount || 0),
                        box: current.box + (play.boxAmount || 0),
                        combo: current.combo + (play.comboAmount || 0)
                    });
                });
            }
        });

        // 2. Generate risk rows for normal plays
        tickets.forEach(ticket => {
            if (ticket.isRelocation) return;

            const user = users.find(u => u.id === ticket.userId);
            const userName = user ? user.name : 'Guest';

            ticket.plays.forEach((play, index) => {
                const isNyInvolved = ticket.tracks.some(t => {
                    const l = t.toLowerCase();
                    return l.includes('new york') || l.includes('/ny') || l.includes('ny/');
                });

                // Deduct dropped amounts
                const dropKey = `${play.gameMode}|${play.betNumber}`;
                const drops = droppedAvailable.get(dropKey);

                let netStraight = play.straightAmount || 0;
                let netBox = play.boxAmount || 0;
                let netCombo = play.comboAmount || 0;

                if (drops) {
                    if (drops.straight > 0 && netStraight > 0) {
                        const deduction = Math.min(netStraight, drops.straight);
                        netStraight -= deduction;
                        drops.straight -= deduction;
                    }
                    if (drops.box > 0 && netBox > 0) {
                        const deduction = Math.min(netBox, drops.box);
                        netBox -= deduction;
                        drops.box -= deduction;
                    }
                    if (drops.combo > 0 && netCombo > 0) {
                        const deduction = Math.min(netCombo, drops.combo);
                        netCombo -= deduction;
                        drops.combo -= deduction;
                    }
                }

                // If fully covered by drop, skip displaying as risky
                // But wait, the user wants to see "Amt. Dropped", so we might still want to show it if its high risk but fully dropped? 
                // Let's decide to show it if there was an original wager.
                if (play.straightAmount === 0 && play.boxAmount === 0 && play.comboAmount === 0) return;

                const simulatedNetPlay = { ...play, straightAmount: netStraight, boxAmount: netBox, comboAmount: netCombo };
                const riskVal = calculatePotentialPayout(simulatedNetPlay, prizeTable, isNyInvolved ? 'New York' : 'Standard');
                const totalOriginalWager = (play.straightAmount || 0) + (play.boxAmount || 0) + (play.comboAmount || 0);
                const totalRemWager = netStraight + netBox + netCombo;
                const totalDropped = totalOriginalWager - totalRemWager;

                // Simple Expiration Logic: check if ticket's transactionDate is older than 24h OR if we implement track times
                // For now, let's assume a basic timestamp comparison. If ticket is older than 24h, it's probably expired.
                // You can refine this with real Track Time closing logic.
                const playDate = new Date(ticket.transactionDateTime);
                const playTime = playDate.getTime();
                const now = Date.now();
                const hoursOld = (now - playTime) / (1000 * 60 * 60);
                const isExpired = hoursOld > 12;

                // Probability Calculation
                let prob = 0;
                const mode = play.gameMode.toLowerCase();
                const numLen = play.betNumber.length;
                if (mode.includes('single action')) prob = 0.1; // 10%
                else if (numLen === 1) prob = 0.1;
                else if (numLen === 2) prob = 0.01;
                else if (numLen === 3) prob = 0.001;
                else if (numLen === 4) prob = 0.0001;

                rows.push({
                    uniqueKey: `${ticket.ticketNumber}_p${index}`,
                    ticketNumber: ticket.ticketNumber,
                    playIndex: index,
                    userId: ticket.userId || '',
                    userName,
                    transactionDate: typeof ticket.transactionDateTime === 'string' ? ticket.transactionDateTime : ticket.transactionDateTime.toISOString(),
                    track: ticket.tracks.join(', '),
                    betNumber: play.betNumber,
                    gameMode: play.gameMode,
                    straightRequest: netStraight,
                    boxRequest: netBox,
                    comboRequest: netCombo,
                    totalWager: totalOriginalWager,
                    amtDropped: totalDropped,
                    remWager: totalRemWager,
                    riskAmount: riskVal,
                    probability: prob,
                    isExpired
                });
            });
        });

        // Sort by Probability DESC then Risk DESC
        return rows.sort((a, b) => b.probability - a.probability || b.riskAmount - a.riskAmount);
    }, [tickets, prizeTable, users]);

    // View Filtering
    const displayedRiskRows = useMemo(() => {
        let filtered = allRiskRows.filter(r => filterTab === 'active' ? !r.isExpired : r.isExpired);
        if (trackFilter !== 'all') {
            filtered = filtered.filter(r => r.track.includes(trackFilter));
        }
        return filtered;
    }, [allRiskRows, filterTab, trackFilter]);

    // Track List for Filter
    const trackList = useMemo(() => {
        const tracks = new Set<string>();
        allRiskRows.forEach(r => {
            // Split if it's a comma-separated list from multiple tracks in one ticket
            r.track.split(', ').forEach(t => tracks.add(t));
        });
        return Array.from(tracks).sort();
    }, [allRiskRows]);

    // --- DERIVED DATA: GLOBAL WAGER LIMITS ---
    const globalRiskStats = useMemo(() => {
        const aggregator = new Map<string, number>();
        const metaData = new Map<string, { track: string, gameMode: string, betNumber: string, wagerType: 'Straight' | 'Box' | 'Combo' }>();

        // 1. Aggregate All Tickets
        tickets.forEach(ticket => {
            ticket.plays.forEach(play => {
                const modeLimits = WAGER_LIMITS[play.gameMode];
                if (!modeLimits) return;

                ticket.tracks.forEach(track => {
                    const factor = (ticket.isRelocation || play.isDropped) ? -1 : 1;

                    // Straight
                    if (play.straightAmount && play.straightAmount > 0) {
                        const key = `${track}|${play.gameMode}|${play.betNumber}|Straight`;
                        const current = aggregator.get(key) || 0;
                        aggregator.set(key, Math.max(0, current + (play.straightAmount * factor)));
                        if (!metaData.has(key)) metaData.set(key, { track, gameMode: play.gameMode, betNumber: play.betNumber, wagerType: 'Straight' });
                    }
                    // Box
                    if (play.boxAmount && play.boxAmount > 0) {
                        const key = `${track}|${play.gameMode}|${play.betNumber}|Box`;
                        const current = aggregator.get(key) || 0;
                        aggregator.set(key, Math.max(0, current + (play.boxAmount * factor)));
                        if (!metaData.has(key)) metaData.set(key, { track, gameMode: play.gameMode, betNumber: play.betNumber, wagerType: 'Box' });
                    }
                    // Combo
                    if (play.comboAmount && play.comboAmount > 0) {
                        const key = `${track}|${play.gameMode}|${play.betNumber}|Combo`;
                        const current = aggregator.get(key) || 0;
                        aggregator.set(key, Math.max(0, current + (play.comboAmount * factor)));
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
            if (!limits || total <= 0) return; // Ignore if total risk is 0 or negative

            let limitVal: number | null = null;
            if (meta.wagerType === 'Straight') limitVal = limits.STRAIGHT;
            else if (meta.wagerType === 'Box') limitVal = limits.BOX;
            else if (meta.wagerType === 'Combo') limitVal = limits.COMBO;

            if (limitVal !== null && total >= limitVal) {
                violations.push({
                    key,
                    ...meta,
                    totalAmount: total,
                    limit: limitVal,
                    isExceeded: total > limitVal
                });
            }
        });

        return violations.sort((a, b) => {
            const aRatio = a.totalAmount / (a.limit || 1);
            const bRatio = b.totalAmount / (b.limit || 1);
            return bRatio - aRatio;
        });

    }, [tickets]);

    // Derived Filtered List for "Select High Risk" button
    const highRiskOnly = displayedRiskRows.filter(r => r.riskAmount > riskLimit);

    useEffect(() => {
        fetch('/api/config/autopilot')
            .then(res => res.json())
            .then(data => setAutopilotEnabled(data.enabled))
            .catch(err => console.error("Error fetching autopilot config:", err));
    }, []);

    const toggleAutopilot = async () => {
        const newVal = !autopilotEnabled;
        setAutopilotEnabled(newVal);
        try {
            await fetch('/api/config/autopilot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled: newVal })
            });
        } catch (err) {
            console.error("Error setting autopilot config:", err);
            setAutopilotEnabled(!newVal); // Rollback
        }
    };
    const handleToggleRow = (key: string) => {
        const newSet = new Set(selectedRows);
        if (newSet.has(key)) newSet.delete(key);
        else newSet.add(key);
        setSelectedRows(newSet);
    };

    const handleSelectAllHighRisk = () => {
        const newSet = new Set(selectedRows);
        // Only select high risk plays that are currently DISPLAYED
        const visibleHighRisk = displayedRiskRows.filter(r => r.riskAmount > riskLimit);
        visibleHighRisk.forEach(r => newSet.add(r.uniqueKey));
        setSelectedRows(newSet);
    };

    const handleDeselectAll = () => {
        setSelectedRows(new Set());
    };

    const handleRelocate = () => {
        if (selectedRows.size === 0) return alert("No plays selected.");

        const exportData = displayedRiskRows.filter(r => selectedRows.has(r.uniqueKey)).map(r => {
            const isHighRisk = r.riskAmount > riskLimit;
            let ratio = 1;

            if (isHighRisk && r.riskAmount > riskLimit) {
                // Ratio to REMOVE: (Total Risk - Target Risk) / Total Risk
                // This ensures (Original Wager * (1 - Ratio)) * Multiplier = Target Risk
                ratio = (r.riskAmount - riskLimit) / r.riskAmount;
            } else {
                ratio = 0; // Don't remove anything if it's already below limit
            }

            // If ratio is 1, it means remove everything. 
            // If the user selected it but it's not high risk, maybe they want to remove 100% manually?
            // Actually, the current logic only applies ratio if IS high risk.
            // If they manually selected a low risk row, we assume they want to clear it (ratio 1)? 
            // Let's stick to high risk auto-reduction and 100% for others if manually selected.
            if (!isHighRisk && selectedRows.has(r.uniqueKey)) ratio = 1;

            const newStraight = r.straightRequest > 0 ? Number((r.straightRequest * ratio).toFixed(2)) : null;
            const newBox = r.boxRequest > 0 ? Number((r.boxRequest * ratio).toFixed(2)) : null;
            const newCombo = r.comboRequest > 0 ? Number((r.comboRequest * ratio).toFixed(2)) : null;

            return {
                betNumber: r.betNumber,
                gameMode: r.gameMode,
                straightAmount: newStraight,
                boxAmount: newBox,
                comboAmount: newCombo,
            };
        });

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

            {/* TABS: Active vs Expired */}
            <div className="flex items-center gap-2 border-b border-slate-700 pb-2">
                <button
                    onClick={() => { setFilterTab('active'); handleDeselectAll(); }}
                    className={`px-6 py-2 rounded-t-lg font-bold transition-all ${filterTab === 'active' ? 'bg-slate-800 text-neon-cyan border-t border-x border-slate-700' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    Activas / Pendientes
                </button>
                <button
                    onClick={() => setFilterTab('expired')}
                    className={`flex-1 sm:flex-none px-6 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-200 ${filterTab === 'expired' ? 'bg-slate-700 text-white border-b-2 border-slate-400' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    Vencidas
                </button>

                {/* Autopilot Toggle */}
                <div className="flex items-center gap-3 px-4 py-1.5 bg-slate-900/50 rounded-full border border-slate-800 ml-4">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">PILOTO AUTOMÁTICO</span>
                    <button
                        onClick={toggleAutopilot}
                        className={`w-10 h-5 rounded-full relative p-0.5 transition-colors duration-300 ease-in-out ${autopilotEnabled ? 'bg-green-500' : 'bg-slate-700'}`}
                    >
                        <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-300 ease-in-out ${autopilotEnabled ? 'translate-x-[20px]' : 'translate-x-0'}`} />
                    </button>
                    <span className={`text-[10px] font-bold uppercase ${autopilotEnabled ? 'text-green-400' : 'text-slate-500'}`}>
                        {autopilotEnabled ? 'ACTIVO' : 'OFF'}
                    </span>
                </div>

                <div className="ml-auto flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 uppercase">Filtrar Track:</span>
                    <select
                        value={trackFilter}
                        onChange={(e) => setTrackFilter(e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs font-bold text-neon-cyan focus:outline-none"
                    >
                        <option value="all">TODOS LOS TRACKS</option>
                        {trackList.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                    </select>
                </div>
            </div>

            {/* 2. CONTROLS HEADER */}
            <div className="bg-slate-800 p-4 rounded-xl rounded-tl-none border border-slate-700 shadow-lg flex flex-wrap items-center justify-between gap-4 -mt-6">
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
                                <th className="p-4">Ticket</th>
                                <th className="p-4">Fecha/Hora</th>
                                <th className="p-4">Track</th>
                                <th className="p-4">Number / Mode</th>
                                <th className="p-4 text-center">Prob.</th>
                                {/* Detailed Wager Columns */}
                                <th className="p-4 text-center bg-slate-900/50">Straight</th>
                                <th className="p-4 text-center bg-slate-900/50">Box</th>
                                <th className="p-4 text-center bg-slate-900/50">Combo</th>
                                <th className="p-4 text-right">Total Wager</th>
                                <th className="p-4 text-right text-orange-400 bg-orange-900/10">Dropped</th>
                                <th className="p-4 text-right text-cyan-400 bg-cyan-900/10">Rem. Wager</th>
                                <th className="p-4 text-right">Potential Payout</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700 cursor-default">
                            {displayedRiskRows.map(row => {
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
                                            <div className="text-[10px] text-white font-bold truncate max-w-[80px]" title={row.userName}>{row.userName.split(' ')[0]}</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="text-xs font-bold text-slate-300">
                                                {new Date(row.transactionDate).toLocaleDateString([], { month: '2-digit', day: '2-digit' })}
                                            </div>
                                            <div className="text-[10px] text-slate-500">
                                                {new Date(row.transactionDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </td>
                                        <td className="p-4 max-w-[150px] truncate text-slate-400 font-bold" title={row.track}>
                                            {row.track.split(',')[0]}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xl font-black text-white font-mono tracking-wider">{row.betNumber}</span>
                                                <span className="text-[10px] uppercase font-bold bg-slate-700 px-1.5 py-0.5 rounded text-slate-300">{row.gameMode}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${row.probability >= 0.1 ? 'bg-green-500/20 text-green-400' :
                                                row.probability >= 0.01 ? 'bg-blue-500/20 text-blue-400' :
                                                    'bg-slate-700 text-slate-400'
                                                }`}>
                                                {(row.probability * 100).toFixed(row.betNumber.length === 1 ? 0 : 2)}%
                                            </span>
                                        </td>

                                        {/* WAGER DETAILS */}
                                        <td className="p-4 text-center font-mono text-slate-300 bg-slate-800/30">
                                            {row.straightRequest > 0 ? <span className="font-bold text-white">${row.straightRequest.toFixed(2)}</span> : '-'}
                                        </td>
                                        <td className="p-4 text-center font-mono text-slate-300 bg-slate-800/30">
                                            {row.boxRequest > 0 ? <span>${row.boxRequest.toFixed(2)}</span> : '-'}
                                        </td>
                                        <td className="p-4 text-center font-mono text-slate-300 bg-slate-800/30">
                                            {row.comboRequest > 0 ? <span>${row.comboRequest.toFixed(2)}</span> : '-'}
                                        </td>

                                        <td className="p-4 text-right font-mono text-slate-500">
                                            ${row.totalWager.toFixed(2)}
                                        </td>
                                        <td className="p-4 text-right font-mono font-bold text-orange-400 bg-orange-900/10">
                                            {row.amtDropped > 0 ? `$${row.amtDropped.toFixed(2)}` : '-'}
                                        </td>
                                        <td className="p-4 text-right font-mono font-bold text-cyan-400 bg-cyan-900/10">
                                            ${row.remWager.toFixed(2)}
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className={`flex items-center justify-end gap-2 font-bold font-mono text-base ${isHighRisk ? 'text-red-400' : 'text-green-400'}`}>
                                                {isHighRisk && (
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-pulse"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><line x1="12" x2="12" y1="9" y2="13" /><line x1="12" x2="12" y1="17" y2="17" /></svg>
                                                )}
                                                ${row.riskAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
            {/* 6. PENDING DROPS (AUTOPILOT SECTION) */}
            {autopilotEnabled && (
                <div className="mt-8 space-y-4">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                        <h3 className="text-sm font-black text-orange-500 uppercase tracking-widest italic">Drops Pendientes de Compartir (Autopilot)</h3>
                    </div>
                    {tickets.filter(t => t.status === 'pending-share' && t.isRelocation).length === 0 ? (
                        <div className="bg-slate-900/30 border border-dashed border-slate-800 rounded-xl p-8 text-center">
                            <p className="text-xs text-slate-600 font-bold uppercase">No hay drops pendientes en este momento</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {tickets.filter(t => t.status === 'pending-share' && t.isRelocation).map(t => (
                                <div key={t.ticketNumber} className="bg-slate-900 border border-orange-500/30 rounded-xl p-4 flex flex-col gap-3 shadow-lg shadow-orange-950/20">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">TICKET DE DROP AUTO</div>
                                            <div className="text-sm font-black text-white font-mono">{t.ticketNumber}</div>
                                        </div>
                                        <div className="bg-orange-900/30 text-orange-400 text-[9px] font-black px-2 py-0.5 rounded border border-orange-500/20">PENDIENTE</div>
                                    </div>
                                    <div className="flex flex-wrap gap-2 text-[10px] items-center">
                                        <span className="text-neon-cyan font-bold">{t.tracks.join(', ')}</span>
                                        <span className="text-slate-600">•</span>
                                        <span className="text-slate-400">{t.plays.length} JUGADAS</span>
                                    </div>
                                    <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                                        <div className="text-lg font-black text-white font-mono">${t.totalWager?.toFixed(2)}</div>
                                        <button
                                            onClick={() => {
                                                // Function to share (placeholder for real share logic)
                                                console.log("Sharing ticket:", t.ticketNumber);
                                                window.alert(`Compartiendo Drop: ${t.ticketNumber}\nTotal: $${t.totalWager}`);
                                                // Mark as shared (shared status)
                                                fetch(`/api/tickets/${t.id}/status`, {
                                                    method: 'PATCH',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ status: 'shared' })
                                                }).then(() => window.location.reload());
                                            }}
                                            className="bg-green-600 hover:bg-green-500 text-white text-[10px] font-black px-4 py-2 rounded-lg flex items-center gap-2 transition-all"
                                        >
                                            <span className="text-sm">↗</span> COMPARTIR
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default RiskMonitor;
