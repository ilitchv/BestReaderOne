
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { localDbService } from '../services/localDbService';
import { TicketData, WinningResult } from '../types';
import TicketModal from './TicketModal';
import UserSettingsModal from './UserSettingsModal';
import ReferralTree from './ReferralTree';
import ReferralLinkModal from './ReferralLinkModal';
import RegistrationModal from './RegistrationModal';
import SniperFrame from './SniperFrame';

interface UserDashboardProps {
    onOpenPlayground: () => void;
    onLogout: () => void;
    onHome: () => void;
    onPlayback: (ticket: TicketData) => void;
}

const UserDashboard: React.FC<UserDashboardProps> = ({ onOpenPlayground, onLogout, onHome, onPlayback }) => {
    const { user } = useAuth();
    const [recentTickets, setRecentTickets] = useState<TicketData[]>([]);
    const [selectedTicket, setSelectedTicket] = useState<TicketData | null>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // New Modal States
    const [isReferralLinkOpen, setIsReferralLinkOpen] = useState(false);
    const [isRegistrationOpen, setIsRegistrationOpen] = useState(false);

    const [activeTab, setActiveTab] = useState<'dashboard' | 'referrals' | 'strategy'>('dashboard');
    const [allResults, setAllResults] = useState<WinningResult[]>([]);
    const [refreshTreeKey, setRefreshTreeKey] = useState(0); // Trigger tree refresh

    useEffect(() => {
        if (!user) return;

        // Load recent tickets
        const tickets = localDbService.getTickets();

        // STRICT FILTER: Only show tickets belonging to this user
        const myTickets = tickets.filter(t => t.userId === user.id);

        // Sort by date descending
        myTickets.sort((a, b) => new Date(b.transactionDateTime).getTime() - new Date(a.transactionDateTime).getTime());
        setRecentTickets(myTickets.slice(0, 20)); // Show last 20

        // Load all results for the smart viewer (Live Win Calculation)
        setAllResults(localDbService.getResults());
    }, [user]);

    const handlePlayback = (ticket: TicketData) => {
        // Call parent handler to switch view and inject data
        onPlayback(ticket);
    };

    if (!user) return null;

    return (
        <div className="min-h-screen bg-[#0b1121] text-gray-100 font-sans selection:bg-neon-cyan selection:text-black">

            {/* --- DASHBOARD HEADER --- */}
            <header className="sticky top-0 z-30 bg-[#0b1121]/80 backdrop-blur-md border-b border-white/5">
                <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-cyan to-blue-600 flex items-center justify-center shadow-[0_0_15px_rgba(0,255,255,0.3)]">
                            <span className="font-black text-black">BR</span>
                        </div>
                        <div>
                            <h1 className="text-sm font-bold text-white tracking-wide">BEAST READER</h1>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                <span className="text-[10px] text-gray-400 uppercase tracking-widest">Live Market</span>
                            </div>
                        </div>
                    </div>

                    {/* Desktop Navigation Tabs */}
                    <div className="hidden md:flex gap-1 bg-white/5 p-1 rounded-lg">
                        <button
                            onClick={() => setActiveTab('dashboard')}
                            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'dashboard' ? 'bg-neon-cyan text-black shadow' : 'text-gray-400 hover:text-white'}`}
                        >
                            Dashboard
                        </button>
                        <button
                            onClick={() => setActiveTab('referrals')}
                            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'referrals' ? 'bg-neon-cyan text-black shadow' : 'text-gray-400 hover:text-white'}`}
                        >
                            My Network
                        </button>
                    </div>

                    <div className="flex items-center gap-4">
                        <button onClick={onHome} className="hidden sm:flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                            Home
                        </button>

                        <div className="relative group cursor-pointer">
                            <img src={user.avatarUrl} alt="Avatar" className="w-10 h-10 rounded-full border-2 border-white/10 group-hover:border-neon-cyan transition-colors" />
                            <div className="absolute right-0 top-12 w-48 bg-[#151e32] border border-white/10 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-right z-50">
                                <div className="px-4 py-3 border-b border-white/5">
                                    <p className="text-white font-bold text-sm truncate">{user.name}</p>
                                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                </div>
                                <button onClick={() => setIsSettingsOpen(true)} className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-white/5 hover:text-white">Settings</button>
                                <button onClick={onLogout} className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 last:rounded-b-xl">Log Out</button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mobile Navigation Tabs */}
                <div className="md:hidden flex border-t border-white/5">
                    <button
                        onClick={() => setActiveTab('dashboard')}
                        className={`flex-1 py-3 text-xs font-bold text-center ${activeTab === 'dashboard' ? 'text-neon-cyan border-b-2 border-neon-cyan' : 'text-gray-500'}`}
                    >
                        DASHBOARD
                    </button>
                    <button
                        onClick={() => setActiveTab('referrals')}
                        className={`flex-1 py-3 text-xs font-bold text-center ${activeTab === 'referrals' ? 'text-neon-cyan border-b-2 border-neon-cyan' : 'text-gray-500'}`}
                    >
                        NETWORK
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
                {activeTab === 'dashboard' && (
                    <>
                        {/* 1. THE VAULT (WALLET) */}
                        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a2333] to-[#0f1525] border border-white/5 shadow-2xl group">
                                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                                <div className="absolute top-0 right-0 w-64 h-64 bg-neon-cyan/5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>

                                <div className="relative p-6 sm:p-8 flex flex-col justify-between h-full min-h-[220px]">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-gray-400 text-xs font-bold tracking-widest uppercase mb-1">Total Balance</p>
                                            <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight drop-shadow-lg">
                                                ${user.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                            </h2>
                                        </div>
                                        <div className="p-2 bg-white/5 rounded-lg border border-white/10">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-neon-cyan"><rect width="20" height="14" x="2" y="5" rx="2" /><line x1="2" x2="22" y1="10" y2="10" /></svg>
                                        </div>
                                    </div>

                                    <div className="flex gap-4 mt-8">
                                        <button className="px-6 py-3 bg-neon-cyan text-black font-bold rounded-xl shadow-[0_0_20px_rgba(0,255,255,0.2)] hover:shadow-[0_0_30px_rgba(0,255,255,0.4)] hover:scale-105 transition-all flex items-center gap-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14" /><path d="m5 12 7-7 7 7" /></svg>
                                            Deposit
                                        </button>
                                        <button className="px-6 py-3 bg-white/5 text-white font-bold rounded-xl border border-white/10 hover:bg-white/10 transition-all flex items-center gap-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14" /><path d="m19 12-7 7-7-7" /></svg>
                                            Withdraw
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Secondary Stats */}
                            <div className="space-y-6">
                                <div className="bg-[#151e32] p-5 rounded-2xl border border-white/5 flex items-center justify-between">
                                    <div>
                                        <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-1">In Play (Pending)</p>
                                        <p className="text-2xl font-bold text-yellow-400">${user.pendingBalance.toFixed(2)}</p>
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                    </div>
                                </div>
                                <div className="bg-[#151e32] p-5 rounded-2xl border border-white/5 flex items-center justify-between">
                                    <div>
                                        <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-1">Total Winnings</p>
                                        <p className="text-2xl font-bold text-green-400">$0.00</p>
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" /></svg>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* 2. COMMAND CENTER (ACTIONS) */}
                        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <button onClick={onOpenPlayground} className="group relative overflow-hidden bg-[#151e32] hover:bg-[#1a253a] p-4 rounded-2xl border border-white/5 transition-all text-left">
                                <div className="absolute top-0 right-0 p-2 opacity-50 group-hover:opacity-100 group-hover:scale-110 transition-all">
                                    <svg className="text-neon-cyan" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M7 7h10" /><path d="M7 12h10" /><path d="M7 17h10" /></svg>
                                </div>
                                <span className="block mt-8 text-sm font-bold text-white group-hover:text-neon-cyan transition-colors">New Ticket</span>
                                <span className="text-[10px] text-gray-500">Open Playground</span>
                            </button>

                            <button disabled className="group relative overflow-hidden bg-[#151e32] p-4 rounded-2xl border border-white/5 opacity-60 cursor-not-allowed text-left">
                                <div className="absolute top-0 right-0 p-2 opacity-50">
                                    <svg className="text-purple-500" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>
                                </div>
                                <span className="block mt-8 text-sm font-bold text-gray-400">Lucky Numbers</span>
                                <span className="text-[10px] text-gray-600">Coming Soon</span>
                            </button>

                            <button onClick={() => setActiveTab('strategy')} className="group relative overflow-hidden bg-[#151e32] hover:bg-[#1a253a] p-4 rounded-2xl border border-white/5 transition-all text-left">
                                <div className="absolute top-0 right-0 p-2 opacity-50 group-hover:opacity-100 group-hover:scale-110 transition-all">
                                    <svg className="text-pink-500" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z" /><path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" /><path d="M12 2v2" /><path d="M12 22v-2" /><path d="m17 17-1.4-1.4" /><path d="m17 7-1.4 1.4" /><path d="m7 17 1.4-1.4" /><path d="m7 7 1.4 1.4" /></svg>
                                </div>
                                <span className="block mt-8 text-sm font-bold text-white group-hover:text-pink-500 transition-colors">Strategy</span>
                                <span className="text-[10px] text-gray-500">Sniper Tools</span>
                            </button>

                            <button onClick={() => setActiveTab('referrals')} className="group relative overflow-hidden bg-[#151e32] hover:bg-[#1a253a] p-4 rounded-2xl border border-white/5 transition-all text-left">
                                <div className="absolute top-0 right-0 p-2 opacity-50 group-hover:opacity-100 group-hover:scale-110 transition-all">
                                    <svg className="text-blue-400" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" x2="15.42" y1="13.51" y2="17.49" /><line x1="15.41" x2="8.59" y1="6.51" y2="10.49" /></svg>
                                </div>
                                <span className="block mt-8 text-sm font-bold text-white group-hover:text-blue-400 transition-colors">My Network</span>
                                <span className="text-[10px] text-gray-500">View Referrals</span>
                            </button>
                        </section>

                        {/* 3. RECENT ACTIVITY */}
                        <section>
                            <h3 className="text-lg font-bold text-white mb-4">Recent Tickets</h3>
                            <div className="bg-[#151e32] rounded-2xl border border-white/5 overflow-hidden">
                                {recentTickets.length === 0 ? (
                                    <div className="p-8 text-center text-gray-500">
                                        <p className="text-sm">No tickets found.</p>
                                        <button onClick={onOpenPlayground} className="mt-2 text-neon-cyan hover:underline text-xs">Create your first ticket</button>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm text-gray-400">
                                            <thead className="bg-white/5 text-xs uppercase font-bold text-gray-500">
                                                <tr>
                                                    <th className="p-4">Ticket ID</th>
                                                    <th className="p-4">Date</th>
                                                    <th className="p-4">Tracks</th>
                                                    <th className="p-4 text-center">Plays</th>
                                                    <th className="p-4 text-right">Total</th>
                                                    <th className="p-4 text-right">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {recentTickets.map(ticket => (
                                                    <tr key={ticket.ticketNumber} className="hover:bg-white/5 transition-colors cursor-pointer" onClick={() => setSelectedTicket(ticket)}>
                                                        <td className="p-4 font-mono text-neon-cyan">{ticket.ticketNumber}</td>
                                                        <td className="p-4 text-white">{new Date(ticket.transactionDateTime).toLocaleDateString()}</td>
                                                        <td className="p-4 max-w-xs truncate">{ticket.tracks.filter(t => !['Venezuela', 'Pulito'].includes(t)).length > 2 ? `${ticket.tracks.filter(t => !['Venezuela', 'Pulito'].includes(t))[0]} +${ticket.tracks.filter(t => !['Venezuela', 'Pulito'].includes(t)).length - 1}` : ticket.tracks.filter(t => !['Venezuela', 'Pulito'].includes(t)).join(', ')}</td>
                                                        <td className="p-4 text-center">{ticket.plays.length}</td>
                                                        <td className="p-4 text-right font-bold text-white">${ticket.grandTotal.toFixed(2)}</td>
                                                        <td className="p-4 text-right">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handlePlayback(ticket); }}
                                                                className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded text-xs font-bold transition-colors flex items-center gap-1 ml-auto"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                                                                Playback
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </section>
                    </>
                )}

                {activeTab === 'referrals' && (
                    <section className="space-y-6">
                        <div className="flex justify-between items-end bg-[#151e32] p-6 rounded-2xl border border-white/5 shadow-lg">
                            <div>
                                <h3 className="text-xl font-bold text-white mb-1">Your Agent Network</h3>
                                <p className="text-sm text-gray-400">Grow your business by sharing your link.</p>
                            </div>
                            <button
                                onClick={() => setIsReferralLinkOpen(true)}
                                className="px-5 py-2.5 bg-neon-cyan text-black font-bold rounded-xl shadow-[0_0_15px_rgba(0,255,255,0.2)] hover:scale-105 transition-all flex items-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
                                Recruit Agent
                            </button>
                        </div>

                        <ReferralTree key={refreshTreeKey} />
                    </section>
                )}

                {activeTab === 'strategy' && (
                    <section className="h-full">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <svg className="text-pink-500" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="22" y1="12" x2="18" y2="12" /><line x1="6" y1="12" x2="2" y2="12" /><line x1="12" y1="6" x2="12" y2="2" /><line x1="12" y1="22" x2="12" y2="18" /></svg>
                                Sniper Strategy
                            </h2>
                            <button onClick={() => setActiveTab('dashboard')} className="text-sm text-gray-400 hover:text-white underline">Back to Dashboard</button>
                        </div>
                        <SniperFrame mode="user" userId={user.id} />
                    </section>
                )}
            </main>

            {/* MODALS */}
            {selectedTicket && (
                <TicketModal
                    isOpen={!!selectedTicket}
                    onClose={() => setSelectedTicket(null)}
                    plays={selectedTicket.plays}
                    selectedTracks={selectedTicket.tracks}
                    selectedDates={selectedTicket.betDates}
                    grandTotal={selectedTicket.grandTotal}
                    ticketNumber={selectedTicket.ticketNumber}
                    isConfirmed={true}
                    setIsConfirmed={() => { }}
                    setTicketNumber={() => { }}
                    ticketImageBlob={null}
                    setTicketImageBlob={() => { }}
                    terminalId="WEB-CLIENT"
                    cashierId="SELF"
                    onSaveTicket={() => { }}
                    isSaving={false}
                    serverHealth="online"
                    lastSaveStatus="success"
                    variant="results-only"
                    resultsContext={allResults}
                />
            )}

            <UserSettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
            />

            <ReferralLinkModal
                isOpen={isReferralLinkOpen}
                onClose={() => setIsReferralLinkOpen(false)}
                onSimulate={() => {
                    setIsReferralLinkOpen(false);
                    setIsRegistrationOpen(true);
                }}
            />

            <RegistrationModal
                isOpen={isRegistrationOpen}
                onClose={() => setIsRegistrationOpen(false)}
                sponsorId={user.id} // User self-simulates, so they are the sponsor
            />
        </div>
    );
};

export default UserDashboard;
