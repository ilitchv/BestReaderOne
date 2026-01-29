// const puppeteer = require('puppeteer'); // LAZY LOADED
const mongoose = require('mongoose');
require('dotenv').config();
const LotteryResult = require('../models/LotteryResult');

const { triggerAlert } = require('./utils/alertHelper');
const firebaseService = require('./firebaseService'); // NEW: Dual-Store

// Configuration
const TARGET_URL = 'https://instantcash.bet';
const MAX_RETRIES = 3;

/**
 * Scrapes Instant Cash results using a headless browser.
 */
async function scrapeInstantCashHeadless(targetDateArg) {
    // SECURITY GUARD: Vercel does not support standard Puppeteer.
    if (process.env.VERCEL) {
        console.warn("⚠️ [InstantCash] Puppeteer execution skipped (Vercel Environment detected).");
        return;
    }

    console.log('[InstantCash] Starting Headless Scraper...');

    let attempts = 0;
    while (attempts < MAX_RETRIES) {
        attempts++;
        let browser = null;
        try {
            if (attempts > 1) console.log(`[InstantCash] Retry attempt ${attempts}/${MAX_RETRIES}...`);

            let puppeteer;
            try {
                puppeteer = require('puppeteer');
            } catch (e) {
                console.error("❌ Puppeteer module not found. Skipping Instant Cash.");
                return;
            }

            browser = await puppeteer.launch({
                headless: "new",
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
            });
            const page = await browser.newPage();
            // User Agent to avoid bot detection
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

            // 1. Navigate
            console.log(`[InstantCash] Navigating to ${TARGET_URL}...`);
            await page.goto(TARGET_URL, { waitUntil: 'networkidle2', timeout: 60000 });

            // 2. Wait for Flutter app to hydrate
            console.log('[InstantCash] Waiting for app hydration (10s)...');
            await new Promise(r => setTimeout(r, 10000));

            // 3. Enable Accessibility
            try {
                const btnSelector = 'flt-semantics-placeholder';
                await page.waitForSelector(btnSelector, { timeout: 5000 });
                await page.evaluate((sel) => {
                    const el = document.querySelector(sel);
                    if (el) el.click();
                }, btnSelector);
                console.log('[InstantCash] Clicked semantics placeholder.');
            } catch (e) {
                console.warn('[InstantCash] Semantics click warning:', e);
            }

            await new Promise(r => setTimeout(r, 2000));

            // 4. Incremental Scroll (ELEMENT BASED)
            console.log('[InstantCash] starting incremental scrape (Element Scroll Mode)...');
            const allExtractedTexts = [];
            const collectedHashes = new Set(); // To avoid adding duplicates if view doesn't change

            // Increased scroll limit to capture previous day if needed
            const scrollLimit = targetDateArg ? 150 : 80;
            console.log(`[InstantCash] Scrolling ${scrollLimit} times...`);

            for (let i = 0; i < scrollLimit; i++) {
                // Focus body
                await page.focus('body');

                // EXTRACT
                const currentText = await page.evaluate(() => {
                    function getVisibleText(node) {
                        if (node.nodeType === Node.TEXT_NODE) return node.textContent.trim();
                        if (node.nodeType !== Node.ELEMENT_NODE) return "";
                        try {
                            const style = window.getComputedStyle(node);
                            if (style.display === 'none' || style.visibility === 'hidden') return "";
                        } catch (e) { }

                        let text = "";
                        if (node.shadowRoot) text += getVisibleText(node.shadowRoot);
                        for (let child of node.childNodes) text += " " + getVisibleText(child);
                        if (node.getAttribute && node.getAttribute('aria-label')) {
                            text += " [ARIA: " + node.getAttribute('aria-label') + "] ";
                        }
                        return text;
                    }
                    return getVisibleText(document.body);
                });

                // Helper hash
                const hash = currentText.length + "-" + currentText.substring(0, 50);
                if (!collectedHashes.has(hash)) {
                    allExtractedTexts.push(currentText);
                    collectedHashes.add(hash);
                }

                // SCROLL ACTION
                // Try to find the last semantic node and scroll it into view
                await page.evaluate(() => {
                    const nodes = document.querySelectorAll('flt-semantics');
                    if (nodes.length > 0) {
                        const last = nodes[nodes.length - 1];
                        last.scrollIntoView();
                    } else {
                        window.scrollBy(0, window.innerHeight);
                    }
                });

                await new Promise(r => setTimeout(r, 1000)); // Wait for render
            }

            // Re-combine
            const extractedData = allExtractedTexts.join(" ||CHUNK|| ");

            console.log(`[InstantCash] Parsing results...`);
            const resultsByDate = parseResults(extractedData);
            console.log(`[InstantCash] Found Dates: ${Object.keys(resultsByDate).join(', ')}`);
            const savedDrawsCount = {};

            if (Object.keys(resultsByDate).length > 0) {
                for (const [dateStr, draws] of Object.entries(resultsByDate)) {
                    savedDrawsCount[dateStr] = draws.length;
                    await saveResults(draws, dateStr);
                }

                // --- VALIDATION & ALERTING ---
                // Validate Target Date if provided, otherwise Today
                const dateToValidate = targetDateArg || new Date().toLocaleDateString('en-CA');

                if (resultsByDate[dateToValidate]) {
                    await validateCompleteness(dateToValidate, resultsByDate[dateToValidate]);
                } else {
                    console.warn(`[InstantCash] No data found for Validation Target: ${dateToValidate}`);
                    // If we explicitly asked for a date and got nothing, that's a MISSING_DATA event
                    if (targetDateArg) {
                        await validateCompleteness(dateToValidate, []);
                    }
                }
                // -----------------------------

                console.log('[InstantCash] Data successfully processed.');
                if (browser) await browser.close();
                return;
            } else {
                console.warn('[InstantCash] No results found in text.');
                throw new Error("No results found in extracted text.");
            }

        } catch (error) {
            console.error(`[InstantCash] Error on attempt ${attempts}:`, error.message);
            if (browser) await browser.close();
            if (attempts >= MAX_RETRIES) {
                await triggerAlert('SCRAPER_FAILURE', 'Instant Cash Scraper Failed (Max Retries)', { error: error.message }, 'HIGH');
            } else {
                await new Promise(r => setTimeout(r, 10000));
            }
        }
    }
}

