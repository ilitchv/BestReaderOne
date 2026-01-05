
import React, { useState, useEffect } from 'react';
import Sidebar from '../components/mlm/Sidebar';
import UserDirectory from '../components/mlm/UserDirectory';
import ReportsView from '../components/mlm/ReportsView';
import ReferralTree from '../components/ReferralTree';
import { ViewType, User } from '../types';
import { localDbService } from '../services/localDbService';

const NetworkPage: React.FC = () => {
    const [activeView, setActiveView] = useState<ViewType>('tree');
    const [users, setUsers] = useState<User[]>([]);
    const [selectedUserForTree, setSelectedUserForTree] = useState<string | undefined>(undefined);

    useEffect(() => {
        document.title = "Beast Office | Network";
        // Load data
        const loadedUsers = localDbService.getUsers();
        setUsers(loadedUsers);
    }, []);

    const handleViewUserInTree = (userId: string) => {
        setSelectedUserForTree(userId);
        setActiveView('tree');
    };

    return (
        <div className="min-h-screen bg-[#0f1525] flex overflow-hidden font-sans">
            {/* Sidebar Navigation */}
            <Sidebar activeView={activeView} onViewChange={setActiveView} />

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col relative overflow-hidden">
                {/* Header for Mobile */}
                <header className="md:hidden flex items-center justify-between p-4 bg-[#0B1221] border-b border-white/10">
                    <span className="font-bold text-white">BEAST OFFICE</span>
                    <button className="text-white"><span className="material-symbols-outlined">menu</span></button>
                </header>

                {/* Dynamic View Rendering */}
                {activeView === 'tree' && (
                    <div className="flex-1 p-6 overflow-y-auto">
                        <div className="max-w-7xl mx-auto">
                            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                                <span className="material-symbols-outlined text-cyan-400">account_tree</span>
                                Estructura de Red
                            </h2>
                            <ReferralTree rootUserId={selectedUserForTree || 'COMPANY_ROOT'} />

                            {selectedUserForTree && (
                                <button
                                    onClick={() => setSelectedUserForTree(undefined)}
                                    className="mt-4 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors text-sm"
                                >
                                    Reset to Root
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {activeView === 'directory' && (
                    <UserDirectory users={users} onViewUserInTree={handleViewUserInTree} />
                )}

                {activeView === 'reports' && (
                    <ReportsView />
                )}

                {activeView === 'commissions' && (
                    <div className="flex-1 flex items-center justify-center text-gray-500">
                        <div className="text-center">
                            <span className="material-symbols-outlined text-6xl mb-4 opacity-50">payments</span>
                            <h3 className="text-xl font-bold text-white">Comisiones</h3>
                            <p>Modulo en desarrollo. Aqui veras el historial de pagos.</p>
                        </div>
                    </div>
                )}
                {activeView === 'config' && (
                    <div className="flex-1 flex items-center justify-center text-gray-500">
                        <div className="text-center">
                            <span className="material-symbols-outlined text-6xl mb-4 opacity-50">settings</span>
                            <h3 className="text-xl font-bold text-white">Configuración</h3>
                            <p>Ajustes del plan de compensación.</p>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default NetworkPage;
