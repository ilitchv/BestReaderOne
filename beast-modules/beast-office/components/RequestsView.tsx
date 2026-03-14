import React, { useState, useEffect, useCallback } from 'react';
import { User } from '../../../types';

interface RequestsViewProps {
    users: User[];
    onApprove: (user: User) => void;
    onReject: (user: User) => void;
    onAlertsChanged?: () => void;
}

interface SystemAlert {
    _id: string;
    type: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    message: string;
    metadata?: any;
    createdAt: string;
    dismissed?: boolean;
}

type InboxTab = 'solicitudes' | 'alertas';

const RequestsView: React.FC<RequestsViewProps> = ({ users, onApprove, onReject, onAlertsChanged }) => {
    const [activeTab, setActiveTab] = useState<InboxTab>('solicitudes');
    const [alerts, setAlerts] = useState<SystemAlert[]>([]);
    const [selectedAlerts, setSelectedAlerts] = useState<Set<string>>(new Set());
    const [isLoadingAlerts, setIsLoadingAlerts] = useState(false);
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);

    const pendingUsers = users.filter(u => u.status === 'pending');
    const totalBadge = pendingUsers.length + alerts.length;

    const fetchAlerts = useCallback(async () => {
        setIsLoadingAlerts(true);
        try {
            const res = await fetch('/api/admin/alerts');
            if (res.ok) setAlerts(await res.json());
        } catch { /* silent */ } finally {
            setIsLoadingAlerts(false);
        }
    }, []);

    useEffect(() => {
        fetchAlerts();
    }, [fetchAlerts]);

    // Auto-switch to alerts tab if there are no pending users but there are alerts
    useEffect(() => {
        if (pendingUsers.length === 0 && alerts.length > 0 && activeTab === 'solicitudes') {
            setActiveTab('alertas');
        }
    }, [alerts.length, pendingUsers.length]);

    const toggleSelectAlert = (id: string) => {
        setSelectedAlerts(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedAlerts.size === alerts.length) {
            setSelectedAlerts(new Set());
        } else {
            setSelectedAlerts(new Set(alerts.map(a => a._id)));
        }
    };

    const dismissSingle = async (id: string) => {
        try {
            await fetch(`/api/admin/alerts/dismiss/${id}`, { method: 'POST' });
            setAlerts(prev => prev.filter(a => a._id !== id));
            setSelectedAlerts(prev => { const s = new Set(prev); s.delete(id); return s; });
            onAlertsChanged?.();
        } catch { /* silent */ }
    };

    const bulkDismiss = async () => {
        if (selectedAlerts.size === 0) return;
        setIsBulkDeleting(true);
        try {
            await fetch('/api/admin/alerts/bulk-dismiss', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: [...selectedAlerts] })
            });
            setAlerts(prev => prev.filter(a => !selectedAlerts.has(a._id)));
            setSelectedAlerts(new Set());
            onAlertsChanged?.();
        } catch { /* silent */ } finally {
            setIsBulkDeleting(false);
        }
    };

    const severityStyles = {
        CRITICAL: { bar: 'border-l-red-500 bg-red-950/30', badge: 'bg-red-500/20 text-red-300 border-red-500/40', dot: 'bg-red-500' },
        HIGH: { bar: 'border-l-orange-500 bg-orange-950/30', badge: 'bg-orange-500/20 text-orange-300 border-orange-500/40', dot: 'bg-orange-500' },
        MEDIUM: { bar: 'border-l-yellow-500 bg-yellow-950/20', badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40', dot: 'bg-yellow-500' },
        LOW: { bar: 'border-l-blue-500 bg-blue-950/20', badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40', dot: 'bg-blue-500' },
    };

    return (
        <div className="flex-1 overflow-auto p-6 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-bold text-white tracking-tight">Solicitudes / Inbox</h2>
                        {totalBadge > 0 && (
                            <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-sm font-bold border border-red-500/40 animate-pulse">
                                {totalBadge} pendiente{totalBadge !== 1 ? 's' : ''}
                            </span>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-slate-900 p-1 rounded-xl border border-slate-700 w-fit">
                    <TabButton
                        active={activeTab === 'solicitudes'}
                        onClick={() => setActiveTab('solicitudes')}
                        icon="person_add"
                        label="Solicitudes de Ingreso"
                        badge={pendingUsers.length}
                        badgeColor="bg-orange-500"
                    />
                    <TabButton
                        active={activeTab === 'alertas'}
                        onClick={() => setActiveTab('alertas')}
                        icon="notifications_active"
                        label="Alertas del Sistema"
                        badge={alerts.length}
                        badgeColor="bg-red-500"
                    />
                </div>

                {/* ── TAB: Solicitudes de Ingreso ────────────────────── */}
                {activeTab === 'solicitudes' && (
                    <div className="bg-slate-700/40 border border-slate-600 rounded-2xl overflow-hidden shadow-xl">
                        <table className="w-full text-sm text-left text-slate-400">
                            <thead className="bg-slate-800 text-xs uppercase font-bold text-slate-400 border-b border-slate-700">
                                <tr>
                                    <th className="p-5 w-16"></th>
                                    <th className="p-5">Candidato</th>
                                    <th className="p-5">Patrocinador</th>
                                    <th className="p-5">Fecha Solicitud</th>
                                    <th className="p-5 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700 text-sm">
                                {pendingUsers.map(u => (
                                    <tr key={u.id} className="hover:bg-slate-700/30 transition-colors group">
                                        <td className="p-5">
                                            <div className="size-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 border border-orange-500/20 shadow-lg group-hover:scale-110 transition-transform">
                                                <span className="material-symbols-outlined">person_search</span>
                                            </div>
                                        </td>
                                        <td className="p-5">
                                            <div className="font-bold text-white text-base">{u.name}</div>
                                            <div className="text-xs text-slate-500">{u.email}</div>
                                            {u.phone && <div className="text-xs text-slate-500 mt-0.5">{u.phone}</div>}
                                        </td>
                                        <td className="p-5">
                                            {u.sponsorId && users.find(s => s.id === u.sponsorId) ? (
                                                <div className="flex items-center gap-2 text-brand-cyan font-bold text-sm bg-brand-cyan/5 px-2 py-1 rounded-lg border border-brand-cyan/10 w-fit">
                                                    <span className="material-symbols-outlined text-[16px]">how_to_reg</span>
                                                    {users.find(s => s.id === u.sponsorId)?.name}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-slate-500 italic">Directo / Root</span>
                                            )}
                                        </td>
                                        <td className="p-5 text-xs font-mono text-slate-500">
                                            {new Date(u.createdAt).toLocaleString()}
                                        </td>
                                        <td className="p-5 text-right">
                                            <div className="flex justify-end gap-3">
                                                <button onClick={() => onReject(u)} className="px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-xl font-bold text-xs border border-red-500/30 transition-all active:scale-95">
                                                    Rechazar
                                                </button>
                                                <button onClick={() => onApprove(u)} className="px-5 py-2 bg-green-500 text-black hover:bg-green-400 rounded-xl font-bold text-xs shadow-[0_0_15px_rgba(34,197,94,0.3)] transition-all flex items-center gap-2 active:scale-95">
                                                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                                                    Aprobar
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {pendingUsers.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-16 text-center">
                                            <div className="flex flex-col items-center gap-4 text-slate-500">
                                                <span className="material-symbols-outlined text-4xl opacity-30">inbox</span>
                                                <span className="text-sm">No hay solicitudes pendientes.</span>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* ── TAB: Alertas del Sistema ──────────────────────── */}
                {activeTab === 'alertas' && (
                    <div className="space-y-4">

                        {/* Toolbar */}
                        {alerts.length > 0 && (
                            <div className="flex items-center justify-between bg-slate-900 border border-slate-700 rounded-xl px-4 py-3">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={selectedAlerts.size === alerts.length && alerts.length > 0}
                                        onChange={toggleSelectAll}
                                        className="w-4 h-4 accent-brand-cyan rounded cursor-pointer"
                                    />
                                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider group-hover:text-white transition-colors">
                                        {selectedAlerts.size === alerts.length ? 'Deseleccionar Todo' : `Seleccionar Todo (${alerts.length})`}
                                    </span>
                                </label>
                                {selectedAlerts.size > 0 && (
                                    <button
                                        onClick={bulkDismiss}
                                        disabled={isBulkDeleting}
                                        className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/40 text-red-400 border border-red-500/30 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">delete_sweep</span>
                                        {isBulkDeleting ? 'Eliminando...' : `Eliminar ${selectedAlerts.size} seleccionada${selectedAlerts.size !== 1 ? 's' : ''}`}
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Alert list */}
                        {isLoadingAlerts ? (
                            <div className="p-12 text-center text-slate-500">Cargando alertas...</div>
                        ) : alerts.length === 0 ? (
                            <div className="p-16 text-center flex flex-col items-center gap-4 text-slate-500 bg-slate-800/30 rounded-2xl border border-slate-700">
                                <span className="material-symbols-outlined text-4xl opacity-30">check_circle</span>
                                <p className="text-sm">Sin alertas pendientes. Todo está bien. ✅</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {alerts.map(alert => {
                                    const styles = severityStyles[alert.severity] || severityStyles.MEDIUM;
                                    const isSelected = selectedAlerts.has(alert._id);
                                    return (
                                        <div key={alert._id} className={`flex items-start gap-4 p-4 rounded-xl border-l-4 border border-slate-700/50 transition-all cursor-pointer ${styles.bar} ${isSelected ? 'ring-2 ring-brand-cyan/50' : ''}`}
                                            onClick={() => toggleSelectAlert(alert._id)}>
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => toggleSelectAlert(alert._id)}
                                                onClick={e => e.stopPropagation()}
                                                className="mt-1 w-4 h-4 accent-brand-cyan rounded cursor-pointer shrink-0"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                                    <span className={`text-[10px] px-2 py-0.5 rounded border font-bold uppercase tracking-wider ${styles.badge}`}>
                                                        {alert.severity}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{alert.type}</span>
                                                    <span className="text-[10px] text-slate-500 font-mono ml-auto">
                                                        {new Date(alert.createdAt).toLocaleString()}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-white font-medium">{alert.message}</p>
                                                {alert.metadata && (
                                                    <p className="text-[10px] text-slate-500 font-mono mt-1 truncate">
                                                        {typeof alert.metadata === 'string' ? alert.metadata : JSON.stringify(alert.metadata)}
                                                    </p>
                                                )}
                                            </div>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); dismissSingle(alert._id); }}
                                                className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all shrink-0"
                                                title="Descartar"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">close</span>
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

interface TabButtonProps {
    active: boolean;
    onClick: () => void;
    icon: string;
    label: string;
    badge?: number;
    badgeColor?: string;
}

const TabButton: React.FC<TabButtonProps> = ({ active, onClick, icon, label, badge, badgeColor = 'bg-red-500' }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${active
            ? 'bg-slate-700 text-white border border-slate-600 shadow'
            : 'text-slate-400 hover:text-white'
            }`}
    >
        <span className="material-symbols-outlined text-[18px]">{icon}</span>
        <span>{label}</span>
        {badge !== undefined && badge > 0 && (
            <span className={`${badgeColor} text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md`}>
                {badge}
            </span>
        )}
    </button>
);

export default RequestsView;
