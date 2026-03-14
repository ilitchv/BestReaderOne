// PASTE YOUR components/ConfigurationView.tsx CODE HERE

import React, { useState, useRef, useEffect } from 'react';
import { User } from '../../../types';

interface Props { user: User; onUpdateUser: (u: User) => void; }

const ConfigurationView: React.FC<Props> = ({ user, onUpdateUser }) => {
    const [formData, setFormData] = useState<User>(user);
    const [isDirty, setIsDirty] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'network' | 'notifications'>('profile');
    const [supervisorEmails, setSupervisorEmails] = useState(['', '', '']);
    const [emailSaved, setEmailSaved] = useState(false);

    const handleChange = (field: keyof User, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setIsDirty(true);
    };

    useEffect(() => {
        fetch('/api/admin/config/alert-emails')
            .then(r => r.json())
            .then(d => {
                const emails = d.emails || [];
                setSupervisorEmails([emails[0] || '', emails[1] || '', emails[2] || '']);
            })
            .catch(() => { });
    }, []);

    const handleSaveEmails = async () => {
        try {
            await fetch('/api/admin/config/alert-emails', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ emails: supervisorEmails })
            });
            setEmailSaved(true);
            setTimeout(() => setEmailSaved(false), 3000);
        } catch { alert('Error al guardar los correos.'); }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, avatar: reader.result as string }));
                setIsDirty(true);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = () => {
        onUpdateUser(formData);
        setIsDirty(false);
        alert("Perfil actualizado correctamente en la base de datos.");
    };

    return (
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 animate-in zoom-in-95 duration-500">
            <div className="mx-auto max-w-5xl">

                {/* Admin Tabs */}
                <div className="flex gap-4 mb-8 border-b border-brand-panel-lighter pb-1">
                    <button onClick={() => setActiveTab('profile')} className={`pb-3 px-2 text-xs font-bold uppercase tracking-widest border-b-2 transition-all ${activeTab === 'profile' ? 'border-brand-cyan text-white' : 'border-transparent text-brand-text-muted hover:text-white'}`}>Editar Perfil</button>
                    <button onClick={() => setActiveTab('security')} className={`pb-3 px-2 text-xs font-bold uppercase tracking-widest border-b-2 transition-all ${activeTab === 'security' ? 'border-brand-cyan text-white' : 'border-transparent text-brand-text-muted hover:text-white'}`}>Seguridad & KYC</button>
                    <button onClick={() => setActiveTab('network')} className={`pb-3 px-2 text-xs font-bold uppercase tracking-widest border-b-2 transition-all ${activeTab === 'network' ? 'border-brand-cyan text-white' : 'border-transparent text-brand-text-muted hover:text-white'}`}>Ajustes de Red</button>
                </div>

                {activeTab === 'profile' && (
                    <div className="grid grid-cols-1 gap-8 animate-in fade-in slide-in-from-left-4 duration-300">
                        {/* Profile Editor */}
                        <section className="bg-brand-panel p-8 rounded-[2rem] border border-brand-panel-lighter shadow-xl">
                            <div className="flex justify-between items-start mb-8">
                                <h3 className="text-white font-bold flex items-center gap-2">
                                    <span className="material-symbols-outlined text-brand-cyan">edit_note</span>
                                    Editar Información de Usuario
                                </h3>
                                {isDirty && <span className="text-[10px] text-yellow-500 font-bold uppercase animate-pulse">Cambios sin guardar</span>}
                            </div>

                            <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
                                <div className="relative group">
                                    <div className="size-40 rounded-3xl bg-cover bg-center border-4 border-brand-panel-lighter group-hover:border-brand-cyan transition-all" style={{ backgroundImage: `url(${formData.avatar})` }}></div>
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="absolute -bottom-3 -right-3 size-12 bg-brand-cyan rounded-xl flex items-center justify-center text-black shadow-lg hover:scale-110 transition-transform cursor-pointer"
                                    >
                                        <span className="material-symbols-outlined">photo_camera</span>
                                    </button>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleImageUpload}
                                        className="hidden"
                                        accept="image/*"
                                    />
                                </div>
                                <div className="flex-1 w-full space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <ConfigInput label="Nombre Completo" value={formData.name} onChange={(v) => handleChange('name', v)} />
                                        <ConfigInput label="Correo Electrónico" value={formData.email} onChange={(v) => handleChange('email', v)} type="email" />
                                        <ConfigInput label="ID de Usuario (Sistema)" value={formData.id} readOnly />
                                        <ConfigInput label="Código de Referido" value={formData.referralCode} readOnly />
                                    </div>
                                    <div className="bg-brand-dark/50 p-4 rounded-xl border border-brand-panel-lighter">
                                        <p className="text-[10px] text-brand-text-muted uppercase font-bold mb-2">Nota del Administrador</p>
                                        <textarea className="w-full bg-transparent text-sm text-white border-none focus:ring-0 p-0 resize-none" rows={2} placeholder="Añadir notas internas sobre este usuario..."></textarea>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <div className="flex justify-end gap-4">
                            <button onClick={() => setFormData(user)} className="px-6 py-3 rounded-xl text-brand-text-muted hover:text-white text-xs font-bold uppercase tracking-widest transition-colors">
                                Descartar
                            </button>
                            <button onClick={handleSave} className="px-8 py-3 bg-brand-cyan text-black font-black rounded-xl hover:shadow-[0_0_20px_rgba(0,240,255,0.4)] transition-all uppercase tracking-widest text-xs flex items-center gap-2">
                                <span className="material-symbols-outlined text-lg">save</span>
                                Guardar Cambios
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'security' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <VerificationCard
                            icon="verified_user"
                            title="Verificación KYC"
                            desc="Documento de identidad validado."
                            verified={formData.kycVerified}
                            onClick={() => handleChange('kycVerified', !formData.kycVerified)}
                        />
                        <VerificationCard
                            icon="account_balance_wallet"
                            title="Wallet BTC"
                            desc="Dirección de pago configurada."
                            verified={formData.walletRegistered}
                            onClick={() => handleChange('walletRegistered', !formData.walletRegistered)}
                        />
                    </div>
                )}
                {activeTab === 'notifications' && (
                    <div className="animate-in fade-in duration-300 space-y-6">
                        <section className="bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-xl">
                            <div className="flex items-center gap-3 mb-6">
                                <span className="material-symbols-outlined text-brand-cyan">mail</span>
                                <div>
                                    <h3 className="text-white font-bold">Supervisores On-Call</h3>
                                    <p className="text-slate-400 text-xs mt-0.5">Recibirán un email cuando un resultado de sorteo no se capture automáticamente.</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                {[0, 1, 2].map(i => (
                                    <div key={i} className="space-y-1.5">
                                        <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Supervisor On-Call {i + 1}</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 material-symbols-outlined text-[18px]">alternate_email</span>
                                            <input
                                                type="email"
                                                value={supervisorEmails[i]}
                                                onChange={e => {
                                                    const next = [...supervisorEmails];
                                                    next[i] = e.target.value;
                                                    setSupervisorEmails(next);
                                                }}
                                                placeholder={`supervisor${i + 1}@dominio.com`}
                                                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:ring-1 focus:ring-brand-cyan focus:border-brand-cyan outline-none placeholder-slate-600 transition-all"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-6 flex items-center gap-4">
                                <button
                                    onClick={handleSaveEmails}
                                    className="px-6 py-2.5 bg-brand-cyan text-black font-bold rounded-xl hover:opacity-90 transition-all text-sm flex items-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-[18px]">save</span>
                                    Guardar Correos
                                </button>
                                {emailSaved && <span className="text-green-400 text-sm font-bold animate-in fade-in">✅ Guardado correctamente</span>}
                            </div>
                        </section>
                        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-xs text-slate-400">
                            <p className="font-bold text-slate-300 mb-2">⚙️ Requisitos para emails Gmail:</p>
                            <ol className="list-decimal list-inside space-y-1">
                                <li>Configura <code className="bg-slate-700 px-1 rounded">ALERT_EMAIL_FROM</code> en tu <code className="bg-slate-700 px-1 rounded">.env</code> (tu dirección Gmail)</li>
                                <li>Crea una <strong>App Password</strong> en Google → Seguridad → Contraseñas de app</li>
                                <li>Configura <code className="bg-slate-700 px-1 rounded">ALERT_EMAIL_PASS</code> en tu <code className="bg-slate-700 px-1 rounded">.env</code> con esa App Password</li>
                            </ol>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const TabBtn: React.FC<{ active: boolean; onClick: () => void; label: string }> = ({ active, onClick, label }) => (
    <button
        onClick={onClick}
        className={`px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${active ? 'bg-slate-700 text-white border border-slate-600' : 'text-slate-400 hover:text-white'
            }`}
    >{label}</button>
);

const ConfigInput: React.FC<{ label: string, value: string, readOnly?: boolean, onChange?: (val: string) => void, type?: string }> = ({ label, value, readOnly, onChange, type = "text" }) => (
    <div className="space-y-1.5">
        <label className="text-[10px] text-brand-text-muted font-bold uppercase tracking-widest ml-1">{label}</label>
        <input
            type={type}
            value={value}
            readOnly={readOnly}
            onChange={(e) => onChange && onChange(e.target.value)}
            className={`w-full bg-brand-dark border border-brand-panel-lighter rounded-xl px-4 py-2.5 text-sm text-white focus:ring-1 focus:ring-brand-cyan focus:border-brand-cyan transition-all ${readOnly ? 'opacity-50 cursor-not-allowed focus:border-brand-panel-lighter focus:ring-0' : ''}`}
        />
    </div>
);

const VerificationCard: React.FC<{ icon: string, title: string, desc: string, verified: boolean, onClick: () => void }> = ({ icon, title, desc, verified, onClick }) => (
    <div className={`p-6 rounded-[2rem] border transition-all ${verified ? 'bg-brand-cyan/5 border-brand-cyan/20' : 'bg-brand-panel border-brand-panel-lighter'}`}>
        <div className="flex justify-between items-start mb-4">
            <div className={`p-3 rounded-2xl ${verified ? 'bg-brand-cyan/10 text-brand-cyan' : 'bg-brand-dark text-brand-text-muted'}`}>
                <span className="material-symbols-outlined text-2xl">{icon}</span>
            </div>
            <button onClick={onClick} className={`text-[10px] px-3 py-1 rounded-full font-bold uppercase border ${verified ? 'bg-brand-cyan text-black border-brand-cyan' : 'border-brand-text-muted text-brand-text-muted hover:border-white hover:text-white'}`}>
                {verified ? 'Verificado' : 'Forzar Verificación'}
            </button>
        </div>
        <h4 className="text-white font-bold text-sm mb-1">{title}</h4>
        <p className="text-xs text-brand-text-muted">{desc}</p>
    </div>
);

export default ConfigurationView;
