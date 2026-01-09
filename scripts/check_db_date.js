require('dotenv').config();
const mongoose = require('mongoose');
const LotteryResult = require('../models/LotteryResult');

async function checkDate() {
    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sniper_db');
    }

    const state = 'tx';
    const draw = 'Day'; // Texas Day
    const resultId = 'tx/tx_day/Day'; // Need to Verify ID format, usually country/state/draw

    // Let's search broadly first
    console.log("Searching for Texas Day...");
    // Try to find by lotteryName/drawName
    const doc = await LotteryResult.findOne({
        lotteryName: 'Texas',
        drawName: 'Day'
    }).sort({ drawDate: -1 }); // Get latest

    if (doc) {
        console.log("✅ Found Document:");
        console.log(`   ID: ${doc._id}`);
        console.log(`   Draw Date (Raw): ${doc.drawDate} (Type: ${typeof doc.drawDate})`);
        console.log(`   Numbers: ${doc.numbers}`);
        console.log(`   Scraped At: ${doc.scrapedAt}`);
        console.log(`   Result ID: ${doc.resultId}`);
    } else {
        console.log("❌ No document found for Texas Day");
    }

    mongoose.connection.close();
}

checkDate();
