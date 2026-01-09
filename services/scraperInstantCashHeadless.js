const puppeteer = require('puppeteer');
const mongoose = require('mongoose');
require('dotenv').config();
const LotteryResult = require('../models/LotteryResult');

// Configuration
const TARGET_URL = 'https://instantcash.bet';
const MAX_RETRIES = 1;

/**
 * Scrapes Instant Cash results using a headless browser.
 */
async function scrapeInstantCashHeadless(targetDateArg) {
    console.log('[InstantCash] Starting Headless Scraper...');

    let attempts = 0;
    while (attempts < MAX_RETRIES) {
        attempts++;
        let browser = null;
        try {
            if (attempts > 1) {
                console.log(`[InstantCash] Retry attempt ${attempts}/${MAX_RETRIES}...`);
            }

            browser = await puppeteer.launch({
                headless: "new",
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
            });
            const page = await browser.newPage();

            // Set User Agent to avoid bot detection
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

            // 1. Navigate
            console.log(`[InstantCash] Navigating to ${TARGET_URL}...`);
            await page.goto(TARGET_URL, { waitUntil: 'networkidle2', timeout: 60000 });

            // 2. Wait for Flutter app to hydrate (heuristic wait)
            console.log('[InstantCash] Waiting for app hydration (10s)...');
            await new Promise(r => setTimeout(r, 10000));

            // 3. Enable Accessibility ONCE (or try to keep it enabled)
            // It seems Flutter accessibility might need re-enabling or stays on.
            // Let's force it at the start.
            await page.evaluate(() => {
                const fltBtn = document.querySelector('flt-semantics-placeholder');
                if (fltBtn) fltBtn.click();
            });
            await new Promise(r => setTimeout(r, 2000));

            // 4. Incremental Scroll & Scrape
            console.log('[InstantCash] starting incremental scrape (Mouse Wheel Mode)...');
            const allExtractedTexts = [];

            // 4a. Capture INITIAL Viewport (Top of list = Latest results)
            try {
                const initialText = await page.evaluate(() => document.body.innerText);
                allExtractedTexts.push(initialText);
                console.log(`[InstantCash] Captured initial viewport (${initialText.length} chars).`);
            } catch (e) {
                console.warn("[InstantCash] Initial capture warn:", e);
            }

            await page.evaluate(async () => {
                // Define helper inside evaluate context
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

                window.collectedText = ""; // Global buffer

                // Improved Scroll for Flutter (Virtual Lists often ignore window.scroll)
                const viewportHeight = window.innerHeight;
                const centerX = window.innerWidth / 2;
                const centerY = viewportHeight / 2;

                // We use Puppeteer's native mouse wheel in the main node context, 
                // but here (inside evaluate) we can only sleep or gather text.
                // We must move the scroll logic OUT to the main Puppeteer loop.
            });

            // 4b. MAIN LOOP with MOUSE WHEEL
            // Optimize: Reduced from 120 to 30 for faster updates (approx 1 hr coverage is enough for frequent runs)
            for (let i = 0; i < 30; i++) {
                // Mouse Wheel Scroll (Generic)
                await page.mouse.move(200, 300); // Move over potential list
                await page.mouse.wheel({ deltaY: 800 });

                await new Promise(r => setTimeout(r, 1500)); // Wait for render

                // Extract Text incrementally using robust Shadow DOM walker
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
                allExtractedTexts.push(currentText);
            }

            // Re-combine
            const extractedData = allExtractedTexts.join(" ||CHUNK|| ");

            // (Legacy code cleanup)

            console.log(`[InstantCash] Raw Extracted (First 200 chars): ${extractedData.slice(0, 200)}`);

            // Generate Target Date Str
            // If explicit date passed, use it. Else default to NY Time Today.
            let targetStr;
            if (targetDateArg) {
                targetStr = targetDateArg;
            } else {
                const nyDate = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
                const year = nyDate.getFullYear();
                const month = String(nyDate.getMonth() + 1).padStart(2, '0');
                const day = String(nyDate.getDate()).padStart(2, '0');
                targetStr = `${year}-${month}-${day}`;
            }

            console.log(`[InstantCash] Parsing for Target Date: ${targetStr}`);
            const results = parseResults(extractedData, targetStr);
            console.log(`[InstantCash] Parsed ${results.length} draws.`);

            if (results.length > 0) {
                await saveResults(results, targetStr);
                console.log('[InstantCash] Data successfully saved.');
                // Success - break loop
                if (browser) await browser.close();
                return;
            } else {
                console.warn('[InstantCash] No results found. Might be legitimate or scraping failure.');
                // If it's a failure, we might want to retry? 
                // Let's retry if result count is 0, just in case DOM wasn't ready.
                throw new Error("No results found in extracted text.");
            }

        } catch (error) {
            console.error(`[InstantCash] Error on attempt ${attempts}:`, error.message);
            if (browser) await browser.close();

            if (attempts >= MAX_RETRIES) {
                console.error('[InstantCash] Max retries reached. Giving up.');
            } else {
                console.log('[InstantCash] Waiting 10s before retry...');
                await new Promise(r => setTimeout(r, 10000));
            }
        }
    }
}

