require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./database');
const LotteryResult = require('./models/LotteryResult');

const run = async () => {
    await connectDB();
    console.log("Connected to DB");

    try {
        // Fetch data from Jan 1st to ensure we have a good starting gap for Jan 8th
        const results = await LotteryResult.find({
            lotteryName: "New York",
            drawDate: { $gte: "2026-01-01", $lte: "2026-01-24" }
        }).sort({ drawDate: 1, drawName: 1 }); // Sort by Date ASC

        // Sort properly by time (Midday vs Evening)
        results.sort((a, b) => {
            if (a.drawDate !== b.drawDate) return a.drawDate.localeCompare(b.drawDate);
            // Midday comes before Evening
            const isEveA = a.drawName.toLowerCase().includes('evening');
            const isEveB = b.drawName.toLowerCase().includes('evening');
            if (isEveA && !isEveB) return 1;
            if (!isEveA && isEveB) return -1;
            return 0;
        });

        let currentGap = 0;
        let maxGapInPeriod = 0;
        let gapSequence = [];

        console.log(`Analyzing ${results.length} draws...`);

        results.forEach(r => {
            const parts = r.numbers.split('-');
            const p3 = parts[0].trim();

            // Check P1 (Last 2 digits of Pick 3 match)
            // p3 string length 3. Index 0, 1, 2.
            const isP1 = p3.length === 3 && p3[1] === p3[2];

            const inPeriod = r.drawDate >= "2026-01-08";

            if (inPeriod) {
                console.log(`${r.drawDate} ${r.drawName}: ${p3} (P1: ${isP1}) | Gap: ${currentGap}`);
            }

            if (isP1) {
                if (inPeriod) gapSequence.push(currentGap);
                currentGap = 0;
            } else {
                currentGap++;
                if (inPeriod && currentGap > maxGapInPeriod) {
                    maxGapInPeriod = currentGap;
                }
            }
        });

        console.log("------------------------------------------------");
        console.log("RESULTS (Jan 8 - Jan 24):");
        console.log("Max Gap Observed:", maxGapInPeriod);
        console.log("Gap Sequence (hits):", gapSequence.join(", "));
        console.log("Status at end of Jan 24:", currentGap);

    } catch (e) {
        console.error(e);
    } finally {
        mongoose.disconnect();
    }
};

run();
