// PASTE YOUR components/GenealogyTree.tsx CODE HERE

import React, { useState, useEffect } from 'react';
import { User, UserRank, UserStatus } from '../../../types';

interface GenealogyTreeProps {
    rootUser: User;
    onMoveUser?: (draggedId: string, targetId: string) => void;
    focusedUserId?: string | null;
    onFocusCleared?: () => void;
}

// Estados locales para los filtros visuales
interface TreeFilters {
    showInactive: boolean;
    highlightManagers: boolean;
}

const GenealogyTree: React.FC<GenealogyTreeProps> = ({ rootUser, onMoveUser, focusedUserId, onFocusCleared }) => {
    const [scale, setScale] = useState(1);
    const [filters, setFilters] = useState<TreeFilters>({ showInactive: true, highlightManagers: true });

    useEffect(() => {
        if (focusedUserId) {
            setScale(1.1);
        }
    }, [focusedUserId]);

    return (
        <div className="w-full h-full relative overflow-hidden flex flex-col bg-[#0b0e14]">
            {/* Grid Background */}
            <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none"></div>

            {/* Widgets Superpuestos */}
            <aside className="absolute top-6 left-6 z-30 flex flex-col gap-5 w-80 pointer-events-none">
                <NetworkOverviewWidget rootUser={rootUser} />
                <div className="pointer-events-auto">
                    <ViewOptionsWidget filters={filters} setFilters={setFilters} />
                </div>
            </aside>

            {/* Badge de Usuario Enfocado */}
            {focusedUserId && (
                <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 bg-brand-cyan/20 border border-brand-cyan text-brand-cyan px-4 py-2 rounded-full animate-bounce cursor-pointer" onClick={onFocusCleared}>
                    <span className="material-symbols-outlined text-sm">filter_center_focus</span>
                    <span className="text-xs font-bold uppercase tracking-widest">Enfocando Usuario (Click para salir)</span>
                </div>
            )}

            {/* Controles de Navegación */}
            <div className="absolute bottom-6 right-6 z-30 flex flex-col gap-4">
                <div className="bg-brand-panel/90 backdrop-blur-xl border border-brand-panel-lighter rounded-2xl p-1.5 flex flex-col gap-1 shadow-2xl items-center pointer-events-auto">
                    <ControlButton icon="add" onClick={() => setScale(prev => Math.min(prev + 0.1, 2))} />
                    <div className="h-[1px] w-8 bg-brand-panel-lighter"></div>
                    <ControlButton icon="remove" onClick={() => setScale(prev => Math.max(prev - 0.1, 0.5))} />
                    <div className="h-[1px] w-8 bg-brand-panel-lighter"></div>
                    <ControlButton icon="center_focus_strong" onClick={() => setScale(1)} />
                </div>
            </div>

            {/* Área del Árbol */}
            <div className="flex-1 overflow-auto p-24 select-none relative z-0">
                <div
                    className="flex justify-center min-w-max transition-transform duration-300 origin-top"
                    style={{ transform: `scale(${scale})` }}
                >
                    <TreeNode
                        user={rootUser}
                        isRoot
                        focusedUserId={focusedUserId}
                        onMoveUser={onMoveUser}
                        filters={filters}
                    />
                </div>
            </div>

            {/* Footer Leyenda */}
            <div className="absolute bottom-6 left-6 z-10 bg-brand-panel/95 backdrop-blur-xl border border-brand-panel-lighter rounded-2xl py-3 px-5 shadow-card flex items-center gap-6 pointer-events-auto border-l-4 border-l-brand-cyan">
                <span className="text-[10px] text-brand-text-muted font-bold uppercase tracking-widest border-r border-brand-panel-lighter pr-4">Arrastra perfiles para editar estructura</span>
                <StatusKeyItem color="bg-brand-cyan shadow-[0_0_8px_rgba(0,240,255,0.6)]" label="Activo" />
                <StatusKeyItem color="bg-yellow-500" label="Pendiente" />
                <StatusKeyItem color="bg-red-500" label="Inactivo" />
            </div>
        </div>
    );
};

interface TreeNodeProps {
    user: User;
    isRoot?: boolean;
    focusedUserId?: string | null;
    onMoveUser?: (draggedId: string, targetId: string) => void;
    filters: TreeFilters;
}

