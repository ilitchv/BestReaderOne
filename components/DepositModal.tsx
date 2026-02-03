
import React, { useState, useEffect } from 'react';
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

interface DepositModalProps {
    isOpen: boolean;
    onClose: () => void;
    userEmail: string;
    userId: string;
    onSuccess: (amount: number) => void;
}

const PRESET_AMOUNTS = [5, 10, 20, 40, 80, 100];

// Simplified Deposit Modal for Lumina Integration
export const DepositModal: React.FC<DepositModalProps> = ({ isOpen, onClose, userId }) => {

    if (!isOpen) return null;

    const handleLuminaRedirect = () => {
        // Redirect to Lumina Add Funds Page with beastId param
        const returnUrl = encodeURIComponent(window.location.href);
        const luminaUrl = `http://localhost:3000/add-funds?beastId=${userId}&returnUrl=${returnUrl}`;
        window.location.href = luminaUrl;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl w-full max-w-md overflow-hidden relative shadow-2xl">

                {/* Header */}
                <div className="p-6 border-b border-[#333] flex justify-between items-center bg-[#222]">
                    <h2 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-600 bg-clip-text text-transparent">
                        Deposit Funds
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        ✕
                    </button>
                </div>

                <div className="p-6 space-y-6 text-center">

                    <div className="py-4">
                        <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-500/30">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-white mb-2">Secure Deposit via Lumina</h3>
                        <p className="text-gray-400 text-sm">
                            We use Lumina Marketplace for secure payments. You will be redirected to complete your deposit effectively adding funds to your wallet.
                        </p>
                    </div>

                    <button
                        onClick={handleLuminaRedirect}
                        className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-lg rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 group"
                    >
                        <span>Deposit Now</span>
                        <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </button>

                    <p className="text-xs text-gray-600 mt-4">
                        Funds are credited instantly after purchase.
                    </p>

                </div>
            </div>
        </div>
    );
};
