
import React, { useState, useEffect } from 'react';

interface WithdrawModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    availableBalance: number;
    defaultWallet?: string; // NEW
    onSuccess: (amount: number) => void;
}

const NETWORKS = ['BTC (Bitcoin)', 'USDT (TRC20)', 'USDT (ERC20)', 'LTC (Litecoin)'];

export const WithdrawModal: React.FC<WithdrawModalProps> = ({ isOpen, onClose, userId, availableBalance, defaultWallet, onSuccess }) => {
    const [amount, setAmount] = useState<string>('');
    const [walletAddress, setWalletAddress] = useState('');
    const [network, setNetwork] = useState('BTC (Bitcoin)');
    const [saveWallet, setSaveWallet] = useState(false); // NEW
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        if (isOpen) {
            setAmount('');
            setWalletAddress(defaultWallet || ''); // Use prop
            setNetwork('BTC (Bitcoin)');
            setErrorMsg('');
            setSaveWallet(false);
        }
    }, [isOpen]);

    // Update wallet address if prop changes (requires interface update)
    // For now, let's keep it simple.

    const handleWithdraw = async () => {
        const val = parseFloat(amount);
        if (isNaN(val) || val <= 0) {
            setErrorMsg('Invalid Amount');
            return;
        }
        if (val > availableBalance) {
            setErrorMsg('Insufficient Balance');
            return;
        }
        if (!walletAddress.trim()) {
            setErrorMsg('Wallet Address Required');
            return;
        }

        setLoading(true);
        setStatus('processing');
        setErrorMsg('');

        try {
            const res = await fetch('/api/financial/withdraw', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    amount: val,
                    walletAddress,
                    network,
                    saveWallet // NEW
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Withdrawal failed');
            }

            setStatus('success');
            setTimeout(() => {
                onSuccess(val);
                onClose();
            }, 2000);

        } catch (error: any) {
            console.error(error);
            setStatus('error');
            setErrorMsg(error.message);
        } finally {
            setLoading(false);
        }
    };

    // UI Change: Add Checkbox below Wallet Input
    // ...

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl w-full max-w-md overflow-hidden relative shadow-2xl">

                {/* Header */}
                <div className="p-6 border-b border-[#333] flex justify-between items-center bg-[#222]">
                    <h2 className="text-xl font-bold bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent">
                        Withdraw Funds
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        ✕
                    </button>
                </div>

                <div className="p-6 space-y-6">

                    {status === 'idle' && (
                        <>
                            <div className="bg-[#111] p-4 rounded-xl border border-[#333] flex justify-between items-center">
                                <span className="text-gray-400 text-xs uppercase font-bold">Available</span>
                                <span className="text-xl font-mono text-green-400">${availableBalance.toFixed(2)}</span>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Amount to Withdraw</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                                        <input
                                            type="number"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            className="w-full bg-[#222] border border-[#333] rounded-lg p-2 pl-6 text-white outline-none focus:border-red-500 transition-colors"
                                            placeholder="0.00"
                                        />
                                        <button
                                            onClick={() => setAmount(availableBalance.toString())}
                                            className="absolute right-2 top-2 text-[10px] bg-[#333] px-2 py-1 rounded text-gray-300 hover:text-white uppercase"
                                        >
                                            Max
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Network</label>
                                    <select
                                        value={network}
                                        onChange={(e) => setNetwork(e.target.value)}
                                        className="w-full bg-[#222] border border-[#333] rounded-lg p-2 text-white outline-none focus:border-red-500 transition-colors text-sm"
                                    >
                                        {NETWORKS.map(n => <option key={n} value={n}>{n}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Wallet Address</label>
                                    <input
                                        type="text"
                                        value={walletAddress}
                                        onChange={(e) => setWalletAddress(e.target.value)}
                                        className="w-full bg-[#222] border border-[#333] rounded-lg p-2 text-white font-mono text-xs outline-none focus:border-red-500 transition-colors"
                                        placeholder="Paste your address here..."
                                    />
                                </div>
                            </div>

                            {errorMsg && (
                                <div className="p-3 bg-red-900/20 border border-red-500/50 rounded-lg text-red-400 text-xs font-bold text-center">
                                    {errorMsg}
                                </div>
                            )}

                            <button
                                onClick={handleWithdraw}
                                disabled={loading}
                                className="w-full py-4 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold text-lg rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Processing...' : 'Request Withdrawal'}
                            </button>
                        </>
                    )}

                    {status === 'processing' && (
                        <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                            <div className="w-12 h-12 border-4 border-red-500/30 border-t-red-500 rounded-full animate-spin"></div>
                            <p className="text-gray-400 animate-pulse">Verifying & Creating Request...</p>
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center border border-green-500 text-green-500 text-3xl">
                                ✓
                            </div>
                            <h3 className="text-xl font-bold text-white">Request Sent!</h3>
                            <p className="text-gray-400 text-sm">Your funds are reserved. Admin will process shortly.</p>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center border border-red-500 text-red-500 text-3xl">
                                ⚠
                            </div>
                            <h3 className="text-xl font-bold text-red-400">Error</h3>
                            <p className="text-gray-400 text-sm">{errorMsg || 'Something went wrong.'}</p>
                            <button
                                onClick={() => setStatus('idle')}
                                className="px-6 py-2 bg-[#333] hover:bg-[#444] rounded-lg text-white transition-colors"
                            >
                                Try Again
                            </button>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};
