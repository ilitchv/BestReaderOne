const mongoose = require('mongoose');
require('dotenv').config();
const firebaseService = require('./services/firebaseService');

async function seedFirebase() {
    console.log("🌱 Seeding Firebase to force collection creation...");

    // 1. Initialize Firebase (Automated in service)

    try {
        // 2. Simulate Result Sync
        console.log("   > Syncing Test Result...");
        await firebaseService.syncToFirestore('results', 'TEST-RESULT-001', {
            resultId: 'TEST-RESULT-001',
            country: 'TEST',
            lotteryName: 'Firebase Verification',
            drawName: 'Test Draw',
            numbers: '12-34',
            drawDate: new Date().toISOString().split('T')[0],
            scrapedAt: new Date()
        });
        console.log("   ✅ Result Synced.");

        // 3. Simulate Ticket Sync
        console.log("   > Syncing Test Ticket...");
        await firebaseService.syncToFirestore('tickets', 'TEST-TICKET-001', {
            ticketNumber: 'TEST-TICKET-001',
            userId: 'test-user-id',
            grandTotal: 10,
            plays: [{ betNumber: '12', amount: 10 }],
            createdAt: new Date()
        });
        console.log("   ✅ Ticket Synced.");

        // 4. Simulate Ledger Sync
        console.log("   > Syncing Test Ledger Block...");
        await firebaseService.syncToFirestore('ledger', 'TEST-HASH-001', {
            index: 999999,
            action: 'TEST_DEPOSIT',
            amount: 100,
            userId: 'test-user-id',
            description: 'Firebase Verification Test',
            timestamp: new Date()
        });
        console.log("   ✅ Ledger Synced.");

        console.log("\n🎉 SUCCESS! Go check your Firebase Console now.");
        console.log("You should see collections: 'results', 'tickets', and 'ledger'.");
        process.exit(0);

    } catch (e) {
        console.error("❌ Seeding Failed:", e);
        process.exit(1);
    }
}

seedFirebase();
