
const mongoose = require('mongoose');
require('dotenv').config();

async function diagnose() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to DB");

        const LotteryResult = mongoose.connection.db.collection('lotteryresults');

        // 1. Instant Cash Jan 10
        const instant = await LotteryResult.findOne({
            resultId: 'special/instant-cash',
            drawDate: '2026-01-10'
        });

        console.log("\n--- INSTANT CASH (2026-01-10) ---");
        if (instant) {
            const draws = JSON.parse(instant.numbers);
            console.log(`Total Draws: ${draws.length}`);
            const times = draws.map(d => d.time);
            console.log("Last 5 Draws (Newest First):", times.slice(0, 5));
            console.log("Updated At:", instant.updatedAt);
        } else {
            console.log("Document not found");
        }

        // 2. Top Pick Jan 10
        const top = await LotteryResult.findOne({
            resultId: 'special/top-pick',
            drawDate: '2026-01-10'
        });

        console.log("\n--- TOP PICK (2026-01-10) ---");
        if (top) {
            const draws = JSON.parse(top.numbers);
            console.log(`Total Draws: ${draws.length}`);
            const times = draws.map(d => d.time);
            console.log("Last 5 Draws (Newest First):", times.slice(0, 5));
            console.log("Updated At:", top.updatedAt);
        } else {
            console.log("Document not found");
        }

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

diagnose();
