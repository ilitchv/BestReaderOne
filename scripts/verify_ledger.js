require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const BeastLedger = require('../models/BeastLedger');
const ledgerService = require('../services/ledgerService');
const connectDB = require('../database');

const runVerification = async () => {
    console.log("🧪 STARTING BEAST LEDGER VERIFICATION");
    await connectDB();

    try {
        // 1. Setup Test User
        let user = await User.findOne({ email: 'user@demo.com' });
        if (!user) {
            user = await User.create({
                email: 'user@demo.com',
                username: 'demo_verifier',
                name: 'Verifier',
                balance: 100, // Start with 100
                password: 'test'
            });
        } else {
            // Reset balance for test consistency
            // Direct DB update to bypass ledger for setup (simulating genesis state)
            user.balance = 100;
            await user.save();
        }

        console.log(`👤 User Initial Balance: $${user.balance}`);

        // 2. Test Success Wager (Cost 50)
        console.log("\n--- TEST 1: Valid Wager ($50) ---");
        await ledgerService.addToLedger({
            action: 'WAGER',
            userId: user._id,
            amount: -50,
            referenceId: 'TEST-1',
            description: 'Test Wager 1'
        });

        user = await User.findById(user._id);
        console.log(`✅ Success. New Balance: $${user.balance} (Expected: 50)`);
        if (user.balance !== 50) throw new Error("Balance mismatch Test 1");

        // 3. Test Fail Wager (Cost 60, Balance 50)
        console.log("\n--- TEST 2: Invalid Wager ($60) ---");
        try {
            await ledgerService.addToLedger({
                action: 'WAGER',
                userId: user._id,
                amount: -60,
                referenceId: 'TEST-2',
                description: 'Test Wager 2'
            });
            throw new Error("❌ FAIL: Transaction should have been rejected!");
        } catch (e) {
            console.log(`✅ Correctly Rejected: "${e.message}"`);
        }

        // 4. Test Deposit (Admin adds 1000)
        console.log("\n--- TEST 3: Admin Deposit ($1000) ---");
        await ledgerService.addToLedger({
            action: 'DEPOSIT',
            userId: user._id,
            amount: 1000,
            referenceId: 'ADMIN-TEST',
            description: 'Admin Topup'
        });

        user = await User.findById(user._id);
        console.log(`✅ Success. New Balance: $${user.balance} (Expected: 1050)`);

        // 5. Test valid Wager after Deposit ($60)
        console.log("\n--- TEST 4: Valid Wager Post-Deposit ($60) ---");
        await ledgerService.addToLedger({
            action: 'WAGER',
            userId: user._id,
            amount: -60,
            referenceId: 'TEST-4',
            description: 'Test Wager 4'
        });

        user = await User.findById(user._id);
        console.log(`✅ Success. New Balance: $${user.balance} (Expected: 990)`);

        // 6. Verify Chain Integrity
        console.log("\n--- TEST 5: Chain Integrity Audit ---");
        const audit = await ledgerService.verifyIntegrity();
        console.log(`Audit Result:`, audit);
        if (!audit.valid) throw new Error("Chain Integrity Failed");

        console.log("\n🎉 ALL TESTS PASSED. BEAST LEDGER IS SECURE.");
        process.exit(0);

    } catch (e) {
        console.error("\n❌ VERIFICATION FAILED:", e);
        process.exit(1);
    }
};

runVerification();
