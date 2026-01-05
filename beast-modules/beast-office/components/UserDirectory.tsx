// PASTE YOUR components/UserDirectory.tsx CODE HERE

import React, { useState, useMemo } from 'react';
import { UserRank, UserStatus, User } from '../../../types';
import StatCards from './StatCards';

interface Props {
    users: User[];
    onViewUserInTree?: (userId: string) => void;
    onRefresh?: () => void; // NEW
}

const UserDirectory: React.FC<Props> = ({ users, onViewUserInTree, onRefresh }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [rankFilter, setRankFilter] = useState<string>('Todos');

    const filteredUsers = useMemo(() => {
        return users.filter(user => {
            const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.id.includes(searchTerm) ||
                user.email.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesRank = rankFilter === 'Todos' || user.rank === rankFilter;
            return matchesSearch && matchesRank;
        });
    }, [searchTerm, rankFilter, users]);

    return (
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 animate-in fade-in duration-500">
            <div className="mx-auto max-w-7xl flex flex-col gap-8">
                <StatCards />

                <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center bg-brand-panel p-4 rounded-2xl border border-brand-panel-lighter shadow-xl">
                    <div className="flex flex-1 w-full lg:max-w-xl gap-3">
                        <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-muted material-symbols-outlined">search</span>
                            <input
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-brand-dark border border-brand-panel-lighter text-white text-sm rounded-xl focus:ring-1 focus:ring-brand-cyan focus:border-brand-cyan block pl-10 p-2.5 placeholder-brand-text-muted/70 outline-none"
                                placeholder="Buscar por Nombre, Email o ID..."
                            />
                        </div>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0 w-full lg:w-auto">
                        <select
                            value={rankFilter}
                            onChange={(e) => setRankFilter(e.target.value)}
                            className="bg-brand-dark border border-brand-panel-lighter text-white text-xs rounded-xl focus:ring-brand-cyan focus:border-brand-cyan p-2.5 outline-none cursor-pointer"
                        >
                            <option value="Todos">Rango: Todos</option>
                            {Object.values(UserRank).map(rank => (
                                <option key={rank} value={rank}>{rank}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="relative overflow-hidden rounded-2xl border border-brand-panel-lighter bg-brand-panel shadow-2xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-brand-text-muted">
                            <thead className="bg-brand-panel-lighter border-b border-brand-panel-lighter uppercase text-[10px] font-bold tracking-widest text-white">
                                <tr>
                                    <th className="px-6 py-4">Usuario</th>
                                    <th className="px-6 py-4">ID / Referido</th>
                                    <th className="px-6 py-4">Rango</th>
                                    <th className="px-6 py-4">Estado</th>
                                    <th className="px-6 py-4 text-right">Consumo (PV)</th>
                                    <th className="px-6 py-4 text-right">Red (GV)</th>
                                    <th className="px-6 py-4 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-brand-panel-lighter">
                                {filteredUsers.map((user) => (
                                    <tr key={user.id} className="bg-brand-dark/50 hover:bg-brand-panel transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div
                                                className="flex items-center gap-3 cursor-pointer"
                                                onClick={() => onViewUserInTree?.(user.id)}
                                                title="Ver en el Árbol"
                                            >
                                                <div className="size-10 rounded-full bg-cover bg-center border border-brand-panel-lighter group-hover:border-brand-cyan transition-colors" style={{ backgroundImage: `url(${user.avatar})` }}></div>
                                                <div>
                                                    <div className="font-bold text-white text-sm group-hover:text-brand-cyan transition-colors">{user.name}</div>
                                                    <div className="text-[10px] text-brand-text-muted">{user.email}</div>

                                                    {/* Admin Toggle Switch */}
                                                    <div
                                                        className="mt-2 flex items-center gap-2"
                                                        onClick={(e) => e.stopPropagation()} // Prevent row click
                                                    >
                                                        <label className="relative inline-flex items-center cursor-pointer group/toggle">
                                                            <input
                                                                type="checkbox"
                                                                className="sr-only peer"
                                                                checked={user.networkEnabled || false}
                                                                onChange={(e) => {
                                                                    const newStatus = e.target.checked;
                                                                    // Optimistic update handled by Refresh, but we want avoiding full flicker.
                                                                    // Ideally we'd update local state, but onRefresh will re-fetch list.
                                                                    // To avoid flickering, we rely on the Backend fast response + React diffing.
                                                                    fetch('/api/network/toggle-access', {
                                                                        method: 'POST',
                                                                        headers: { 'Content-Type': 'application/json' },
                                                                        body: JSON.stringify({ userId: user.id, enabled: newStatus })
                                                                    })
                                                                        .then(() => onRefresh?.())
                                                                        .catch(err => console.error(err));
                                                                }}
                                                            />
                                                            <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-brand-cyan/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-cyan"></div>
                                                            <span className="ml-2 text-[10px] font-medium text-brand-text-muted group-hover/toggle:text-white transition-colors">
                                                                {user.networkEnabled ? 'Network Active' : 'Network Locked'}
                                                            </span>
                                                        </label>
                                                    </div>

                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="font-mono text-xs text-brand-cyan">{user.id}</span>
                                                <span className="text-[10px] text-brand-text-muted">{user.referralCode}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <RankBadge rank={user.rank} />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <StatusBadge status={user.status} />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="flex flex-col items-end">
                                                <span className={`font-bold ${(user.personalVolume ?? 0) >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                                                    ${user.personalVolume ?? 0}
                                                </span>
                                                <span className="text-[9px] uppercase tracking-tighter opacity-50">Min $50</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <span className="text-white font-bold">${(user.groupVolume ?? 0).toLocaleString()}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <button
                                                onClick={() => onViewUserInTree?.(user.id)}
                                                className="text-brand-text-muted hover:text-brand-cyan transition-colors p-2 rounded-lg hover:bg-brand-panel-lighter"
                                                title="Localizar en Árbol"
                                            >
                                                <span className="material-symbols-outlined text-[20px]">filter_center_focus</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {filteredUsers.length === 0 && (
                        <div className="p-12 text-center">
                            <span className="material-symbols-outlined text-4xl mb-2 opacity-20">person_off</span>
                            <p className="text-brand-text-muted">No se encontraron usuarios con esos criterios.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const RankBadge: React.FC<{ rank: UserRank }> = ({ rank }) => {
    const styles = {
        [UserRank.NORMAL]: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
        [UserRank.AGENTE]: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        [UserRank.SOCIO]: 'bg-purple-500/10 text-purple-400 border-purple-400/20',
        [UserRank.MANAGER]: 'bg-brand-cyan/10 text-brand-cyan border-brand-cyan/20',
    };
    return (
        <span className={`inline-flex items-center rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wider border ${styles[rank]}`}>
            {rank}
        </span>
    );
};

const StatusBadge: React.FC<{ status: UserStatus }> = ({ status }) => {
    const styles = {
        [UserStatus.ACTIVE]: 'bg-brand-cyan/10 text-brand-cyan border-brand-cyan/20',
        [UserStatus.PENDING]: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
        [UserStatus.INACTIVE]: 'bg-red-500/10 text-red-500 border-red-500/20',
    };
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border ${styles[status]}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${status === UserStatus.ACTIVE ? 'bg-brand-cyan animate-pulse' : status === UserStatus.PENDING ? 'bg-yellow-500' : 'bg-red-500'}`}></span>
            {status}
        </span>
    );
};

export default UserDirectory;
