import React from 'react';

interface SniperFrameProps {
    mode: 'user' | 'admin';
    userId?: string;
    className?: string;
}

const SniperFrame: React.FC<SniperFrameProps> = ({ mode, userId, className }) => {
    // Defines the scope of data: Global for Admin, specific UserId for Users
    const finalUserId = mode === 'admin' ? 'sniper_global_master_v1' : (userId || 'guest');

    // Construct the Iframe URL with query parameters
    const targetUrl = `/sniper/index.html?mode=${mode}&userId=${finalUserId}&t=${Date.now()}`;

    return (
        <div className={`w-full h-[80vh] min-h-[600px] bg-[#0b1120] rounded-xl overflow-hidden border border-slate-700 shadow-2xl relative ${className}`}>
            {/* Loader Overlay (Masked by Iframe load usually, but good to have background) */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                <span className="text-cyan-500 animate-pulse font-bold text-xs">LOADING SNIPER ENGINE...</span>
            </div>
            <iframe
                src={targetUrl}
                className="w-full h-full border-0 relative z-10"
                title="Sniper Strategy"
                allow="clipboard-read; clipboard-write; fullscreen"
            />
        </div>
    );
};

export default SniperFrame;
