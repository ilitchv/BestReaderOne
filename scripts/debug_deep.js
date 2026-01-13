
const mongoose = require('mongoose');
require('dotenv').config();

async function checkAll() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to DB");

        // Access the correct collection 'lotteryresults' (lowercase)
        const LotteryResult = mongoose.connection.db.collection('lotteryresults');

        const count = await LotteryResult.countDocuments();
        console.log("Total docs in 'lotteryresults':", count);

        // Find the specific document for Instant Cash today
        const doc = await LotteryResult.findOne({
            resultId: 'special/instant-cash',
            drawDate: '2026-01-09'
        });

        if (doc) {
            console.log("✅ Found Instant Cash Document for 2026-01-09");
            let draws = [];
            try {
                draws = JSON.parse(doc.numbers);
            } catch (e) {
                console.error("Error parsing JSON:", e.message);
            }

            console.log(`Total Stored Draws: ${draws.length}`);

            // Find 10:00 AM
            // Time format might be "10:00 AM" or "10:00AM" etc.
            const draw10 = draws.find(d => d.time === '10:00 AM' || d.time === '10:00AM');

            if (draw10) {
                console.log("🎉 SUCCESS: 10:00 AM Draw Found:", draw10);
            } else {
                console.log("❌ FAILURE: 10:00 AM Draw MISSING.");
                console.log("First 5 draws:", draws.slice(0, 5));
            }

        } else {
            console.log("❌ Document for 2026-01-09 NOT FOUND.");
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

checkAll();
