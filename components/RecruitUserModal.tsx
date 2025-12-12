
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { localDbService } from '../services/localDbService';
import { User } from '../types';
import { useSound } from '../hooks/useSound';

interface RecruitUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const RecruitUserModal: React.FC<RecruitUserModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const { user } = useAuth();
    const { playSound } = useSound();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        phone: ''
    });
    const [error, setError] = useState('');

    if (!isOpen || !user) return null;

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
            role: 'user', // Always user
            status: 'active',
            balance: 0,
            pendingBalance: 0,
            phone: formData.phone,
            createdAt: new Date().toISOString(),
            avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name)}&background=random&color=fff`,
            sponsorId: user.id // STRICT: The creator is the sponsor
        };

        const success = localDbService.saveUser(newUser);
        if (success) {
            playSound('success');
            onSuccess();
            onClose();
            setFormData({ name: '', email: '', password: '', phone: '' });
        } else {
            setError('Failed to create user. Email might be taken.');
            playSound('error');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[60] animate-fade-in" onClick={onClose}>
            <div className="bg-[#151e32] w-full max-w-md rounded-2xl border border-neon-cyan/30 shadow-[0_0_30px_rgba(0,255,255,0.1)] overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-neon-cyan/10 to-transparent">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neon-cyan"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" x2="20" y1="8" y2="14"/><line x1="23" x2="17" y1="11" y2="11"/></svg>
                        Recruit New Agent
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">✕</button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="bg-blue-500/10 p-3 rounded-lg border border-blue-500/20 mb-4">
                        <p className="text-xs text-blue-200">
                            You are registering a new agent under your network. 
                            <strong> {user.name}</strong> will be set as their Sponsor.
                        </p>
                    </div>

                    <div>
                        <label className="block text-xs uppercase text-gray-500 font-bold mb-1">Agent Name <span className="text-red-500">*</span></label>
                        <input 
                            type="text" 
                            required
                            placeholder="e.g. John Doe"
                            value={formData.name} 
                            onChange={e => setFormData({...formData, name: e.target.value})} 
                            className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:border-neon-cyan outline-none transition-colors" 
                        />
                    </div>

                    <div>
                        <label className="block text-xs uppercase text-gray-500 font-bold mb-1">Email <span className="text-red-500">*</span></label>
                        <input 
                            type="email" 
                            required
                            placeholder="agent@example.com"
                            value={formData.email} 
                            onChange={e => setFormData({...formData, email: e.target.value})} 
                            className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:border-neon-cyan outline-none transition-colors" 
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs uppercase text-gray-500 font-bold mb-1">Password <span className="text-red-500">*</span></label>
                            <input 
                                type="text" 
                                required
                                placeholder="Secret123"
                                value={formData.password} 
                                onChange={e => setFormData({...formData, password: e.target.value})} 
                                className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:border-neon-cyan outline-none transition-colors font-mono" 
                            />
                        </div>
                        <div>
                            <label className="block text-xs uppercase text-gray-500 font-bold mb-1">Phone (Optional)</label>
                            <input 
                                type="text" 
                                placeholder="+1..."
                                value={formData.phone} 
                                onChange={e => setFormData({...formData, phone: e.target.value})} 
                                className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:border-neon-cyan outline-none transition-colors" 
                            />
                        </div>
                    </div>

                    {error && <p className="text-red-500 text-xs font-bold text-center animate-pulse">{error}</p>}

                    <div className="pt-2 flex gap-3">
                        <button type="button" onClick={onClose} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-colors">Cancel</button>
                        <button type="submit" className="flex-1 py-3 bg-neon-cyan hover:bg-cyan-400 text-black rounded-xl font-bold shadow-lg shadow-neon-cyan/20 transition-all hover:scale-[1.02]">Create Agent</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RecruitUserModal;
