// PASTE YOUR components/CommissionsView.tsx CODE HERE

import React, { useState, useMemo } from 'react';
import { User, Transaction } from '../../../types';
import { generateMockTransactions } from '../mockData';

interface Props {
    user: User;
}

// Extender Transaction para uso interno si es necesario
interface ViewTransaction extends Transaction {
    type: 'incoming' | 'withdrawal';
}

const CommissionsView: React.FC<Props> = ({ user }) => {
    // Estado para las transacciones (inicializado con datos mock)
    const [transactions] = useState<ViewTransaction[]>(() =>
        generateMockTransactions(10).map(t => ({ ...t, type: 'incoming' }))
    );

    const [showAllHistory, setShowAllHistory] = useState(false);

    const totalBalance = (user.commissionBalance?.tokens ?? 0) + (user.commissionBalance?.btc ?? 0);
    const btcProgress = Math.min(((user.commissionBalance?.btc ?? 0) / 50) * 100, 100);
    const canWithdraw = (user.commissionBalance?.btc ?? 0) >= 50;

    const visibleTransactions = showAllHistory ? transactions : transactions.slice(0, 5);

    return (
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 animate-in fade-in duration-500">
            <div className="mx-auto max-w-6xl">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Main Balance Card */}
                    <div className="lg:col-span-2 bg-gradient-to-br from-brand-panel to-brand-dark p-8 rounded-[2rem] border border-brand-panel-lighter shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                            <span className="material-symbols-outlined text-[120px] text-white">account_balance_wallet</span>
                        </div>
                        <h3 className="text-brand-text-muted text-xs font-bold uppercase tracking-[0.2em] mb-4">Saldo Total Acumulado</h3>
                        <div className="flex items-baseline gap-4 mb-8">
                            <span className="text-6xl font-black text-white tracking-tight">${totalBalance.toFixed(2)}</span>
                            <span className="text-brand-cyan font-bold bg-brand-cyan/10 px-3 py-1 rounded-full text-xs border border-brand-cyan/20">Semana Actual</span>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-brand-dark/50 p-6 rounded-2xl border border-brand-panel-lighter">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-[10px] text-brand-text-muted font-bold uppercase tracking-widest">Créditos (70%)</span>
                                    <span className="material-symbols-outlined text-brand-cyan text-lg">token</span>
                                </div>
                                <p className="text-2xl font-bold text-white">${(user.commissionBalance?.tokens ?? 0).toFixed(2)}</p>
                                <p className="text-[9px] text-brand-text-muted mt-2 uppercase">Solo para consumo interno</p>
                            </div>
                            <div className="bg-brand-dark/50 p-6 rounded-2xl border border-brand-panel-lighter">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-[10px] text-brand-cyan font-bold uppercase tracking-widest">Saldo BTC (30%)</span>
                                    <span className="material-symbols-outlined text-orange-500 text-lg">currency_bitcoin</span>
                                </div>
                                <p className="text-2xl font-bold text-white">${(user.commissionBalance?.btc ?? 0).toFixed(2)}</p>
                                <p className="text-[9px] text-brand-text-muted mt-2 uppercase">Retirable a wallet externa</p>
                            </div>
                        </div>
                    </div>

                    {/* Withdrawal Status (Informational) */}
                    <div className="bg-brand-panel p-8 rounded-[2rem] border border-brand-panel-lighter shadow-xl flex flex-col justify-between relative overflow-hidden">
                        <div>
                            <h3 className="text-white text-sm font-bold mb-6">Elegibilidad de Pago</h3>
                            <div className="relative size-40 mx-auto mb-6 transition-all duration-1000">
                                <svg className="size-full -rotate-90" viewBox="0 0 36 36">
                                    <circle cx="18" cy="18" r="16" fill="none" className="stroke-brand-dark" strokeWidth="3"></circle>
                                    <circle
                                        cx="18" cy="18" r="16" fill="none"
                                        className={`stroke-brand-cyan shadow-[0_0_10px_#00f0ff] transition-all duration-1000 ease-out`}
                                        strokeWidth="3"
                                        strokeDasharray="100"
                                        strokeDashoffset={100 - btcProgress}
                                        strokeLinecap="round"
                                    ></circle>
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-2xl font-bold text-white">{Math.round(btcProgress)}%</span>
                                    <span className="text-[8px] text-brand-text-muted uppercase font-bold">Progreso Meta</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-2 bg-brand-dark/50 p-4 rounded-xl border border-brand-panel-lighter text-center">
                            <div className="flex justify-center mb-2">
                                <span className="material-symbols-outlined text-brand-text-muted">account_balance</span>
                            </div>
                            <p className="text-[10px] text-brand-text-muted uppercase font-bold leading-relaxed mb-2">
                                La gestión de retiros se realiza desde su <span className="text-white">Wallet Principal</span>.
                            </p>
                            {canWithdraw ? (
                                <div className="flex items-center justify-center gap-1.5 text-green-400">
                                    <span className="material-symbols-outlined text-sm">check_circle</span>
                                    <span className="text-[10px] font-bold uppercase">Mínimo Alcanzado</span>
                                </div>
                            ) : (
                                <span className="text-[10px] text-brand-text-muted block opacity-50">Mínimo $50.00 para retirar</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* History Section */}
                <div className="mt-8 bg-brand-panel rounded-[2rem] border border-brand-panel-lighter overflow-hidden shadow-xl">
                    <div className="p-6 border-b border-brand-panel-lighter flex justify-between items-center bg-brand-panel/50 backdrop-blur-sm sticky top-0 z-10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-brand-dark rounded-lg border border-brand-panel-lighter">
                                <span className="material-symbols-outlined text-brand-cyan">history</span>
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-sm">Desglose de Comisiones</h3>
                                <p className="text-[10px] text-brand-text-muted">Registro de ingresos por red</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowAllHistory(!showAllHistory)}
                            className="text-xs text-brand-cyan font-bold hover:underline bg-brand-cyan/10 px-3 py-1.5 rounded-lg border border-brand-cyan/20 transition-all hover:bg-brand-cyan/20"
                        >
                            {showAllHistory ? 'Ver Menos' : 'Ver Todo'}
                        </button>
                    </div>

                    <div className="max-h-[500px] overflow-y-auto">
                        <table className="w-full text-left text-sm">
                            <tbody className="divide-y divide-brand-panel-lighter">
                                {visibleTransactions.length > 0 ? (
                                    visibleTransactions.map((tx) => (
                                        <tr key={tx.id} className="hover:bg-brand-panel-lighter/30 transition-colors group">
                                            <td className="p-6">
                                                <div className="flex items-center gap-4">
                                                    <div className={`size-10 rounded-full flex items-center justify-center border ${tx.type === 'withdrawal' ? 'bg-orange-500/10 border-orange-500/20 text-orange-500' : 'bg-green-500/10 border-green-500/20 text-green-400'}`}>
                                                        <span className="material-symbols-outlined">
                                                            {tx.type === 'withdrawal' ? 'arrow_upward' : 'add'}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <p className="text-white font-bold text-xs">
                                                            {tx.type === 'withdrawal' ? 'Retiro de Fondos BTC' : `Comisión de Red - Nivel ${tx.level}`}
                                                        </p>
                                                        <p className="text-[10px] text-brand-text-muted flex items-center gap-1">
                                                            <span className="font-mono opacity-70">#{tx.id}</span>
                                                            <span>•</span>
                                                            <span>{new Date(tx.date).toLocaleDateString()} {new Date(tx.date).toLocaleTimeString()}</span>
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6 text-right">
                                                <p className={`font-black text-sm ${tx.type === 'withdrawal' ? 'text-white' : 'text-brand-cyan'}`}>
                                                    {tx.type === 'withdrawal' ? '-' : '+'}${Math.abs(tx.commissionEarned).toFixed(2)}
                                                </p>
                                                <p className="text-[10px] text-brand-text-muted uppercase font-bold tracking-wider">
                                                    {tx.type === 'withdrawal' ? 'Completado' : 'Acreditado'}
                                                </p>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={2} className="p-12 text-center text-brand-text-muted">
                                            <span className="material-symbols-outlined text-4xl mb-2 opacity-20">receipt_long</span>
                                            <p>No hay transacciones registradas aún.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {visibleTransactions.length > 0 && (
                        <div className="p-3 border-t border-brand-panel-lighter bg-brand-dark/30 text-center">
                            <p className="text-[9px] text-brand-text-muted uppercase">Mostrando {visibleTransactions.length} de {transactions.length} registros</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CommissionsView;
