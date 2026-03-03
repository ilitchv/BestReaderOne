
const mongoose = require('mongoose');
require('dotenv').config();

const LotteryResultSchema = new mongoose.Schema({
    resultId: String,
    lotteryName: String,
    drawDate: String,
    numbers: String,
    scrapedAt: Date
}, { collection: 'lotteryresults' });

const SystemAlertSchema = new mongoose.Schema({
    type: String,
    message: String,
    metadata: mongoose.Schema.Types.Mixed,
    severity: String,
    createdAt: { type: Date, default: Date.now }
}, { collection: 'systemalerts' });

const LotteryResult = mongoose.model('LotteryResult', LotteryResultSchema);
const SystemAlert = mongoose.model('SystemAlert', SystemAlertSchema);

async function diagnose() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to DB");

        console.log("\n--- Checking Instant Cash Results since Feb 15 ---");
        const results = await LotteryResult.find({
            resultId: 'special/instant-cash',
            drawDate: { $gte: '2026-02-15' }
        }).sort({ drawDate: -1 });

        console.log(`Found ${results.length} entries.`);
        results.forEach(r => {
            let drawCount = 0;
            try {
                const draws = JSON.parse(r.numbers);
                drawCount = draws.length;
                const lastDrawTime = draws.length > 0 ? draws[draws.length - 1].time : 'N/A';
                console.log(`- [${r.drawDate}] Saved at: ${r.scrapedAt} | Draws: ${drawCount} | Last Draw: ${lastDrawTime}`);
            } catch (e) {
                console.log(`- [${r.drawDate}] Saved at: ${r.scrapedAt} | ERROR PARSING NUMBERS`);
            }
        });

        console.log("\n--- Checking SCRAPER_FAILURE Alerts since Feb 19 ---");
        const scrapAlerts = await SystemAlert.find({
            type: 'SCRAPER_FAILURE',
            createdAt: { $gte: new Date('2026-02-19') },
            message: /Instant Cash/i
        }).sort({ createdAt: -1 });

        console.log(`Found ${scrapAlerts.length} Instant Cash failure alerts.`);
        scrapAlerts.forEach(a => {
            console.log(`- [${a.createdAt.toISOString()}] ${a.message}`);
            if (a.metadata) console.log(`  Error: ${a.metadata.error || JSON.stringify(a.metadata)}`);
        });

        console.log("\n--- Checking generic Instant Cash Results since Feb 19 (Check schema) ---");
        // Maybe the resultId changed?
        const genericResults = await LotteryResult.find({
            lotteryName: /Instant Cash/i,
            drawDate: { $gte: '2026-02-19' }
        }).sort({ drawDate: -1 });
        console.log(`Found ${genericResults.length} generic entries.`);

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await mongoose.disconnect();
    }
}

diagnose();
