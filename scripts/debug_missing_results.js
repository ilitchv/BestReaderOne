
const mongoose = require('mongoose');
const LotteryResult = require('../models/LotteryResult');
const connectDB = require('../database');

async function check() {
    await connectDB();

    const ids = [
        'usa/mi/Evening', // Michigan Night
        'usa/de/Midday',  // Delaware Day
        'usa/tn/Evening', // Tennessee Evening
        'usa/ma/Midday',  // Mass Midday
        'usa/nc/Midday'   // NC Day
    ];

    for (const id of ids) {
        console.log(`\n--- Checking ${id} ---`);
        const results = await LotteryResult.find({ resultId: id })
            .sort({ drawDate: -1 })
            .limit(3);

        if (results.length === 0) {
            console.log("NO RESULTS FOUND.");
        } else {
            results.forEach(r => {
                console.log(`Date: ${r.drawDate}, Numbers: '${r.numbers}', ScrapedAt: ${r.scrapedAt}`);
            });
        }
    }
    process.exit();
}

check();
