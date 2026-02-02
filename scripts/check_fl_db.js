const mongoose = require('mongoose');
require('dotenv').config();
const LotteryResult = require('../models/LotteryResult');
const Track = require('../models/Track');

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
    .then(async () => {
        console.log('Connected to Mongo');

        // DEBUG: List 5 most recent Florida entries
        console.log('\n--- Recent Florida Entries (Any Date) ---');
        const recentTracks = await Track.find({
            lottery: { $regex: /Florida/i }
        })
            .sort({ _id: -1 }) // Sort by insertion time (ObjectId)
            .limit(5);

        recentTracks.forEach(t => {
            console.log(`Track: ${t.lottery} ${t.time} | Date: ${t.date} (Type: ${typeof t.date}) | Numbers: ${t.p3}`);
        });

        const recentResults = await LotteryResult.find({
            resultId: { $regex: /usa\/fl/i }
        })
            .sort({ scrapedAt: -1 })
            .limit(5);

        console.log('\n--- Recent LotteryResults ---');
        recentResults.forEach(r => {
            console.log(`Result: ${r.resultId} | DrawDate: ${r.drawDate} | Numbers: ${r.numbers}`);
        });

        mongoose.disconnect();
    })
    .catch(err => {
        console.error(err);
        mongoose.disconnect();
    });