function parseResults(text, targetDateStr) {
    const draws = [];

    // Regex for Date headers and Time rows
    const dateRegex = /([a-zA-Z]{3}\s+\d{1,2},?\s+\d{4})/gi; // "Jan 8, 2026"
    const timeRegex = /(\d{1,2}:\d{2}\s*(?:AM|PM))/gi; // "12:00 PM"

    const events = [];
    let match;

    // 1. Find all Date occurrences
    while ((match = dateRegex.exec(text)) !== null) {
        events.push({ type: 'DATE', val: match[1], index: match.index });
    }

    // 2. Find all Time occurrences
    while ((match = timeRegex.exec(text)) !== null) {
        events.push({ type: 'TIME', val: match[0], index: match.index });
    }

    // 3. Sort by index to reconstruct the flow
    events.sort((a, b) => a.index - b.index);

    let currentRowDateStr = null; // State

    for (let i = 0; i < events.length; i++) {
        const e = events[i];

        if (e.type === 'DATE') {
            const d = new Date(e.val);
            if (!isNaN(d.getTime())) {
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                currentRowDateStr = `${year}-${month}-${day}`;
            }
        }
        else if (e.type === 'TIME') {
            if (!currentRowDateStr) continue;

            // FILTER:
            if (currentRowDateStr !== targetDateStr) {
                continue;
            }

            // Extract numbers from lookahead chunk
            const nextEventIndex = (i + 1 < events.length) ? events[i + 1].index : text.length;
            const chunk = text.substring(e.index, nextEventIndex);

            // Remove time string from chunk
            const content = chunk.replace(e.val, '');

            // Regex for numbers
            const numsMatch = content.match(/((?:\d\s*,?\s*){10,})/);
            if (numsMatch) {
                const rawNums = numsMatch[0].replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
                const numArr = rawNums.split(' ');

                draws.push({
                    time: e.val,
                    numbers: numArr.join('-')
                });
            }
        }
    }

    return draws;
}

async function saveResults(draws, targetDateStr) {
    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(process.env.MONGODB_URI);
    }

    const resultId = 'special/instant-cash';

    // 1. Fetch Existing
    let existingDoc = await LotteryResult.findOne({ resultId: resultId, drawDate: targetDateStr });
    let existingDraws = [];

    if (existingDoc && existingDoc.numbers) {
        try {
            existingDraws = JSON.parse(existingDoc.numbers);
        } catch (e) {
            console.warn('[InstantCash] Failed to parse existing numbers JSON', e);
        }
    }

    // 2. Format New Draws
    const newDrawsFormatted = draws.map(d => ({
        time: d.time,
        draws: { "All": d.numbers }
    }));

    // 3. Merge Logic (Deduplicate by Time)
    // Create a map of time -> draw
    const mergedMap = new Map();

    // Load existing first
    existingDraws.forEach(d => {
        mergedMap.set(d.time, d);
    });

    // Overwrite/Add new
    newDrawsFormatted.forEach(d => {
        mergedMap.set(d.time, d);
    });

    // Convert back to array
    const mergedDraws = Array.from(mergedMap.values());

    console.log(`[InstantCash] Merged ${existingDraws.length} existing + ${newDrawsFormatted.length} new = ${mergedDraws.length} total draws.`);

    const payload = {
        resultId,
        country: 'SPECIAL',
        lotteryName: 'Instant Cash',
        drawName: 'All Day',
        drawDate: targetDateStr,
        numbers: JSON.stringify(mergedDraws),
        scrapedAt: new Date()
    };

    const doc = await LotteryResult.findOneAndUpdate(
        { resultId: payload.resultId, drawDate: payload.drawDate },
        payload,
        { upsert: true, new: true }
    );
    console.log(`[InstantCash] Saved to DB. ID: ${doc._id}`);
}

// Execute if running directly
if (require.main === module) {
    const args = process.argv.slice(2);
    const dateArg = args[0]; // e.g. "2026-01-07"
    scrapeInstantCashHeadless(dateArg);
}

module.exports = scrapeInstantCashHeadless;
