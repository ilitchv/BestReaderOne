
const mongoose = require('mongoose');
require('dotenv').config();

const LotteryResultSchema = new mongoose.Schema({
    lotteryId: String,
    lotteryName: String,
    date: String, // Stored as DD-MM-YY or YYYY-MM-DD? Let's check both or regex
    draw: String, // '10:00 AM' etc
    numbers: String,
    createdAt: { type: Date, default: Date.now }
}, { collection: 'LotteryResults' });

const LotteryResult = mongoose.model('LotteryResult', LotteryResultSchema);

async function checkResults() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to DB");

        // Check for any Instant Cash results for today (Jan 9, 2026)
        // Date format in constants/scrapers is often DD/MM/YYYY or YYYY-MM-DD
        // We'll search broadly for 'Instant Cash'

        console.log("Searching for 'Instant Cash' results...");
        const results = await LotteryResult.find({
            $or: [
                { lotteryName: /Instant Cash/i },
                { lotteryId: 'special/instant-cash' }
            ]
        }).sort({ createdAt: -1 }).limit(20);

        console.log(`Found ${results.length} recent entries.`);
        results.forEach(r => {
            console.log(`- [${r.date}] ID: ${r.lotteryId} | Draw: ${r.draw} | Nums: ${r.numbers} | Created: ${r.createdAt}`);
        });

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await mongoose.disconnect();
    }
}

checkResults();
