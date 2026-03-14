import React, { useState, useEffect, useRef } from 'react';
import { ViewType, User } from '../../types';
import Sidebar from './components/Sidebar';
import UserDirectory from './components/UserDirectory';
import GenealogyTree from './components/GenealogyTree';
import CommissionsView from './components/CommissionsView';
import ReportsView from './components/ReportsView';
import ConfigurationView from './components/ConfigurationView';
import RequestsView from './components/RequestsView';
import SupportInboxView from './components/SupportInboxView';
import AddReferralModal from './components/AddReferralModal';
import CompensationChatbot from './components/CompensationChatbot';

interface BeastModuleProps {
    users: User[];
    rootUser: User;
    onApproveUser?: (user: User) => void;
    onRejectUser?: (user: User) => void;
}

// ── Alert audio utility ────────────────────────────────────────────────────
const playAlertSound = () => {
    try {
        const audio = new Audio('/sounds/alert.mp3');
        audio.volume = 0.7;
        audio.play().catch(() => {
            // Fallback: Web Audio API synthetic beep
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.value = 880;
            gain.gain.setValueAtTime(0.5, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.8);
        });
    } catch { /* silent */ }
};

const showPushNotification = (count: number) => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
        new Notification('⚠ Alerta del Sistema', {
            body: `Hay ${count} alerta${count > 1 ? 's' : ''} sin resolver. Ir a Solicitudes → Alertas.`,
            icon: '/favicon.ico',
        });
    } else if (Notification.permission !== 'denied') {
        Notification.requestPermission();
    }
};

