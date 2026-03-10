
const mongoose = require('mongoose');
const ledgerService = require('./services/ledgerService');
const connectDB = require('./database');
const User = require('./models/User');

async function testFix() {
    try {
        await connectDB();
        console.log("Connected to DB...");

        // Find a test user (Ilich)
        const user = await User.findOne({ email: 'ilitchvasquez@gmail.com' });
        if (!user) {
            console.log("User not found, pick another email or ID");
            process.exit(0);
        }

        console.log(`Testing with user: ${user.name} (${user._id})`);

        // Simulate a wager
        const result = await ledgerService.addToLedger({
            action: 'WAGER',
            userId: user._id.toString(),
            amount: 1.00,
            referenceId: 'TEST-FIX-' + Date.now(),
            description: 'Verification Test for Session Fix'
        });

        console.log("✅ SUCCESS! Transaction completed without session mismatch.");
        console.log("New Balance:", result.balanceAfter);

    } catch (err) {
        console.error("❌ FAILED:", err.message);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

testFix();
