import React from 'react';
import QRCode from 'react-qr-code';

interface FloatingQRProps {
    className?: string;
}

export const FloatingQR: React.FC<FloatingQRProps> = ({ className = '' }) => {
    const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

    return (
        <div className={`flex flex-col items-center bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-2xl p-4 ${className}`}>
            <div className="bg-white p-2 rounded-xl">
                <QRCode
                    value={currentUrl}
                    size={150}
                    level="H"
                    bgColor="#FFFFFF"
                    fgColor="#000000"
                />
            </div>
            <div className="text-center mt-3">
                <p className="text-white font-bold text-sm">Scan to Open on Mobile</p>
                <p className="text-white/60 text-xs">Play Anywhere</p>
            </div>
        </div>
    );
};
