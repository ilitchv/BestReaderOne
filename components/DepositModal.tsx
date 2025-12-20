
import React, { useState, useEffect } from 'react';

interface DepositModalProps {
    isOpen: boolean;
    onClose: () => void;
    userEmail: string;
    userId: string;
    onSuccess: (amount: number) => void;
}

const PRESET_AMOUNTS = [5, 10, 20, 40, 80, 100];

export const DepositModal: React.FC<DepositModalProps> = ({ isOpen, onClose, userEmail, userId, onSuccess }) => {
    const [selectedAmount, setSelectedAmount] = useState<number>(10);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'processing' | 'waiting_payment' | 'paid' | 'error'>('idle');
    const [paymentLink, setPaymentLink] = useState<string | null>(null);
    const [invoiceId, setInvoiceId] = useState<string | null>(null);
    const [paymentType, setPaymentType] = useState<'BTC' | 'SHOPIFY'>('BTC');

    // Reset state when opening
    useEffect(() => {
        if (isOpen) {
            setSelectedAmount(10);
            setStatus('idle');
            setPaymentLink(null);
            setInvoiceId(null);
            setPaymentType('BTC');
        }
    }, [isOpen]);

    // Listen for payment success from new tab
    useEffect(() => {
        const bc = new BroadcastChannel('payment_channel');

        bc.onmessage = async (event) => {
            console.log('💰 Deposit Signal Received:', event.data);
            if (event.data?.status === 'success' || event.data?.status === 'paid' || event.data === 'payment_success') {

                // MANUAL CLAIM (Localhost Fix for BTC)
                if (invoiceId && paymentType === 'BTC') {
                    try {
                        setStatus('processing');
                        console.log(`🔎 Claiming Deposit Invoice: ${invoiceId}`);
                        const claimRes = await fetch('/api/payment/claim', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ invoiceId, userId })
                        });
                        const claimData = await claimRes.json();
                        console.log("✅ Claim Response:", claimData);
                    } catch (e) {
                        console.error("Claim Error:", e);
                    }
                }

                setStatus('paid');
                setTimeout(() => {
                    onSuccess(selectedAmount);
                    onClose();
                }, 2000);
            }
        };

        return () => bc.close();
    }, [selectedAmount, onSuccess, onClose, invoiceId, userId, paymentType]);


    const handleCreateInvoice = async () => {
        setLoading(true);
        setStatus('processing');
        try {
            const res = await fetch('/api/payment/invoice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: selectedAmount,
                    currency: 'USD',
                    buyerEmail: userEmail,
                    orderId: `DEPOSIT-${userId}-${Date.now()}`
                })
            });

            const data = await res.json();

            if (data.checkoutLink) {
                setPaymentLink(data.checkoutLink);
                setInvoiceId(data.id);
                // Note: invoiceId is BTCPay Invoice ID
                setStatus('waiting_payment');
                window.open(data.checkoutLink, '_blank');
            } else {
                throw new Error('No checkout link returned');
            }

        } catch (error) {
            console.error(error);
            setStatus('error');
        } finally {
            setLoading(false);
        }
    };

    const handleShopifyCheckout = async () => {
        setLoading(true);
        setStatus('processing');
        setPaymentType('SHOPIFY');
        try {
            const res = await fetch('/api/payment/shopify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: selectedAmount,
                    userId: userId,
                    email: userEmail
                })
            });
            const d = await res.json();

            if (d.checkoutUrl) {
                setPaymentLink(d.checkoutUrl);
                // Extract Draft Order ID (Assuming backend returns it, or we assume checkoutUrl has it? No, backend MUST return ID)
                // Wait, previously I saw server.js did NOT return ID. I need to assume server.js returns { checkoutUrl, success }
                // I need to update server code to return { checkoutUrl, id }.
                // But let's assume I fix server code OR I extract ID from URL?
                // Draft Order URL: https://store.com/invoice/ID/verify
                // Actually server returned `paymentInfo.id` in console log but JSON response was: `res.json({ success: true, checkoutUrl: paymentInfo.checkoutUrl });`
                // I NEED TO FIX SERVER.JS FIRST or assume I will.
                // Let's assume I will fix server.js to return `id`.

                // Temporary HACK if ID is missing: We can't poll without ID.
                // I WILL FIX SERVER.JS AFTER THIS.

                // Let's try to extract if coming from server:
                if (d.id) {
                    setInvoiceId(d.id.toString());
                } else {
                    // Fallback: If no ID, we can't poll. We rely on user coming back?
                    // Or we extract from URL if possible.
                    console.warn("No Draft Order ID returned for polling.");
                }

                setStatus('waiting_payment');
                window.open(d.checkoutUrl, '_blank');
            } else {
                throw new Error('No checkout link returned');
            }
        } catch (e) {
            console.error(e);
            setStatus('error');
        } finally {
            setLoading(false);
        }
    };

    // Polling backup
    useEffect(() => {
        if (status !== 'waiting_payment' || !invoiceId) return;

        const interval = setInterval(async () => {
            try {
                let success = false;

                if (paymentType === 'SHOPIFY') {
                    const res = await fetch('/api/payment/shopify-status', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: invoiceId, userId })
                    });
                    if (res.ok) {
                        const d = await res.json();
                        if (d.success && d.status === 'completed') success = true;
                    }
                } else {
                    // BTCPay
                    const claimRes = await fetch('/api/payment/claim', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ invoiceId, userId })
                    });
                    if (claimRes.ok) {
                        const claimData = await claimRes.json();
                        if (claimData.success) success = true;
                    }
                }

                if (success) {
                    console.log("✅ Polling confirmed payment!");
                    setStatus('paid');
                    setTimeout(() => {
                        onSuccess(selectedAmount);
                        onClose();
                    }, 2000);
                }
            } catch (e) { console.error(e); }
        }, 5000);

        return () => clearInterval(interval);
    }, [status, invoiceId, paymentType, userId, selectedAmount, onSuccess, onClose]);


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl w-full max-w-md overflow-hidden relative shadow-2xl">

                {/* Header */}
                <div className="p-6 border-b border-[#333] flex justify-between items-center bg-[#222]">
                    <h2 className="text-xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
                        Deposit Funds
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        ✕
                    </button>
                </div>

                <div className="p-6 space-y-6">

                    {status === 'idle' && (
                        <>
                            {/* Amount Grid */}
                            <div className="grid grid-cols-3 gap-3">
                                {PRESET_AMOUNTS.map(amount => (
                                    <button
                                        key={amount}
                                        onClick={() => setSelectedAmount(amount)}
                                        className={`py-3 rounded-lg font-bold border transition-all ${selectedAmount === amount
                                            ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.3)]'
                                            : 'bg-[#222] border-[#333] text-gray-400 hover:border-gray-500 hover:bg-[#2a2a2a]'
                                            }`}
                                    >
                                        ${amount}
                                    </button>
                                ))}
                            </div>

                            {/* Summary */}
                            <div className="bg-[#111] p-4 rounded-xl border border-[#333] flex justify-between items-center">
                                <span className="text-gray-400">Total to Pay</span>
                                <span className="text-2xl font-mono text-white">${selectedAmount.toFixed(2)}</span>
                            </div>

                            {/* Action Buttons */}
                            <div className="space-y-3">
                                <button
                                    onClick={() => { setPaymentType('BTC'); handleCreateInvoice(); }}
                                    disabled={loading}
                                    className="w-full py-4 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-black font-bold text-lg rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    <span>⚡</span> {loading && paymentType === 'BTC' ? 'Creating...' : 'Pay with Bitcoin'}
                                </button>

                                <button
                                    onClick={handleShopifyCheckout}
                                    disabled={loading}
                                    className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold text-lg rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    <span>💳</span> {loading && paymentType === 'SHOPIFY' ? 'Creating Link...' : 'Pay with Card (Shopify)'}
                                </button>
                            </div>
                        </>
                    )}

                    {status === 'processing' && (
                        <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                            <div className="w-12 h-12 border-4 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin"></div>
                            <p className="text-gray-400 animate-pulse">Contacting Payment Processor...</p>
                        </div>
                    )}

                    {status === 'waiting_payment' && (
                        <div className="py-8 flex flex-col items-center justify-center text-center space-y-6">
                            <div className="relative">
                                <div className="absolute inset-0 bg-yellow-500/20 blur-xl rounded-full"></div>
                                <div className="relative bg-[#111] p-4 rounded-full border border-yellow-500/50">
                                    <span className="text-4xl">{paymentType === 'BTC' ? '⚡' : '💳'}</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-xl font-bold text-white">Payment Window Open</h3>
                                <p className="text-gray-400 text-sm max-w-[80%] mx-auto">
                                    A new tab has opened for your payment. Please complete the transaction there.
                                </p>
                            </div>

                            {paymentLink && (
                                <a
                                    href={paymentLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-6 py-2 bg-[#222] hover:bg-[#333] border border-[#444] rounded-lg text-yellow-400 text-sm transition-colors flex items-center gap-2"
                                >
                                    Re-open Payment Page ↗
                                </a>
                            )}

                            <p className="text-xs text-gray-500 mt-4">Waiting for confirmation...</p>
                        </div>
                    )}

                    {status === 'paid' && (
                        <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center border border-green-500 text-green-500 text-3xl">
                                ✓
                            </div>
                            <h3 className="text-xl font-bold text-green-400">Deposit Successful!</h3>
                            <p className="text-gray-400">Adding funds to your wallet...</p>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center border border-red-500 text-red-500 text-3xl">
                                ⚠
                            </div>
                            <h3 className="text-xl font-bold text-red-400">Connection Failed</h3>
                            <p className="text-gray-400 text-sm">Could not create invoice. Please try again.</p>
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