const TreeNode: React.FC<TreeNodeProps> = ({ user, isRoot, focusedUserId, onMoveUser, filters }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [isDragOver, setIsDragOver] = useState(false);
    const isFocused = focusedUserId === user.id;

    // Filtros: Si está inactivo y el filtro dice ocultar, no renderizamos
    if (!filters.showInactive && user.status === UserStatus.INACTIVE) {
        return null;
    }

    // Resaltado de managers
    const isManager = user.rank === UserRank.MANAGER || user.rank === UserRank.SOCIO;
    const highlightClass = filters.highlightManagers && isManager ? 'ring-2 ring-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)]' : '';

    // Auto-expandir si un hijo está enfocado (lógica simple, se podría mejorar con recursión de padres)
    useEffect(() => {
        if (focusedUserId) setIsExpanded(true);
    }, [focusedUserId]);

    const handleDragStart = (e: React.DragEvent) => {
        e.stopPropagation();
        e.dataTransfer.setData('userId', user.id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault(); // Necesario para permitir drop
        e.stopPropagation();
        if (!isDragOver) setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        const draggedId = e.dataTransfer.getData('userId');
        if (draggedId && draggedId !== user.id && onMoveUser) {
            const confirmMove = window.confirm(`¿Mover el usuario ID:${draggedId} debajo de ${user.name}?`);
            if (confirmMove) {
                onMoveUser(draggedId, user.id);
            }
        }
    };

    return (
        <div className={`flex flex-col items-center transition-all duration-500 ${isFocused ? 'scale-110 z-50' : ''}`}>
            {/* Node Content */}
            <div
                className="relative z-10"
                draggable={!isRoot} // Root no se mueve
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <div className={`
            node-card ${isRoot ? 'w-72' : 'w-64'} 
            bg-brand-panel border 
            ${isDragOver ? 'border-green-400 bg-green-900/20 scale-105 border-dashed' : isFocused ? 'border-brand-cyan shadow-[0_0_30px_rgba(0,240,255,0.2)]' : 'border-brand-panel-lighter'} 
            ${highlightClass}
            rounded-2xl p-4 shadow-card flex items-center gap-4 group transition-all 
            hover:border-brand-cyan hover:shadow-[0_0_20px_rgba(0,240,255,0.1)] cursor-grab active:cursor-grabbing
        `}>
                    <div className="relative shrink-0 pointer-events-none">
                        <div
                            className={`size-14 rounded-xl bg-cover bg-center border-2 ${isFocused ? 'border-brand-cyan' : 'border-brand-panel-lighter'} shadow-inner group-hover:border-brand-cyan transition-colors`}
                            style={{ backgroundImage: `url(${user.avatar})` }}
                        ></div>
                        <div className={`absolute -bottom-1 -right-1 size-5 rounded-full border-[3px] border-brand-panel flex items-center justify-center shadow-lg ${user.status === UserStatus.ACTIVE ? 'bg-brand-cyan' : 'bg-brand-panel-lighter'}`}>
                            <span className="material-symbols-outlined text-[10px] text-black font-bold">
                                {user.status === UserStatus.ACTIVE ? 'check' : 'hourglass_empty'}
                            </span>
                        </div>
                    </div>
                    <div className="flex-1 min-w-0 pointer-events-none">
                        <h3 className="text-white text-sm font-bold truncate tracking-tight">{user.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[9px] px-1.5 py-0.5 rounded border uppercase font-bold tracking-wider ${user.rank === UserRank.MANAGER ? 'bg-brand-cyan/10 text-brand-cyan border-brand-cyan/20' :
                                user.rank === UserRank.SOCIO ? 'bg-purple-500/10 text-purple-400 border-purple-400/20' :
                                    'bg-brand-panel-lighter text-brand-text-muted border-brand-panel-lighter'
                                }`}>
                                {user.rank}
                            </span>
                            <span className="text-[9px] text-brand-text-muted font-mono">{user.referralCode}</span>
                        </div>
                        {isRoot && (
                            <div className="mt-2">
                                <div className="w-full bg-brand-dark rounded-full h-1 border border-brand-panel-lighter">
                                    <div className="bg-gradient-to-r from-blue-500 to-brand-cyan h-full rounded-full w-[85%]"></div>
                                </div>
                                <div className="flex justify-between mt-1">
                                    <span className="text-[8px] text-brand-text-muted uppercase font-bold">Vol. Grupal</span>
                                    <span className="text-[8px] text-white font-mono">${(user.groupVolume || 0).toLocaleString()}</span>
                                </div>
                            </div>
                        )}
                    </div>
                    {user.children && user.children.length > 0 && (
                        <button
                            onMouseDown={(e) => e.stopPropagation()} // Prevenir drag al clickear boton
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="absolute -bottom-3 left-1/2 -translate-x-1/2 size-7 rounded-full bg-brand-panel-lighter border border-brand-panel-lighter flex items-center justify-center text-white hover:bg-brand-cyan hover:text-black hover:border-brand-cyan transition-all z-20 shadow-lg cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-[16px] font-bold">
                                {isExpanded ? 'remove' : 'add'}
                            </span>
                        </button>
                    )}
                </div>
            </div>

            {/* Connecting Lines and Children */}
            {isExpanded && user.children && user.children.length > 0 && (
                <div className="flex flex-col items-center mt-8 animate-in slide-in-from-top-4 duration-300">
                    <div className="w-[1px] h-8 bg-brand-panel-lighter"></div>

                    <div className="flex items-start gap-12 relative">
                        {user.children.length > 1 && (
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[calc(100%-8rem)] h-[1px] bg-brand-panel-lighter"></div>
                        )}

                        {user.children.map(child => (
                            <div key={child.id} className="flex flex-col items-center">
                                <div className="w-[1px] h-8 bg-brand-panel-lighter"></div>
                                <TreeNode
                                    user={child}
                                    focusedUserId={focusedUserId}
                                    onMoveUser={onMoveUser}
                                    filters={filters}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const NetworkOverviewWidget: React.FC<{ rootUser: User }> = ({ rootUser }) => (
    <div className="bg-brand-panel/95 backdrop-blur-xl border border-brand-panel-lighter rounded-3xl p-6 shadow-card">
        <div className="flex justify-between items-center mb-5">
            <h3 className="text-white text-xs font-bold tracking-widest uppercase text-brand-text-muted">Resumen de Red</h3>
            <span className="material-symbols-outlined text-brand-cyan text-lg">monitoring</span>
        </div>
        <div className="mb-8">
            <p className="text-brand-text-muted text-[10px] font-bold uppercase tracking-[0.2em] mb-1">Total Volumen</p>
            <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-white">${(rootUser?.groupVolume || 0).toLocaleString()}</span>
                <span className="text-[10px] text-green-400 font-bold flex items-center bg-green-400/10 px-2 py-0.5 rounded-full border border-green-400/20">
                    <span className="material-symbols-outlined text-[12px] mr-1">arrow_upward</span> +12%
                </span>
            </div>
        </div>
        <div className="space-y-5">
            <ProgressStat label="Nivel 1 (Directos)" current={rootUser?.levels?.direct || 0} total={20} color="bg-brand-cyan shadow-[0_0_10px_rgba(0,240,255,0.5)]" />
            <ProgressStat label="Nivel 2 (Indirectos)" current={rootUser?.levels?.indirect || 0} total={100} color="bg-purple-500" />
        </div>
    </div>
);

const ViewOptionsWidget: React.FC<{ filters: TreeFilters, setFilters: any }> = ({ filters, setFilters }) => (
    <div className="bg-brand-panel/95 backdrop-blur-xl border border-brand-panel-lighter rounded-3xl p-6 shadow-card pointer-events-auto">
        <div className="flex justify-between items-center mb-5">
            <h3 className="text-white text-xs font-bold tracking-widest uppercase text-brand-text-muted">Opciones de Vista</h3>
            <span className="material-symbols-outlined text-brand-cyan text-lg">tune</span>
        </div>
        <div className="space-y-4">
            <ToggleOption
                label="Mostrar Inactivos"
                checked={filters.showInactive}
                onChange={() => setFilters((prev: TreeFilters) => ({ ...prev, showInactive: !prev.showInactive }))}
            />
            <ToggleOption
                label="Resaltar Managers"
                checked={filters.highlightManagers}
                onChange={() => setFilters((prev: TreeFilters) => ({ ...prev, highlightManagers: !prev.highlightManagers }))}
            />
        </div>
    </div>
);

const ToggleOption: React.FC<{ label: string; checked: boolean, onChange: () => void }> = ({ label, checked, onChange }) => (
    <label className="flex items-center justify-between cursor-pointer group p-3 hover:bg-brand-panel-lighter rounded-2xl transition-all border border-transparent hover:border-brand-panel-lighter">
        <span className="text-xs text-gray-300 font-bold uppercase tracking-wider">{label}</span>
        <div className="relative flex items-center">
            <input checked={checked} onChange={onChange} className="peer sr-only" type="checkbox" />
            <div className="w-10 h-5 bg-brand-dark border border-brand-panel-lighter rounded-full peer-checked:bg-brand-cyan/20 peer-checked:border-brand-cyan peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-500 peer-checked:after:bg-brand-cyan after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
        </div>
    </label>
);

const ProgressStat: React.FC<{ label: string; current: number; total: number; color: string }> = ({ label, current, total, color }) => (
    <div>
        <div className="flex justify-between items-center text-[10px] text-brand-text-muted font-bold uppercase tracking-wider mb-2">
            <span>{label}</span>
            <span className="text-white font-mono">{current} / {total}</span>
        </div>
        <div className="w-full bg-brand-dark h-1.5 rounded-full overflow-hidden border border-brand-panel-lighter">
            <div className={`${color} h-full rounded-full transition-all duration-1000`} style={{ width: `${(current / total) * 100}%` }}></div>
        </div>
    </div>
);

const ControlButton: React.FC<{ icon: string; onClick: () => void }> = ({ icon, onClick }) => (
    <button
        onClick={onClick}
        className="p-3 text-brand-text-muted hover:text-brand-cyan hover:bg-brand-panel-lighter rounded-xl transition-all active:scale-90"
    >
        <span className="material-symbols-outlined text-[20px] font-bold">{icon}</span>
    </button>
);

const StatusKeyItem: React.FC<{ color: string; label: string }> = ({ color, label }) => (
    <div className="flex items-center gap-2.5">
        <span className={`size-2.5 rounded-full ${color}`}></span>
        <span className="text-[10px] text-white font-bold uppercase tracking-widest">{label}</span>
    </div>
);

export default GenealogyTree;
