import React from 'react';
import { User } from '../../../types';

interface RequestsViewProps {
    users: User[];
    onApprove: (user: User) => void;
    onReject: (user: User) => void;
}

const RequestsView: React.FC<RequestsViewProps> = ({ users, onApprove, onReject }) => {
    // Filter pending users locally
    const pendingUsers = users.filter(u => u.status === 'pending');

    return (
        <div className="flex-1 overflow-auto p-8 relative">
            <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none"></div>
            <div className="max-w-7xl mx-auto space-y-6 relative z-10">
                <header className="flex items-center gap-3">
                    <h2 className="text-3xl font-bold text-white tracking-tight">Solicitudes de Ingreso</h2>
                    <span className="px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 text-sm font-bold border border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.3)]">
                        {pendingUsers.length} Pendientes
                    </span>
                </header>

                <div className="bg-brand-panel border border-brand-panel-lighter rounded-3xl overflow-hidden shadow-card">
                    <table className="w-full text-sm text-left text-brand-text-muted">
                        <thead className="bg-brand-dark/50 text-xs uppercase font-bold text-brand-text-muted border-b border-brand-panel-lighter">
                            <tr>
                                <th className="p-5 w-16"></th>
                                <th className="p-5">Candidato</th>
                                <th className="p-5">Patrocinador</th>
                                <th className="p-5">Fecha Solicitud</th>
                                <th className="p-5 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-panel-lighter text-sm">
                            {pendingUsers.map(u => (
                                <tr key={u.id} className="hover:bg-brand-panel-lighter/30 transition-colors group">
                                    <td className="p-5">
                                        <div className="size-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 border border-orange-500/20 shadow-lg group-hover:scale-110 transition-transform">
                                            <span className="material-symbols-outlined">person_search</span>
                                        </div>
                                    </td>
                                    <td className="p-5">
                                        <div className="font-bold text-white text-base">{u.name}</div>
                                        <div className="text-xs text-brand-text-muted">{u.email}</div>
                                        {u.phone && <div className="text-xs text-brand-text-muted mt-0.5">{u.phone}</div>}
                                    </td>
                                    <td className="p-5">
                                        {u.sponsorId && users.find(s => s.id === u.sponsorId) ? (
                                            <div className="flex items-center gap-2 text-brand-cyan font-bold text-sm bg-brand-cyan/5 px-2 py-1 rounded-lg border border-brand-cyan/10 w-fit">
                                                <span className="material-symbols-outlined text-[16px]">how_to_reg</span>
                                                {users.find(s => s.id === u.sponsorId)?.name}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-gray-500 italic bg-white/5 px-2 py-1 rounded">Directo / Root</span>
                                        )}
                                    </td>
                                    <td className="p-5 text-xs font-mono text-brand-text-muted">
                                        {new Date(u.createdAt).toLocaleString()}
                                    </td>
                                    <td className="p-5 text-right flex justify-end gap-3">
                                        <button
                                            onClick={() => onReject(u)}
                                            className="px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-xl font-bold text-xs border border-red-500/30 transition-all active:scale-95"
                                        >
                                            Rechazar
                                        </button>
                                        <button
                                            onClick={() => onApprove(u)}
                                            className="px-5 py-2 bg-green-500 text-black hover:bg-green-400 rounded-xl font-bold text-xs shadow-[0_0_15px_rgba(34,197,94,0.3)] hover:shadow-[0_0_20px_rgba(34,197,94,0.5)] transition-all flex items-center gap-2 active:scale-95 transform hover:-translate-y-0.5"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">check_circle</span>
                                            Aprobar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {pendingUsers.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-16 text-center text-brand-text-muted italic flex flex-col items-center gap-4">
                                        <div className="size-16 rounded-full bg-brand-panel-lighter flex items-center justify-center grayscale opacity-50">
                                            <span className="material-symbols-outlined text-3xl">inbox</span>
                                        </div>
                                        <span>No hay solicitudes pendientes en este momento.</span>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default RequestsView;
