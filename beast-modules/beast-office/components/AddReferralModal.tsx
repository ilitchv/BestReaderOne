// PASTE YOUR components/AddReferralModal.tsx CODE HERE

import React, { useState } from 'react';
import { User, UserRank, UserStatus } from '../../../types';

interface Props { onClose: () => void; sponsor: User; }

const AddReferralModal: React.FC<Props> = ({ onClose, sponsor }) => {
    const [loading, setLoading] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            onClose();
            alert("Referido registrado exitosamente. Aparecerá en tu árbol tras la validación del primer pago.");
        }, 1500);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-brand-dark/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-brand-panel w-full max-w-md rounded-[2.5rem] border border-brand-panel-lighter shadow-2xl p-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-brand-cyan"></div>
                <button onClick={onClose} className="absolute top-6 right-6 text-brand-text-muted hover:text-white transition-colors">
                    <span className="material-symbols-outlined">close</span>
                </button>

                <header className="mb-8">
                    <h2 className="text-2xl font-black text-white mb-2">Nuevo Referido</h2>
                    <div className="flex items-center gap-2 p-3 bg-brand-dark/50 rounded-2xl border border-brand-panel-lighter">
                        <span className="text-[10px] text-brand-text-muted font-bold uppercase tracking-widest">Sponsor:</span>
                        <span className="text-xs text-brand-cyan font-bold">{sponsor.name}</span>
                    </div>
                </header>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] text-brand-text-muted font-bold uppercase tracking-widest ml-1">Nombre Completo</label>
                        <input required type="text" className="w-full bg-brand-dark border border-brand-panel-lighter rounded-2xl px-5 py-3.5 text-sm text-white focus:ring-1 focus:ring-brand-cyan focus:border-brand-cyan" placeholder="Ej: Juan Pérez" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] text-brand-text-muted font-bold uppercase tracking-widest ml-1">Correo Electrónico</label>
                        <input required type="email" className="w-full bg-brand-dark border border-brand-panel-lighter rounded-2xl px-5 py-3.5 text-sm text-white focus:ring-1 focus:ring-brand-cyan focus:border-brand-cyan" placeholder="juan@email.com" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] text-brand-text-muted font-bold uppercase tracking-widest ml-1">Ubicación de Rama</label>
                        <select className="w-full bg-brand-dark border border-brand-panel-lighter rounded-2xl px-5 py-3.5 text-sm text-white focus:ring-1 focus:ring-brand-cyan focus:border-brand-cyan outline-none appearance-none">
                            <option>Rama Automática (Balanceada)</option>
                            <option>Rama Izquierda</option>
                            <option>Rama Derecha</option>
                        </select>
                    </div>

                    <div className="pt-4">
                        <button
                            disabled={loading}
                            className="w-full py-5 bg-brand-cyan text-black font-black rounded-[1.5rem] uppercase tracking-widest text-xs hover:scale-[1.02] transition-all shadow-[0_0_20px_rgba(0,240,255,0.4)] disabled:opacity-50"
                        >
                            {loading ? 'Procesando...' : 'Registrar Referido'}
                        </button>
                    </div>
                    <p className="text-center text-[9px] text-brand-text-muted uppercase leading-relaxed font-medium">
                        Al registrarlo, el usuario recibirá un correo con su link de activación. Debe cumplir con un PV mínimo de $50 para que comiences a generar comisiones sobre su red.
                    </p>
                </form>
            </div>
        </div>
    );
};

export default AddReferralModal;
