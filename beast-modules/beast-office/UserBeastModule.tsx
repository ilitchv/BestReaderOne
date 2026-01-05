import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import GenealogyTree from './components/GenealogyTree';
import CommissionsView from './components/CommissionsView';
import AddReferralModal from './components/AddReferralModal';

interface UserBeastModuleProps {
    user: User;
    networkEnabled: boolean;
}

const UserBeastModule: React.FC<UserBeastModuleProps> = ({ user, networkEnabled }) => {
    const [networkUser, setNetworkUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'tree' | 'commissions' | 'referrals'>('tree');
    const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);

    useEffect(() => {
        if (networkEnabled && user.id) {
            fetchMyNetworkData();
        }
    }, [user, networkEnabled]);

    const fetchMyNetworkData = async () => {
        try {
            setIsLoading(true);
            // Fetch ONLY this user's tree node
            const res = await fetch(`/api/network/tree?rootId=${user.id}`);
            const data = await res.json();
            if (data.root) {
                setNetworkUser(data.root);
            }
        } catch (error) {
            console.error("Failed to load user network:", error);
        } finally {
            setIsLoading(false);
        }
    };

    if (!networkEnabled) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-[#0f131a] rounded-xl border border-red-500/20">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-red-500 text-3xl">lock</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Acceso Restringido</h3>
                <p className="text-gray-400 max-w-md">
                    El módulo de red no está activado para su cuenta. Por favor contacte a su administrador para habilitar el acceso a funciones avanzadas, comisiones y gestión de referidos.
                </p>
            </div>
        );
    }

    if (isLoading) return <div className="flex justify-center p-8 text-brand-cyan">Cargando datos de red...</div>;
    if (!networkUser) return <div className="p-8 text-center text-gray-500">No se encontraron datos de red.</div>;

    const tabs = [
        { id: 'tree', label: 'Mi Árbol', icon: 'account_tree' },
        { id: 'commissions', label: 'Mis Comisiones', icon: 'payments' },
        { id: 'referrals', label: 'Crear Referido', icon: 'person_add' }
    ];

    return (
        <div className="flex flex-col h-full bg-brand-dark rounded-xl overflow-hidden border border-white/5 shadow-2xl">
            {/* Header / Tabs */}
            <div className="bg-[#1a2333] border-b border-brand-panel-lighter flex items-center justify-between px-4">
                <div className="flex space-x-1">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => tab.id === 'referrals' ? setIsReferralModalOpen(true) : setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === tab.id && tab.id !== 'referrals'
                                    ? 'border-brand-cyan text-brand-cyan bg-brand-cyan/5'
                                    : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="py-2">
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        <span className="text-xs font-bold text-green-500 uppercase tracking-widest">Network Active</span>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative bg-[#0f131a]">
                {activeTab === 'tree' && (
                    <GenealogyTree
                        rootUser={networkUser}
                        // Users can only move nodes within their own downline, but for safety we might disable move entirely here if needed
                        onMoveUser={() => alert("Contacte a soporte para mover usuarios.")}
                        focusedUserId={null}
                        onFocusCleared={() => { }}
                    />
                )}

                {activeTab === 'commissions' && (
                    <CommissionsView user={networkUser} />
                )}
            </div>

            {/* Modals */}
            {isReferralModalOpen && (
                <AddReferralModal
                    onClose={() => setIsReferralModalOpen(false)}
                    sponsor={networkUser}
                    onSave={async (data) => {
                        try {
                            const res = await fetch('/api/network/referral', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(data)
                            });
                            if (res.ok) {
                                alert("Referido creado exitosamente");
                                setIsReferralModalOpen(false);
                                fetchMyNetworkData();
                            } else {
                                alert("Error al crear referido");
                            }
                        } catch (e) { console.error(e); }
                    }}
                />
            )}
        </div>
    );
};

export default UserBeastModule;
