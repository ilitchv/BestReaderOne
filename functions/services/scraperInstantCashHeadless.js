const puppeteer = require('puppeteer');
const mongoose = require('mongoose');
const LotteryResult = require('../models/LotteryResult');
const { triggerAlert } = require('./utils/alertHelper');

// Configuration
const TARGET_URL = 'https://instantcash.bet';
const MAX_RETRIES = 2; // Reduced for Cloud Functions to avoid timeouts

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
            if (attempts > 1) console.log(`[InstantCash] Retry attempt ${attempts}/${MAX_RETRIES}...`);

            browser = await puppeteer.launch({
                headless: "new",
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
            });
            const page = await browser.newPage();
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

            // 1. Navigate
            console.log(`[InstantCash] Navigating...`);
            await page.goto(TARGET_URL, { waitUntil: 'networkidle2', timeout: 45000 });

            // 2. Wait for hydration
            await new Promise(r => setTimeout(r, 8000));

            // 3. Semantics
            try {
                const btnSelector = 'flt-semantics-placeholder';
                await page.waitForSelector(btnSelector, { timeout: 5000 });
                await page.evaluate((sel) => {
                    const el = document.querySelector(sel);
                    if (el) el.click();
                }, btnSelector);
            } catch (e) {
                console.warn('[InstantCash] Semantics click warning:', e);
            }
            await new Promise(r => setTimeout(r, 2000));

            // 4. Scroll
            const allExtractedTexts = [];
            const collectedHashes = new Set();
            const scrollLimit = targetDateArg ? 100 : 50; // Reduce scroll limit slightly for Cloud Function speed

            for (let i = 0; i < scrollLimit; i++) {
                const currentText = await page.evaluate(() => {
                    function getVisibleText(node) {
                        if (node.nodeType === Node.TEXT_NODE) return node.textContent.trim();
                        if (node.nodeType !== Node.ELEMENT_NODE) return "";
                        try {
                            const style = window.getComputedStyle(node);
                            if (style.display === 'none' || style.visibility === 'hidden') return "";
                        } catch (e) { }
                        let text = "";
                        for (let child of node.childNodes) text += " " + getVisibleText(child);
                        if (node.getAttribute && node.getAttribute('aria-label')) text += " [ARIA: " + node.getAttribute('aria-label') + "] ";
                        return text;
                    }
                    return getVisibleText(document.body);
                });

                const hash = currentText.length + "-" + currentText.substring(0, 50);
                if (!collectedHashes.has(hash)) {
                    allExtractedTexts.push(currentText);
                    collectedHashes.add(hash);
                }

                await page.evaluate(() => {
                    const nodes = document.querySelectorAll('flt-semantics');
                    if (nodes.length > 0) nodes[nodes.length - 1].scrollIntoView();
                    else window.scrollBy(0, window.innerHeight);
                });
                await new Promise(r => setTimeout(r, 800)); // slightly faster
            }

            const extractedData = allExtractedTexts.join(" ||CHUNK|| ");
            const resultsByDate = parseResults(extractedData);

            if (Object.keys(resultsByDate).length > 0) {
                for (const [dateStr, draws] of Object.entries(resultsByDate)) {
                    await saveResults(draws, dateStr);
                }
                const dateToValidate = targetDateArg || new Date().toLocaleDateString('en-CA');
                if (resultsByDate[dateToValidate]) {
                    await validateCompleteness(dateToValidate, resultsByDate[dateToValidate]);
                }
                if (browser) await browser.close();
                return;
            } else {
                throw new Error("No results found in extracted text.");
            }

        } catch (error) {
            console.error(`[InstantCash] Error on attempt ${attempts}:`, error.message);
            if (browser) await browser.close();
            if (attempts >= MAX_RETRIES) {
                await triggerAlert('SCRAPER_FAILURE', 'Instant Cash Scraper Failed', { error: error.message }, 'HIGH');
            } else {
                await new Promise(r => setTimeout(r, 5000));
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
            const content = chunk.replace(e.val, '');
            const numsMatch = content.match(/((?:\d\s*,?\s*){10,})/);
            if (numsMatch) {
                const rawNums = numsMatch[0].replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
                const numArr = rawNums.split(' ');
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
    const resultId = 'special/instant-cash';
    let existingDoc = await LotteryResult.findOne({ resultId: resultId, drawDate: targetDateStr });
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
    console.log(`[InstantCash] Saved ${mergedDraws.length} draws for ${targetDateStr}.`);
}

async function validateCompleteness(dateStr, draws) {
    const startHour = 10;
    const endHour = 22;
    const intervalMins = 30;
    const targetDate = new Date(dateStr + 'T00:00:00');
    const now = new Date();
    const isToday = now.toDateString() === targetDate.toDateString();
    if (!isToday) return;

    const expectedTimes = [];
    let current = new Date(targetDate);
    current.setHours(startHour, 0, 0, 0);
    const end = new Date(targetDate);
    end.setHours(endHour, 0, 0, 0);
    const threshold = new Date(now.getTime() - 15 * 60000);

    while (current <= end) {
        if (current > threshold) break;
        let hours = current.getHours();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        const mins = String(current.getMinutes()).padStart(2, '0');
        const timeLabel = `${hours}:${mins} ${ampm}`;
        expectedTimes.push(timeLabel);
        current.setMinutes(current.getMinutes() + intervalMins);
    }

    const actualTimes = new Set(draws.map(d => d.time.replace(/^0/, '').trim()));
    const missing = [];
    expectedTimes.forEach(exp => {
        if (!actualTimes.has(exp.replace(/^0/, '').trim())) missing.push(exp);
    });

    if (missing.length > 0) {
        console.warn(`[InstantCash] ⚠️ MISSING DRAWS DETECTED: ${missing.join(', ')}`);
        await triggerAlert(
            'MISSING_DATA',
            `Instant Cash Missing ${missing.length} Draws for ${dateStr}`,
            { missingDraws: missing, date: dateStr },
            'HIGH'
        );
    }
}

module.exports = scrapeInstantCashHeadless;
