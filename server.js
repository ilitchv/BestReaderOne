console.log("------------------------------------------------");
console.log("🚀 STARTING BEAST READER SERVER (CLOUD RUN MODE)");
console.log("=== SERVER BOOT CHECK [ID: VERIFY-001] ===");
console.log("------------------------------------------------");

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

// Database & Services
const connectDB = require('./database');
const scraperService = require('./services/scraperService');
const ledgerService = require('./services/ledgerService'); // NEW
const riskService = require('./services/riskService'); // NEW - Risk Management
const aiService = require('./services/aiService'); // NEW - AI Features

// Models
const Ticket = require('./models/Ticket');
const Jugada = require('./models/Jugada'); // NEW
const LotteryResult = require('./models/LotteryResult');
const Track = require('./models/Track');
const User = require('./models/User'); // NEW
const BeastLedger = require('./models/BeastLedger'); // NEW
const WithdrawRequest = require('./models/WithdrawRequest'); // NEW

const AuditLog = require('./models/AuditLog'); // NEW
const TrackConfig = require('./models/TrackConfig'); // NEW - Daily Closing Time Config

// HELPER: CENTRALIZED AUDIT LOGGER
const logSystemAudit = async (data) => {
    try {
        await AuditLog.create(data);
        console.log(`📝 Audit Logged: ${data.action} - ${data.user}`);
    } catch (e) {
        console.error("Audit Log Error:", e);
    }
};

const app = express();
// Google Cloud Run injects the PORT environment variable
const PORT = parseInt(process.env.PORT) || 8080;

// 1. Connect to Database (Lazy/Cached for Serverless)
// Removed top-level fire-and-forget call
// 1. Connect to Database (Lazy/Cached for Serverless)
// Removed top-level fire-and-forget call
connectDB();

// 2. Start Background Jobs
try {
    if (process.env.NODE_ENV !== 'production') {
        // Only run scraper scheduler in long-running processes, not serverless functions usually
        // OR assume this server.js is also used for a worker
        scraperService.startResultScheduler();
        console.log("✅ Scraper service initialized");
    }
} catch (err) {
    console.error("⚠️ Failed to start scraper:", err);
}

// 3. Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// DATABASE CONNECTION MIDDLEWARE REMOVED
// We now connect explicitly in each route handler to ensure reliability in serverless environments.
app.use((req, res, next) => {
    next();
});

// Logger Middleware
app.use((req, res, next) => {
    if (!req.url.match(/\.(js|css|png|jpg|ico)$/)) {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    }
    next();
});


// ==========================================
// 7. AI ROUTES (Gemini)
// ==========================================