function parseResults(text) {
    const drawsByDate = {};
    const dateRegex = /([a-zA-Z]{3}\s+\d{1,2},?\s+\d{4})/gi;
    const timeRegex = /(\d{1,2}:\d{2}\s*(?:AM|PM))/gi;

    const events = [];
    let match;

    while ((match = dateRegex.exec(text)) !== null) events.push({ type: 'DATE', val: match[1], index: match.index });
    while ((match = timeRegex.exec(text)) !== null) events.push({ type: 'TIME', val: match[0], index: match.index });

    events.sort((a, b) => a.index - b.index);

    let currentRowDateStr = null;

    for (let i = 0; i < events.length; i++) {
        const e = events[i];

        if (e.type === 'DATE') {
            const d = new Date(e.val);
            if (!isNaN(d.getTime())) {
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                currentRowDateStr = `${year}-${month}-${day}`;
                if (!drawsByDate[currentRowDateStr]) drawsByDate[currentRowDateStr] = [];
            }
        }
        else if (e.type === 'TIME') {
            if (!currentRowDateStr) continue;
            const nextEventIndex = (i + 1 < events.length) ? events[i + 1].index : text.length;
            const chunk = text.substring(e.index, nextEventIndex);

            // Clean content to just numbers
            const content = chunk.replace(e.val, '');
            const numsMatch = content.match(/((?:\d\s*,?\s*){10,})/);

            if (numsMatch) {
                const rawNums = numsMatch[0].replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
                const numArr = rawNums.split(' ');

                // Deduplicate within the parser run to handle overlap chunks
                const exists = drawsByDate[currentRowDateStr].some(d => d.time === e.val);
                if (!exists) {
                    drawsByDate[currentRowDateStr].push({
                        time: e.val,
                        numbers: numArr.join('-')
                    });
                }
            }
        }
    }
    return drawsByDate;
}

