import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { useSound } from '../hooks/useSound';
import { DepositModal } from './DepositModal';

interface WalletManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User | null;
    onSuccess: () => void;
}

export const WalletManagerModal: React.FC<WalletManagerModalProps> = ({ isOpen, onClose, user, onSuccess }) => {
    const { playSound } = useSound();

    // ─── Discount Config State ─────────────────────────────────────────────────
    // These are managed INDEPENDENTLY from the `user` prop after initial load.
    // They only reset when the user IDENTITY (id) changes — not when balance updates.
    const [discountEnabled, setDiscountEnabled] = useState(false);
    const [discountPercent, setDiscountPercent] = useState(10);
    const [isSavingDiscount, setIsSavingDiscount] = useState(false);
    const [discountMsg, setDiscountMsg] = useState('');
    // Track which user's discount is currently loaded
    const loadedDiscountForUserId = useRef<string | null>(null);

    // ─── Deposit / Withdraw State ───────────────────────────────────────────────
    const [amount, setAmount] = useState('');
    const [type, setType] = useState<'DEPOSIT' | 'WITHDRAW'>('DEPOSIT');
    const [note, setNote] = useState('');

    // ─── Debt Management State ─────────────────────────────────────────────────
    const [debtAmount, setDebtAmount] = useState('');
    const [debtNote, setDebtNote] = useState('');
    const [isDebtLoading, setIsDebtLoading] = useState(false);
    const [debtMsg, setDebtMsg] = useState('');

    // ─── General UI ────────────────────────────────────────────────────────────
    const [error, setError] = useState('');
    const [showDepositModal, setShowDepositModal] = useState(false);

    // ─── On modal open: reset form fields ─────────────────────────────────────
    useEffect(() => {
        if (isOpen) {
            setAmount('');
            setNote('');
            setError('');
            setDebtAmount('');
            setDebtNote('');
            setDebtMsg('');
            setDiscountMsg('');
            setType('DEPOSIT');
            setShowDepositModal(false);
        } else {
            // When modal closes, forget which user was loaded so next open re-syncs
            loadedDiscountForUserId.current = null;
        }
    }, [isOpen]);

    // ─── Sync discount state when user IDENTITY changes ───────────────────────
    // This only fires when we open the modal for a DIFFERENT user, not when
    // balance/debt refreshes after a deposit (which keeps the same user id).
    useEffect(() => {
        if (isOpen && user && user.id !== loadedDiscountForUserId.current) {
            loadedDiscountForUserId.current = user.id;
            setDiscountEnabled(user.discountEnabled ?? false);
            setDiscountPercent(user.discountPercent ?? 10);
        }
    }, [isOpen, user?.id]); // intentionally ONLY depends on user.id, not user.discountEnabled

    if (!isOpen || !user) return null;

    // ─── Derived values ────────────────────────────────────────────────────────
    const debtBalance = user.debtBalance ?? 0;
    const totalBalance = user.balance ?? 0;
    const realBalance = totalBalance - debtBalance; // What the user genuinely deposited
    const numAmount = parseFloat(amount) || 0;
    const projectedBalance = type === 'DEPOSIT' ? totalBalance + numAmount : totalBalance - numAmount;

    // ─── Toggle Discount ───────────────────────────────────────────────────────
    // Direct API call — NO debounce — NO onSuccess() — intentional.
    // We must NOT trigger a parent reload here or the local state gets overwritten.
    const handleToggleDiscount = async (newValue: boolean) => {
        setDiscountEnabled(newValue); // Optimistic update immediately
        setDiscountMsg('');
        setIsSavingDiscount(true);
        try {
            const res = await fetch(`/api/admin/users/${user.id}/finance-config`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ discountEnabled: newValue, discountPercent })
            });
            if (!res.ok) {
                // Revert on failure
                setDiscountEnabled(!newValue);
                throw new Error('Error al guardar');
            }
            playSound('add');
            setDiscountMsg(newValue ? '✓ Descuento activado' : '✓ Descuento desactivado');
            setTimeout(() => setDiscountMsg(''), 3000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSavingDiscount(false);
        }
    };

    const handleDiscountPercentChange = async (val: number) => {
        setDiscountPercent(val);
        // Only save the percent if discount is already enabled
        if (!discountEnabled) return;
        setIsSavingDiscount(true);
        try {
            await fetch(`/api/admin/users/${user.id}/finance-config`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ discountEnabled, discountPercent: val })
            });
            setDiscountMsg('✓ Porcentaje actualizado');
            setTimeout(() => setDiscountMsg(''), 2000);
        } catch { /* silent */ } finally {
            setIsSavingDiscount(false);
        }
    };

    // ─── Credit Load (to debtBalance) ─────────────────────────────────────────
    const handleLoadCredit = async () => {
        const num = parseFloat(debtAmount);
        if (!num || num <= 0) return setError('Ingresa un monto válido para cargar crédito.');
        setIsDebtLoading(true);
        setError('');
        try {
            const res = await fetch(`/api/admin/users/${user.id}/adjust-debt`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: num, note: debtNote || 'Crédito cargado por admin' })
            });
            if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Error'); }
            playSound('add');
            setDebtMsg(`$${num.toFixed(2)} cargados como crédito ✓`);
            setDebtAmount('');
            setDebtNote('');
            onSuccess(); // This calls refreshSelectedWalletUser which only updates balance/debt
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsDebtLoading(false);
        }
    };

    // ─── Debt Payment (balance → debtBalance) ─────────────────────────────────
    const handlePayDebt = async () => {
        const num = parseFloat(debtAmount);
        if (!num || num <= 0) return setError('Ingresa el monto a pagar hacia la deuda.');
        if (num > debtBalance) return setError(`No puedes pagar más de la deuda actual ($${debtBalance.toFixed(2)})`);
        if (num > totalBalance) return setError('Fondos insuficientes en el balance para pagar.');
        setIsDebtLoading(true);
        setError('');
        try {
            const res = await fetch(`/api/admin/users/${user.id}/pay-debt`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: num, note: debtNote || 'Pago de deuda' })
            });
            if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Error'); }
            playSound('delete');
            setDebtMsg(`$${num.toFixed(2)} aplicados a la deuda ✓`);
            setDebtAmount('');
            setDebtNote('');
            onSuccess();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsDebtLoading(false);
        }
    };

    // ─── Standard Deposit / Withdraw ──────────────────────────────────────────
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (numAmount <= 0) return setError('El monto debe ser mayor a 0.');
        if (!note.trim()) return setError('Se requiere nota de auditoría.');
        if (type === 'WITHDRAW' && projectedBalance < 0) return setError('Fondos insuficientes.');
        setError('');
        try {
            const res = await fetch('/api/admin/credit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-lumina-secret': 'lumina-secret-2025' },
                body: JSON.stringify({ adminId: 'admin', targetUserId: user.id, amount: numAmount, note, action: type })
            });
            if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Error'); }
            playSound(type === 'DEPOSIT' ? 'add' : 'delete');
            setAmount('');
            setNote('');
            onSuccess();
        } catch (err: any) {
            setError(err.message || 'Transaction failed');
        }
    };

    const isDeposit = type === 'DEPOSIT';

    return (
        <>
            <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-[200]" onClick={onClose}>
                <div
                    className="bg-slate-900 w-full max-w-lg rounded-2xl border border-slate-700 shadow-2xl overflow-hidden max-h-[95vh] flex flex-col"
                    onClick={e => e.stopPropagation()}
                >
                    {/* ── HEADER: User info + Balance ──────────────────────── */}
                    <div className="p-5 border-b border-slate-800 bg-gradient-to-br from-slate-800 to-slate-900 flex-shrink-0">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <img src={user.avatarUrl} className="w-10 h-10 rounded-full border-2 border-white/20" alt="" />
                                <div>
                                    <p className="text-white font-bold text-sm">{user.name}</p>
                                    <p className="text-gray-500 text-xs font-mono">{user.email}</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1">✕</button>
                        </div>

                        {/* Balance & Debt: two-column layout */}
                        <div className={`grid gap-3 ${debtBalance > 0 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                            {/* Balance column */}
                            <div className="bg-black/30 rounded-xl p-3 text-center border border-white/5">
                                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">
                                    Balance Disponible
                                </p>
                                <p className={`text-3xl font-black font-mono tracking-tight ${totalBalance >= 0 ? 'text-green-400' : 'text-red-500'}`}>
                                    {totalBalance < 0 ? '-' : '+'}${Math.abs(totalBalance).toFixed(2)}
                                </p>
                                <p className="text-[10px] text-gray-600 mt-1">Para jugar tickets</p>
                            </div>

                            {/* Debt column — only shown if debtBalance > 0 */}
                            {debtBalance > 0 && (
                                <div className="bg-red-950/40 rounded-xl p-3 text-center border border-red-900/60">
                                    <p className="text-[10px] text-red-400 uppercase font-bold tracking-widest mb-1">
                                        ⚠ Deuda con la Casa
                                    </p>
                                    <p className="text-3xl font-black font-mono text-red-400 tracking-tight">
                                        -${debtBalance.toFixed(2)}
                                    </p>
                                    <p className="text-[10px] text-red-700 mt-1">
                                        Real: <span className={realBalance >= 0 ? 'text-green-600' : 'text-red-600'}>${realBalance.toFixed(2)}</span>
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── SCROLLABLE CONTENT ──────────────────────────────── */}
                    <div className="overflow-y-auto flex-1 custom-scrollbar">
                        <div className="p-5 space-y-5">

                            {/* Global error */}
                            {error && (
                                <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-500/40 rounded-lg text-red-400 text-xs">
                                    <span>⚠</span> {error}
                                    <button onClick={() => setError('')} className="ml-auto text-red-500 hover:text-red-300">✕</button>
                                </div>
                            )}

                            {/* ── SECTION 1: Discount Config ────────────────── */}
                            <div className="bg-slate-800/50 rounded-xl border border-slate-700/60 p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">🏷 Descuento de Jugadas</h4>
                                    {isSavingDiscount && (
                                        <span className="text-[10px] text-blue-400 animate-pulse font-bold">Guardando...</span>
                                    )}
                                    {discountMsg && !isSavingDiscount && (
                                        <span className="text-[10px] text-green-400 font-bold">{discountMsg}</span>
                                    )}
                                </div>

                                <div className="flex items-center gap-4">
                                    {/* Toggle button — pure button, not a wrapping div */}
                                    <button
                                        type="button"
                                        disabled={isSavingDiscount}
                                        onClick={() => handleToggleDiscount(!discountEnabled)}
                                        aria-checked={discountEnabled}
                                        aria-label="Activar descuento"
                                        className="flex items-center gap-2.5 group disabled:opacity-60 disabled:cursor-wait"
                                    >
                                        <div className={`
                                            w-12 h-6 rounded-full relative transition-all duration-300 border-2
                                            ${discountEnabled
                                                ? 'bg-green-500 border-green-400 shadow-[0_0_12px_rgba(34,197,94,0.5)]'
                                                : 'bg-slate-700 border-slate-600'}
                                        `}>
                                            <div className={`
                                                absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-md transition-all duration-300
                                                ${discountEnabled ? 'left-[26px]' : 'left-0.5'}
                                            `} />
                                        </div>
                                        <span className={`text-xs font-bold min-w-[50px] transition-colors ${discountEnabled ? 'text-green-400' : 'text-gray-500'}`}>
                                            {discountEnabled ? 'ACTIVO' : 'INACTIVO'}
                                        </span>
                                    </button>

                                    {/* Percent input */}
                                    <div className="flex items-center gap-2 flex-1">
                                        <span className="text-gray-500 text-xs">Descuento:</span>
                                        <div className="flex items-center bg-slate-950 border border-slate-700 rounded-lg overflow-hidden flex-1">
                                            <input
                                                type="number"
                                                min="1"
                                                max="25"
                                                value={discountPercent}
                                                onChange={e => handleDiscountPercentChange(Math.min(25, Math.max(1, parseInt(e.target.value) || 1)))}
                                                className="w-full bg-transparent p-2 text-white text-sm font-mono text-center outline-none"
                                            />
                                            <span className="pr-3 text-gray-500 font-bold">%</span>
                                        </div>
                                    </div>
                                </div>

                                {discountEnabled && (
                                    <p className="text-[10px] text-green-600 mt-2 bg-green-950/30 p-2 rounded">
                                        Ejemplo: ticket de $100 → cobro al wallet: <strong>${(100 * (1 - discountPercent / 100)).toFixed(0)}</strong>. El ticket sigue mostrando $100.
                                    </p>
                                )}
                            </div>

                            {/* ── SECTION 2: Credit / Debt Management ──────── */}
                            <div className="bg-slate-800/50 rounded-xl border border-slate-700/60 p-4 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">💳 Crédito / Deuda</h4>
                                    <div className="text-right">
                                        <p className="text-[9px] text-gray-500 uppercase font-bold">Deuda Actual</p>
                                        <p className={`text-base font-black font-mono ${debtBalance > 0 ? 'text-red-400' : 'text-gray-600'}`}>
                                            ${debtBalance.toFixed(2)}
                                        </p>
                                    </div>
                                </div>

                                {debtMsg && (
                                    <div className="p-2 bg-green-900/20 border border-green-500/30 rounded text-green-400 text-xs text-center">
                                        ✓ {debtMsg}
                                    </div>
                                )}

                                {/* Debt amount input — FULLY INDEPENDENT */}
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">Monto</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-mono font-bold text-sm">$</span>
                                        <input
                                            type="number"
                                            min="0.01"
                                            step="0.01"
                                            value={debtAmount}
                                            onChange={e => setDebtAmount(e.target.value)}
                                            placeholder="0.00"
                                            className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2.5 pl-8 pr-4 text-white font-mono text-sm focus:border-blue-500 outline-none transition-colors"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">Nota (opcional)</label>
                                    <input
                                        type="text"
                                        value={debtNote}
                                        onChange={e => setDebtNote(e.target.value)}
                                        placeholder="Razón del crédito / pago..."
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 px-3 text-white text-xs focus:border-blue-500 outline-none"
                                    />
                                </div>

                                <div className="grid grid-cols-1 gap-2.5">
                                    {/* Load Credit */}
                                    <button
                                        type="button"
                                        onClick={handleLoadCredit}
                                        disabled={isDebtLoading}
                                        className="w-full py-3 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/40 text-blue-300 text-xs font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        <span>📥</span>
                                        <span>Cargar Saldo como Crédito</span>
                                        <span className="text-blue-400/50 font-normal text-[10px]">(genera deuda)</span>
                                    </button>

                                    {/* Pay Debt — only shown when there IS debt */}
                                    {debtBalance > 0 && (
                                        <button
                                            type="button"
                                            onClick={handlePayDebt}
                                            disabled={isDebtLoading || totalBalance <= 0}
                                            className="w-full py-3 bg-red-900/20 hover:bg-red-900/40 border border-red-600/40 text-red-300 text-xs font-bold rounded-xl transition-all disabled:opacity-50 flex flex-col items-center justify-center gap-0.5"
                                        >
                                            <div className="flex items-center gap-2">
                                                <span>💸</span>
                                                <span>Pagar Deuda con Saldo del Wallet</span>
                                            </div>
                                            <span className="text-red-400/50 font-normal text-[10px]">
                                                Como pago de tarjeta en banca online: wallet → deuda
                                            </span>
                                        </button>
                                    )}
                                </div>

                                {debtBalance > 0 && (
                                    <div className="flex justify-between text-[10px] text-gray-600 bg-black/20 p-2 rounded">
                                        <span>Balance disponible para jugar:</span>
                                        <span className="text-white font-mono font-bold">${totalBalance.toFixed(2)}</span>
                                    </div>
                                )}
                            </div>

                            {/* ── SECTION 3: Manual Deposit / Withdraw ──────── */}
                            <div className="bg-slate-800/50 rounded-xl border border-slate-700/60 p-4 space-y-4">
                                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">💰 Depósito / Retiro Manual</h4>

                                <div className="bg-slate-950 p-1 rounded-lg flex border border-slate-800">
                                    <button
                                        type="button"
                                        onClick={() => setType('DEPOSIT')}
                                        className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${isDeposit ? 'bg-green-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                                    >
                                        DEPOSIT
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setType('WITHDRAW')}
                                        className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${!isDeposit ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                                    >
                                        WITHDRAW
                                    </button>
                                </div>

                                {type === 'DEPOSIT' && (
                                    <button
                                        onClick={() => setShowDepositModal(true)}
                                        className="w-full py-3 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 text-black font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg"
                                    >
                                        <span>⚡</span> Deposit with Bitcoin
                                    </button>
                                )}

                                {type === 'DEPOSIT' && (
                                    <p className="text-center text-gray-600 text-xs">— OR MANUAL OVERRIDE —</p>
                                )}

                                <form onSubmit={handleSubmit} className={`space-y-3 ${type === 'DEPOSIT' ? 'pt-2 border-t border-dashed border-slate-700' : ''}`}>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-mono">$</span>
                                        <input
                                            type="number"
                                            value={amount}
                                            onChange={e => setAmount(e.target.value)}
                                            className={`w-full bg-slate-950 border border-slate-800 rounded-lg py-3 pl-8 pr-4 text-white font-mono outline-none transition-colors ${isDeposit ? 'focus:border-green-500' : 'focus:border-red-500'}`}
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <input
                                        type="text"
                                        value={note}
                                        onChange={e => setNote(e.target.value)}
                                        className={`w-full bg-slate-950 border border-slate-800 rounded-lg py-3 px-4 text-white text-xs outline-none transition-colors ${isDeposit ? 'focus:border-green-500' : 'focus:border-red-500'}`}
                                        placeholder={isDeposit ? 'Nota de auditoría (requerida)...' : 'Razón del retiro (requerida)...'}
                                    />
                                    <div className="flex justify-between text-xs text-gray-600">
                                        <span>Balance proyectado:</span>
                                        <span className={`font-mono font-bold ${projectedBalance < 0 ? 'text-red-500' : 'text-gray-300'}`}>
                                            ${projectedBalance.toFixed(2)}
                                        </span>
                                    </div>
                                    <button
                                        type="submit"
                                        className={`w-full py-3 font-bold rounded-lg transition-all text-sm ${isDeposit
                                                ? 'bg-green-900/50 hover:bg-green-800 text-green-200 border border-green-700/50'
                                                : 'bg-red-600 hover:bg-red-500 text-white shadow-lg active:scale-95'
                                            }`}
                                    >
                                        {isDeposit ? 'Confirm Manual Credit' : 'Confirm Withdrawal'}
                                    </button>
                                </form>
                            </div>

                        </div>
                    </div>
                </div>
            </div>

            {showDepositModal && (
                <DepositModal
                    isOpen={showDepositModal}
                    onClose={() => setShowDepositModal(false)}
                    userId={user.id}
                    currentBalance={user.balance}
                    onSuccess={() => {
                        setShowDepositModal(false);
                        onSuccess();
                    }}
                />
            )}
        </>
    );
};

export default WalletManagerModal;