const BeastModule: React.FC<BeastModuleProps> = ({ users: initialUsers, rootUser: initialRoot, onApproveUser, onRejectUser }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [currentRoot, setCurrentRoot] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeView, setActiveView] = useState<ViewType>('tree');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [focusedUserId, setFocusedUserId] = useState<string | null>(null);
    const [alertCount, setAlertCount] = useState(0);
    const prevAlertCountRef = useRef(0);

    // Initial Load
    useEffect(() => {
        fetchNetworkData();
        fetchAlertCount();

        // Request push notification permission early
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        // Poll alert count every 30 seconds
        const alertInterval = setInterval(fetchAlertCount, 30000);
        return () => clearInterval(alertInterval);
    }, []);

    const fetchAlertCount = async () => {
        try {
            const res = await fetch('/api/admin/alerts?count=true');
            if (res.ok) {
                const data = await res.json();
                const newCount = data.count ?? 0;
                if (newCount > prevAlertCountRef.current && prevAlertCountRef.current !== -1) {
                    // New alerts arrived! Sound + push
                    playAlertSound();
                    showPushNotification(newCount);
                }
                prevAlertCountRef.current = newCount;
                setAlertCount(newCount);
            }
        } catch { /* silent */ }
    };

    const fetchNetworkData = async () => {
        try {
            setIsLoading(true);
            const res = await fetch('/api/network/tree');
            const data = await res.json();

            if (data.allUsers) {
                setUsers(data.allUsers);
                if (!currentRoot) {
                    setCurrentRoot(data.root);
                } else {
                    const freshRoot = data.allUsers.find((u: User) => u.id === currentRoot.id) || data.root;
                    setCurrentRoot(freshRoot);
                }
            }
        } catch (error) {
            console.error("Failed to load network:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleApproveUser = async (user: User) => {
        try {
            await fetch('/api/network/approve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id })
            });
            await fetchNetworkData();
        } catch (e) { console.error(e); }
    };

    const handleRejectUser = async (user: User) => {
        if (!confirm("¿Seguro que deseas eliminar esta solicitud?")) return;
        try {
            await fetch('/api/network/reject', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id })
            });
            await fetchNetworkData();
        } catch (e) { console.error(e); }
    };

    const handleCreateReferral = async (data: any) => {
        try {
            const res = await fetch('/api/network/referral', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                await fetchNetworkData();
                setIsModalOpen(false);
            } else {
                alert("Error al crear referido");
            }
        } catch (e) { console.error(e); }
    };

    const pendingCount = users.filter(u => u.status === 'pending').length;

    const moveUserInTree = (draggedId: string, targetParentId: string) => {
        console.log(`Move request: ${draggedId} -> ${targetParentId}`);
        alert("Drag & Drop logic requires backend integration.");
    };

    const handleUpdateUser = async (updatedUser: User) => {
        setCurrentRoot(updatedUser);
    };

    const handleViewUserInTree = (userId: string) => {
        setFocusedUserId(userId);
        setActiveView('tree');
    };

    if (isLoading) return <div className="flex items-center justify-center h-full text-brand-cyan">Cargando Red...</div>;
    if (!currentRoot) return <div className="p-8 text-white">No se encontró estructura de red. Asegúrate de tener usuarios en la base de datos.</div>;

    const renderView = () => {
        switch (activeView) {
            case 'directory':
                return <UserDirectory users={users} onViewUserInTree={handleViewUserInTree} onRefresh={fetchNetworkData} />;
            case 'requests':
                return <RequestsView
                    users={users}
                    onApprove={handleApproveUser}
                    onReject={handleRejectUser}
                    onAlertsChanged={fetchAlertCount}
                />;
            case 'tree':
                return <GenealogyTree rootUser={currentRoot} onMoveUser={moveUserInTree} focusedUserId={focusedUserId} onFocusCleared={() => setFocusedUserId(null)} />;
            case 'commissions':
                return <CommissionsView user={currentRoot} />;
            case 'reports':
                return <ReportsView />;
            case 'config':
                return <ConfigurationView user={currentRoot} onUpdateUser={handleUpdateUser} />;
            case 'support':
                return <SupportInboxView />;
            default:
                return <GenealogyTree rootUser={currentRoot} />;
        }
    };

    return (
        <div className="flex h-full w-full bg-slate-800 overflow-hidden font-sans selection:bg-brand-cyan/30 selection:text-brand-cyan">
            <Sidebar
                activeView={activeView}
                onViewChange={(view) => {
                    setActiveView(view);
                    if (view !== 'tree') setFocusedUserId(null);
                }}
                pendingCount={pendingCount}
                alertCount={alertCount}
            />

            <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
                <header className="flex items-center justify-between whitespace-nowrap border-b border-slate-600 px-6 py-4 bg-slate-900 z-20 shrink-0 shadow-lg">
                    <div className="flex items-center gap-4">
                        <h2 className="text-white text-xl font-bold leading-tight tracking-wide uppercase">
                            {activeView === 'tree' && 'Gestión de Red Gráfica'}
                            {activeView === 'directory' && 'Directorio de Usuarios'}
                            {activeView === 'requests' && 'Solicitudes / Inbox'}
                            {activeView === 'commissions' && 'Control de Comisiones'}
                            {activeView === 'reports' && 'Métricas de Rendimiento'}
                            {activeView === 'config' && 'Administración de Perfiles'}
                            {activeView === 'support' && 'Inbox Agente Live'}
                        </h2>
                        <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-brand-cyan/10 border border-brand-cyan/20">
                            <span className="size-1.5 rounded-full bg-brand-cyan animate-pulse"></span>
                            <span className="text-[10px] text-brand-cyan font-bold tracking-wider uppercase">Admin Mode</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => window.open('/compensation_plan.html', '_blank')}
                            className="hidden lg:flex items-center justify-center rounded-lg h-10 px-4 border border-slate-600 bg-slate-800 hover:bg-slate-700 text-brand-cyan hover:text-white text-sm font-bold transition-all"
                            title="Ver Plan de Compensación"
                        >
                            <span className="material-symbols-outlined text-[18px] mr-2">hub</span>
                            <span>Plan de Compensación</span>
                        </button>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="flex items-center justify-center rounded-lg h-10 px-4 border border-brand-panel-lighter bg-brand-cyan text-black hover:opacity-90 text-sm font-bold transition-all shadow-[0_0_15px_rgba(0,240,255,0.3)] active:scale-95"
                        >
                            <span className="material-symbols-outlined text-[18px] mr-2">person_add</span>
                            <span className="hidden md:inline">Nuevo Referido</span>
                        </button>
                        <div className="relative group cursor-pointer" onClick={() => setActiveView('config')}>
                            <div
                                className="bg-center bg-no-repeat bg-cover rounded-full size-10 border-2 border-slate-600 group-hover:border-brand-cyan transition-colors"
                                style={{ backgroundImage: `url(${currentRoot?.avatar || 'https://ui-avatars.com/api/?name=Admin'})` }}
                            ></div>
                            <div className="absolute bottom-0 right-0 size-3 bg-brand-cyan rounded-full border-2 border-slate-900"></div>
                        </div>
                    </div>
                </header>

                <div className="flex-1 relative flex flex-col overflow-hidden bg-slate-800">
                    {renderView()}
                </div>

                {isModalOpen && <AddReferralModal onClose={() => setIsModalOpen(false)} sponsor={currentRoot} onSave={handleCreateReferral} />}

                <CompensationChatbot />
            </main>
        </div>
    );
};

export default BeastModule;
