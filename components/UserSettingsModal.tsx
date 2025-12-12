
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface UserSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const UserSettingsModal: React.FC<UserSettingsModalProps> = ({ isOpen, onClose }) => {
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        phone: '+1 (809) 555-0123',
        address: '123 Cyber Ave, Santo Domingo',
        email: user?.email || '',
        notifications: true
    });

    if (!isOpen || !user) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Mock save
        alert("Settings saved!");
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[60] animate-fade-in" onClick={onClose}>
            <div className="bg-[#151e32] w-full max-w-md rounded-2xl border border-slate-700 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b border-white/10 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-white">Profile Settings</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="flex items-center gap-4 mb-4">
                        <img src={user.avatarUrl} alt="Avatar" className="w-16 h-16 rounded-full border-2 border-neon-cyan" />
                        <div>
                            <p className="font-bold text-white text-lg">{user.name}</p>
                            <p className="text-xs text-neon-cyan">Verified User</p>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs uppercase text-gray-500 font-bold mb-1">Email</label>
                        <input type="email" value={formData.email} disabled className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-gray-400 cursor-not-allowed" />
                    </div>

                    <div>
                        <label className="block text-xs uppercase text-gray-500 font-bold mb-1">Phone Number</label>
                        <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-white focus:border-neon-cyan outline-none" />
                    </div>

                    <div>
                        <label className="block text-xs uppercase text-gray-500 font-bold mb-1">Physical Address</label>
                        <textarea value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-white focus:border-neon-cyan outline-none h-20" />
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                        <input type="checkbox" checked={formData.notifications} onChange={e => setFormData({...formData, notifications: e.target.checked})} className="accent-neon-cyan w-4 h-4" />
                        <span className="text-sm text-gray-300">Receive email notifications</span>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button type="button" onClick={onClose} className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg font-bold">Cancel</button>
                        <button type="submit" className="flex-1 py-2 bg-gradient-to-r from-neon-cyan to-blue-600 text-white rounded-lg font-bold hover:shadow-lg hover:shadow-neon-cyan/20">Save Changes</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UserSettingsModal;
