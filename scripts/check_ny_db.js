const mongoose = require('mongoose');

const MONGODB_URI = "mongodb+srv://BeastBetTwo:Amiguito2468@beastbet.lleyk.mongodb.net/beastbetdb?retryWrites=true&w=majority&appName=Beastbet";

const LotteryResultSchema = new mongoose.Schema({
    resultId: String,
    drawDate: String,
    lotteryName: String,
    drawName: String,
    numbers: String,
    scrapedAt: Date,
    createdAt: Date,
    updatedAt: Date
});

const LotteryResult = mongoose.model('LotteryResult', LotteryResultSchema);

async function check() {
    try {
        console.log("Connecting to atlas...");
        await mongoose.connect(MONGODB_URI);
        console.log("Connected to DB");

        const results = await LotteryResult.find({ resultId: /usa\/ny/ }).sort({ updatedAt: -1 }).limit(10);
        console.log("\nNY Results (last 10 updates):");
        results.forEach(r => {
            console.log(`${r.resultId.padEnd(20)} | Date: ${r.drawDate} | Nums: ${r.numbers.padEnd(10)} | Last Updated: ${r.updatedAt}`);
        });

    } catch (e) {
        console.error("Error:", e);
    } finally {
        mongoose.disconnect();
    }
}

check();
