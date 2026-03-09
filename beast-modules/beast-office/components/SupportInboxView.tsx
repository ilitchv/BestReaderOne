import React, { useState, useEffect } from 'react';

interface SupportRequest {
    _id: string;
    userId: string;
    userName: string;
    reason: string;
    status: 'unseen' | 'read' | 'resolved';
    timestamp: string;
}

const SupportInboxView: React.FC = () => {
    const [requests, setRequests] = useState<SupportRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchRequests();
        const interval = setInterval(fetchRequests, 30000); // Polling every 30s
        return () => clearInterval(interval);
    }, []);

    const fetchRequests = async () => {
        try {
            const res = await fetch('/api/admin/support/requests');
            const data = await res.json();
            setRequests(data);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateStatus = async (id: string, status: string) => {
        try {
            await fetch(`/api/admin/support/requests/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            fetchRequests();
        } catch (e) {
            console.error(e);
        }
    };

    if (isLoading) return <div className="p-8 text-brand-cyan animate-pulse">Cargando Inbox de Soporte...</div>;

    return (
        <div className="flex-1 flex flex-col p-6 overflow-hidden">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-xl font-bold text-white uppercase tracking-tight">Inbox de Agente Live</h3>
                    <p className="text-brand-text-muted text-xs font-mono">Monitoreo de solicitudes de asistencia humana vía IA</p>
                </div>
                <div className="px-3 py-1 rounded-full bg-brand-cyan/10 border border-brand-cyan/30 text-brand-cyan text-[10px] font-bold uppercase tracking-widest animate-pulse">
                    Live Monitor
                </div>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar border border-brand-panel-lighter rounded-2xl bg-brand-dark/30">
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-[#161b24] text-brand-text-muted text-[10px] uppercase font-bold tracking-widest z-10 border-b border-brand-panel-lighter">
                        <tr>
                            <th className="p-4">Usuario</th>
                            <th className="p-4">Razón / Contexto</th>
                            <th className="p-4">Estado</th>
                            <th className="p-4">Fecha</th>
                            <th className="p-4 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-panel-lighter/50">
                        {requests.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="p-20 text-center text-brand-text-muted font-light italic">
                                    No hay solicitudes de soporte activas en este momento.
                                </td>
                            </tr>
                        ) : (
                            requests.map((req) => (
                                <tr key={req._id} className={`group border-b border-brand-panel-lighter/30 hover:bg-white/5 transition-colors ${req.status === 'unseen' ? 'bg-brand-cyan/5' : ''}`}>
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="size-8 rounded-full bg-gradient-to-br from-brand-cyan/20 to-blue-500/20 border border-brand-cyan/30 flex items-center justify-center text-brand-cyan text-xs font-bold">
                                                {req.userName.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-white">{req.userName}</p>
                                                <p className="text-[10px] text-brand-text-muted font-mono">{req.userId}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <p className="text-sm text-gray-300 max-w-sm truncate group-hover:text-white" title={req.reason}>
                                            {req.reason}
                                        </p>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${req.status === 'unseen' ? 'bg-orange-500/20 text-orange-500 border border-orange-500/30' :
                                                req.status === 'read' ? 'bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30' :
                                                    'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'
                                            }`}>
                                            {req.status}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <p className="text-xs text-brand-text-muted">{new Date(req.timestamp).toLocaleString()}</p>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {req.status !== 'resolved' && (
                                                <button
                                                    onClick={() => handleUpdateStatus(req._id, req.status === 'unseen' ? 'read' : 'resolved')}
                                                    className="p-2 rounded-lg bg-brand-panel hover:bg-brand-cyan hover:text-black text-brand-cyan transition-all"
                                                    title={req.status === 'unseen' ? "Marcar como leído" : "Marcar como resuelto"}
                                                >
                                                    <span className="material-symbols-outlined text-lg">
                                                        {req.status === 'unseen' ? 'visibility' : 'check_circle'}
                                                    </span>
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default SupportInboxView;
