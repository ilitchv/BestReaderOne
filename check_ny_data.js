
const mongoose = require('mongoose');
const LotteryResult = require('./models/LotteryResult');
const connectDB = require('./database');
require('dotenv').config();

const checkData = async () => {
    try {
        await connectDB();
        console.log("Checking NY Evening Data...");
        const results = await LotteryResult.find({
            resultId: 'usa/ny/Evening'
        }).sort({ drawDate: -1 }).limit(20);

        console.log(`Found ${results.length} recent entries:`);
        results.forEach(r => {
            console.log(`${r.drawDate} | ${r.numbers}`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        mongoose.connection.close();
    }
};

checkData();
