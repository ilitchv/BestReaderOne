
import { TicketData, WinningResult, PrizeTable, AuditLogEntry, User } from '../types';
import { DEFAULT_PRIZE_TABLE } from '../constants';

const TICKETS_KEY = 'beast_tickets_db';
const RESULTS_KEY = 'beast_results_db';
const PRIZES_KEY = 'beast_prizes_db';
const AUDIT_KEY = 'beast_audit_log_db';
const USERS_KEY = 'beast_users_db';

export const localDbService = {
    // --- TICKETS ---
    saveTicket: (ticket: TicketData) => {
        try {
            const existingStr = localStorage.getItem(TICKETS_KEY);
            const existing: TicketData[] = existingStr ? JSON.parse(existingStr) : [];
            
            if (!existing.some((t) => t.ticketNumber === ticket.ticketNumber)) {
                // Ensure plays have default payment status
                const ticketWithMeta: TicketData = { 
                    ...ticket, 
                    syncStatus: 'local', 
                    savedAt: new Date().toISOString(),
                    // FIX: Privacy - Detach from Demo User. Default to 'guest-session' if no user is logged in.
                    userId: ticket.userId || 'guest-session', 
                    plays: ticket.plays.map(p => ({ ...p, paymentStatus: 'unpaid' }))
                };
                const updated = [ticketWithMeta, ...existing];
                localStorage.setItem(TICKETS_KEY, JSON.stringify(updated));
                console.log('✅ Ticket saved to Local DB');
            }
        } catch (e) {
            console.error('❌ Local DB Save Error', e);
        }
    },

    getTickets: (): TicketData[] => {
        try {
            const existingStr = localStorage.getItem(TICKETS_KEY);
            const tickets: TicketData[] = existingStr ? JSON.parse(existingStr) : [];
            
            // Migration: Ensure userId and paymentStatus exist
            return tickets.map(t => ({
                ...t,
                // FIX: Privacy - Default old/orphan tickets to 'guest-session' instead of Demo User
                userId: t.userId || 'guest-session', 
                plays: t.plays.map(p => ({
                    ...p,
                    paymentStatus: p.paymentStatus || 'unpaid'
                }))
            }));
        } catch (e) {
            console.error('❌ Local DB Read Error', e);
            return [];
        }
    },

    // NEW: Mark specific plays as paid
    markPlaysAsPaid: (ticketNumber: string, playIndices: number[]) => {
        try {
            const tickets = localDbService.getTickets();
            const ticketIndex = tickets.findIndex(t => t.ticketNumber === ticketNumber);
            
            if (ticketIndex !== -1) {
                const ticket = tickets[ticketIndex];
                let somethingChanged = false;

                ticket.plays = ticket.plays.map((p, idx) => {
                    if (playIndices.includes(idx) && p.paymentStatus !== 'paid') {
                        somethingChanged = true;
                        return { ...p, paymentStatus: 'paid' };
                    }
                    return p;
                });

                if (somethingChanged) {
                    tickets[ticketIndex] = ticket;
                    localStorage.setItem(TICKETS_KEY, JSON.stringify(tickets));
                    return true;
                }
            }
            return false;
        } catch (e) {
            console.error("Failed to mark plays as paid", e);
            return false;
        }
    },

    // --- RESULTS (WITH AUDIT) ---
    saveResult: (result: WinningResult) => {
        try {
            const existingStr = localStorage.getItem(RESULTS_KEY);
            let existing: WinningResult[] = existingStr ? JSON.parse(existingStr) : [];
            
            // Check if exists to determine Action Type
            const previousIndex = existing.findIndex(r => r.id === result.id);
            const isUpdate = previousIndex !== -1;
            
            // Remove existing result for same lottery+date if exists
            if (isUpdate) {
                existing.splice(previousIndex, 1);
            }
            
            const updated = [result, ...existing];
            localStorage.setItem(RESULTS_KEY, JSON.stringify(updated));
            
            // LOG AUDIT
            localDbService.logAction({
                id: Date.now().toString(),
                timestamp: new Date().toISOString(),
                action: isUpdate ? 'UPDATE' : 'CREATE',
                targetId: result.id,
                details: isUpdate 
                    ? `Updated result for ${result.lotteryName} (${result.date}). New val: ${result.first}-${result.second}-${result.third}` 
                    : `Created result for ${result.lotteryName} (${result.date}). Val: ${result.first}-${result.second}-${result.third}`,
                user: 'Admin'
            });

            console.log('✅ Result saved/audited to Local DB');
        } catch (e) {
            console.error('❌ Local DB Result Save Error', e);
        }
    },

    getResults: (): WinningResult[] => {
        try {
            const existingStr = localStorage.getItem(RESULTS_KEY);
            return existingStr ? JSON.parse(existingStr) : [];
        } catch (e) {
            console.error('❌ Local DB Result Read Error', e);
            return [];
        }
    },

    deleteResult: (id: string) => {
        try {
            const existingStr = localStorage.getItem(RESULTS_KEY);
            if (existingStr) {
                const existing: WinningResult[] = JSON.parse(existingStr);
                const target = existing.find(r => r.id === id);
                
                if (target) {
                    const updated = existing.filter(r => r.id !== id);
                    localStorage.setItem(RESULTS_KEY, JSON.stringify(updated));

                    // LOG AUDIT
                    localDbService.logAction({
                        id: Date.now().toString(),
                        timestamp: new Date().toISOString(),
                        action: 'DELETE',
                        targetId: id,
                        details: `Deleted result for ${target.lotteryName} (${target.date}). Data was: ${target.first}-${target.second}-${target.third}`,
                        user: 'Admin'
                    });
                }
            }
        } catch (e) { console.error(e); }
    },

    // --- AUDIT LOG SYSTEM ---
    logAction: (entry: AuditLogEntry) => {
        try {
            const logStr = localStorage.getItem(AUDIT_KEY);
            const logs: AuditLogEntry[] = logStr ? JSON.parse(logStr) : [];
            // Add new entry at the top
            logs.unshift(entry);
            // Optional: Limit log size to prevent storage overflow (e.g., keep last 1000)
            if (logs.length > 1000) logs.length = 1000;
            localStorage.setItem(AUDIT_KEY, JSON.stringify(logs));
        } catch (e) {
            console.error('Failed to write audit log', e);
        }
    },

    getAuditLog: (): AuditLogEntry[] => {
        try {
            const logStr = localStorage.getItem(AUDIT_KEY);
            return logStr ? JSON.parse(logStr) : [];
        } catch (e) { return []; }
    },

    // --- USER MANAGEMENT (CRUD) ---
    getUsers: (): User[] => {
        try {
            const usersStr = localStorage.getItem(USERS_KEY);
            let users: User[] = usersStr ? JSON.parse(usersStr) : [];
            
            // MOCK DATA INITIALIZATION & MIGRATION
            // Check if we need to seed initial users or new demo users
            const hasDemo = users.some(u => u.id === 'u-12345');
            const hasMaria = users.some(u => u.id === 'u-maria');
            
            if (!hasDemo || !hasMaria) {
                const newUsers = [];
                
                if (!hasDemo) {
                    newUsers.push({
                        id: 'u-12345',
                        email: 'user@demo.com',
                        password: '123', 
                        name: 'Demo Player',
                        role: 'user',
                        status: 'active',
                        balance: 1540.00,
                        pendingBalance: 25.00,
                        phone: '+1 809-555-0123',
                        address: 'Santo Domingo, DO',
                        createdAt: new Date().toISOString(),
                        avatarUrl: 'https://ui-avatars.com/api/?name=Demo+Player&background=0D8ABC&color=fff',
                        sponsorId: 'u-admin-01' // Linked to Admin
                    });
                    newUsers.push({
                        id: 'u-admin-01',
                        email: 'admin@beast.com',
                        password: 'admin',
                        name: 'System Admin',
                        role: 'admin',
                        status: 'active',
                        balance: 0,
                        pendingBalance: 0,
                        createdAt: new Date().toISOString(),
                        avatarUrl: 'https://ui-avatars.com/api/?name=System+Admin&background=10b981&color=fff'
                    });
                }

                if (!hasMaria) {
                    newUsers.push({
                        id: 'u-maria',
                        email: 'maria@demo.com',
                        password: '123',
                        name: 'Maria Perez',
                        role: 'user',
                        status: 'active',
                        balance: 500.00,
                        pendingBalance: 0,
                        phone: '+1 809-555-0001',
                        address: 'Santiago, DO',
                        createdAt: new Date().toISOString(),
                        avatarUrl: 'https://ui-avatars.com/api/?name=Maria+Perez&background=FF69B4&color=fff',
                        sponsorId: 'u-12345' // Linked to Demo Player
                    });
                    newUsers.push({
                        id: 'u-pedro',
                        email: 'pedro@demo.com',
                        password: '123',
                        name: 'Pedro Martinez',
                        role: 'user',
                        status: 'active',
                        balance: 2500.00,
                        pendingBalance: 100.00,
                        phone: '+1 829-555-0002',
                        address: 'La Romana, DO',
                        createdAt: new Date().toISOString(),
                        avatarUrl: 'https://ui-avatars.com/api/?name=Pedro+Martinez&background=32CD32&color=fff',
                        sponsorId: 'u-12345' // Linked to Demo Player
                    });
                }

                users = [...users, ...newUsers];
                localStorage.setItem(USERS_KEY, JSON.stringify(users));
            }
            return users;
        } catch (e) {
            return [];
        }
    },

    saveUser: (user: User) => {
        try {
            const users = localDbService.getUsers();
            const index = users.findIndex(u => u.id === user.id);
            let isNew = false;
            
            if (index >= 0) {
                users[index] = user;
            } else {
                users.push(user);
                isNew = true;
            }
            localStorage.setItem(USERS_KEY, JSON.stringify(users));

            // AUDIT LOGGING FOR USERS
            localDbService.logAction({
                id: Date.now().toString(),
                timestamp: new Date().toISOString(),
                action: isNew ? 'USER_CREATE' : 'USER_UPDATE',
                targetId: user.id,
                details: isNew 
                    ? `Created new user: ${user.name} (${user.email})` 
                    : `Updated profile for: ${user.name}`,
                user: 'Admin'
            });

            return true;
        } catch (e) {
            console.error("Failed to save user", e);
            return false;
        }
    },

    updateUserBalance: (userId: string, amount: number, type: 'DEPOSIT' | 'WITHDRAW' | 'WIN', note: string) => {
        try {
            const users = localDbService.getUsers();
            const index = users.findIndex(u => u.id === userId);
            
            if (index >= 0) {
                const user = users[index];
                const oldBalance = user.balance;
                let newBalance = oldBalance;

                if (type === 'DEPOSIT' || type === 'WIN') {
                    newBalance += Math.abs(amount);
                } else if (type === 'WITHDRAW') {
                    newBalance -= Math.abs(amount);
                }

                user.balance = newBalance;
                users[index] = user;
                localStorage.setItem(USERS_KEY, JSON.stringify(users));

                // Log Transaction
                localDbService.logAction({
                    id: Date.now().toString(),
                    timestamp: new Date().toISOString(),
                    action: type === 'WIN' ? 'PAYOUT' : 'FINANCE',
                    targetId: userId,
                    details: `${type}: ${user.name}. Amt: $${amount.toFixed(2)}. Old: $${oldBalance.toFixed(2)} -> New: $${newBalance.toFixed(2)}. Note: ${note}`,
                    user: 'Admin',
                    amount: amount
                });

                return true;
            }
            return false;
        } catch (e) {
            console.error("Balance update failed", e);
            return false;
        }
    },

    deleteUser: (userId: string) => {
        try {
            const users = localDbService.getUsers();
            const target = users.find(u => u.id === userId);
            const filtered = users.filter(u => u.id !== userId);
            localStorage.setItem(USERS_KEY, JSON.stringify(filtered));
            
            // Audit Log
            if (target) {
                localDbService.logAction({
                    id: Date.now().toString(),
                    timestamp: new Date().toISOString(),
                    action: 'USER_DELETE',
                    targetId: userId,
                    details: `Deleted user: ${target.name} (${target.email})`,
                    user: 'Admin'
                });
            }
            return true;
        } catch (e) {
            return false;
        }
    },

    // --- PRIZE TABLE ---
    savePrizeTable: (table: PrizeTable) => {
        try {
            localStorage.setItem(PRIZES_KEY, JSON.stringify(table));
        } catch (e) { console.error('Error saving prize table', e); }
    },

    getPrizeTable: (): PrizeTable => {
        try {
            const saved = localStorage.getItem(PRIZES_KEY);
            return saved ? JSON.parse(saved) : DEFAULT_PRIZE_TABLE;
        } catch (e) { return DEFAULT_PRIZE_TABLE; }
    },

    // --- UTILS ---
    clearDb: () => {
        localStorage.removeItem(TICKETS_KEY);
        localStorage.removeItem(RESULTS_KEY);
        localStorage.removeItem(PRIZES_KEY);
        localStorage.removeItem(USERS_KEY);
        // NOTE: AUDIT LOG IS NOT CLEARED HERE TO PRESERVE INTEGRITY
    },
    
    getStats: () => {
        const tickets = localDbService.getTickets();
        const totalSales = tickets.reduce((acc, t) => acc + t.grandTotal, 0);
        const totalTickets = tickets.length;
        return { totalSales, totalTickets };
    }
};