async function saveResults(draws, targetDateStr) {
    if (mongoose.connection.readyState === 0) await mongoose.connect(process.env.MONGODB_URI);
    const resultId = 'special/instant-cash';

    // 1. Fetch Existing
    let existingDoc = await LotteryResult.findOne({ resultId: resultId, drawDate: targetDateStr });
    let existingDraws = [];
    if (existingDoc && existingDoc.numbers) {
        try { existingDraws = JSON.parse(existingDoc.numbers); } catch (e) { }
    }

    // 2. Merge
    const mergedMap = new Map();
    existingDraws.forEach(d => mergedMap.set(d.time, d));

    // Format new
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
        { resultId: payload.resultId, drawDate: payload.drawDate },
        payload,
        { upsert: true, new: true }
    );

    // NEW: Sync to Secondary DB
    firebaseService.syncToFirestore('results', payload.resultId, payload);
}

// --- VALIDATION LOGIC ---
async function validateCompleteness(dateStr, draws) {
    // 1. Define Standard Schedule: 10:00 AM to 10:00 PM , every 30 mins
    const startHour = 10;
    const endHour = 22; // 10 PM
    const intervalMins = 30;

    // Parse target date
    const targetDate = new Date(dateStr + 'T00:00:00');
    const now = new Date();

    // Check if target date is today
    const isToday = now.toDateString() === targetDate.toDateString();

    if (!isToday) return; // Only validate active days for alerts (historical alerts usually noise)

    const expectedTimes = [];
    let current = new Date(targetDate);
    current.setHours(startHour, 0, 0, 0);

    const end = new Date(targetDate);
    end.setHours(endHour, 0, 0, 0);

    // Buffer: Don't expect a draw if it's currently 10:05 and draw is 10:00. Give 15 mins.
    const threshold = new Date(now.getTime() - 15 * 60000);

    while (current <= end) {
        if (current > threshold) break; // Don't expect future draws

        // Format: "10:00 AM" or "01:30 PM"
        let hours = current.getHours();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'
        const mins = String(current.getMinutes()).padStart(2, '0');
        // Note: Scraper output might perform loose matching (e.g. 01:00 vs 1:00). 
        // Parser creates "01:00 PM" usually if input is "01:00". Text says "12:30 PM", "1:00 PM".
        // Let's create a normalized comparator.
        const timeLabel = `${hours}:${mins} ${ampm}`; // "10:00 AM"

        expectedTimes.push(timeLabel);

        current.setMinutes(current.getMinutes() + intervalMins);
    }

    // Check Actuals
    const actualTimes = new Set(draws.map(d => normalizeTime(d.time)));
    const missing = [];

    expectedTimes.forEach(exp => {
        if (!actualTimes.has(normalizeTime(exp))) {
            missing.push(exp);
        }
    });

    if (missing.length > 0) {
        console.warn(`[InstantCash] ⚠️ MISSING DRAWS DETECTED: ${missing.join(', ')}`);
        // Trigger Alert
        await triggerAlert(
            'MISSING_DATA',
            `Instant Cash Missing ${missing.length} Draws for ${dateStr}`,
            { missingDraws: missing, date: dateStr },
            'HIGH'
        );
    } else {
        console.log(`[InstantCash] ✅ Validation Passed: All ${expectedTimes.length} expected draws found.`);
    }
}

function normalizeTime(t) {
    // "10:00 AM" -> "10:00 AM", "01:00 PM" -> "1:00 PM"
    return t.replace(/^0/, '').trim();
}

if (require.main === module) {
    const args = process.argv.slice(2);
    const dateArg = args[0];
    scrapeInstantCashHeadless(dateArg);
}

module.exports = scrapeInstantCashHeadless;

