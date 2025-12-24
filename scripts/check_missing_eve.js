const mongoose = require('mongoose');

const MONGODB_URI = "mongodb+srv://BeastBetTwo:Amiguito2468@beastbet.lleyk.mongodb.net/beastbetdb?retryWrites=true&w=majority&appName=Beastbet";

const LotteryResultSchema = new mongoose.Schema({
    resultId: String,
    drawDate: String,
    lotteryName: String,
    drawName: String,
    numbers: String,
    updatedAt: Date
});

const LotteryResult = mongoose.model('LotteryResult', LotteryResultSchema);

async function check() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("Connected to DB");

        const today = "2025-12-22";
        const eveIds = [
            "usa/ga/Evening", "usa/fl/Evening", "usa/pa/Evening",
            "usa/ny/Evening", "usa/nj/Evening", "usa/ct/Night"
        ];

        const results = await LotteryResult.find({
            resultId: { $in: eveIds },
            drawDate: today
        });

        console.log(`\nEvening Results for ${today}:`);
        eveIds.forEach(id => {
            const found = results.find(r => r.resultId === id);
            if (found) {
                console.log(`[FOUND] ${id}: ${found.numbers}`);
            } else {
                console.log(`[MISSING] ${id}`);
            }
        });

    } catch (e) {
        console.error(e);
    } finally {
        mongoose.disconnect();
    }
}

check();
