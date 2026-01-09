const mongoose = require('mongoose');
require('dotenv').config();
const LotteryResult = require('./models/LotteryResult');

async function clearTopPick() {
    await mongoose.connect(process.env.MONGODB_URI);

    // Delete Top Pick results to force re-scrape with CLEAN data
    const res = await LotteryResult.deleteMany({ resultId: 'special/top-pick' });
    console.log(`[Cleaner] Deleted ${res.deletedCount} Top Pick documents.`);

    await mongoose.disconnect();
}

clearTopPick();
