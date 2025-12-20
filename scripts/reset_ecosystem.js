
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Models
const Ticket = require('../models/Ticket');
const Jugada = require('../models/Jugada');
const User = require('../models/User');
const BeastLedger = require('../models/BeastLedger');
const LotteryResult = require('../models/LotteryResult');

// Load env
dotenv.config();
dotenv.config({ path: './backend/.env' });

// CONSTANTS
const GUEST_ID = '507f1f77bcf86cd799439011'; // Valid 24-char Hex ObjectId

const RESET_ALL = async () => {
    try {
        console.log("🔥 STARTING SYSTEM-WIDE RESET (ZERO TRUST MODE) 🔥");

        if (!process.env.MONGODB_URI) {
            throw new Error("MONGODB_URI not found in environment");
        }

        // Connect to DB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("✅ Connected to MongoDB");

        // 1. Wipe Financial Records
        await BeastLedger.deleteMany({});
        console.log("🗑️  Ledger Wiped (0 Blocks)");

        // 2. Wipe Activity Records
        await Ticket.deleteMany({});
        console.log("🗑️  Tickets Wiped");

        await Jugada.deleteMany({});
        console.log("🗑️  Jugadas Wiped");

        // 3. Reset User Balances
        const result = await User.updateMany(
            {},
            { $set: { balance: 0, walletHash: 'RESET_000', pendingBalance: 0 } }
        );
        console.log(`📉 Reset Balances for ${result.matchedCount} users to $0.00`);

        // 4. ENSURE GUEST USER EXISTS WITH VALID OBJECT ID
        let guest = await User.findById(GUEST_ID);
        if (!guest) {
            console.log("👤 Creating Guest User with Valid ObjectId...");
            // If ID doesn't exist, we create it.
            // Note: Mongoose might not let us force _id easily on create if not careful, 
            // but usually passing _id in constructor works.
            guest = new User({
                _id: GUEST_ID,
                name: 'Guest User',
                email: 'guest@session', // Dummy email to satisfy unique constraint
                username: 'guest_user',
                referralCode: 'GUEST-REF-001', // Ensure uniqueness
                password: 'no_password', // Dummy
                role: 'user',
                balance: 0,
                status: 'active'
            });
            await guest.save();
            console.log("✅ Guest User Created:", GUEST_ID);
        } else {
            console.log("👤 Guest User Exists. Ensuring 0 balance.");
            guest.balance = 0;
            guest.walletHash = '0';
            await guest.save();
        }

        console.log("✅ SYSTEM RESET COMPLETE. ALL BALANCES ARE $0.00. LEDGER IS EMPTY.");
        process.exit(0);

    } catch (error) {
        console.error("❌ RESET FAILED:", error);
        process.exit(1);
    }
};

RESET_ALL();
