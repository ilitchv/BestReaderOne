// PASTE YOUR components/Sidebar.tsx CODE HERE

import React from 'react';
import { ViewType } from '../../../types';

interface SidebarProps {
    activeView: ViewType;
    onViewChange: (view: ViewType) => void;
    pendingCount?: number;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, onViewChange, pendingCount = 0 }) => {
    return (
        <aside className="hidden md:flex w-64 flex-col border-r border-brand-panel-lighter bg-brand-dark shrink-0">
            <div className="flex h-full flex-col justify-between p-4">
                <div className="flex flex-col gap-6">
                    <div className="flex items-center gap-3 px-2">
                        <div className="size-10 bg-brand-cyan rounded-lg flex items-center justify-center text-black font-bold shadow-[0_0_15px_rgba(0,240,255,0.4)]">
                            <span className="material-symbols-outlined">hub</span>
                        </div>
                        <div className="flex flex-col">
                            <h1 className="text-white text-base font-bold leading-normal tracking-wide">BEAST<span className="font-light">OFFICE</span></h1>
                            <p className="text-brand-text-muted text-[10px] font-medium uppercase tracking-widest">v1.0 Operational</p>
                        </div>
                    </div>

                    <nav className="flex flex-col gap-2">
                        <NavItem
                            icon="account_tree"
                            label="Vista de Árbol"
                            active={activeView === 'tree'}
                            onClick={() => onViewChange('tree')}
                        />
                        <NavItem
                            icon="directory_sync"
                            label="Directorio"
                            active={activeView === 'directory'}
                            onClick={() => onViewChange('directory')}
                        />
                        <NavItem
                            icon="person_add"
                            label="Solicitudes"
                            active={activeView === 'requests'}
                            onClick={() => onViewChange('requests')}
                            badge={pendingCount > 0 ? pendingCount : undefined}
                        />
                        <NavItem
                            icon="payments"
                            label="Comisiones"
                            active={activeView === 'commissions'}
                            onClick={() => onViewChange('commissions')}
                        />
                        <NavItem
                            icon="analytics"
                            label="Reportes"
                            active={activeView === 'reports'}
                            onClick={() => onViewChange('reports')}
                        />
                        <NavItem
                            icon="settings"
                            label="Configuración"
                            active={activeView === 'config'}
                            onClick={() => onViewChange('config')}
                        />
                    </nav>
                </div>

                <div className="p-4 rounded-2xl bg-brand-panel/50 border border-brand-panel-lighter mb-4">
                    <p className="text-[10px] text-brand-text-muted uppercase font-bold tracking-widest mb-2">Estado Semanal</p>
                    <div className="flex items-center gap-2">
                        <div className="size-2 rounded-full bg-brand-cyan animate-pulse"></div>
                        <span className="text-xs text-white font-bold">Calificado (Agente)</span>
                    </div>
                </div>

                <button
                    onClick={() => window.location.reload()}
                    className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg h-10 px-4 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all text-sm font-bold"
                >
                    <span className="material-symbols-outlined text-lg">logout</span>
                    <span>Cerrar Sesión</span>
                </button>
            </div>
        </aside>
    );
};

interface NavItemProps {
    icon: string;
    label: string;
    active: boolean;
    onClick: () => void;
    badge?: number;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, active, onClick, badge }) => (
    <button
        onClick={onClick}
        className={`group flex items-center justify-between px-3 py-2.5 rounded-xl transition-all w-full ${active
            ? 'bg-brand-panel text-brand-cyan border border-brand-panel-lighter'
            : 'text-brand-text-muted hover:bg-brand-panel hover:text-white'
            }`}
    >
        <div className="flex items-center gap-3">
            <span className={`material-symbols-outlined text-2xl ${active ? 'text-brand-cyan' : 'group-hover:text-brand-cyan'}`}>
                {icon}
            </span>
            <span className="text-sm font-semibold tracking-wide">{label}</span>
        </div>
        {badge !== undefined && (
            <span className="bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-lg animate-pulse">
                {badge}
            </span>
        )}
    </button>
);

export default Sidebar;
