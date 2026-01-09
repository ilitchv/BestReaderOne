import React from 'react';
import QRCode from 'react-qr-code';

interface FloatingQRProps {
    className?: string;
}

export const FloatingQR: React.FC<FloatingQRProps> = ({ className = '' }) => {
    const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

    return (
        <div className={`relative group ${className}`}>
            {/* Glow Effect */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-neon-cyan via-blue-500 to-purple-600 rounded-2xl blur opacity-60 group-hover:opacity-100 transition duration-500"></div>

            <div className="relative flex flex-col items-center bg-slate-900 border border-slate-700/50 rounded-2xl p-5 backdrop-blur-xl">
                {/* Header Badge */}
                <div className="absolute -top-3 bg-gradient-to-r from-neon-cyan to-blue-600 text-black text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg">
                    Command Center
                </div>

                <div className="bg-white p-2 rounded-xl shadow-inner mt-2">
                    <QRCode
                        value={currentUrl}
                        size={160}
                        level="H"
                        bgColor="#FFFFFF"
                        fgColor="#000000"
                    />
                </div>

                <div className="text-center mt-4">
                    <div className="flex items-center justify-center gap-2 text-white font-bold text-sm uppercase tracking-wide">
                        <span className="text-neon-cyan animate-pulse">●</span> Mobile Access
                    </div>
                    <p className="text-slate-400 text-[10px] font-mono mt-1">Scan for Full Control</p>
                </div>
            </div>
        </div>
    );
};
