
const mongoose = require('mongoose');
require('dotenv').config();
const LotteryResult = require('../models/LotteryResult');

async function checkData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to DB");

        const count = await LotteryResult.countDocuments();
        console.log(`Total LotteryResults: ${count}`);

        const latest = await LotteryResult.find().sort({ drawDate: -1 }).limit(5);
        console.log("Latest 5 Results:");
        console.log(JSON.stringify(latest, null, 2));

        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkData();
