
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSound } from '../hooks/useSound';

interface ReferralLinkModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSimulate: () => void;
}

const ReferralLinkModal: React.FC<ReferralLinkModalProps> = ({ isOpen, onClose, onSimulate }) => {
    const { user } = useAuth();
    const { playSound } = useSound();
    const [copied, setCopied] = useState(false);

    if (!isOpen || !user) return null;

    const referralLink = `https://beastreader.com/register?ref=${user.id}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(referralLink);
        setCopied(true);
        playSound('success');
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[60] animate-fade-in" onClick={onClose}>
            <div className="bg-[#151e32] w-full max-w-md rounded-2xl border border-neon-cyan/30 shadow-[0_0_30px_rgba(0,255,255,0.1)] overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-neon-cyan/10 to-transparent">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neon-cyan"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                        Invite Agent
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">✕</button>
                </div>
                
                <div className="p-6 space-y-6">
                    <div className="text-center">
                        <div className="w-16 h-16 bg-neon-cyan/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-neon-cyan/30">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neon-cyan"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" x2="20" y1="8" y2="14"/><line x1="23" x2="17" y1="11" y2="11"/></svg>
                        </div>
                        <h4 className="text-white font-bold text-lg mb-2">Grow Your Network</h4>
                        <p className="text-gray-400 text-sm">Share this unique link. When they register, they will be added to your team pending Admin approval.</p>
                    </div>

                    <div className="bg-black/30 p-3 rounded-xl border border-white/10 flex items-center gap-2">
                        <input 
                            type="text" 
                            readOnly 
                            value={referralLink} 
                            className="bg-transparent text-gray-300 text-xs w-full outline-none font-mono truncate"
                        />
                        <button 
                            onClick={handleCopy} 
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${copied ? 'bg-green-500 text-black' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                        >
                            {copied ? 'COPIED' : 'COPY'}
                        </button>
                    </div>

                    <div className="border-t border-white/10 pt-4">
                        <button 
                            onClick={() => { onClose(); onSimulate(); }} 
                            className="w-full py-3 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20.94c1.61 0 3.11-.59 4.25-1.56 2.06-1.76 2.06-4.62 0-6.38a6.38 6.38 0 0 0-4.25-1.56c-1.61 0-3.11.59-4.25 1.56-2.06 1.76-2.06 4.62 0 6.38a6.38 6.38 0 0 0 4.25 1.56Z"/><path d="M12 8V2"/></svg>
                            Simulate Registration (Demo)
                        </button>
                        <p className="text-center text-[10px] text-gray-500 mt-2">
                            Use this to test the registration flow as if you were the new user.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReferralLinkModal;
