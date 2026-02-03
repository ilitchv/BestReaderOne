const mongoose = require('mongoose');
require('dotenv').config();
const Jugada = require('./models/Jugada');
const connectDB = require('./database');

async function checkExposure() {
    await connectDB();

    const betNumber = "1047";
    const gameMode = "Win 4";
    const trackName = "usa/ny/Evening";

    // Get today's date format as used in the app (usually YYYY-MM-DD or similar)
    // The screenshot implies it's for an active game. 
    // Let's look for ANY recent plays for this number.

    console.log(`🔎 Checking exposure for Number: ${betNumber} (${gameMode})...`);

    const plays = await Jugada.find({
        betNumber: betNumber,
        gameMode: gameMode
    });

    console.log(`Found ${plays.length} total plays for ${betNumber} in history.`);

    plays.forEach(p => {
        console.log(`- [${p.transactionDateTime}] Track: ${p.tracks}, Date: ${p.betDates}, Amount: $${p.straight}`);
    });

    // Run the Aggregation Risk Check logic exactly as riskService does
    const riskService = require('./services/riskService');
    const today = new Date().toISOString().split('T')[0]; // Default to today logic

    // We try to find WHAT date/track is triggering it.
    // The user screenshot says "on usa/ny/Evening".
    // Let's assume the date is TODAY or TOMORROW.
    // We'll check the specific combination.

    // We don't know the exact date the user selected, but let's check "today" and the collected dates from the plays found.
    const distinctDates = [...new Set(plays.flatMap(p => p.betDates.split(',')))];

    for (const date of distinctDates) {
        const exposure = await riskService.calculateExposure(trackName, date, betNumber, gameMode);
        console.log(`\n📊 Exposure for ${trackName} on ${date}:`);
        console.log(`   Straight: $${exposure.str}`);
        console.log(`   Box: $${exposure.box}`);
        console.log(`   Combo: $${exposure.com}`);

        if (exposure.str >= 6) { // 6 + 4 = 10 limit
            console.log("   ⚠️  THIS IS THE CULPRIT! Existing exposure is high.");
        }
    }

    mongoose.connection.close();
}

checkExposure();
