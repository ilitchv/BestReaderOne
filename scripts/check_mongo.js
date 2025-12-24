const mongoose = require('mongoose');
const connectDB = require('../database');
const LotteryResult = require('../models/LotteryResult');

async function run() {
    try {
        await connectDB();
        console.log("✅ Custom Script Connected to MongoDB");

        console.log("\n--- SEARCHING FOR SPECIFIC STATES ---");
        // MA, VA, NC, MI (Night?), DE (Day?), TN (Evening?)
        const patterns = ['usa/ma', 'usa/va', 'usa/nc', 'usa/mi', 'usa/de', 'usa/tn', 'usa/ct'];

        for (const p of patterns) {
            console.log(`\nChecking pattern: ${p} ...`);
            // Get ALL distinct IDs for this pattern
            const results = await LotteryResult.find({ resultId: { $regex: p } }).select('resultId').limit(100);
            const uniqueIds = [...new Set(results.map(r => r.resultId))];

            if (uniqueIds.length === 0) {
                console.log(`  ❌ No results found for ${p}`);
            } else {
                uniqueIds.sort().forEach(uid => console.log(`  FOUND: ${uid}`));
            }
        }

    } catch (error) {
        console.error("Script Error:", error);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
}

run();
