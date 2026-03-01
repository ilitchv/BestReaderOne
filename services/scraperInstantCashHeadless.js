const mongoose = require('mongoose');
require('dotenv').config();
const LotteryResult = require('../models/LotteryResult');
const { triggerAlert } = require('./utils/alertHelper');
const firebaseService = require('./firebaseService');
const aiService = require('./aiService');

const TARGET_URL = 'https://instantcash.bet';
const MAX_RETRIES = 3;

// CALENDAR COORDINATES (FEBRUARY 2026)
const COORDS = {
    tabs: { today: { x: 163, y: 245 }, past: { x: 749, y: 245 } },
    dateSelector: { x: 500, y: 375 },
    okBtn: { x: 641, y: 712 },
    days: {
        20: { x: 613, y: 500 }, // Fri
        21: { x: 644, y: 500 }, // Sat
        22: { x: 457, y: 551 }, // Sun
        23: { x: 489, y: 551 }, // Mon
        24: { x: 520, y: 551 }, // Tue
        25: { x: 551, y: 551 }, // Wed
        26: { x: 582, y: 551 }, // Thu
        27: { x: 613, y: 551 }, // Fri
        28: { x: 644, y: 551 }  // Sat
    },
    timeSelector: { x: 555, y: 523 },
    times: [
        { label: "10:00 AM", x: 555, y: 452 },
        { label: "01:00 PM", x: 555, y: 496 },
        { label: "04:00 PM", x: 555, y: 540 },
        { label: "07:00 PM", x: 555, y: 584 },
        { label: "10:00 PM", x: 555, y: 628 }
    ]
};

async function scrapeInstantCashHeadless(targetDateArg) {
    if (process.env.VERCEL) return;

    console.log('[InstantCash] Starting Robust Visual Scraper...');

    const todayStr = new Date().toLocaleDateString('en-CA');
    let datesToScrape = targetDateArg ? [targetDateArg] : [todayStr];

    if (!targetDateArg) {
        const start = new Date('2026-02-20');
        const end = new Date();
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dStr = d.toLocaleDateString('en-CA');
            const exists = await LotteryResult.findOne({ resultId: 'special/instant-cash', drawDate: dStr });
            // If it's today, we always scrape. If it's past and exists, skip if it's "full" (approx 20 draws)
            if (!exists || (exists && JSON.parse(exists.numbers).length < 5)) {
                if (!datesToScrape.includes(dStr)) datesToScrape.push(dStr);
            }
        }
    }

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
        await page.setViewport({ width: 1000, height: 1000 }); // Matches coordinate system
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        console.log(`[InstantCash] Navigating...`);
        await page.goto(TARGET_URL, { waitUntil: 'networkidle2', timeout: 60000 });
        await new Promise(r => setTimeout(r, 10000));

        for (const dateStr of datesToScrape) {
            const dayNum = parseInt(dateStr.split('-')[2]);
            if (!COORDS.days[dayNum] && dateStr !== todayStr) continue;

            console.log(`\n--- [InstantCash] Scraping ${dateStr} ---`);

            if (dateStr !== todayStr) {
                await page.mouse.click(COORDS.tabs.past.x, COORDS.tabs.past.y);
                await new Promise(r => setTimeout(r, 2000));

                // Open Calendar
                await page.mouse.click(COORDS.dateSelector.x, COORDS.dateSelector.y);
                await new Promise(r => setTimeout(r, 2000));

                // Click Day
                const dayCoord = COORDS.days[dayNum];
                if (dayCoord) {
                    await page.mouse.click(dayCoord.x, dayCoord.y);
                    await new Promise(r => setTimeout(r, 1000));
                    await page.mouse.click(COORDS.okBtn.x, COORDS.okBtn.y);
                    await new Promise(r => setTimeout(r, 3000));
                }
            } else {
                await page.mouse.click(COORDS.tabs.today.x, COORDS.tabs.today.y);
                await new Promise(r => setTimeout(r, 3000));
            }

            // Time Loop (Scrape latest 5 draws if possible)
            const dailyDraws = [];
            for (const timeInfo of COORDS.times) {
                console.log(`[InstantCash] Selecting Time ${timeInfo.label}...`);
                await page.mouse.click(COORDS.timeSelector.x, COORDS.timeSelector.y);
                await new Promise(r => setTimeout(r, 1000));
                await page.mouse.click(timeInfo.x, timeInfo.y);
                await new Promise(r => setTimeout(r, 2000));

                const screenshotBuffer = await page.screenshot({
                    clip: { x: 0, y: 400, width: 1000, height: 400 },
                    encoding: 'base64'
                });

                const aiResult = await aiService.interpretWinningResultsImage(screenshotBuffer);
                if (aiResult && aiResult.numbers && aiResult.numbers.length >= 10) {
                    dailyDraws.push({
                        time: aiResult.drawTime || timeInfo.label,
                        numbers: aiResult.numbers.join('-')
                    });
                }
            }

            if (dailyDraws.length > 0) {
                await saveResults(dailyDraws, dateStr);
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

    let existingDoc = await LotteryResult.findOne({ resultId, drawDate: targetDateStr });
    let existingDraws = [];
    if (existingDoc && existingDoc.numbers) {
        try { existingDraws = JSON.parse(existingDoc.numbers); } catch (e) { }
    }

    const mergedMap = new Map();
    existingDraws.forEach(d => mergedMap.set(d.time, d));
    draws.forEach(d => {
        mergedMap.set(d.time, { time: d.time, draws: { "All": d.numbers } });
    });

    const mergedDraws = Array.from(mergedMap.values()).sort((a, b) => a.time.localeCompare(b.time));

    await LotteryResult.findOneAndUpdate(
        { resultId, drawDate: targetDateStr },
        {
            resultId,
            country: 'SPECIAL',
            lotteryName: 'Instant Cash',
            drawName: 'All Day',
            drawDate: targetDateStr,
            numbers: JSON.stringify(mergedDraws),
            scrapedAt: new Date()
        },
        { upsert: true, new: true }
    );

    firebaseService.syncToFirestore('results', 'special_instant-cash', {
        resultId, drawDate: targetDateStr, numbers: JSON.stringify(mergedDraws)
    });
}

if (require.main === module) {
    scrapeInstantCashHeadless(process.argv[2]);
}

module.exports = scrapeInstantCashHeadless;
