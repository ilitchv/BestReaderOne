const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/User');
const Ticket = require('../models/Ticket');
const BeastLedger = require('../models/BeastLedger');
const AuditLog = require('../models/AuditLog');
const connectDB = require('../database');

// MOCK: We need to mock the ledgerService if we are running this script standalone 
// OR we can just use the actual API if the server is running.
// BUT, to "whitebox" test the DB logic, I will use a direct DB insertion test similar to the API logic,
// OR better yet, I will simulate the API call logic directly in this script to test the INTEGRATION.

// Actually, the server logic is in `server.js`. I can't easily import `app` to test via supertest without exporting it.
// So I will REPLICATE the logic to verify the MODELS and CONNECTION are working.
// Wait, the user wants me to verify the "System".
// If the server is running (I can assume it might be or I can try to hit it via fetch if I knew the port), 
// but usually environment is local files.
// Best approach: "Fire Test" script that:
// 1. Connects to DB.
// 2. Finds Admin.
// 3. Simulates the EXACT code block from server.js (Ledger + Ticket Save).
// 4. Checks results.

const ledgerService = require('../services/ledgerService');

async function runTest() {
    console.log("🔥 STARTING FIRE TEST: DATA PERSISTENCE & INTEGRITY");

    await connectDB();

    // 1. FIND ADMIN
    const admin = await User.findOne({ email: 'admin@beast.com' });
    if (!admin) {
        console.error("❌ Admin user not found. Please ensure seed data exists.");
        process.exit(1);
    }
    console.log(`✅ Admin Identified: ${admin.name} (${admin._id})`);
    console.log(`   Initial Balance: $${admin.balance}`);

    const TICKET_ID = `TEST-FIRE-${Date.now()}`;
    const WAGER_AMOUNT = 1.00;

    // 2. EXECUTE LOGIC (Simulating server.js /api/tickets)
    const session = await mongoose.startSession();
    session.startTransaction();

    let success = false;
    let errorMsg = "";

    try {
        console.log(`🚀 Simulating Ticket Purchase: ${TICKET_ID} ($${WAGER_AMOUNT})`);

        // A. LEDGER TRANSACTION
        await ledgerService.addToLedger({
            action: 'WAGER',
            userId: admin._id.toString(), // Strict String
            amount: -Math.abs(WAGER_AMOUNT),
            referenceId: TICKET_ID,
            description: `FIRE TEST Ticket #${TICKET_ID}`
        });

        // B. AUDIT LOG
        await AuditLog.create({
            action: 'FINANCE_WAGER',
            user: admin._id.toString(),
            amount: -Math.abs(WAGER_AMOUNT),
            details: `FIRE TEST Ticket #${TICKET_ID}`,
            referenceId: TICKET_ID,
            targetId: TICKET_ID
        });

        // C. TICKET SAVE
        const newTicket = new Ticket({
            ticketNumber: TICKET_ID,
            userId: admin._id.toString(),
            transactionDateTime: new Date(),
            betDates: ["2025-12-25"],
            tracks: ["Test Track"],
            grandTotal: WAGER_AMOUNT,
            plays: [{
                betNumber: "123",
                gameMode: "Pick 3",
                straightAmount: 1,
                boxAmount: 0,
                comboAmount: 0,
                totalAmount: 1,
                jugadaNumber: 1
            }],
            ticketImage: "base64mock"
        });
        await newTicket.save({ session });

        await session.commitTransaction();
        success = true;
        console.log("✅ TRANSACTION COMMITTED.");

    } catch (e) {
        await session.abortTransaction();
        console.error("❌ TRANSACTION FAILED:", e.message);
        errorMsg = e.message;
    } finally {
        session.endSession();
    }

    if (!success) {
        console.log("💥 Test Failed during Execution phase.");
        process.exit(1);
    }

    // 3. VERIFICATION PHASE
    console.log("\n🕵️ VERIFYING DATA INTEGRITY...");

    // Check User Balance
    const updatedAdmin = await User.findById(admin._id);
    const balanceDiff = admin.balance - updatedAdmin.balance;
    console.log(`   User Balance: $${admin.balance} -> $${updatedAdmin.balance} (Diff: ${balanceDiff})`);
    if (Math.abs(balanceDiff - WAGER_AMOUNT) < 0.01) console.log("   ✅ Balance Deducted Correctly");
    else console.error("   ❌ Balance Mismatch!");

    // Check Ledger
    const ledgerEntry = await BeastLedger.findOne({ referenceId: TICKET_ID });
    if (ledgerEntry && ledgerEntry.userId === admin._id.toString()) console.log("   ✅ Ledger Entry Found & Linked to User");
    else console.error("   ❌ Ledger Entry Missing or Unlinked!");

    // Check Ticket
    const ticketEntry = await Ticket.findOne({ ticketNumber: TICKET_ID });
    if (ticketEntry && ticketEntry.userId === admin._id.toString()) console.log("   ✅ Ticket Saved & Linked to User");
    else {
        console.error("   ❌ Ticket Missing or Unlinked!");
        if (ticketEntry) console.log("      Found Ticket but userId is:", ticketEntry.userId);
    }

    // Check Audit
    const auditEntry = await AuditLog.findOne({ referenceId: TICKET_ID });
    if (auditEntry) console.log("   ✅ Audit Log Found");
    else console.error("   ❌ Audit Log Missing!");

    console.log("\n🏁 FIRE TEST COMPLETE.");
    process.exit(0);
}

runTest();
