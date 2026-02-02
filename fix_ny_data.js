
const mongoose = require('mongoose');
const LotteryResult = require('./models/LotteryResult');
const connectDB = require('./database');
const { processDraw } = require('./services/scraperService'); // If exposed? No, it's not exported.
require('dotenv').config();

// We must manually construct record updates since processDraw isn't easily reachable
const fixData = async () => {
    try {
        await connectDB();
        console.log("🛠️ FIXING NY EVENING DATA...");

        const updates = [
            { date: '2026-01-30', numbers: '415-2968' },
            { date: '2026-01-29', numbers: '592-2006' },
            { date: '2026-01-24', numbers: '551-1960' }
        ];

        for (const up of updates) {
            const resultId = 'usa/ny/Evening';
            await LotteryResult.updateOne(
                { resultId: resultId, drawDate: up.date },
                {
                    $set: {
                        resultId: resultId,
                        country: 'USA',
                        lotteryName: 'New York',
                        drawName: 'Evening',
                        numbers: up.numbers,
                        drawDate: up.date,
                        scrapedAt: new Date(),
                        manualFix: true
                    }
                },
                { upsert: true }
            );
            console.log(`✅ Fixed ${up.date}: ${up.numbers}`);
        }

    } catch (e) {
        console.error(e);
    } finally {
        mongoose.connection.close();
    }
};

fixData();
