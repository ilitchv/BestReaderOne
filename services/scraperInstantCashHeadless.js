const mongoose = require('mongoose');
require('dotenv').config();
const LotteryResult = require('../models/LotteryResult');
const { triggerAlert } = require('./utils/alertHelper');
const firebaseService = require('./firebaseService');
const aiService = require('./aiService');

const TARGET_URL = 'https://instantcash.bet';
const MAX_RETRIES = 3;

/**
 * Scrapes Instant Cash results using Gemini Vision.
 */
async function scrapeInstantCashHeadless(targetDateArg) {
    if (process.env.VERCEL) {
        console.warn("⚠️ [InstantCash] Puppeteer execution skipped (Vercel Environment detected).");
        return;
    }

    console.log('[InstantCash] Starting Visual Scraper...');

    const todayStr = new Date().toLocaleDateString('en-CA');
    let datesToScrape = targetDateArg ? [targetDateArg] : [todayStr];

    if (!targetDateArg) {
        const start = new Date('2026-02-20');
        const end = new Date();
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dStr = d.toLocaleDateString('en-CA');
            const exists = await LotteryResult.findOne({ resultId: 'special/instant-cash', drawDate: dStr });
            if (!exists) {
                console.log(`[InstantCash] Missing data for ${dStr}. Adding to queue.`);
                if (!datesToScrape.includes(dStr)) datesToScrape.push(dStr);
            }
        }
    }

    let puppeteer;
    try {
        puppeteer = require('puppeteer');
    } catch (e) {
        console.error("❌ Puppeteer module not found.");
        return;
    }

    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        console.log(`[InstantCash] Navigating to ${TARGET_URL}...`);
        await page.goto(TARGET_URL, { waitUntil: 'networkidle2', timeout: 60000 });
        await new Promise(r => setTimeout(r, 10000));

        for (const dateStr of datesToScrape) {
            console.log(`\n--- [InstantCash] Processing Date: ${dateStr} ---`);

            const isToday = dateStr === todayStr;
            if (!isToday) {
                console.log(`[InstantCash] Navigating to 'Past Draws' tab...`);
                await page.mouse.click(749, 245);
                await new Promise(r => setTimeout(r, 2000));
            } else {
                await page.mouse.click(163, 245);
                await new Promise(r => setTimeout(r, 2000));
            }

            console.log(`[InstantCash] Capturing result screenshot...`);
            const screenshotBuffer = await page.screenshot({
                clip: { x: 0, y: 350, width: 1280, height: 450 },
                encoding: 'base64'
            });

            console.log(`[InstantCash] Sending to Gemini Vision...`);
            const aiResult = await aiService.interpretWinningResultsImage(screenshotBuffer);

            if (aiResult && aiResult.numbers && aiResult.numbers.length >= 10) {
                // FORCE the requested date if AI gives something different (avoid hallucinations)
                const finalDate = dateStr;
                const drawTime = aiResult.drawTime || "Unknown";

                console.log(`[InstantCash] Extracted Numbers: ${aiResult.numbers.join('-')}`);
                console.log(`[InstantCash] Assumed Date: ${finalDate} | Time: ${drawTime}`);

                const drawData = {
                    time: drawTime,
                    numbers: aiResult.numbers.join('-')
                };
                await saveResults([drawData], finalDate);
            } else {
                console.error(`[InstantCash] Failed to extract results for ${dateStr}.`);
            }
        }

    } catch (error) {
        console.error(`[InstantCash] Global Error:`, error.message);
        await triggerAlert('SCRAPER_FAILURE', 'Instant Cash Visual Scraper Failed', { error: error.message }, 'HIGH');
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

    const mergedDraws = Array.from(mergedMap.values());
    console.log(`[InstantCash] Saving ${mergedDraws.length} total draws for ${targetDateStr}.`);

    const payload = {
        resultId,
        country: 'SPECIAL',
        lotteryName: 'Instant Cash',
        drawName: 'All Day',
        drawDate: targetDateStr,
        numbers: JSON.stringify(mergedDraws),
        scrapedAt: new Date()
    };

    await LotteryResult.findOneAndUpdate(
        { resultId, drawDate: targetDateStr },
        payload,
        { upsert: true, new: true }
    );

    const firestoreId = payload.resultId.replace(/\//g, '_');
    firebaseService.syncToFirestore('results', firestoreId, payload);
}

if (require.main === module) {
    const args = process.argv.slice(2);
    scrapeInstantCashHeadless(args[0]);
}

module.exports = scrapeInstantCashHeadless;
