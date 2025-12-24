
const mongoose = require('mongoose');
const LotteryResult = require('./models/LotteryResult');
const path = require('path');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/sniper_strategy_db";

async function checkNacional() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("Connected to DB");

        const res = await LotteryResult.findOne({ lotteryName: 'Nacional' }).sort({ drawDate: -1 });
        if (res) {
            console.log("Found Nacional Result:");
            console.log(JSON.stringify(res, null, 2));
        } else {
            console.log("No Nacional result found.");
        }

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

checkNacional();
