require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./database');
const LotteryResult = require('./models/LotteryResult');

const run = async () => {
    await connectDB();
    console.log("Connected to DB");

    try {
        const result = await LotteryResult.findOne({ lotteryName: "New York" }).sort({ drawDate: -1 });
        console.log("Sample Result:", result);
    } catch (e) {
        console.error(e);
    } finally {
        mongoose.disconnect();
    }
};

run();
