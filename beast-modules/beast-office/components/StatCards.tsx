import React from 'react';

const StatCards: React.FC = () => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
                title="Volumen Total (GV)"
                value="$124,500"
                trend="+15%"
                isPositive={true}
                icon="monitoring"
                color="cyan"
            />
            <StatCard
                title="Comisiones del Mes"
                value="$3,240.50"
                trend="+8%"
                isPositive={true}
                icon="account_balance_wallet"
                color="purple"
            />
            <StatCard
                title="Nuevos Usuarios"
                value="45"
                trend="+12"
                isPositive={true}
                icon="group_add"
                color="green"
            />
            <StatCard
                title="Tickets Activos"
                value="128"
                trend="-2%"
                isPositive={false}
                icon="confirmation_number"
                color="orange"
            />
        </div>
    );
};

interface StatCardProps {
    title: string;
    value: string;
    trend: string;
    isPositive: boolean;
    icon: string;
    color: 'cyan' | 'purple' | 'green' | 'orange';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, trend, isPositive, icon, color }) => {
    const colorClasses = {
        cyan: 'text-brand-cyan bg-brand-cyan/10 border-brand-cyan/20 shadow-[0_0_10px_rgba(0,240,255,0.2)]',
        purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20 shadow-[0_0_10px_rgba(168,85,247,0.2)]',
        green: 'text-green-400 bg-green-500/10 border-green-500/20',
        orange: 'text-orange-400 bg-orange-500/10 border-orange-500/20'
    };

    const iconColorClass = colorClasses[color];

    return (
        <div className="bg-brand-panel border border-brand-panel-lighter rounded-2xl p-5 shadow-card hover:border-brand-panel-lighter/80 transition-all group">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${iconColorClass} group-hover:scale-110 transition-transform`}>
                    <span className="material-symbols-outlined text-2xl">{icon}</span>
                </div>
                <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full ${isPositive ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                    <span className="material-symbols-outlined text-[12px]">{isPositive ? 'trending_up' : 'trending_down'}</span>
                    {trend}
                </div>
            </div>
            <div>
                <h3 className="text-brand-text-muted text-[10px] font-bold uppercase tracking-widest mb-1">{title}</h3>
                <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
            </div>
        </div>
    );
};

export default StatCards;