app.post('/api/ai/interpret-ticket', async (req, res) => {
    try {
        const { base64Image } = req.body;
        if (!base64Image) return res.status(400).json({ error: "Missing image" });

        const result = await aiService.interpretTicketImage(base64Image);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/ai/interpret-text', async (req, res) => {
    try {
        const { prompt } = req.body;
        if (!prompt) return res.status(400).json({ error: "Missing prompt" });

        const result = await aiService.interpretText(prompt);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/ai/interpret-batch', async (req, res) => {
    try {
        const { base64Image } = req.body;
        if (!base64Image) return res.status(400).json({ error: "Missing image" });

        const result = await aiService.interpretBatch(base64Image);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/ai/interpret-results-image', async (req, res) => {
    res.json([]); // Stub
});


app.post('/api/ai/interpret-results-text', async (req, res) => {
    res.json([]); // Stub
});

app.post('/api/ai/chat-compensation', async (req, res) => {
    try {
        const { query, context } = req.body;
        if (!query || !context) return res.status(400).json({ error: "Missing query or context" });

        const answer = await aiService.chatWithContext(query, context);
        res.json({ answer });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});



// ==========================================
// 8. NETWORK / BEAST OFFICE ROUTES
// ==========================================

// Helper: Recursive Tree Builder (simplified for now, ideally limit depth)
// For a production app with thousands of users, use a nested set model or graph DB.
// Here we fetch all (small scale) or lazy load children.
app.get('/api/network/tree', async (req, res) => {
    try {
        await connectDB();
        const { rootId } = req.query;

        // Fetch all users to build tree in memory (efficient for < 1000 nodes)
        const users = await User.find({}).select('-password').lean();

        // If no users, create default admin
        if (users.length === 0) {
            return res.json({ root: null, allUsers: [] });
        }

        // Identify Root
        let root = rootId ? users.find(u => u._id.toString() === rootId) : users.find(u => !u.sponsorId);

        // Fallback if no specific root found, pick the first one (usually Admin)
        if (!root) root = users[0];

        // Attach children recursively
        const userMap = {};
        users.forEach(u => {
            u.id = u._id.toString(); // Map _id to id
            u.children = [];
            userMap[u.id] = u;
        });

        const hierarchy = [];
        users.forEach(u => {
            if (u.sponsorId && userMap[u.sponsorId]) {
                userMap[u.sponsorId].children.push(u);
            } else if (!u.sponsorId) {
                hierarchy.push(u); // Top level
            }
        });

        // If specific root requested, find it in the built map
        const responseRoot = userMap[root.id];

        res.json({ root: responseRoot, allUsers: users });

    } catch (e) {
        console.error("Tree Error:", e);
        res.status(500).json({ error: e.message });
    }
});

// Create Referral (Pending)
app.post('/api/network/referral', async (req, res) => {
    try {
        await connectDB();
        const { name, email, phone, sponsorId } = req.body;

        const exists = await User.findOne({ email });
        if (exists) return res.status(400).json({ error: "Email already registered" });

        const newUser = new User({
            name, email,
            password: "tempPassword123", // Should be set via invite email later
            role: 'user',
            status: 'pending',
            sponsorId: sponsorId || null,
            referralCode: `REF-${Math.floor(Math.random() * 100000)}`
        });

        await newUser.save();
        res.json({ success: true, user: newUser });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Approve User
app.post('/api/network/approve', async (req, res) => {
    try {
        await connectDB();
        const { userId } = req.body;
        await User.findByIdAndUpdate(userId, { status: 'active' });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Reject User
app.post('/api/network/reject', async (req, res) => {
    try {
        await connectDB();
        const { userId } = req.body;
        await User.findByIdAndDelete(userId);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Toggle Network Access (Admin)
app.post('/api/network/toggle-access', async (req, res) => {
    try {
        await connectDB();
        const { userId, enabled } = req.body;
        // Verify Admin Auth here in production (req.user.role === 'admin')

        await User.findByIdAndUpdate(userId, { networkEnabled: enabled });
        res.json({ success: true, enabled });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});


// ==========================================
// 9. FINANCIAL / WITHDRAWAL ROUTES
// ==========================================

// A. Request Withdrawal (User)
app.post('/api/financial/withdraw', async (req, res) => {
    try {
        await connectDB();
        const { userId, amount, walletAddress, network } = req.body;

        if (!userId || !amount || !walletAddress) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        if (amount <= 0) {
            return res.status(400).json({ error: 'Invalid amount' });
        }

        // 0. Update User Wallet if requested
        if (req.body.saveWallet) {
            await User.findByIdAndUpdate(userId, { savedWalletAddress: walletAddress });
        }

        // 1. Process Ledger Debit (This throws if insufficient funds)
        // We use "WITHDRAW" action which decreases balance
        const block = await ledgerService.addToLedger({
            action: 'WITHDRAW',
            userId: userId,
            amount: amount, // Service handles negation based on action
            referenceId: `REQ-${Date.now()}`,
            description: `Withdrawal Request to ${network} Wallet`
        });

        // 2. Create Request Record
        const newRequest = new WithdrawRequest({
            userId,
            amount,
            walletAddress,
            network,
            status: 'PENDING',
            ledgerTransactionId: block.hash // Link to the ledger block hash for audit
        });

        await newRequest.save();

        // 3. AUDIT LOG (FINANCE_WITHDRAW_REQ)
        await logSystemAudit({
            action: 'FINANCE_WITHDRAW_REQ',
            user: userId,
            amount: -amount,
            details: `Withdrawal Request: $${amount} to ${network} (${walletAddress})`,
            referenceId: block.hash,
            targetId: newRequest._id
        });

        res.json({ success: true, request: newRequest, balance: block.balanceAfter });

    } catch (error) {
        console.error("Values error:", error);
        res.status(500).json({ error: error.message });
    }
});

// A.2 List My Withdrawals (User)
app.get('/api/user/withdrawals', async (req, res) => {
    try {
        await connectDB();
        const { userId } = req.query;
        if (!userId) return res.status(400).json({ error: 'User ID required' });

        const requests = await WithdrawRequest.find({ userId }).sort({ createdAt: -1 });
        res.json(requests);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// A.3 My Ledger History (User)
app.get('/api/user/ledger', async (req, res) => {
    try {
        await connectDB();
        const { userId, limit } = req.query;
        if (!userId) return res.status(400).json({ error: 'User ID required' });

        const limitVal = parseInt(limit) || 100;
        const history = await BeastLedger.find({ userId }).sort({ timestamp: -1 }).limit(limitVal);
        res.json(history);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// B. List Withdrawals (Admin)
app.get('/api/admin/withdrawals', async (req, res) => {
    try {
        await connectDB();
        // Can filter by status if needed query param
        const requests = await WithdrawRequest.find().sort({ createdAt: -1 }).populate('userId', 'name email');
        res.json(requests);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// C. Process Withdrawal (Admin)
app.post('/api/admin/withdrawals/:id/process', async (req, res) => {
    try {
        await connectDB();
        const { id } = req.params;
        const { action, adminNote } = req.body; // action: 'APPROVE' or 'REJECT'

        const request = await WithdrawRequest.findById(id).populate('userId'); // FIX: Populate to get Name
        if (!request) return res.status(404).json({ error: 'Request not found' });
        if (request.status !== 'PENDING') return res.status(400).json({ error: 'Request already processed' });

        if (action === 'APPROVE') {
            request.status = 'APPROVED';
            request.processedAt = new Date();
            request.adminNote = adminNote || 'Approved by Admin (Manual)';
            await request.save();

        } else if (action === 'APPROVE_AUTO') {
            // AUTOMATED PAYOUT (Phase 8)
            const paymentService = require('./services/paymentService');

            try {
                // 1. Trigger Payout
                // Identify User Label (Name or Email)
                const userLabel = request.userId ? (request.userId.name || request.userId.email) : 'Unknown User';

                const payout = await paymentService.createPayout(
                    request.amount,
                    'USD', // Or derive from request.network if we store currency
                    request.walletAddress,
                    request.userId._id || request.userId, // Ensure ID string
                    userLabel // Pass the dynamic label
                );

                // 2. Update Request based on Payout Status
                if (payout.isSemiAuto) {
                    request.status = 'PENDING_SIGNATURE';
                    request.adminNote = `Payout Staged. Waiting for Admin Signature. Payout ID: ${payout.id}`;
                } else {
                    request.status = 'COMPLETED'; // Instant success
                    request.adminNote = `Auto-Payout Completed: ${payout.id}`;
                }

                request.processedAt = new Date();
                request.txHash = `PAYOUT-${payout.id}`;
                await request.save();

                return res.json({ success: true, request, payout, isSemiAuto: payout.isSemiAuto });

            } catch (payoutError) {
                console.error("Auto-Payout Failed:", payoutError);
                // ... logging ...
                return res.status(500).json({ error: 'BTCPay Payout Failed: ' + payoutError.message });
            }

        } else if (action === 'REJECT') {
            request.status = 'REJECTED';
            request.processedAt = new Date();
            request.adminNote = adminNote || 'Rejected by Admin';
            await request.save();

            // REFUND THE USER
            // We must credit the money back to the ledger
            const refundBlock = await ledgerService.addToLedger({
                action: 'DEPOSIT', // effectively a specialized refund deposit
                userId: request.userId,
                amount: request.amount,
                referenceId: `REFUND-${request._id}`,
                description: `Refund: Withdrawal Rejected. ${adminNote}`
            });

            // AUDIT LOG (REJECT/REFUND)
            await logSystemAudit({
                action: 'FINANCE_WITHDRAW_REJECT',
                user: request.userId,
                amount: request.amount,
                details: `Withdrawal Rejected (Refunded): ${adminNote}`,
                referenceId: refundBlock.hash,
                targetId: request._id
            });

        } else {
            return res.status(400).json({ error: 'Invalid action' });
        }

        // AUDIT LOG (APPROVE - General)
        if (request.status === 'APPROVED' || request.status === 'COMPLETED' || request.status === 'PENDING_SIGNATURE') {
            await logSystemAudit({
                action: 'FINANCE_WITHDRAW_APPROVE',
                user: request.userId,
                amount: -request.amount,
                details: `Withdrawal Approved (${action}). Status: ${request.status}`,
                referenceId: request.txHash || 'MANUAL-APPROVE',
                targetId: request._id
            });
        }

        res.json({ success: true, request });

    } catch (error) {
        console.error("Process error:", error);
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// 8. SERVER START
// ==========================================

// ==========================================
// 4. API ROUTES (PRIORITY #1)
// ==========================================

app.get('/api/health', async (req, res) => {
    await connectDB();
    const dbState = mongoose.connection.readyState;
    const statusMap = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };

    res.status(200).json({
        server: 'online',
        database: statusMap[dbState] || 'unknown',
        env: process.env.NODE_ENV || 'production',
        timestamp: new Date().toISOString()
    });
});

app.get('/api/results', async (req, res) => {
    try {
        await connectDB();
        const { date, resultId } = req.query;
        const query = {};
        if (date) query.drawDate = date;
        if (resultId) query.resultId = resultId;
        const results = await LotteryResult.find(query).sort({ drawDate: -1, country: 1, lotteryName: 1 });
        res.json(results);
    } catch (error) {
        console.error("Error fetching results:", error);
        res.status(500).json({ error: 'Failed to fetch results from DB' });
    }
});

// MANUAL RESULT ENTRY (Admin)
app.post('/api/results/manual', async (req, res) => {
    try {
        await connectDB();
        const { resultId, lotteryName, drawName, numbers, drawDate, drawTime, country } = req.body;

        // Validation? Basic check
        if (!resultId || !numbers) return res.status(400).json({ error: 'Missing Data' });

        // Upsert Logic
        const updated = await LotteryResult.findOneAndUpdate(
            { resultId: resultId }, // Search by unique ID
            {
                resultId,
                lotteryName,
                drawName,
                numbers, // Expected to be formatted "123-4" or similar
                drawDate, // "YYYY-MM-DD"
                drawTime: drawTime || new Date().toLocaleTimeString('en-US', { hour12: false }), // "HH:mm"
                country: country || 'Custom',
                scrapedAt: new Date()
            },
            { upsert: true, new: true }
        );

        res.json({ success: true, result: updated });
    } catch (e) {
        console.error("Manual Entry Error:", e);
        res.status(500).json({ error: e.message });
    }
});

// DAILY CLOSING TIME CONFIG (Admin)
app.post('/api/config/daily-close', async (req, res) => {
    try {
        await connectDB();
        const { trackId, date, closingType, generalTime, digitTimes } = req.body;

        if (!trackId || !date) return res.status(400).json({ error: 'Missing Track or Date' });

        // Upsert Config
        const config = await TrackConfig.findOneAndUpdate(
            { trackId, date },
            {
                trackId,
                date,
                closingType: closingType || 'GENERAL',
                generalTime,
                digitTimes, // Expects Object/Map
                updatedAt: new Date(),
                updatedBy: 'ADMIN' // or req.user.id if auth passed
            },
            { upsert: true, new: true }
        );

        res.json({ success: true, config });
    } catch (e) {
        console.error("Daily Config Error:", e);
        res.status(500).json({ error: e.message });
    }
});

// ==========================================
// LEDGER & PAYMENT ROUTES (NEW)
// ==========================================

// A. AUTHENTICATION (Simple Mock for Prototype)
app.post('/api/auth/login', async (req, res) => {
    try {
        await connectDB();
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user) return res.status(401).json({ error: "Invalid credentials" });

        // In production, use bcrypt.compare(password, user.password)
        if (password !== user.password && password !== "admin123") { // Backdoor for demo
            return res.status(401).json({ error: "Invalid credentials" });
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        res.json({
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            balance: user.balance,
            status: user.status,
            avatar: user.avatarUrl,
            networkEnabled: user.networkEnabled // NEW
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/auth/me', async (req, res) => {
    try {
        await connectDB();
        const userId = req.headers['x-user-id'] || req.query.userId;
        console.log(`[AUTH DEBUG] Fetching me for: ${userId}`);

        if (!userId) return res.status(400).json({ error: "Missing User ID" });

        const user = await User.findById(userId);
        if (!user) {
            console.log(`[AUTH DEBUG] User not found: ${userId}`);
            return res.status(404).json({ error: "User not found" });
        }

        console.log(`[AUTH DEBUG] User found: ${user.name}`);

        // Calculate Balance from Ledger for truth (optional but good)
        // const balance = await ledgerService.getBalance(userId);

        res.json({
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            balance: user.balance,
            status: user.status,
            avatar: user.avatarUrl,
            networkEnabled: user.networkEnabled // NEW
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// B. ADMIN CREDITS (Manual Top-up)
app.post('/api/admin/credit', async (req, res) => {
    try {
        await connectDB();
        const { adminId, targetUserId, amount, note } = req.body;

        // Verify Admin (Simple check)
        // const admin = await User.findById(adminId);
        // if (!admin || admin.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

        const block = await ledgerService.addToLedger({
            action: 'DEPOSIT',
            userId: targetUserId,
            amount: parseFloat(amount), // Ensure number
            referenceId: 'ADMIN-MANUAL-' + Date.now(),
            description: note || 'Admin Manual Credit'
        });

        // AUDIT LOG
        await logSystemAudit({
            action: 'FINANCE_ADMIN_ADJUST',
            user: targetUserId, // The user receiving the credit
            performedBy: 'ADMIN', // Ideally capture which admin
            amount: parseFloat(amount),
            details: `Admin Added Credit: $${amount}. Note: ${note || 'Manual Credit'}`,
            referenceId: block.hash, // Link to ledger block hash
            targetId: targetUserId,
            metadata: { note, adminId }
        });

        res.json({ success: true, balance: block.balanceAfter });
    } catch (e) {
        console.error("Credit Error:", e);
        res.status(500).json({ error: e.message });
    }
});

// C. ADMIN APIs (Dashboard Data)

// NEW: AUDIT LOGS
app.get('/api/admin/audit', async (req, res) => {
    try {
        await connectDB();
        const limit = parseInt(req.query.limit) || 100;
        const logs = await AuditLog.find().sort({ timestamp: -1 }).limit(limit);
        res.json(logs);
    } catch (e) {
        console.error("Audit Fetch Error:", e);
        res.status(500).json({ error: "Failed to fetch audit log" });
    }
});

app.get('/api/admin/users', async (req, res) => {
    try {
        await connectDB();
        // Return all users with essential fields
        const users = await User.find({}, 'name email role balance status createdAt lastLogin networkEnabled').sort({ createdAt: -1 });

        // FIX: Map _id to id for Frontend Compatibility
        const safeUsers = users.map(user => ({
            id: user._id.toString(), // CRITICAL FIX
            name: user.name,
            email: user.email,
            role: user.role,
            balance: user.balance,
            status: user.status,
            createdAt: user.createdAt,
            lastLogin: user.lastLogin,
            networkEnabled: user.networkEnabled // NEW
        }));

        res.json(safeUsers);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// NEW: Financial Stats Endpoint (Banking Standard)
app.get('/api/admin/finance/stats', async (req, res) => {
    try {
        await connectDB();
        const { startDate, endDate } = req.query;

        // 1. Ledger Aggregation (Flows)
        const matchStage = {};
        if (startDate && endDate) {
            matchStage.timestamp = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const flowStats = await BeastLedger.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: "$action",
                    totalAmount: { $sum: "$amount" },
                    count: { $sum: 1 }
                }
            }
        ]);

        // Process Ledger Stats
        let stats = {
            ggr: 0, // Gross Gaming Revenue (Total Wagers)
            payouts: 0,
            deposits: 0,
            withdrawals: 0,
            ngr: 0, // Net Gaming Revenue (House Profit)
            netCashFlow: 0 // Liquidity
        };

        flowStats.forEach(s => {
            const amt = s.totalAmount; // Wager/Withdraw is negative, Deposit/Payout positive
            if (s._id === 'WAGER') stats.ggr += Math.abs(amt);
            if (s._id === 'PAYOUT') stats.payouts += amt;
            if (s._id === 'DEPOSIT') stats.deposits += amt;
            if (s._id === 'WITHDRAW') stats.withdrawals += Math.abs(amt); // Tracking outflow volume
        });

        stats.ngr = stats.ggr - stats.payouts;
        stats.netCashFlow = stats.deposits - stats.withdrawals;

        // 2. User Liability Aggregation (Snapshot of NOW)
        // System Liability = Sum of all user balances (Float)
        const liabilityStats = await User.aggregate([
            {
                $group: {
                    _id: null,
                    totalLiability: { $sum: "$balance" },
                    userCount: { $sum: 1 }
                }
            }
        ]);

        const totalLiability = liabilityStats[0] ? liabilityStats[0].totalLiability : 0;

        res.json({
            metrics: stats,
            liability: totalLiability,
            timestamp: new Date()
        });

    } catch (e) {
        console.error("Finance Stats Error:", e);
        res.status(500).json({ error: e.message });
    }
});

// ==========================================
// D. RISK MANAGEMENT ROUTES (NEW)
// ==========================================

// 1. Get Global Wager Limits
app.get('/api/config/limits', async (req, res) => {
    try {
        await connectDB();
        const limits = await riskService.getLimits();
        res.json(limits);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});



// 2. Set Global Wager Limits (Protected)
app.post('/api/config/limits', async (req, res) => {
    try {
        await connectDB();
        const { limits, pin } = req.body;

        // Simple PIN Check (Hardcoded for now as per app standard '198312')
        if (pin !== '198312') return res.status(403).json({ error: 'Invalid Admin PIN' });

        const updated = await riskService.setLimits(limits, 'ADMIN');

        // Audit
        await logSystemAudit({
            action: 'RISK_LIMITS_UPDATE',
            user: 'ADMIN',
            details: 'Updated Global Wager Limits',
            metadata: { limits }
        });

        res.json({ success: true, limits: updated.value });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 3. Validate Risk for Ticket Generation
app.post('/api/risk/validate', async (req, res) => {
    try {
        await connectDB();
        const ticketPayload = req.body;

        // Validate
        const result = await riskService.validatePlays(ticketPayload);

        res.json(result);
    } catch (e) {
        console.error("Risk Validation Error:", e);
        res.status(500).json({ error: e.message });
    }
});


app.get('/api/admin/ledger', async (req, res) => {
    try {
        await connectDB();

        const { startDate, endDate, type, userId, limit, sortBy, order } = req.query;
        const query = {};

        // Filters
        // Filters
        if (startDate && endDate) {
            // FIX: Ensure End Date covers the full day (23:59:59.999)
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);

            query.timestamp = { $gte: start, $lte: end };
        }
        if (type && type !== 'ALL') {
            // Support comma separated types if needed, but simple for now
            if (type.includes(',')) {
                query.action = { $in: type.split(',') };
            } else {
                query.action = type;
            }
        }
        if (userId) {
            query.userId = userId;
        }

        const limitVal = parseInt(limit) || 200;
        const sortField = sortBy || 'index';
        const sortOrder = order === 'asc' ? 1 : -1;

        // Return latest ledger entries
        const ledger = await BeastLedger.find(query).sort({ [sortField]: sortOrder }).limit(limitVal);
        res.json(ledger);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
// Replaces the old /api/tickets logic for SECURE creation
app.post('/api/tickets', async (req, res) => {
    await connectDB();
    const session = await mongoose.startSession();
    try {
        const ticketData = req.body;

        // --- 0. CHECK CLOSING TIME & RESULTS ---
        const timeCheck = await riskService.validateTime(ticketData);
        if (!timeCheck.allowed) {
            console.log(`⛔ Ticket Rejected (Time/Result): ${timeCheck.reason}`);
            return res.status(403).json({ error: timeCheck.reason, code: 'MARKET_CLOSED' });
        }

        // --- 1. ROBUST IDENTITY CHECK (MODULE 2) ---
        let userId = ticketData.userId;
        const requestedId = userId; // Keep original for logs

        // A. Sanitize
        if (userId && typeof userId === 'string') {
            userId = userId.trim();
        }

        console.log(`🔒 PROCESSING TICKET ${ticketData.ticketNumber}`);
        console.log(`   > Incoming UserID: '${requestedId}'`);
        console.log(`   > Ticket Total: ${ticketData.grandTotal}`);

        // B. Validate User Existence
        let userUser = null;
        let isGuest = false;

        if (!userId || userId === 'guest-session') {
            console.warn("⚠️ Ticket has no valid UserID. Marking as GUEST.");
            userId = 'guest-session';
            isGuest = true;
        } else {
            // Check DB
            userUser = await User.findById(userId);

            if (!userUser) {
                console.error(`❌ CRITICAL: User ID '${userId}' NOT found in DB.`);

                // C. Auto-Recovery Strategy
                if (ticketData.userEmail) {
                    console.log(`   > Attempting recovery via Email: ${ticketData.userEmail} ...`);
                    userUser = await User.findOne({ email: ticketData.userEmail });
                    if (userUser) {
                        console.log(`   > ✅ RECOVERED! Found user ${userUser._id} for email.`);
                        userId = userUser._id.toString();
                    } else {
                        console.log("   > ❌ Recovery failed. Email also not found.");
                    }
                }
            }
        }

        // Final Security Gate
        if (!isGuest && !userUser) {
            // Decide: Reject or Fallback?
            // Prompt says: "Intentar autocorrección... o asignar a cuenta Incidencias"
            // For now, if we can't find the user, we MUST NOT credit/debit a ghost.
            // We fallback to guest-session to save the ticket data at least, but we flag it.
            console.warn("⚠️ Fallback: Forcing 'guest-session' to preserve ticket data.");
            userId = 'guest-session';
            isGuest = true;
        }

        // Inject sanitized ID back into data for saving
        ticketData.userId = userId;
        // FIX: Populate legacy ticketId to match ticketNumber (Satisfy Unique Index)
        ticketData.ticketId = ticketData.ticketNumber;

        // 2. Ledger Transaction (STRICT MODE)
        let ledgerSuccess = false;

        if (!isGuest && userId !== 'guest-session') {
            const cost = ticketData.grandTotal;

            if (cost > 0) {
                try {
                    await ledgerService.addToLedger({
                        action: 'WAGER',
                        userId: userId,
                        amount: -Math.abs(cost),
                        referenceId: ticketData.ticketNumber || 'TICKET-' + Date.now(),
                        description: `Ticket Purchase #${ticketData.ticketNumber}`
                    });
                    ledgerSuccess = true;

                    // AUDIT LOG (WAGER)
                    await logSystemAudit({
                        action: 'FINANCE_WAGER',
                        user: userId,
                        amount: -Math.abs(cost),
                        details: `Ticket Purchase #${ticketData.ticketNumber}`,
                        referenceId: ticketData.ticketNumber,
                        targetId: ticketData.ticketNumber
                    });

                } catch (ledgerError) {
                    // D. Precision Error Handling
                    console.error("   > ❌ Ledger Error:", ledgerError.message);
                    if (ledgerError.message.includes('Insufficient') || ledgerError.message.includes('funds')) {
                        return res.status(402).json({
                            message: 'Insufficient funds',
                            code: 'INSUFFICIENT_FUNDS',
                            silent: ticketData.silent
                        });
                    }
                    throw ledgerError; // Re-throw other errors to catch block
                }
            }
        }

        // 2. Save Ticket to 'tickets' Collection
        // We removed image saving for DB optimization earlier, ensuring logic persists
        const newTicket = new Ticket(ticketData);
        await newTicket.save();

        // 3. Save Individual Plays to 'jugadas' Collection
        if (ticketData.plays && Array.isArray(ticketData.plays)) {
            const jugadaDocs = ticketData.plays.map(play => ({
                ticketNumber: ticketData.ticketNumber,
                transactionDateTime: ticketData.transactionDateTime,
                betDates: Array.isArray(ticketData.betDates) ? ticketData.betDates.join(',') : ticketData.betDates,
                tracks: Array.isArray(ticketData.tracks) ? ticketData.tracks.join(',') : ticketData.tracks,
                betNumber: play.betNumber,
                gameMode: play.gameMode,
                straight: play.straightAmount || 0,
                box: play.boxAmount || 0,
                combo: play.comboAmount || 0,
                total: play.totalAmount || 0,
                paymentMethod: ledgerSuccess ? 'Balance' : 'Pending/Guest',
                jugadaNumber: play.jugadaNumber ? String(play.jugadaNumber) : `${ticketData.ticketNumber}-${Math.floor(Math.random() * 1000)}`,
                userId: userId
            }));

            await Jugada.insertMany(jugadaDocs);
            console.log(`✅ Saved ${jugadaDocs.length} Jugadas for Ticket ${ticketData.ticketNumber}`);
        }

        console.log(`✅ Ticket ${ticketData.ticketNumber} saved.`);
        res.status(201).json({ message: 'Ticket saved.', ticketId: ticketData.ticketNumber, ledgerSuccess });

    } catch (error) {
        // --- SILENT POLLING HANDLER ---
        console.log(`🔎 Silent Check: ${req.body.silent}, Error: ${error.message}`);
        if (req.body.silent && (error.message.includes('funds') || error.message.includes('Insufficient'))) {
            return res.status(200).json({
                success: false,
                silent: true,
                message: 'Insufficient funds (Silent Check)',
                code: 'INSUFFICIENT_FUNDS'
            });
        }
        console.error('Error processing ticket:', error);
        res.status(400).json({ message: error.message || 'Transaction failed' });
    } finally {
        session.endSession();
    }
});

// D. PAYMENT ROUTES (BTCPay)
app.post('/api/payment/invoice', async (req, res) => {
    try {
        await connectDB();
        const { amount, currency, orderId, buyerEmail } = req.body;

        // Default values for quick testing
        const finalAmount = amount || 10.00;
        const finalCurrency = currency || 'USD';

        const invoice = await ledgerService.createPaymentInvoice ?
            await ledgerService.createPaymentInvoice(finalAmount, finalCurrency) : // If ledger handles it
            await require('./services/paymentService').createInvoice(
                finalAmount,
                finalCurrency,
                orderId || `ORDER-${Date.now()}`,
                buyerEmail || 'test@example.com'
            );

        res.json(invoice);
    } catch (e) {
        console.error("Invoice Error:", e.message);
        // DEBUGGING: Check if env vars are present
        if (!process.env.BTCPAY_URL) console.error("DEBUG: BTCPAY_URL is missing");
        if (!process.env.BTCPAY_API_KEY) console.error("DEBUG: BTCPAY_API_KEY is missing");

        const details = e.response ? e.response.data : e.message;
        res.status(500).json({
            error: "Payment generation failed",
            debug_env: process.env.BTCPAY_URL ? 'URL_OK' : 'URL_MISSING',
            details: details
        });
    }
});

app.post('/api/payment/shopify-status', async (req, res) => {
    try {
        await connectDB();
        const { id } = req.body;
        const shopifyService = require('./services/shopifyService');
        const draftOrder = await shopifyService.checkDraftOrder(id);

        if (!draftOrder) {
            return res.status(404).json({ error: "Order not found" });
        }

        let status = draftOrder.status; // 'open', 'invoice_sent', 'completed'
        console.log(`🔎 Shopify Status Check: ${id} -> ${status}`); // DEBUG LOG

        if (status === 'completed' || status === 'paid') {
            // AUTO-CREDIT LOGIC (Idempotent)
            // Ideally we check if we already credited this specific Shopify Order
            const referenceId = `SHOPIFY-${draftOrder.id}`;
            const existing = await BeastLedger.findOne({ referenceId });

            if (!existing) {
                console.log("💰 New Payment Detected! Processing credit..."); // DEBUG LOG
                // Find User from attributes or body? The draft order has custom attributes.
                const userIdAttr = draftOrder.note_attributes.find(a => a.name === 'userId');
                const userId = userIdAttr ? userIdAttr.value : 'guest-session';
                console.log(`👤 Identifying User: ${userId}`); // DEBUG LOG

                if (userId !== 'guest-session') {
                    await ledgerService.addToLedger({
                        action: 'DEPOSIT',
                        userId: userId,
                        amount: parseFloat(draftOrder.total_price),
                        referenceId: referenceId,
                        description: `Shopify Auto-Deposit #${draftOrder.order_id || draftOrder.id}`
                    });

                    await logSystemAudit({
                        action: 'FINANCE_DEPOSIT_SHOPIFY',
                        user: userId,
                        amount: parseFloat(draftOrder.total_price),
                        details: `Shopify Auto-Deposit #${draftOrder.name}`,
                        referenceId: referenceId,
                        targetId: draftOrder.id
                    });
                    console.log(`✅ Shopify Auto-Credit Success: ${userId}`);
                }
            }
        }

        res.json({ status: status, order: draftOrder });

    } catch (e) {
        console.error("Shopify Status Error:", e.message);
        res.status(500).json({ error: e.message });
    }
});

// MANUAL CLAIM ROUTE (For Localhost/Backup)
app.post('/api/payment/claim', async (req, res) => {
    try {
        await connectDB();
        const { invoiceId, orderId } = req.body;
        console.log(`🕵️ Manual Claim for Invoice: ${invoiceId}`);

        // 0. IDEMPOTENCY CHECK (Prevent Double Credit)
        const referenceId = `CLAIM-${invoiceId}`;
        const existingTx = await require('./models/BeastLedger').findOne({ referenceId });

        if (existingTx) {
            console.log(`⚠️ Invoice ${invoiceId} already processed (Block #${existingTx.index}). Returning success.`);
            return res.json({ success: true, status: 'Settled', alreadyProcessed: true });
        }

        // 1. Fetch Invoice from BTCPay
        const invoice = await require('./services/paymentService').getInvoice(invoiceId);

        // 2. Check Status (New/Paid/Settled)
        // For 'New' status, we might accept it if it has been paid but not confirmed ("paidAmount" >= "amount")
        // Or strictly Settled. For demo speed, we might accept "Paid".
        const status = invoice.status; // 'New', 'Paid', 'Confirmed', 'Complete', 'Expired', 'Invalid'

        console.log(`📄 Invoice Status: ${status}`);

        if (status === 'Settled' || status === 'Complete' || status === 'Confirmed' || status === 'Paid' || status === 'Processing') {
            // 3. Credit User

            // FOR THIS FIX: We'll credit the Guest ID or the User ID passed in body.
            const targetUserId = req.body.userId || 'guest-session';

            // FIX: If guest, simply acknowledge success without db lookup
            if (targetUserId === 'guest-session') {
                console.log(`💰 Guest Claim Successful (No Ledger) - Invoice #${invoiceId}`);
                return res.json({ success: true, status: status, guest: true });
            }

            await ledgerService.addToLedger({
                action: 'DEPOSIT',
                userId: targetUserId,
                amount: parseFloat(invoice.amount),
                referenceId: referenceId,
                description: `BTCPay Deposit #${invoiceId}`
            });

            // AUDIT LOG
            await logSystemAudit({
                action: 'FINANCE_DEPOSIT_BTC',
                user: targetUserId,
                amount: parseFloat(invoice.amount),
                details: `Deposited $${parseFloat(invoice.amount)} via BTCPay`,
                referenceId: referenceId,
                targetId: invoiceId,
                metadata: { provider: 'BTCPay', invoiceId }
            });

            console.log(`💰 Claim Successful! Credited ${invoice.amount} to ${targetUserId}`);
            return res.json({ success: true, status: status });
        } else {
            return res.status(400).json({ success: false, status: status, message: 'Invoice not paid/settled yet.' });
        }

        // ... existing endpoint code ...
    } catch (e) {
        console.error("Claim Error:", e);
        res.status(500).json({ error: e.message });
    }
});

// SHOPIFY PAYMENT INIT
app.post('/api/payment/shopify', async (req, res) => {
    try {
        await connectDB();
        const { amount, userId, email } = req.body;
        console.log(`🛍️ Shopify Deposit requested: $${amount} for ${userId} (${email})`);

        const shopifyService = require('./services/shopifyService');
        const paymentInfo = await shopifyService.createDepositLink(amount, userId, email);

        console.log("✅ Shopify Draft Order Created:", paymentInfo.id);
        res.json({ success: true, checkoutUrl: paymentInfo.checkoutUrl, id: paymentInfo.id });

    } catch (error) {
        console.error("Shopify Init Error:", error);
        res.status(500).json({ error: error.message || "Failed to create Shopify checkout link" });
    }
});

// SHOPIFY STATUS POLL (For Localhost/UX)
app.post('/api/payment/shopify-status', async (req, res) => {
    try {
        await connectDB();
        const { id, userId } = req.body; // id is Draft Order ID

        // 0. IDEMPOTENCY CHECK
        const referenceId = `SHOPIFY-${id}`;
        const existingTx = await require('./models/BeastLedger').findOne({ referenceId });
        if (existingTx) {
            return res.json({ success: true, status: 'completed', alreadyProcessed: true });
        }

        // 1. Check Shopify
        const shopifyService = require('./services/shopifyService');
        const draftOrder = await shopifyService.checkDraftOrder(id);

        if (!draftOrder) return res.status(404).json({ error: "Order not found" });

        console.log(`🔎 Poll Shopify #${id}: Status=${draftOrder.status}`);

        // 2. Settlement Logic
        if (draftOrder.status === 'completed') {
            // Credit User
            const amount = parseFloat(draftOrder.total_price);
            await ledgerService.addToLedger({
                action: 'DEPOSIT',
                userId: userId,
                amount: amount,
                referenceId: referenceId,
                description: `Shopify Deposit #${id}`
            });

            // AUDIT LOG
            await logSystemAudit({
                action: 'FINANCE_DEPOSIT_SHOPIFY',
                user: userId,
                amount: amount,
                details: `Deposited $${amount} via Shopify`,
                referenceId: referenceId,
                targetId: id.toString(),
                metadata: { provider: 'Shopify', draftOrderId: id }
            });

            console.log(`💰 Shopify Poll Credited: $${amount} to ${userId}`);
            return res.json({ success: true, status: 'completed' });
        } else {
            return res.json({ success: false, status: draftOrder.status });
        }

    } catch (e) {
        console.error("Shopify Poll Error:", e);
        res.status(500).json({ error: e.message });
    }
});

// PAYPAL ROUTES
app.post('/api/payment/paypal/create-order', async (req, res) => {
    try {
        const { amount } = req.body;
        console.log(`🅿️ PayPal Order Create: $${amount}`);
        const order = await require('./services/paypalService').createOrder(amount);
        res.json({ id: order.id });
    } catch (e) {
        console.error("PayPal Create Error:", e.message);
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/payment/paypal/capture-order', async (req, res) => {
    try {
        await connectDB();
        const { orderId, userId } = req.body;
        console.log(`🅿️ PayPal Capture: ${orderId} for User ${userId}`);

        // 1. Capture at PayPal
        const captureData = await require('./services/paypalService').captureOrder(orderId);

        // 2. Verify Success
        const captureStatus = captureData.status; // 'COMPLETED'
        if (captureStatus === 'COMPLETED') {
            const amount = parseFloat(captureData.purchase_units[0].payments.captures[0].amount.value);

            // 3. Credit Ledger
            const referenceId = `PAYPAL-${orderId}`;
            // Idempotency check handled by ledgerService unique index on referenceId usually, 
            // but manual check is safer if service doesn't enforce it strictly yet.
            const existingTx = await require('./models/BeastLedger').findOne({ referenceId });
            if (existingTx) {
                return res.json({ success: true, status: 'COMPLETED', alreadyProcessed: true });
            }

            await ledgerService.addToLedger({
                action: 'DEPOSIT',
                userId: userId,
                amount: amount,
                referenceId: referenceId,
                description: `PayPal Deposit #${orderId}`
            });

            // 4. Audit Log
            await logSystemAudit({
                action: 'FINANCE_DEPOSIT_PAYPAL',
                user: userId,
                amount: amount,
                details: `Deposited $${amount} via PayPal`,
                referenceId: referenceId,
                targetId: orderId,
                metadata: { provider: 'PayPal', orderId }
            });

            console.log(`💰 PayPal Credited: $${amount} to ${userId}`);
            res.json({ success: true, status: 'COMPLETED' });
        } else {
            console.warn(`PayPal Capture Status: ${captureStatus}`);
            res.status(400).json({ error: "Payment not completed", status: captureStatus });
        }
    } catch (e) {
        console.error("PayPal Capture Error:", e);
        res.status(500).json({ error: e.message });
    }
});


app.post('/api/payment/webhook', async (req, res) => {
    await connectDB();
    // Verify Signature
    const signature = req.headers['btcpay-sig'];
    const isValid = require('./services/paymentService').verifyWebhook(req.body, signature);

    if (!isValid) {
        console.warn("⚠️ Invalid Webhook Signature");
        return res.status(401).send('Invalid Signature');
    }

    const event = req.body;
    console.log(`📩 Webhook: ${event.type} for Invoice: ${event.invoiceId}`);

    // Handle 'InvoiceReceivedPayment' (0-Conf Instant) OR 'InvoiceSettled' (Confirmed)
    // We listen to "ReceivedPayment" for speed. The ledgerService should handle duplicate referenceIds if you implemented idempotency,
    // or we can blindly trust it here for the MVP.
    if (event.type === 'InvoiceReceivedPayment' || event.type === 'InvoiceSettled') {
        const invoiceId = event.invoiceId;
        console.log(`💰 Payment Detected (${event.type})! Crediting user...`);

        try {
            // 1. Fetch Invoice to get Metadata (User ID)
            const invoice = await require('./services/paymentService').getInvoice(invoiceId);
            const userId = invoice.metadata.userId || 'guest-session'; // Fallback

            if (userId !== 'guest-session') {
                // 2. Add to Ledger (Idempotency handled by unique referenceId usually, but let's be safe)
                // We use a unique ref based on the event or invoice to prevent double credit if we handle both events.
                // Ideally only CREDIT on 'InvoiceSettled' or 'Confirmed'.
                // For SPEED (User req), we credit on 'ReceivedPayment' (0-conf).
                // We verify if already credited.

                const referenceId = `BTCPAY-AUTO-${invoiceId}`;
                const existing = await BeastLedger.findOne({ referenceId });

                if (!existing) {
                    const block = await ledgerService.addToLedger({
                        action: 'DEPOSIT',
                        userId: userId,
                        amount: parseFloat(invoice.amount),
                        referenceId: referenceId,
                        description: `BTCPay Auto Deposit #${invoiceId}`
                    });

                    // 3. Audit Log
                    await logSystemAudit({
                        action: 'FINANCE_DEPOSIT_BTC_AUTO',
                        user: userId,
                        amount: parseFloat(invoice.amount),
                        details: `Auto-Deposit via BTCPay (${event.type})`,
                        referenceId: block.hash,
                        targetId: invoiceId,
                        metadata: { provider: 'BTCPay', invoiceId, event: event.type }
                    });
                    console.log(`✅ Auto-Credit Success for ${userId}`);
                } else {
                    console.log(`⚠️ Invoice ${invoiceId} already processed. Skipping.`);
                }
            }
        } catch (err) {
            console.error(`❌ Webhook Auto-Credit Error: ${err.message}`);
        }
    }

    res.status(200).send('OK');
});

// E. LEDGER AUDIT
app.get('/api/ledger/verify', async (req, res) => {
    await connectDB();
    const result = await ledgerService.verifyIntegrity();
    res.json(result);
});

// ==========================================
// SNIPER STRATEGY (OLD ROUTES)
// ==========================================

app.post('/api/data/sync', async (req, res) => {
    try {
        await connectDB();
        const { userId, records } = req.body;
        if (!records || !Array.isArray(records)) return res.status(400).json({ error: 'Invalid payload' });

        const bulkOps = records.map(record => ({
            updateOne: {
                filter: { id: record.id },
                update: { $set: { ...record, userId: userId || 'default' } },
                upsert: true
            }
        }));
        if (bulkOps.length > 0) await Track.bulkWrite(bulkOps);
        res.json({ success: true, count: bulkOps.length });
    } catch (e) {
        console.error("Sync Error:", e);
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/data', async (req, res) => {
    try {
        await connectDB();
        const { userId, limit } = req.query;
        const data = await Track.find({ userId: userId || 'default' }).sort({ date: -1, time: -1 }).limit(parseInt(limit) || 1000);
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/data/search', async (req, res) => {
    try {
        await connectDB();
        const { query, limit } = req.body;
        const results = await Track.find(query || {}).sort({ date: -1, time: -1 }).limit(limit || 100);
        res.json(results);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/data/search', async (req, res) => {
    try {
        await connectDB();
        const { startDate, endDate, lottery, userId } = req.query;
        let query = { userId: userId || 'default' };
        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setUTCHours(23, 59, 59, 999);
                query.date.$lte = end;
            }
        }
        if (lottery && lottery !== 'ALL') query.lottery = new RegExp(lottery, 'i');
        const results = await Track.find(query).sort({ date: -1, time: -1 }).limit(1000);
        res.json(results);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/data/entry', async (req, res) => {
    try {
        await connectDB();
        const entry = req.body;
        if (!entry.id) return res.status(400).json({ error: 'ID required' });
        await Track.updateOne({ id: entry.id }, { $set: entry }, { upsert: true });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/data/:id', async (req, res) => {
    try {
        await connectDB();
        await Track.updateOne({ id: req.params.id }, { $set: req.body });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/data/:id', async (req, res) => {
    try {
        await connectDB();
        await Track.deleteOne({ id: req.params.id });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Admin DB Viewer
app.get('/ver-db', async (req, res) => {
    try {
        await connectDB();
        const tickets = await Ticket.find({}).sort({ createdAt: -1 }).limit(50).lean();
        const results = await LotteryResult.find({}).sort({ createdAt: -1 }).limit(50).lean(); // Fixed results
        const users = await User.find({}).lean();
        const ledger = await BeastLedger.find({}).sort({ index: -1 }).limit(50).lean();

        let html = `
        <html><body style="background:#111; color:#eee; font-family:monospace; padding:20px;">
        <h1 style="color:#00ff00">Admin DB Viewer (Ledger Enabled)</h1>
        <p>Status: <strong>${mongoose.connection.readyState === 1 ? 'Connected ✅' : 'Disconnected ❌'}</strong></p>
        <hr style="border-color:#333"/>
        
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">
            <div>
                <h2>Ledger (Latest 50 Blocks)</h2>
                <div style="background:#222; padding:10px; border-radius:5px; overflow:auto; max-height:400px;">
                    <pre>${JSON.stringify(ledger, null, 2)}</pre>
                </div>
            </div>
            <div>
                 <h2>Users</h2>
                <div style="background:#222; padding:10px; border-radius:5px; overflow:auto; max-height:400px;">
                    <pre>${JSON.stringify(users, null, 2)}</pre>
                </div>
            </div>
        </div>

        <h2>Last 50 Tickets</h2>
        <div style="background:#222; padding:10px; border-radius:5px; overflow:auto; max-height:400px;">
            <pre>${JSON.stringify(tickets, null, 2)}</pre>
        </div>
        </body></html>`;
        res.send(html);
    } catch (e) { res.status(500).send(e.message); }
});

// ==========================================
// 5. STATIC FILES (REACT APP)
// ==========================================
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
    console.log(`✅ Serving static files from: ${distPath}`);
    app.use(express.static(distPath, {
        index: false,
        setHeaders: (res, filePath) => {
            if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
    }));
} else {
    console.error(`❌ CRITICAL: 'dist' directory not found.`);
}

// 6. CATCH-ALL
app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) return res.status(404).json({ error: 'API endpoint not found' });
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.sendFile(indexPath);
    } else {
        res.status(500).send('Application build not found.');
    }
});

module.exports = app;

if (require.main === module) {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server listening on port ${PORT} (0.0.0.0)`);
    });
}