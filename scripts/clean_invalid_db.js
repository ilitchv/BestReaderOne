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

async function clean() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("Connected to DB");

        // TARGET: NY Evening for Dec 22 (Which hasn't happened yet)
        const targetDate = "2025-12-22";
        const targetId = "usa/ny/Evening";

        const res = await LotteryResult.deleteMany({ resultId: targetId, drawDate: targetDate });
        console.log(`Deleted ${res.deletedCount} invalid records for ${targetId} on ${targetDate}`);

        // Also clean others if potential pollution exists (e.g. GA Evening Dec 22)
        // Adjust as needed, but let's be safe and just target the reported one or widespread check?
        // Let's delete ALL "Evening" or "Night" results for Today (since it's not night yet)

        // Actually, just target the reported ones for safety first.
        const res2 = await LotteryResult.deleteMany({ resultId: "usa/ga/Evening", drawDate: targetDate });
        console.log(`Deleted ${res2.deletedCount} invalid records for usa/ga/Evening on ${targetDate}`);

        const res3 = await LotteryResult.deleteMany({ resultId: "usa/nj/Evening", drawDate: targetDate });
        console.log(`Deleted ${res3.deletedCount} invalid records for usa/nj/Evening on ${targetDate}`);

    } catch (e) {
        console.error("Error:", e);
    } finally {
        mongoose.disconnect();
    }
}

clean();
