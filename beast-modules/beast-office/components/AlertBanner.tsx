
import React, { useEffect, useState } from 'react';
import { AlertTriangle, XCircle, CheckCircle } from 'lucide-react';
import { Alert } from '../types';

export const AlertBanner: React.FC = () => {
    const [alerts, setAlerts] = useState<any[]>([]);

    const fetchAlerts = async () => {
        try {
            const res = await fetch('/api/admin/alerts');
            if (res.ok) {
                const data = await res.json();
                setAlerts(data);
            }
        } catch (e) {
            console.error("Failed to fetch alerts");
        }
    };

    const dismissAlert = async (id: string) => {
        try {
            await fetch(`/api/admin/alerts/dismiss/${id}`, { method: 'POST' });
            setAlerts(prev => prev.filter(a => a._id !== id));
        } catch (e) {
            console.error("Failed to dismiss");
        }
    };

    useEffect(() => {
        fetchAlerts();
        const interval = setInterval(fetchAlerts, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, []);

    if (alerts.length === 0) return null;

    return (
        <div className="flex flex-col gap-2 mb-6">
            {alerts.map(alert => (
                <div key={alert._id} className={`p-4 rounded-lg flex items-center justify-between border ${alert.severity === 'CRITICAL' ? 'bg-red-900/50 border-red-500 text-red-200' :
                        alert.severity === 'HIGH' ? 'bg-orange-900/50 border-orange-500 text-orange-200' :
                            'bg-yellow-900/50 border-yellow-500 text-yellow-200'
                    }`}>
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5" />
                        <div>
                            <p className="font-bold text-sm uppercase">{alert.type} • {alert.severity}</p>
                            <p className="text-sm">{alert.message}</p>
                            {alert.metadata && (
                                <p className="text-xs opacity-75 mt-1 font-mono">{JSON.stringify(alert.metadata)}</p>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={() => dismissAlert(alert._id)}
                        className="p-2 hover:bg-white/10 rounded-full transition"
                        title="Dismiss"
                    >
                        <XCircle className="w-5 h-5" />
                    </button>
                </div>
            ))}
        </div>
    );
};
