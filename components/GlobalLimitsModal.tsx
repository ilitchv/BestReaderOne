import React, { useState, useEffect } from 'react';

// Default structure if API fails
// Default structure if API fails
const DEFAULT_LIMITS = {
    "Pick 3": { "STRAIGHT": 35, "BOX": 105, "COMBO": 35 },
    "Win 4": { "STRAIGHT": 10, "BOX": 30, "COMBO": 10 },
    "Pick 2": { "STRAIGHT": 100, "BOX": 100, "COMBO": 100 },
    "Palé": { "STRAIGHT": 35, "BOX": 105, "COMBO": 35 },
    "Palé-RD": { "STRAIGHT": 20, "BOX": 105, "COMBO": 20 },
    "Venezuela": { "STRAIGHT": 100, "BOX": 100, "COMBO": 100 },
    "RD-Quiniela": { "STRAIGHT": 100, "BOX": 100, "COMBO": 100 },
    "Pulito": { "STRAIGHT": 100, "BOX": 100, "COMBO": 100 },
    "Single Action": { "STRAIGHT": 600, "BOX": 0, "COMBO": 0 },
};

interface GlobalLimitsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const GlobalLimitsModal: React.FC<GlobalLimitsModalProps> = ({ isOpen, onClose }) => {
    const [limits, setLimits] = useState<any>(DEFAULT_LIMITS);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [pin, setPin] = useState('');
    const [showPinInput, setShowPinInput] = useState(false);

    useEffect(() => {
        if (isOpen) fetchLimits();
    }, [isOpen]);

    const fetchLimits = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/config/limits');
            if (res.ok) {
                const data = await res.json();
                if (data && Object.keys(data).length > 0) {
                    setLimits(data);
                }
            }
        } catch (e) {
            console.error("Failed to load limits", e);
        } finally {
            setLoading(false);
        }
    };

    const handleLimitChange = (game: string, type: string, val: string) => {
        const numVal = parseFloat(val);
        setLimits((prev: any) => ({
            ...prev,
            [game]: {
                ...prev[game],
                [type]: isNaN(numVal) ? 0 : numVal
            }
        }));
    };

    const handleSaveInitiate = () => {
        setShowPinInput(true);
    };

    const handleConfirmSave = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/config/limits', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ limits, pin })
            });

            const data = await res.json();
            if (res.ok) {
                alert("✅ Limits Updated Successfully!");
                setShowPinInput(false);
                setPin('');
                onClose();
            } else {
                alert(`❌ Error: ${data.error}`);
            }
        } catch (e: any) {
            alert(`Error: ${e.message}`);
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="bg-slate-800 p-4 border-b border-slate-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <span className="text-cyan-400">⚡</span> Global Risk Configuration
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    {loading ? (
                        <div className="flex justify-center py-10"><span className="animate-spin text-4xl text-cyan-500">⚙️</span></div>
                    ) : (
                        <div className="space-y-6">
                            <p className="text-sm text-slate-400 bg-slate-800/50 p-3 rounded border border-slate-700">
                                <strong>Global Config Mode:</strong> These limits dictate the maximum allowed wager per number, per play type.
                                <br />The enforcement is applied <strong>Per Track, Per Draw</strong>.
                                <br />(Example: If Limit is $35, you can bet $35 on NY and $35 on FL separately).
                            </p>

                            <div className="grid grid-cols-1 gap-6">
                                {Object.keys(limits).map(game => (
                                    <div key={game} className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                                        <h3 className="font-bold text-lg text-white mb-3 border-b border-slate-700 pb-2">{game}</h3>
                                        <div className="grid grid-cols-3 gap-4">
                                            {['STRAIGHT', 'BOX', 'COMBO'].map(type => (
                                                <div key={type} className="flex flex-col">
                                                    <label className="text-[10px] uppercase font-bold text-slate-500 mb-1">{type} Limit ($)</label>
                                                    <input
                                                        type="number"
                                                        value={limits[game]?.[type] || 0}
                                                        onChange={(e) => handleLimitChange(game, type, e.target.value)}
                                                        className="bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-white font-mono font-bold focus:border-cyan-400 focus:outline-none"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-slate-800 p-4 border-t border-slate-700 flex justify-end gap-3 z-10">
                    {showPinInput ? (
                        <div className="flex items-center gap-2 animate-in slide-in-from-right fade-in">
                            <input
                                type="password"
                                placeholder="Admin PIN"
                                value={pin}
                                onChange={(e) => setPin(e.target.value)}
                                className="bg-slate-900 border border-red-500/50 rounded px-3 py-2 text-white w-32 focus:border-red-500 outline-none"
                            />
                            <button
                                onClick={handleConfirmSave}
                                disabled={saving}
                                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded shadow-lg disabled:opacity-50"
                            >
                                {saving ? 'Saving...' : 'CONFIRM SAVE'}
                            </button>
                            <button onClick={() => { setShowPinInput(false); setPin(''); }} className="text-xs text-slate-400 hover:text-white underline">Cancel</button>
                        </div>
                    ) : (
                        <button
                            onClick={handleSaveInitiate}
                            className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded shadow-lg uppercase tracking-wider"
                        >
                            Save Configuration
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GlobalLimitsModal;
