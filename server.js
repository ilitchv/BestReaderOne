
console.log("------------------------------------------------");
console.log("🚀 STARTING BEAST READER SERVER (CLOUD RUN MODE)");
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
const LotteryResult = require('./models/LotteryResult');
const Track = require('./models/Track');
const User = require('./models/User'); // NEW
const BeastLedger = require('./models/BeastLedger'); // NEW

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

// DATABASE CONNECTION MIDDLEWARE
// Ensures DB is connected before any route handler runs
app.use(async (req, res, next) => {
    // Skip for static files or non-api
    if (req.path.startsWith('/api')) {
        try {
            await connectDB();
            next();
        } catch (e) {
            console.error("MIDDLEWARE DB ERROR:", e);
            res.status(500).json({ error: 'Database Connection Failed', details: e.message });
        }
    } else {
        next();
    }
});

// Logger Middleware
app.use((req, res, next) => {
    if (!req.url.match(/\.(js|css|png|jpg|ico)$/)) {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    }
    next();
});

// ==========================================
// 4. API ROUTES (PRIORITY #1)
// ==========================================

app.get('/api/health', (req, res) => {
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

// C. TICKET CREATION (LEDGER PROTECTED)
// Replaces the old /api/tickets logic for SECURE creation
app.post('/api/tickets', async (req, res) => {
    const session = await mongoose.startSession();
    try {
        const ticketData = req.body;
        const userId = ticketData.userId;

        if (!userId) return res.status(400).json({ error: 'User ID required for transaction' });

        // 1. Calculate Cost (Server-Side Validation recommended, but using client grandTotal for now)
        const cost = ticketData.grandTotal;

        // 2. Transact on Ledger (Throws if insufficient funds)
        await ledgerService.addToLedger({
            action: 'WAGER',
            userId: userId,
            amount: -Math.abs(cost), // Ensure negative
            referenceId: ticketData.ticketNumber || 'TICKET-' + Date.now(),
            description: `Ticket Purchase #${ticketData.ticketNumber}`
        });

        // 3. Create Ticket (Without Session if Ticket modal doesn't support transactions yet, 
        // ideally we wrap this in the same transaction but ledgerService handles its own for now)
        // We removed image saving for DB optimization earlier, ensuring logic persists
        const newTicket = new Ticket(ticketData);
        await newTicket.save();

        console.log(`✅ Ticket ${ticketData.ticketNumber} saved & Paid.`);
        res.status(201).json({ message: 'Ticket saved and paid.', ticketId: ticketData.ticketNumber });

    } catch (error) {
        console.error('Error processing ticket:', error);
        res.status(400).json({ message: error.message || 'Transaction failed' });
    } finally {
        session.endSession();
    }
});

// D. PAYMENT ROUTES (BTCPay)
app.post('/api/payment/invoice', async (req, res) => {
    try {
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
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/payment/webhook', async (req, res) => {
    // Verify Signature
    const signature = req.headers['btcpay-sig'];
    const isValid = require('./services/paymentService').verifyWebhook(req.body, signature);

    if (!isValid) {
        console.warn("⚠️ Invalid Webhook Signature");
        return res.status(401).send('Invalid Signature');
    }

    const event = req.body;
    console.log(`📩 Webhook: ${event.type} for Invoice: ${event.invoiceId}`);

    // Handle 'InvoiceSettled' -> Credit User
    if (event.type === 'InvoiceSettled') {
        const invoiceId = event.invoiceId;
        // In real flow, we would look up which user created this invoice
        // For now, logging the success.
        console.log("💰 Payment Received! Crediting user...");
        // await ledgerService.addToLedger({...})
    }

    res.status(200).send('OK');
});

// E. LEDGER AUDIT
app.get('/api/ledger/verify', async (req, res) => {
    const result = await ledgerService.verifyIntegrity();
    res.json(result);
});

// ==========================================
// SNIPER STRATEGY (OLD ROUTES)
// ==========================================

app.post('/api/data/sync', async (req, res) => {
    try {
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
        const { userId, limit } = req.query;
        const data = await Track.find({ userId: userId || 'default' }).sort({ date: -1, time: -1 }).limit(parseInt(limit) || 1000);
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/data/search', async (req, res) => {
    try {
        const { query, limit } = req.body;
        const results = await Track.find(query || {}).sort({ date: -1, time: -1 }).limit(limit || 100);
        res.json(results);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/data/search', async (req, res) => {
    try {
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
        const entry = req.body;
        if (!entry.id) return res.status(400).json({ error: 'ID required' });
        await Track.updateOne({ id: entry.id }, { $set: entry }, { upsert: true });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/data/:id', async (req, res) => {
    try {
        await Track.updateOne({ id: req.params.id }, { $set: req.body });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/data/:id', async (req, res) => {
    try {
        await Track.deleteOne({ id: req.params.id });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Admin DB Viewer
app.get('/ver-db', async (req, res) => {
    try {
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