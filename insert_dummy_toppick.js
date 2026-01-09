const mongoose = require('mongoose');
require('dotenv').config();

const LotteryResult = require('./models/LotteryResult');

async function insertDummy() {
    await mongoose.connect(process.env.MONGODB_URI);

    // Simulate TODAY's data for Top Pick
    const today = new Date().toISOString().split('T')[0];

    // Generate many rows to test scrolling and sorting
    const fakeDraws = [];

    // Times from 10:00 AM to 10:00 PM every 15 mins
    const times = [
        "10:00 AM", "10:15 AM", "10:30 AM", "10:45 AM",
        "11:00 AM", "11:15 AM", "11:30 AM", "11:45 AM",
        "12:00 PM", "12:15 PM", "12:30 PM", "12:45 PM",
        "01:00 PM", "01:15 PM", "01:30 PM", "01:45 PM",
        "02:00 PM", "02:15 PM", "02:30 PM", "02:45 PM",
    ];

    times.forEach(t => {
        fakeDraws.push({
            time: t,
            draws: {
                "Pick 2": Math.floor(Math.random() * 99).toString().padStart(2, '0').split('').join(''),
                "Pick 3": Math.floor(Math.random() * 999).toString().padStart(3, '0').split('').join(''),
                "Pick 4": Math.floor(Math.random() * 9999).toString().padStart(4, '0').split('').join(''),
                "Pick 5": Math.floor(Math.random() * 99999).toString().padStart(5, '0').split('').join('')
            }
        });
    });

    // Shuffle slightly to test sorting?
    // fakeDraws.sort(() => Math.random() - 0.5);

    const payload = {
        resultId: 'special/top-pick',
        country: 'SPECIAL',
        lotteryName: 'Top Pick Lotto',
        drawName: 'All Day',
        drawDate: today,
        numbers: JSON.stringify(fakeDraws),
        scrapedAt: new Date()
    };

    await LotteryResult.findOneAndUpdate(
        { resultId: payload.resultId, drawDate: payload.drawDate },
        payload,
        { upsert: true, new: true }
    );

    console.log(`[Dummy] Inserted ${fakeDraws.length} Top Pick rows (incl Pick 2) for ${today}.`);
    await mongoose.disconnect();
}

insertDummy();
