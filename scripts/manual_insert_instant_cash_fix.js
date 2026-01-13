const mongoose = require('mongoose');
require('dotenv').config();
const LotteryResult = require('../models/LotteryResult');

async function manualInsert() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const resultId = 'special/instant-cash';
        const drawDate = '2026-01-08';
        const timeToInsert = '10:00 PM';
        // Numbers from screenshot: 3 0 | 6 2 7 | 1 2 4 4 | 2 0 2 1 3
        const numbersString = '3-0-6-2-7-1-2-4-4-2-0-2-1-3';

        // 1. Fetch Existing
        let existingDoc = await LotteryResult.findOne({ resultId, drawDate });
        let existingDraws = [];

        if (existingDoc && existingDoc.numbers) {
            existingDraws = JSON.parse(existingDoc.numbers);
        }

        console.log(`Found ${existingDraws.length} existing draws.`);

        // 2. Prepare New Draw
        const newDraw = {
            time: timeToInsert,
            draws: { "All": numbersString }
        };

        // 3. Merge/Upsert
        const mergedMap = new Map();
        existingDraws.forEach(d => mergedMap.set(d.time, d));
        // Verify if it already exists? User says it's missing.
        // Even if it exists, we overwrite with "Correct" manual data.
        mergedMap.set(newDraw.time, newDraw);

        const mergedDraws = Array.from(mergedMap.values());

        // Sort by time (Descending ideally, or let frontend handle it)
        // Scraper usually sorts? Scraper didn't sort explicitly in save, but map order is insertion order usually.
        // Let's sort to be nice.
        mergedDraws.sort((a, b) => {
            const timeToMin = (t) => {
                const [time, period] = t.split(' ');
                let [h, m] = time.split(':').map(Number);
                if (period === 'PM' && h !== 12) h += 12;
                if (period === 'AM' && h === 12) h = 0;
                return h * 60 + m;
            };
            return timeToMin(b.time) - timeToMin(a.time); // Descending
        });

        // 4. Save
        const payload = {
            resultId,
            country: 'SPECIAL',
            lotteryName: 'Instant Cash',
            drawName: 'All Day',
            drawDate,
            numbers: JSON.stringify(mergedDraws),
            scrapedAt: new Date()
        };

        const doc = await LotteryResult.findOneAndUpdate(
            { resultId, drawDate },
            payload,
            { upsert: true, new: true }
        );

        console.log(`Successfully inserted 10:00 PM draw. Total draws for day: ${mergedDraws.length}`);
        console.log('Doc ID:', doc._id);

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await mongoose.disconnect();
    }
}

manualInsert();
