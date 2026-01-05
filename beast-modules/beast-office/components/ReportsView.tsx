import React from 'react';
import StatCards from './StatCards';

const ReportsView: React.FC = () => {
    return (
        <div className="flex-1 overflow-auto p-8 relative">
            <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none"></div>
            <div className="max-w-7xl mx-auto space-y-8 relative z-10">
                <header>
                    <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">Reportes de Rendimiento</h2>
                    <p className="text-brand-text-muted">Análisis detallado de tu organización y volumen de ventas.</p>
                </header>

                <StatCards />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Placeholder Chart 1 */}
                    <div className="bg-brand-panel border border-brand-panel-lighter rounded-3xl p-6 shadow-card">
                        <h3 className="text-white text-sm font-bold uppercase tracking-widest mb-6">Crecimiento de Red (30 Días)</h3>
                        <div className="h-64 flex items-end justify-between gap-2 px-2">
                            {[30, 45, 32, 60, 75, 50, 80, 95, 85, 100, 110, 125].map((h, i) => (
                                <div key={i} className="w-full bg-brand-cyan/20 hover:bg-brand-cyan/50 transition-all rounded-t-lg relative group">
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                        {h}
                                    </div>
                                    <div style={{ height: `${h}%` }} className="w-full bg-gradient-to-t from-brand-cyan/10 to-brand-cyan border-t border-brand-cyan rounded-t-sm"></div>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between mt-4 text-[10px] text-brand-text-muted font-mono uppercase">
                            <span>Inicio Mes</span>
                            <span>Fin Mes</span>
                        </div>
                    </div>

                    {/* Placeholder Chart 2 */}
                    <div className="bg-brand-panel border border-brand-panel-lighter rounded-3xl p-6 shadow-card">
                        <h3 className="text-white text-sm font-bold uppercase tracking-widest mb-6">Distribución de Volumen</h3>
                        <div className="h-64 flex items-center justify-center relative">
                            <div className="size-48 rounded-full border-[12px] border-brand-panel-lighter relative flex items-center justify-center text-center">
                                <div>
                                    <div className="text-3xl font-bold text-white">85%</div>
                                    <div className="text-[10px] text-brand-text-muted uppercase tracking-widest">Nivel 1-3</div>
                                </div>
                                <svg className="absolute inset-0 size-full -rotate-90">
                                    <circle cx="96" cy="96" r="84" fill="none" stroke="#00f0ff" strokeWidth="12" strokeDasharray="527" strokeDashoffset="80" strokeLinecap="round" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Top Performers Table */}
                <div className="bg-brand-panel border border-brand-panel-lighter rounded-3xl overflow-hidden shadow-card">
                    <div className="p-6 border-b border-brand-panel-lighter flex justify-between items-center">
                        <h3 className="text-white text-sm font-bold uppercase tracking-widest">Top Productores</h3>
                        <button className="text-brand-cyan text-xs font-bold hover:underline">Ver Todo</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-brand-dark/50 text-[10px] uppercase text-brand-text-muted tracking-wider">
                                    <th className="p-4 font-bold">Usuario</th>
                                    <th className="p-4 font-bold text-center">Rango</th>
                                    <th className="p-4 font-bold text-right">Volumen Personal</th>
                                    <th className="p-4 font-bold text-right">Volumen Grupal</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-brand-panel-lighter text-sm">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <tr key={i} className="hover:bg-brand-panel-lighter/30 transition-colors cursor-pointer group">
                                        <td className="p-4 font-bold text-white flex items-center gap-3">
                                            <div className="size-8 rounded-full bg-brand-cyan/20 border border-brand-cyan/50 flex items-center justify-center text-brand-cyan font-mono text-xs">
                                                #{i}
                                            </div>
                                            <div className="flex flex-col">
                                                <span>Usuario Top {i}</span>
                                                <span className="text-[10px] text-brand-text-muted font-normal">ID: 8822{i}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-500/10 text-purple-400 border border-purple-500/20">Manager</span>
                                        </td>
                                        <td className="p-4 text-right text-gray-300 font-mono">1,200 PV</td>
                                        <td className="p-4 text-right text-brand-cyan font-bold font-mono">{(50000 - (i * 2000)).toLocaleString()} GV</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReportsView;
