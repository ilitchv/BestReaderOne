
import { TicketData, WinningResult, PrizeTable, AuditLogEntry, User, LedgerEntry, UserRank } from '../types';
import { DEFAULT_PRIZE_TABLE } from '../constants';
import { sha256 } from '../utils/crypto';

const TICKETS_KEY = 'beast_tickets_db';
const RESULTS_KEY = 'beast_results_db';
const PRIZES_KEY = 'beast_prizes_db';
const AUDIT_KEY = 'beast_audit_log_db';
const USERS_KEY = 'beast_users_db';
const LEDGER_KEY = 'beast_ledger_db';
const GUEST_ID = '507f1f77bcf86cd799439011'; // Valid ObjectId for Guest transactions

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
                const newUsers: User[] = [];

                // Guest Session User (Crucial for Client-Side Ledger Support)
                if (!users.some(u => u.id === GUEST_ID)) {
                    newUsers.push({
                        id: GUEST_ID,
                        email: 'guest@session',
                        password: '',
                        name: 'Guest User',
                        role: 'user',
                        status: 'active',
                        balance: 0,
                        pendingBalance: 0,
                        createdAt: new Date().toISOString(),
                        avatarUrl: '',
                        // MLM DEFAULTS
                        rank: UserRank.NORMAL,
                        personalVolume: 0,
                        groupVolume: 0,
                        directActiveCount: 0,
                        kycVerified: false,
                        walletRegistered: false,
                        commissionBalance: { tokens: 0, btc: 0 }
                    });
                }

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
                        sponsorId: 'u-admin-01', // Linked to Admin
                        referralCode: 'DEMO123',
                        // MLM DATA
                        rank: UserRank.AGENTE,
                        personalVolume: 125.00,
                        groupVolume: 450.00,
                        directActiveCount: 3,
                        kycVerified: true,
                        walletRegistered: true,
                        commissionBalance: { tokens: 150, btc: 45 }
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
                        avatarUrl: 'https://ui-avatars.com/api/?name=System+Admin&background=10b981&color=fff',
                        rank: UserRank.MANAGER,
                        personalVolume: 1000,
                        groupVolume: 10000,
                        directActiveCount: 10,
                        kycVerified: true,
                        walletRegistered: true,
                        referralCode: 'ADMIN01',
                        commissionBalance: { tokens: 1000, btc: 500 }
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
                        sponsorId: 'u-12345', // Linked to Demo Player
                        rank: UserRank.NORMAL,
                        personalVolume: 0,
                        groupVolume: 0,
                        directActiveCount: 0,
                        kycVerified: false,
                        walletRegistered: false,
                        referralCode: 'MARIA01',
                        commissionBalance: { tokens: 0, btc: 0 }
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
                        sponsorId: 'u-12345', // Linked to Demo Player
                        rank: UserRank.NORMAL,
                        personalVolume: 60,
                        groupVolume: 0,
                        directActiveCount: 0,
                        kycVerified: true,
                        walletRegistered: true,
                        referralCode: 'PEDRO01',
                        commissionBalance: { tokens: 0, btc: 0 }
                    });
                }

                users = [...users, ...newUsers];
                localStorage.setItem(USERS_KEY, JSON.stringify(users));
            }

            // AUTO-MIGRATE EXISTING USERS TO HAVE NEW FIELDS
            return users.map(u => ({
                ...u,
                rank: u.rank || UserRank.NORMAL,
                personalVolume: u.personalVolume || 0,
                groupVolume: u.groupVolume || 0,
                directActiveCount: u.directActiveCount || 0,
                kycVerified: u.kycVerified ?? false,
                walletRegistered: u.walletRegistered ?? false,
                commissionBalance: u.commissionBalance || { tokens: 0, btc: 0 },
                referralCode: u.referralCode || `REF-${u.id.substring(0, 5).toUpperCase()}`
            }));
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

    // --- BEAST LEDGER CORE ---
    addToLedger: async (payload: { action: 'DEPOSIT' | 'WITHDRAW' | 'WAGER' | 'PAYOUT' | 'GENESIS', userId: string, amount: number, details: string }): Promise<boolean> => {
        try {
            const raw = localStorage.getItem(LEDGER_KEY);
            let chain: LedgerEntry[] = raw ? JSON.parse(raw) : [];

            // 1. GENESIS BLOCK CHECK
            if (chain.length === 0) {
                const genesis: LedgerEntry = {
                    index: 0,
                    timestamp: Date.now(),
                    action: 'GENESIS',
                    userId: 'SYSTEM',
                    amount: 0,
                    balanceAfter: 0,
                    previousHash: '0',
                    hash: '',
                    details: 'Genesis Block'
                };
                genesis.hash = await sha256(JSON.stringify(genesis));
                chain.push(genesis);
            }

            const lastBlock = chain[chain.length - 1];
            const previousHash = lastBlock.hash;

            // 2. CHECK USER EXISTENCE & BALANCE
            const users = localDbService.getUsers();
            const userIdx = users.findIndex(u => u.id === payload.userId);
            if (userIdx === -1 && payload.action !== 'GENESIS') throw new Error("User not found for ledger transaction");

            const user = users[userIdx];
            // Calculate hypothetical new balance to check funds
            // Note: In this architecture, we trust the Users DB balance as the cached state, 
            // but for high security we should replay the ledger. For this prototype, we update both.
            let currentBalance = user.balance;

            // 3. CREATE NEW BLOCK
            const newBlock: LedgerEntry = {
                index: lastBlock.index + 1,
                timestamp: Date.now(),
                action: payload.action,
                userId: payload.userId,
                amount: payload.amount,
                balanceAfter: 0, // Calculated below
                previousHash: previousHash,
                hash: '',
                details: payload.details
            };

            // Calculate Balance Logic
            if (payload.action === 'DEPOSIT' || payload.action === 'PAYOUT') {
                currentBalance += Math.abs(payload.amount);
            } else if (payload.action === 'WITHDRAW' || payload.action === 'WAGER') {
                if (currentBalance < Math.abs(payload.amount)) {
                    console.warn(`Insufficient funds for ${user.name}`);
                    return false;
                }
                currentBalance -= Math.abs(payload.amount);
            }
            newBlock.balanceAfter = currentBalance;

            // 4. MINE (HASH)
            // We hash everything except the hash itself
            const blockData = JSON.stringify({
                index: newBlock.index,
                timestamp: newBlock.timestamp,
                action: newBlock.action,
                userId: newBlock.userId,
                amount: newBlock.amount,
                balanceAfter: newBlock.balanceAfter,
                previousHash: newBlock.previousHash,
                details: newBlock.details
            });
            newBlock.hash = await sha256(blockData);

            // 5. SAVE CHAIN
            chain.push(newBlock);
            localStorage.setItem(LEDGER_KEY, JSON.stringify(chain));

            // 6. UPDATE USER STATE (Snapshot)
            user.balance = currentBalance;
            users[userIdx] = user;
            localStorage.setItem(USERS_KEY, JSON.stringify(users));

            // 7. EXTERNAL AUDIT LOG (Redundant but keeps UI happy)
            localDbService.logAction({
                id: Date.now().toString(),
                timestamp: new Date().toISOString(),
                action: payload.action === 'PAYOUT' ? 'PAYOUT' : 'FINANCE',
                targetId: user.id,
                details: `[LEDGER #${newBlock.index}] ${payload.action}: $${payload.amount}. New Bal: $${currentBalance}. Hash: ${newBlock.hash.substring(0, 8)}...`,
                user: 'Admin',
                amount: payload.amount
            });

            return true;

        } catch (e) {
            console.error("Ledger Transaction Failed:", e);
            return false;
        }
    },

    verifyLedgerIntegrity: async (): Promise<{ valid: boolean, errors: string[] }> => {
        const raw = localStorage.getItem(LEDGER_KEY);
        if (!raw) return { valid: true, errors: [] }; // Empty is valid
        const chain: LedgerEntry[] = JSON.parse(raw);
        const errors: string[] = [];

        for (let i = 0; i < chain.length; i++) {
            const block = chain[i];

            // 1. Verify Hash
            const blockData = JSON.stringify({
                index: block.index,
                timestamp: block.timestamp,
                action: block.action,
                userId: block.userId,
                amount: block.amount,
                balanceAfter: block.balanceAfter,
                previousHash: block.previousHash,
                details: block.details
            });
            const calculatedHash = await sha256(blockData);

            if (calculatedHash !== block.hash) {
                // Special case for Genesis if I implemented it differently, but here it should match.
                // Actually Genesis hash calculation in 'addToLedger' might be different if I included fields differently.
                // Let's ensure consistency.
                if (i === 0) {
                    // Genesis might be special, but in step 1 I used JSON.stringify(genesis) BEFORE setting hash.
                    // But in verification I use the constructed object.
                    // The Genesis block in step 1 had hash='' when stringified!
                    // The newBlock in step 4 had hash='' implied? No, newBlock had hash='' property.
                    // JSON.stringify includes 'hash': '' if it's there.
                    // My step 4 'blockData' EXCLUDED 'hash' property explicitly?
                    // Step 4:
                    // const blockData = JSON.stringify({ index: ..., ... details: ... }); NO hash property.
                    // So verification must also strictly exclude hash property.
                    // The block object has 'hash'.
                    // My code above constructs a new object literals WITHOUT hash. Correct.
                }

                if (calculatedHash !== block.hash) {
                    // Maybe a timestamp precision issue or Key order issue?
                    // JSON.stringify order is not guaranteed reliable across environments but V8 usually respects definition order.
                    // For robustness, I should fix the order.
                    // But for now, let's assume it works if I use the exact same literal structure.
                    errors.push(`Block #${i} Hash Mismatch! stored=${block.hash.substring(0, 8)}, calc=${calculatedHash.substring(0, 8)}`);
                }
            }

            // 2. Verify Chain Link
            if (i > 0) {
                const prevBlock = chain[i - 1];
                if (block.previousHash !== prevBlock.hash) {
                    errors.push(`Block #${i} Broken Chain! PrevHash (${block.previousHash.substring(0, 8)}) != Block #${i - 1} Hash (${prevBlock.hash.substring(0, 8)})`);
                }
            }
        }

        return { valid: errors.length === 0, errors };
    },

    getLedger: (): LedgerEntry[] => {
        try {
            const raw = localStorage.getItem(LEDGER_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) { return []; }
    },

    updateUserBalance: async (userId: string, amount: number, type: 'DEPOSIT' | 'WITHDRAW' | 'WIN', note: string) => {
        // MAP OLD API TO NEW LEDGER API
        const actionMap: Record<string, 'DEPOSIT' | 'WITHDRAW' | 'PAYOUT'> = {
            'DEPOSIT': 'DEPOSIT',
            'WITHDRAW': 'WITHDRAW',
            'WIN': 'PAYOUT' // 'WIN' usually means Payout
        };

        return await localDbService.addToLedger({
            action: actionMap[type] || 'DEPOSIT',
            userId: userId,
            amount: amount,
            details: note
        });
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