import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

interface WithdrawalRequest {
    _id: string;
    amount: number;
    walletAddress: string;
    network: string;
    status: string;
    createdAt: string;
    txHash?: string;
    ledgerTransactionId?: string;
}

interface LedgerEntry {
    _id: string;
    action: string;
    amount: number;
    referenceId: string;
    description: string;
    timestamp: string;
    balanceAfter: number;
}

export const TransactionHistory: React.FC = () => {
    const { user } = useAuth();
    const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
    const [ledger, setLedger] = useState<LedgerEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        fetchData();
    }, [user]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [wRes, lRes] = await Promise.all([
                axios.get(`/api/user/withdrawals?userId=${user?.id}`),
                axios.get(`/api/user/ledger?userId=${user?.id}&limit=100`)
            ]);
            setWithdrawals(wRes.data);
            setLedger(lRes.data);
        } catch (error) {
            console.error("Failed to fetch history:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500 animate-pulse">Loading financial data...</div>;

    return (
        <div className="space-y-8 animate-fade-in">
            {/* 1. ACTIVE WITHDRAWALS */}
            <div>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <span className="w-2 h-6 bg-orange-500 rounded-sm"></span>
                    Pending Requests
                </h3>
                {withdrawals.filter(w => w.status === 'PENDING').length > 0 ? (
                    <div className="bg-slate-800/50 rounded-lg border border-orange-500/30 overflow-hidden">
                        <table className="w-full text-sm text-left text-gray-300">
                            <thead className="bg-orange-500/10 text-orange-400 font-bold uppercase text-xs">
                                <tr>
                                    <th className="p-4">Date</th>
                                    <th className="p-4">Amount</th>
                                    <th className="p-4">Destination</th>
                                    <th className="p-4 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/50">
                                {withdrawals.filter(w => w.status === 'PENDING').map(w => (
                                    <tr key={w._id}>
                                        <td className="p-4 text-xs font-mono text-slate-400">{new Date(w.createdAt).toLocaleString()}</td>
                                        <td className="p-4 font-bold text-white">${w.amount.toFixed(2)}</td>
                                        <td className="p-4 text-xs font-mono">
                                            <div className="text-slate-400">{w.network}</div>
                                            <div className="text-slate-500 truncate max-w-[200px]">{w.walletAddress}</div>
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 text-[10px] font-bold uppercase animate-pulse">
                                                Processing
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-6 bg-slate-800/30 rounded-lg border border-dashed border-slate-700 text-center text-slate-500 text-sm">
                        No pending withdrawal requests.
                    </div>
                )}
            </div>

            {/* 2. LEDGER HISTORY (ALL TRANSACTIONS) */}
            <div>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <span className="w-2 h-6 bg-neon-cyan/50 rounded-sm"></span>
                    Transaction History
                </h3>
                <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-400">
                            <thead className="bg-slate-950 text-gray-500 font-bold uppercase text-xs">
                                <tr>
                                    <th className="p-4 w-48">Date</th>
                                    <th className="p-4 w-32">Type</th>
                                    <th className="p-4">Description</th>
                                    <th className="p-4 text-right">Amount</th>
                                    <th className="p-4 text-right">Balance</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {ledger.map(entry => (
                                    <tr key={entry._id} className="hover:bg-slate-800/50 transition-colors">
                                        <td className="p-4 text-xs font-mono">{new Date(entry.timestamp).toLocaleString()}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${entry.action === 'DEPOSIT' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                                    entry.action === 'WITHDRAW' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                                                        entry.action === 'WIN' ? 'bg-neon-cyan/10 text-neon-cyan border-neon-cyan/20' :
                                                            'bg-slate-700 text-slate-400 border-transparent'
                                                }`}>
                                                {entry.action}
                                            </span>
                                        </td>
                                        <td className="p-4 text-xs text-slate-300">
                                            {entry.description}
                                            <div className="text-[10px] text-slate-600 font-mono mt-0.5">{entry.referenceId}</div>
                                        </td>
                                        <td className={`p-4 text-right font-mono font-bold ${entry.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {entry.amount >= 0 ? '+' : ''}{entry.amount.toFixed(2)}
                                        </td>
                                        <td className="p-4 text-right font-mono text-slate-500">
                                            ${entry.balanceAfter.toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                                {ledger.length === 0 && (
                                    <tr><td colSpan={5} className="p-8 text-center italic opacity-50">No transaction history found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};
