
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { localDbService } from '../services/localDbService';
import { useSound } from '../hooks/useSound';

interface WalletManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User | null;
    onSuccess: () => void;
}

const WalletManagerModal: React.FC<WalletManagerModalProps> = ({ isOpen, onClose, user, onSuccess }) => {
    const [amount, setAmount] = useState('');
    const [type, setType] = useState<'DEPOSIT' | 'WITHDRAW'>('DEPOSIT');
    const [note, setNote] = useState('');
    const [error, setError] = useState('');
    const { playSound } = useSound();

    useEffect(() => {
        if (isOpen) {
            setAmount('');
            setNote('');
            setError('');
            setType('DEPOSIT');
        }
    }, [isOpen]);

    if (!isOpen || !user) return null;

    const numAmount = parseFloat(amount) || 0;
    const projectedBalance = type === 'DEPOSIT' 
        ? user.balance + numAmount 
        : user.balance - numAmount;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (numAmount <= 0) return setError("Amount must be greater than 0");
        if (!note.trim()) return setError("Audit note is required for financial ops");
        
        // Block overdraft
        if (type === 'WITHDRAW' && projectedBalance < 0) {
            return setError("Insufficient funds for withdrawal.");
        }

        const success = localDbService.updateUserBalance(user.id, numAmount, type, note);
        if (success) {
            playSound(type === 'DEPOSIT' ? 'add' : 'delete');
            onSuccess();
            onClose();
        } else {
            setError("Transaction failed. Check logs.");
        }
    };

    const isDeposit = type === 'DEPOSIT';

    return (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-[200] animate-fade-in" onClick={onClose}>
            <div className="bg-slate-900 w-full max-w-md rounded-2xl border border-slate-700 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div className={`p-6 border-b border-slate-700 bg-gradient-to-r ${isDeposit ? 'from-green-900/50 to-slate-900' : 'from-red-900/50 to-slate-900'}`}>
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="text-xl font-bold text-white">Wallet Manager</h3>
                        <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
                    </div>
                    <div className="flex items-center gap-3">
                        <img src={user.avatarUrl} className="w-10 h-10 rounded-full border border-white/20" alt="Avatar"/>
                        <div>
                            <p className="text-white font-bold text-sm">{user.name}</p>
                            <p className="text-gray-400 text-xs font-mono">{user.email}</p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    
                    {/* Toggle */}
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

                    {/* Amount Input */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Amount</label>
                        <div className="relative">
                            <span className={`absolute left-4 top-3 text-2xl font-bold ${isDeposit ? 'text-green-500' : 'text-red-500'}`}>$</span>
                            <input 
                                type="number" 
                                step="0.01" 
                                autoFocus
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                className={`w-full bg-slate-800 border-2 rounded-xl py-3 pl-10 pr-4 text-2xl font-bold text-white outline-none transition-colors ${isDeposit ? 'border-green-900 focus:border-green-500' : 'border-red-900 focus:border-red-500'}`}
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    {/* Projections */}
                    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 flex justify-between items-center">
                        <div className="text-left">
                            <p className="text-[10px] uppercase text-gray-500 font-bold">Current Balance</p>
                            <p className="text-lg font-mono text-gray-300">${user.balance.toFixed(2)}</p>
                        </div>
                        <div className="text-gray-500">→</div>
                        <div className="text-right">
                            <p className="text-[10px] uppercase text-gray-500 font-bold">New Balance</p>
                            <p className={`text-lg font-mono font-bold ${projectedBalance < 0 ? 'text-red-500' : 'text-white'}`}>
                                ${projectedBalance.toFixed(2)}
                            </p>
                        </div>
                    </div>

                    {/* Note Input */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Audit Note <span className="text-red-500">*</span></label>
                        <textarea 
                            value={note}
                            onChange={e => setNote(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-white focus:border-neon-cyan outline-none resize-none h-20"
                            placeholder="Reason for transaction..."
                        />
                    </div>

                    {error && <p className="text-red-500 text-sm font-bold text-center animate-pulse">{error}</p>}

                    <button 
                        type="submit" 
                        className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg hover:scale-[1.02] transition-transform ${isDeposit ? 'bg-gradient-to-r from-green-500 to-emerald-700 text-white' : 'bg-gradient-to-r from-red-500 to-rose-700 text-white'}`}
                    >
                        CONFIRM {type}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default WalletManagerModal;
