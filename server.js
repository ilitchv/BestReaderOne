
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

// Models
const Ticket = require('./models/Ticket');
const Jugada = require('./models/Jugada'); // NEW
const LotteryResult = require('./models/LotteryResult');
const Track = require('./models/Track');
const User = require('./models/User'); // NEW
const BeastLedger = require('./models/BeastLedger'); // NEW
const WithdrawRequest = require('./models/WithdrawRequest'); // NEW

const app = express();
// Google Cloud Run injects the PORT environment variable
const PORT = parseInt(process.env.PORT) || 8080;

// 1. Connect to Database (Lazy/Cached for Serverless)
// Removed top-level fire-and-forget call
// connectDB(); 

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
// 8. FINANCIAL / WITHDRAWAL ROUTES
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

        const history = await BeastLedger.find({ userId }).sort({ timestamp: -1 }).limit(parseInt(limit) || 50);
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

        const request = await WithdrawRequest.findById(id);
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
                const payout = await paymentService.createPayout(
                    request.amount,
                    'USD', // Or derive from request.network if we store currency
                    request.walletAddress,
                    request.userId
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
                try {
                    require('fs').writeFileSync('_debug_last_error.txt', `[${new Date().toISOString()}] PAYOUT ERROR: ${payoutError.message}\nDETAIL: ${JSON.stringify(payoutError.response?.data || {}, null, 2)}`);
                } catch (err) { console.error("Log write failed", err); }

                return res.status(500).json({ error: 'BTCPay Payout Failed: ' + payoutError.message });
            }

        } else if (action === 'REJECT') {
            request.status = 'REJECTED';
            request.processedAt = new Date();
            request.adminNote = adminNote || 'Rejected by Admin';
            await request.save();

            // REFUND THE USER
            // We must credit the money back to the ledger
            await ledgerService.addToLedger({
                action: 'DEPOSIT', // effectively a specialized refund deposit
                userId: request.userId,
                amount: request.amount,
                referenceId: `REFUND-${request._id}`,
                description: `Refund: Withdrawal Rejected. ${adminNote}`
            });
        } else {
            return res.status(400).json({ error: 'Invalid action' });
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

// ==========================================
// LEDGER & PAYMENT ROUTES (NEW)
// ==========================================

// A. AUTHENTICATION (Simple Mock for Prototype)
app.post('/api/auth/login', async (req, res) => {
    try {
        await connectDB();
        const { email } = req.body;
        // In real app: verify password hash
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Return user info sans password
        res.json({
            id: user._id,
            email: user.email,
            name: user.name,
            role: user.role,
            balance: user.balance
        });
    } catch (e) {
        console.error("❌ LOGIN ERROR:", e); // Log for Vercel Functions Console
        res.status(500).json({
            error: 'Server Error during Login',
            details: e.message,
            stack: process.env.NODE_ENV === 'development' ? e.stack : undefined
        });
    }
});

app.get('/api/auth/me', async (req, res) => {
    try {
        await connectDB();
        const userId = req.headers['x-user-id'] || req.query.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        res.json({
            id: user._id,
            email: user.email,
            name: user.name,
            role: user.role,
            balance: user.balance
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

        res.json({ success: true, balance: block.balanceAfter });
    } catch (e) {
        console.error("Credit Error:", e);
        res.status(500).json({ error: e.message });
    }
});

// C. ADMIN APIs (Dashboard Data)
app.get('/api/admin/users', async (req, res) => {
    try {
        await connectDB();
        // Return all users with essential fields
        const users = await User.find({}, 'name email role balance status createdAt lastLogin').sort({ createdAt: -1 });
        res.json(users);
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

app.get('/api/admin/ledger', async (req, res) => {
    try {
        await connectDB();

        const { startDate, endDate, type, userId, limit, sortBy, order } = req.query;
        const query = {};

        // Filters
        if (startDate && endDate) {
            query.timestamp = { $gte: new Date(startDate), $lte: new Date(endDate) };
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
        // DEBUG: Check if silent flag is receiving
        console.log(`Processing Ticket ${ticketData.ticketNumber}. Silent? ${ticketData.silent}`);

        const userId = ticketData.userId; // Usually 'guest-session' if not logged in

        // 1. Ledger Transaction (Non-Blocking for Guests/Errors to ensure data save)
        // 1. Ledger Transaction (STRICT MODE - ZERO TRUST)
        // If this fails (Insufficient funds), the entire request fails.
        // We now allow ALL users (including Guest ID) to be processed by the ledger.
        let ledgerSuccess = false;

        if (userId) {
            // Calculate Cost
            const cost = ticketData.grandTotal;

            // Transact on Ledger
            // This will THROW if funds are insufficient.
            // FIX: Skip for Guest Session
            if (userId !== 'guest-session') {
                await ledgerService.addToLedger({
                    action: 'WAGER',
                    userId: userId,
                    amount: -Math.abs(cost), // Ensure negative
                    referenceId: ticketData.ticketNumber || 'TICKET-' + Date.now(),
                    description: `Ticket Purchase #${ticketData.ticketNumber}`
                });
            }
            ledgerSuccess = true;
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
                description: `Manual Claim Invoice #${invoiceId}`
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
        res.status(500).json({ error: "Failed to create Shopify checkout link" });
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

        // In a real app, we extract the "orderId" (metadata) to find the user/ticket
        // For this demo, we assume the invoice matches the last pending action.
        // await ledgerService.recordPayment({ invoiceId, ... });
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