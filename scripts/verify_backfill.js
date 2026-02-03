const mongoose = require('mongoose');
const LotteryResult = require('../models/LotteryResult');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const connectDB = require('../database');

async function checkData() {
    await connectDB();
    const states = ['ct', 'pa', 'nj'];
    const dates = ['2026-01-25', '2026-01-26', '2026-01-27'];

    console.log("--- Checking Backfill Status ---");
    for (const state of states) {
        for (const date of dates) {
            // Check just one draw type per state to verify existence
            const midId = `usa/${state}/Midday`;
            const doc = await LotteryResult.findOne({ resultId: midId, drawDate: date });
            console.log(`State: ${state.toUpperCase()} | Date: ${date} | Found: ${!!doc} | Numbers: ${doc ? doc.numbers : 'N/A'}`);
        }
    }
    process.exit();
}

checkData();
