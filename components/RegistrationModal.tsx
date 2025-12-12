
import React, { useState, useEffect } from 'react';
import { localDbService } from '../services/localDbService';
import { User } from '../types';
import { useSound } from '../hooks/useSound';

interface RegistrationModalProps {
    isOpen: boolean;
    onClose: () => void;
    sponsorId: string;
}

const RegistrationModal: React.FC<RegistrationModalProps> = ({ isOpen, onClose, sponsorId }) => {
    const { playSound } = useSound();
    const [sponsorName, setSponsorName] = useState('Unknown');
    const [step, setStep] = useState<'form' | 'success'>('form');
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        phone: ''
    });
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen && sponsorId) {
            const users = localDbService.getUsers();
            const sponsor = users.find(u => u.id === sponsorId);
            setSponsorName(sponsor ? sponsor.name : 'Unknown');
            setStep('form');
            setFormData({ name: '', email: '', password: '', phone: '' });
            setError('');
        }
    }, [isOpen, sponsorId]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!formData.name || !formData.email || !formData.password) {
            setError('Please fill in all required fields.');
            playSound('error');
            return;
        }
        
        const newUser: User = {
            id: `u-${Date.now()}`,
            email: formData.email,
            name: formData.name,
            password: formData.password,
            role: 'user', 
            status: 'pending', // IMPORTANT: Pending approval
            balance: 0,
            pendingBalance: 0,
            phone: formData.phone,
            createdAt: new Date().toISOString(),
            avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name)}&background=random&color=fff`,
            sponsorId: sponsorId
        };

        const success = localDbService.saveUser(newUser);
        if (success) {
            playSound('success');
            setStep('success');
        } else {
            setError('Failed to register. Email might be taken.');
            playSound('error');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-[70] animate-fade-in" onClick={onClose}>
            <div className="bg-slate-900 w-full max-w-md rounded-2xl border border-white/10 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                
                {step === 'form' && (
                    <>
                        <div className="p-6 border-b border-white/5 text-center">
                            <h2 className="text-xl font-bold text-white mb-1">Join Beast Reader</h2>
                            <p className="text-sm text-gray-400">
                                You have been invited by <span className="text-neon-cyan font-bold">{sponsorName}</span>
                            </p>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs uppercase text-gray-500 font-bold mb-1">Full Name <span className="text-red-500">*</span></label>
                                <input 
                                    type="text" required
                                    placeholder="e.g. Jane Doe"
                                    value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} 
                                    className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-neon-cyan outline-none transition-colors" 
                                />
                            </div>

                            <div>
                                <label className="block text-xs uppercase text-gray-500 font-bold mb-1">Email <span className="text-red-500">*</span></label>
                                <input 
                                    type="email" required
                                    placeholder="jane@example.com"
                                    value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} 
                                    className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-neon-cyan outline-none transition-colors" 
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs uppercase text-gray-500 font-bold mb-1">Password <span className="text-red-500">*</span></label>
                                    <input 
                                        type="password" required
                                        placeholder="******"
                                        value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} 
                                        className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-neon-cyan outline-none transition-colors" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs uppercase text-gray-500 font-bold mb-1">Phone</label>
                                    <input 
                                        type="text" 
                                        placeholder="+1..."
                                        value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} 
                                        className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-neon-cyan outline-none transition-colors" 
                                    />
                                </div>
                            </div>

                            {error && <p className="text-red-500 text-xs font-bold text-center animate-pulse">{error}</p>}

                            <button type="submit" className="w-full py-3 bg-gradient-to-r from-neon-cyan to-blue-600 text-white font-bold rounded-xl shadow-lg hover:brightness-110 transition-all mt-2">
                                Submit Application
                            </button>
                            <button type="button" onClick={onClose} className="w-full py-2 text-gray-500 text-sm hover:text-white">Cancel</button>
                        </form>
                    </>
                )}

                {step === 'success' && (
                    <div className="p-8 text-center space-y-4">
                        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto text-green-500 animate-in zoom-in duration-300">
                            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                        </div>
                        <h2 className="text-2xl font-bold text-white">Application Sent!</h2>
                        <p className="text-gray-400">
                            Your account request is currently <strong>Pending Approval</strong>.
                            <br/>You will be notified once the Administrator reviews your application.
                        </p>
                        <button onClick={onClose} className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold">
                            Close
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RegistrationModal;
