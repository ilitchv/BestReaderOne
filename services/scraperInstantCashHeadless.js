const mongoose = require('mongoose');
require('dotenv').config();
const LotteryResult = require('../models/LotteryResult');
const { triggerAlert } = require('./utils/alertHelper');
const firebaseService = require('./firebaseService');
const aiService = require('./aiService');

const TARGET_URL = 'https://instantcash.bet';
const MAX_RETRIES = 3;

// CALENDAR & COORDINATES (REFINED FOR 30-MIN RANGE)
const COORDS = {
    tabs: { today: { x: 250, y: 381 }, past: { x: 750, y: 381 } },
    dateSelector: { x: 972, y: 373 },
    okBtn: { x: 640, y: 710 },
    // Simplified: Just use 30-min slots for 10 AM to 10 PM
    timeSlots: (() => {
        const slots = [];
        for (let h = 10; h <= 22; h++) {
            const period = h >= 12 ? 'PM' : 'AM';
            const displayHour = h > 12 ? h - 12 : h;
            slots.push(`${displayHour}:00 ${period}`);
            if (h < 22) slots.push(`${displayHour}:30 ${period}`);
        }
        return slots;
    })()
};

async function scrapeInstantCashHeadless(targetDateArg) {
    if (process.env.VERCEL) return;

    // Get NY Date/Time
    const nyDateStr = new Date().toLocaleString("en-US", { timeZone: "America/New_York" });
    const nyDate = new Date(nyDateStr);
    const todayStr = nyDate.toLocaleDateString('en-CA');

    let datesToScrape = targetDateArg ? [targetDateArg] : [todayStr];

    let puppeteer;
    try {
        puppeteer = require('puppeteer');
    } catch (e) { return; }

    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1536, height: 695 }); // Based on subagent findings
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        console.log(`[InstantCash] Navigating...`);
        await page.goto(TARGET_URL, { waitUntil: 'networkidle2', timeout: 60000 });
        await new Promise(r => setTimeout(r, 5000));

        for (const dateStr of datesToScrape) {
            console.log(`\n--- [InstantCash] Scraping ${dateStr} ---`);

            // Always click "Today's Draw" first to initialize
            await page.mouse.click(COORDS.tabs.today.x, COORDS.tabs.today.y);
            await new Promise(r => setTimeout(r, 2000));

            const isToday = (dateStr === todayStr);

            if (!isToday) {
                // Navigate to Past Results if needed
                await page.mouse.click(COORDS.tabs.past.x, COORDS.tabs.past.y);
                await new Promise(r => setTimeout(r, 1000));

                // Calendar selection (Requires AI or precise day detection, but for now we skip complex history)
                // We mainly care about catching 'Latest' during the day.
                continue;
            }

            // Capture the "Latest" visible draw
            // Since it's every 30 mins, and we run often, capturing the current screen is most reliable
            const screenshotBuffer = await page.screenshot({
                clip: { x: 0, y: 400, width: 1536, height: 295 }, // Target middle area
                encoding: 'base64'
            });

            const aiResult = await aiService.interpretWinningResultsImage(screenshotBuffer);
            if (aiResult && aiResult.numbers && aiResult.numbers.length === 14) {
                const drawInfo = {
                    time: aiResult.drawTime,
                    numbers: aiResult.numbers.join('-')
                };
                console.log(`[InstantCash] Detected ${drawInfo.time}: ${drawInfo.numbers}`);
                await saveResults([drawInfo], dateStr);
            } else {
                console.log(`[InstantCash] No valid 14-number result detected in capture.`);
            }
        }
    } catch (error) {
        console.error(`[InstantCash] Error:`, error.message);
    } finally {
        await browser.close();
    }
}

async function saveResults(draws, targetDateStr) {
    if (mongoose.connection.readyState === 0) await mongoose.connect(process.env.MONGODB_URI);
    const resultId = 'special/instant-cash';

    // Fetch existing results for this day to merge
    let existingDoc = await LotteryResult.findOne({ resultId, drawDate: targetDateStr });
    let mergedMap = new Map();

    if (existingDoc && existingDoc.numbers) {
        try {
            const existing = JSON.parse(existingDoc.numbers);
            existing.forEach(d => mergedMap.set(d.time, d));
        } catch (e) { }
    }

    draws.forEach(d => {
        if (!d.time) return;
        mergedMap.set(d.time, { time: d.time, draws: { "All": d.numbers } });
    });

    const mergedDrawsList = Array.from(mergedMap.values()).sort((a, b) => {
        // Simple 12h time sort
        const toMin = (t) => {
            const [time, period] = t.split(' ');
            let [h, m] = time.split(':').map(Number);
            if (period === 'PM' && h !== 12) h += 12;
            if (period === 'AM' && h === 12) h = 0;
            return h * 60 + m;
        };
        return toMin(a.time) - toMin(b.time);
    });

    await LotteryResult.findOneAndUpdate(
        { resultId, drawDate: targetDateStr },
        {
            resultId,
            country: 'SPECIAL',
            lotteryName: 'Instant Cash',
            drawName: 'All Day',
            drawDate: targetDateStr,
            numbers: JSON.stringify(mergedDrawsList),
            scrapedAt: new Date()
        },
        { upsert: true, new: true }
    );

    firebaseService.syncToFirestore('results', 'special_instant-cash', {
        resultId, drawDate: targetDateStr, numbers: JSON.stringify(mergedDrawsList)
    });
}

if (require.main === module) {
    scrapeInstantCashHeadless(process.argv[2]);
}

module.exports = scrapeInstantCashHeadless;
