import React, { useState, useEffect } from 'react';
import { GameOutcome, SpinResult, SystemSettings, UserProfile, ViewState } from './types';
import { RouletteWheel } from './Roulette';
import { AdminDashboard } from './AdminDashboard';
import { Confetti } from './Confetti';
import { Settings, X, Zap, Ticket, Trophy, ShieldAlert, ArrowLeft, Disc, CheckCircle, Clock } from 'lucide-react';

import { useAuth } from '../../contexts/AuthContext';

interface RouletteModalProps {
    isOpen: boolean;
    onClose: () => void;
    billAmount: number;
    userId?: string;
    onSpinComplete: (result: SpinResult) => void;
}

// Default Settings (Visual only)
const DEFAULT_SETTINGS: SystemSettings = {
    surchargePercent: 0.10,
    initialRTP: 0.90,
    minRTP: 0.60,
    currentRTP: 0.90,
    decayRate: 0.005,
    globalPool: 42850.20,
    oddsJackpot: 0.02,
    oddsTier2: 0.08,
    oddsTier3: 0.15
};

export const RouletteModal: React.FC<RouletteModalProps> = ({ isOpen, onClose, billAmount, userId, onSpinComplete }) => {
    // --- STATE ---
    const { user } = useAuth();
    const [view, setView] = useState<ViewState | 'CONFIRM'>('HOME');
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [userBalance, setUserBalance] = useState<number>(0);

    // Persistent Settings
    const [settings, setSettings] = useState<SystemSettings>(() => {
        try {
            const saved = localStorage.getItem('roulette_settings');
            return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
        } catch { return DEFAULT_SETTINGS; }
    });

    useEffect(() => {
        localStorage.setItem('roulette_settings', JSON.stringify(settings));
    }, [settings]);

    const [spinResult, setSpinResult] = useState<SpinResult | null>(null);

    // Reset when modal opens
    useEffect(() => {
        if (isOpen) {
            setView('HOME');
            setSpinResult(null);
            setErrorMessage(null);
            setIsLoading(false);
            if (userId) {
                fetch(`/api/auth/me?userId=${userId}`)
                    .then(res => res.json())
                    .then(data => {
                        if (data && data.balance !== undefined) setUserBalance(Number(data.balance));
                    })
                    .catch(e => console.error(e));
            }
        }
    }, [isOpen, userId]);

    const surcharge = billAmount * settings.surchargePercent;

    // STEP 1: User Clicks "SPIN NOW" -> Goes to CONFIRM screen
    const handleInitSpin = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (billAmount <= 0) return;
        if (!userId) {
            setErrorMessage("Please login to play.");
            return;
        }
        setView('CONFIRM');
    };

    // STEP 2: User Clicks "CONFIRM" -> Actually Spins
    const handleConfirmSpin = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsLoading(true);
        setErrorMessage(null);

        try {
            const response = await fetch('/api/casino/spin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, billAmount })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Spin failed');
            }

            setView('SPINNING');
            setSpinResult(data.result);

        } catch (err: any) {
            console.error("Spin Error:", err);
            setErrorMessage(err.message || 'Transaction failed. Check wallet balance.');
            setView('HOME');
            setIsLoading(false);
        }
    };

    const handleWheelStop = () => {
        setView('RESULT');
        setIsLoading(false);
    };

    const handleFinish = (e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (spinResult) {
            onSpinComplete(spinResult);
        }
        onClose();
    };

    if (!isOpen) return null;

    // Safe Maths
    const safeBalance = userBalance || 0;
    const newBalance = safeBalance - surcharge;
    const isInsufficient = newBalance < 0;

    return (
        <div
            className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
        >
            {/* Removed 'bg-transparent' and 'border-0' from conditional to avoid styling conflicts/disappearance */}
            <div className={`bg-slate-900 w-full max-w-4xl h-[90vh] rounded-2xl overflow-hidden relative border border-white/10 shadow-2xl flex flex-col ${view === 'CONFIRM' ? 'max-w-md h-auto' : ''}`}>

                {/* HEADER - Hide in Confirm View for cleaner look, or adapt */}
                {view !== 'CONFIRM' && (
                    <div className="bg-slate-800 p-4 flex justify-between items-center z-10 border-b border-white/5">
                        <div className="flex items-center gap-3">
                            {view === 'ADMIN' && (
                                <button type="button" onClick={() => setView('HOME')} className="p-2 bg-white/5 rounded-full hover:bg-white/10">
                                    <ArrowLeft size={16} />
                                </button>
                            )}
                            <div className="flex items-center gap-2">
                                <Ticket className="text-yellow-500" />
                                <span className="font-bold text-white uppercase tracking-wider">Play Free Ticket</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {user?.role === 'admin' && (
                                <button
                                    type="button"
                                    onClick={() => setView('ADMIN')}
                                    disabled={isLoading || view === 'SPINNING' || view === 'CONFIRM'}
                                    className={`p-2 transition-colors ${isLoading ? 'text-white/10 cursor-not-allowed' : 'text-white/30 hover:text-white'}`}
                                >
                                    <Settings size={20} />
                                </button>
                            )}
                            <button type="button" onClick={onClose} className="p-2 bg-white/10 rounded-full hover:bg-red-500/20 hover:text-red-500 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                    </div>
                )}

                {/* CONTENT */}
                <div className={`flex-1 relative overflow-hidden flex flex-col items-center justify-center p-4 ${view === 'CONFIRM' ? 'overflow-visible' : ''}`}>

                    {view === 'ADMIN' ? (
                        <AdminDashboard settings={settings} setSettings={setSettings} close={() => setView('HOME')} />
                    ) : view === 'CONFIRM' ? (
                        /* --- CONFIRMATION MODAL STYLE --- */
                        <div className="w-full animate-in zoom-in duration-300">
                            <div className="bg-[#1e293b] rounded-xl shadow-none border-0 overflow-hidden relative">
                                <button onClick={() => setView('HOME')} className="absolute top-2 right-2 p-2 text-gray-400 hover:text-white z-10">
                                    <X size={18} />
                                </button>
                                {/* Header */}
                                <div className="p-4 border-b border-white/5 flex justify-between items-center bg-slate-800/50">
                                    <h3 className="text-white font-bold text-lg flex items-center gap-2">
                                        <Clock size={18} />
                                        Confirm Entry
                                    </h3>
                                </div>

                                {/* Dashed Box Content */}
                                <div className="p-6">
                                    <div className="border-2 border-dashed border-white/10 rounded-xl p-6 bg-slate-900/50 space-y-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-400 text-sm">Entry Fee</span>
                                            <span className="text-white font-mono font-bold text-lg">-${surcharge.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-400 text-sm">Wallet Balance</span>
                                            <span className="text-white font-mono font-bold">${safeBalance.toFixed(2)}</span>
                                        </div>
                                        <div className="border-t border-white/10 my-2"></div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-400 text-sm font-bold">New Balance</span>
                                            <span className={`font-mono font-bold text-lg ${isInsufficient ? 'text-red-500' : 'text-green-400'}`}>
                                                ${newBalance.toFixed(2)}
                                            </span>
                                        </div>
                                    </div>

                                    {isInsufficient && (
                                        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-500 text-xs text-center font-bold">
                                            Insufficient Funds
                                        </div>
                                    )}

                                    <button
                                        onClick={handleConfirmSpin}
                                        disabled={isLoading || isInsufficient}
                                        className={`w-full mt-6 py-3 rounded-xl font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 ${isLoading ? 'bg-gray-600 cursor-not-allowed' :
                                            isInsufficient ? 'bg-gray-700 text-gray-400 cursor-not-allowed' :
                                                'bg-neon-cyan text-black hover:bg-cyan-400'
                                            }`}
                                    >
                                        {isLoading ? 'Processing...' : 'Confirm & Spin'}
                                        {!isLoading && <Zap size={18} className="fill-current" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="w-full h-full max-w-5xl mx-auto flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-16">

                            {/* CENTER: THE GAME */}
                            <div className="flex flex-col items-center justify-center relative w-full max-w-md">

                                {view === 'HOME' && (
                                    <div className="flex flex-col items-center gap-6 animate-in zoom-in duration-300 w-full">

                                        {/* HEADER */}
                                        <div className="text-center space-y-1">
                                            <h2 className="text-3xl md:text-4xl font-black text-white uppercase italic tracking-tighter bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                                                PLAY FOR FREE
                                            </h2>
                                            <p className="text-slate-400 text-sm font-medium">
                                                Spin for a chance to win 100% off
                                            </p>
                                        </div>

                                        {/* STATS CARD */}
                                        <div className="w-full bg-slate-800/50 rounded-2xl border border-white/5 p-6 backdrop-blur-sm shadow-xl relative overflow-hidden group">
                                            {/* Glow Effect */}
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-all duration-700" />
                                            <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all duration-700" />

                                            <div className="space-y-4 relative z-10">
                                                <div className="flex justify-between items-center pb-4 border-b border-white/5">
                                                    <span className="text-slate-400 text-xs uppercase font-bold tracking-wider">Ticket Total</span>
                                                    <span className="text-white font-bold font-mono text-lg">${billAmount.toFixed(2)}</span>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <span className="block text-slate-500 text-[10px] uppercase font-bold mb-1">Entry Fee</span>
                                                        <span className="block text-white font-bold font-mono text-xl">-${surcharge.toFixed(2)}</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="block text-slate-500 text-[10px] uppercase font-bold mb-1">Potential Win</span>
                                                        <span className="block text-neon-cyan font-bold font-mono text-xl">${billAmount.toFixed(2)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* ERROR MESSAGE */}
                                        {errorMessage && (
                                            <div className="w-full p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-500 text-xs text-center font-bold animate-pulse">
                                                {errorMessage}
                                            </div>
                                        )}

                                        {/* ACTION BUTTON */}
                                        <button
                                            type="button"
                                            onClick={handleInitSpin}
                                            disabled={isLoading}
                                            className={`w-full group relative overflow-hidden rounded-xl p-4 transition-all hover:scale-[1.02] shadow-2xl ${isLoading ? 'opacity-50 cursor-not-allowed' : 'shadow-neon-cyan/20'
                                                }`}
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 animate-shine opacity-90 group-hover:opacity-100 transition-opacity" />

                                            <div className="relative flex items-center justify-center gap-2">
                                                {isLoading ? (
                                                    <span className="font-black text-white text-xl uppercase tracking-widest italic">PROCESSING...</span>
                                                ) : (
                                                    <span className="font-black text-white text-xl uppercase tracking-widest italic">SPIN NOW</span>
                                                )}
                                            </div>
                                        </button>

                                        <p className="text-[10px] text-center text-slate-500 max-w-xs leading-relaxed">
                                            By spinning you accept the non-refundable surcharge.
                                            <br />Good luck!
                                        </p>
                                    </div>
                                )}

                                {(view === 'SPINNING' || view === 'RESULT') && (
                                    <div className="relative flex flex-col items-center">
                                        <RouletteWheel
                                            targetAngle={spinResult?.stopAngle || 0}
                                            isSpinning={view === 'SPINNING'}
                                            onComplete={handleWheelStop}
                                        />

                                        {/* RESULT OVERLAY */}
                                        {view === 'RESULT' && spinResult && (
                                            <div className="absolute inset-0 z-50 flex items-center justify-center">
                                                <div className="bg-slate-900/90 backdrop-blur-md p-8 rounded-2xl border border-white/20 shadow-2xl text-center max-w-sm w-full mx-4 animate-in zoom-in-95 duration-300">

                                                    {spinResult.outcome === GameOutcome.WIN ? (
                                                        <>
                                                            <div className="text-yellow-400 text-center mb-4 flex justify-center">
                                                                <Trophy size={48} />
                                                            </div>
                                                            <h2 className="text-3xl font-black text-white mb-2 italic uppercase">Winner!</h2>
                                                            <p className="text-white/60 mb-6">You won <span className="text-green-400 font-bold">{spinResult.prizeLabel}</span></p>
                                                            <div className="bg-green-500/10 p-4 rounded-xl border border-green-500/30 mb-6">
                                                                <p className="text-xs text-green-400 uppercase font-bold">Winnings Credited</p>
                                                                <p className="text-3xl font-mono font-bold text-white">+${spinResult.finalPayout.toFixed(2)}</p>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <div className="text-slate-400 text-center mb-4 flex justify-center">
                                                                {spinResult.outcome === GameOutcome.NEAR_MISS ? <ShieldAlert size={48} /> : <Settings size={48} />}
                                                            </div>
                                                            <h2 className="text-2xl font-bold text-white mb-2">{spinResult.outcome === GameOutcome.NEAR_MISS ? 'So Close!' : 'No Luck'}</h2>
                                                            <p className="text-white/60 mb-6">Better luck next time.</p>
                                                        </>
                                                    )}

                                                    <button
                                                        type="button"
                                                        onClick={handleFinish}
                                                        className="w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors"
                                                    >
                                                        {spinResult.outcome === GameOutcome.WIN ? 'AWESOME!' : 'CONTINUE'}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Overlays */}
                {view === 'RESULT' && spinResult?.outcome === GameOutcome.WIN && <Confetti />}
            </div>
        </div>
    );
};
