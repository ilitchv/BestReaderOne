import React, { useState } from 'react';
import { SystemSettings } from './types';
import { BarChart, Bar, ResponsiveContainer, XAxis, Tooltip } from 'recharts';
import { ArrowLeft, Save, TrendingUp, AlertTriangle, Check, RefreshCw, DollarSign, Activity, Percent } from 'lucide-react';

interface AdminProps {
    settings: SystemSettings;
    setSettings: (s: SystemSettings) => void;
    close: () => void;
}

// Mock Data for the chart
const mockData = [
    { name: 'Mon', margin: 12 },
    { name: 'Tue', margin: 14 },
    { name: 'Wed', margin: 8 },
    { name: 'Thu', margin: 11 },
    { name: 'Fri', margin: 15 },
    { name: 'Sat', margin: 18 },
];

export const AdminDashboard: React.FC<AdminProps> = ({ settings, setSettings, close }) => {

    // Local state to manage form inputs before saving
    const [localSettings, setLocalSettings] = useState<SystemSettings>({ ...settings });
    const [saved, setSaved] = useState(false);

    const handleChange = (key: keyof SystemSettings, value: number) => {
        setLocalSettings(prev => ({ ...prev, [key]: value }));
        setSaved(false);
    };

    const handleSave = () => {
        setSettings(localSettings);
        setSaved(true);
        // Visual feedback then close
        setTimeout(() => {
            close();
        }, 800);
    };

    const handleWeeklyReset = () => {
        const resetSettings: SystemSettings = {
            ...localSettings,
            globalPool: 0,
            currentRTP: localSettings.initialRTP
        };
        setLocalSettings(resetSettings);
        setSettings(resetSettings);
        setSaved(true);
        setTimeout(() => {
            close();
        }, 800);
    };

    return (
        <div className="flex flex-col h-full bg-slate-900 animate-in slide-in-from-right duration-300 w-full rounded-xl overflow-hidden text-white">
            <div className="p-4 md:px-8 md:py-6 flex items-center gap-4 border-b border-white/10 bg-slate-800">
                <button onClick={close} className="p-2 hover:bg-white/10 rounded-full text-white">
                    <ArrowLeft />
                </button>
                <h2 className="text-lg md:text-2xl font-bold text-white">Calibration Dashboard</h2>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-8">

                {/* RESPONSIVE GRID LAYOUT: 1 Col Mobile, 2 Cols Tablet, 3 Cols Desktop */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">

                    {/* COLUMN 1: KPIs & CHARTS */}
                    <div className="space-y-6">
                        {/* KPI CARDS */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-slate-800 rounded-xl border border-green-500/20 shadow-lg">
                                <p className="text-xs text-green-400 uppercase tracking-wider mb-1">Global Pool</p>
                                <p className="text-2xl font-bold text-white">${localSettings.globalPool.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                                <div className="flex items-center gap-1 text-[10px] text-green-400 mt-2">
                                    <TrendingUp size={12} />
                                    <span>+12.4% vs last week</span>
                                </div>
                            </div>
                            <div className="p-4 bg-slate-800 rounded-xl border border-white/5 shadow-lg">
                                <p className="text-xs text-white/50 uppercase tracking-wider mb-1">Live RTP Cap</p>
                                <p className="text-2xl font-bold text-white">{(localSettings.currentRTP * 100).toFixed(1)}%</p>
                                <p className="text-[10px] text-white/30 mt-2">
                                    Target: {(localSettings.initialRTP * 100).toFixed(0)}%
                                </p>
                            </div>
                        </div>

                        {/* CHART */}
                        <div className="p-4 bg-slate-800 rounded-xl border border-white/5 h-48 md:h-64 shadow-lg">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-white/70">House Margin Trend</h3>
                                <span className="text-[10px] text-green-400 animate-pulse">LIVE FEED</span>
                            </div>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={mockData}>
                                    <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#666" />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1c2210', borderColor: '#a6f20d', fontSize: '12px' }}
                                        itemStyle={{ color: '#a6f20d' }}
                                    />
                                    <Bar dataKey="margin" fill="#a6f20d" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* COLUMN 2: ODDS & CYCLE */}
                    <div className="space-y-6">
                        {/* PRIZE ODDS CONFIG */}
                        <div className="p-4 md:p-6 rounded-xl border border-purple-500/30 h-fit bg-slate-800">
                            <div className="flex items-center gap-2 mb-4">
                                <Percent size={18} className="text-purple-400" />
                                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Transparent Odds</h3>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {/* Jackpot */}
                                <div className="p-3 bg-slate-900 rounded-lg border border-yellow-500/30">
                                    <label className="text-[10px] text-yellow-500 font-bold uppercase block mb-1">Jackpot (100%)</label>
                                    <div className="flex items-center">
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={(localSettings.oddsJackpot * 100).toFixed(1)}
                                            onChange={(e) => handleChange('oddsJackpot', parseFloat(e.target.value) / 100)}
                                            className="w-full bg-transparent text-white font-mono font-bold text-lg outline-none"
                                        />
                                        <span className="text-white/30 text-xs">%</span>
                                    </div>
                                </div>

                                {/* Tier 2 */}
                                <div className="p-3 bg-slate-900 rounded-lg border border-cyan-500/30">
                                    <label className="text-[10px] text-cyan-500 font-bold uppercase block mb-1">50% Off</label>
                                    <div className="flex items-center">
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={(localSettings.oddsTier2 * 100).toFixed(1)}
                                            onChange={(e) => handleChange('oddsTier2', parseFloat(e.target.value) / 100)}
                                            className="w-full bg-transparent text-white font-mono font-bold text-lg outline-none"
                                        />
                                        <span className="text-white/30 text-xs">%</span>
                                    </div>
                                </div>

                                {/* Tier 3 */}
                                <div className="p-3 bg-slate-900 rounded-lg border border-purple-500/30">
                                    <label className="text-[10px] text-purple-500 font-bold uppercase block mb-1">15% Off</label>
                                    <div className="flex items-center">
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={(localSettings.oddsTier3 * 100).toFixed(1)}
                                            onChange={(e) => handleChange('oddsTier3', parseFloat(e.target.value) / 100)}
                                            className="w-full bg-transparent text-white font-mono font-bold text-lg outline-none"
                                        />
                                        <span className="text-white/30 text-xs">%</span>
                                    </div>
                                </div>

                                {/* Loss */}
                                <div className="p-3 bg-slate-900 rounded-lg border border-red-500/30 opacity-50">
                                    <label className="text-[10px] text-red-500 font-bold uppercase block mb-1">House (Loss)</label>
                                    <div className="flex items-center">
                                        <span className="text-white font-mono font-bold text-lg">
                                            {(100 - (localSettings.oddsJackpot + localSettings.oddsTier2 + localSettings.oddsTier3) * 100).toFixed(1)}
                                        </span>
                                        <span className="text-white/30 text-xs ml-1">%</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* WEEKLY CYCLE */}
                        <div className="p-4 md:p-6 rounded-xl border border-blue-500/30 relative overflow-hidden bg-slate-800">
                            <div className="absolute top-0 right-0 p-2 opacity-10">
                                <RefreshCw size={60} />
                            </div>
                            <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider mb-4 flex items-center gap-2 relative z-10">
                                <Activity size={16} /> Weekly Cycle
                            </h3>

                            <div className="grid grid-cols-2 gap-4 mb-4 relative z-10">
                                <div>
                                    <label className="text-[10px] uppercase font-bold text-white/50 mb-1 block">Pool ($)</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2.5 text-white/30">$</span>
                                        <input
                                            type="number"
                                            value={localSettings.globalPool}
                                            onChange={(e) => handleChange('globalPool', parseFloat(e.target.value))}
                                            className="w-full bg-black/40 border border-white/10 rounded-lg p-2 pl-6 text-white font-mono focus:border-blue-500 outline-none"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase font-bold text-white/50 mb-1 block">Live Cap</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            step="0.1"
                                            max="100"
                                            value={(localSettings.currentRTP * 100).toFixed(1)}
                                            onChange={(e) => handleChange('currentRTP', parseFloat(e.target.value) / 100)}
                                            className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white font-mono focus:border-blue-500 outline-none"
                                        />
                                        <span className="absolute right-3 top-2.5 text-white/30">%</span>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleWeeklyReset}
                                className="relative z-10 w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                            >
                                <RefreshCw size={14} />
                                RESET WEEK
                            </button>
                        </div>
                    </div>

                    {/* COLUMN 3: CALIBRATION & SAVE */}
                    <div className="space-y-6 md:col-span-2 lg:col-span-1">
                        <h3 className="text-lg font-bold flex items-center gap-2 text-white">
                            <span className="material-icons text-green-400">tune</span>
                            Auto-Calibration
                        </h3>

                        {/* Surcharge Slider */}
                        <div className="p-4 md:p-6 rounded-xl bg-slate-800">
                            <div className="flex justify-between mb-2 text-white">
                                <label className="text-sm font-bold">Surcharge %</label>
                                <span className="text-green-400 font-mono">{(localSettings.surchargePercent * 100).toFixed(0)}%</span>
                            </div>
                            <input
                                type="range"
                                min="0.05" max="0.25" step="0.01"
                                value={localSettings.surchargePercent}
                                onChange={(e) => handleChange('surchargePercent', parseFloat(e.target.value))}
                                className="w-full accent-green-400 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
                            />
                            <p className="text-[10px] text-white/40 mt-1">Customer entry fee</p>
                        </div>

                        {/* Initial RTP Slider */}
                        <div className="p-4 md:p-6 rounded-xl bg-slate-800">
                            <div className="flex justify-between mb-2 text-white">
                                <label className="text-sm font-bold">Initial RTP Target</label>
                                <span className="text-green-400 font-mono">{(localSettings.initialRTP * 100).toFixed(0)}%</span>
                            </div>
                            <input
                                type="range"
                                min="0.5" max="0.99" step="0.01"
                                value={localSettings.initialRTP}
                                onChange={(e) => handleChange('initialRTP', parseFloat(e.target.value))}
                                className="w-full accent-green-400 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
                            />
                            <p className="text-[10px] text-white/40 mt-1">Base probability for new cycles</p>
                        </div>

                        <div className="pt-4 pb-8 lg:mt-auto">
                            <button
                                onClick={handleSave}
                                disabled={saved}
                                className={`w-full py-4 font-bold rounded-xl flex items-center justify-center gap-2 transition-all transform active:scale-95 shadow-xl ${saved
                                        ? 'bg-green-500 text-white'
                                        : 'bg-green-600 text-white hover:bg-green-500'
                                    }`}
                            >
                                {saved ? <Check size={20} /> : <Save size={20} />}
                                {saved ? 'SAVE CHANGES' : 'APPLY CHANGES'}
                            </button>
                            <p className="text-center text-[10px] text-white/30 mt-2 flex items-center justify-center gap-1">
                                <AlertTriangle size={10} />
                                Affects real-time calculation.
                            </p>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};
