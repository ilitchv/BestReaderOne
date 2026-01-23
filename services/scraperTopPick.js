const axios = require('axios');
const cheerio = require('cheerio');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const LotteryResult = require('../models/LotteryResult');
const LotteryResult = require('../models/LotteryResult');
const { triggerAlert } = require('./utils/alertHelper');
const firebaseService = require('./firebaseService'); // NEW: Dual-Store

// Configuration
const TARGET_URL = 'https://tplotto.com/procedure_load_numbers_public';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Helper to format date as YYYY-MM-DD in New York Time
const formatDate = (date) => {
    // If we are given a Date object that was created from "YYYY-MM-DD", it might be UTC 00:00.
    // In NY (EST), that represents the *previous* day's 7 PM.
    // We want to treat the input date as the target day.

    // Simplest fix: Add 12 hours to ensure we are in the middle of the day before formatting to NY?
    // Or just format assuming the input is ALREADY the correct timestamp?

    // Better: Use the date string directly if possible? No, we need to support `new Date()`.

    // Fix: adjusting the date object to be "Safe".
    // If the hour is 0 (UTC midnight implications), add 12 hours.
    const safeDate = new Date(date);
    if (safeDate.getHours() === 0 && safeDate.getTimezoneOffset() < 0) {
        // It's likely a UTC date being viewed in Western hemisphere.
        safeDate.setHours(12);
    }

    const nyDate = new Date(safeDate.toLocaleString("en-US", { timeZone: "America/New_York" }));
    const year = nyDate.getFullYear();
    const month = String(nyDate.getMonth() + 1).padStart(2, '0');
    const day = String(nyDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

async function scrapeTopPick(targetDate = new Date()) {
    try {
        const formattedDate = formatDate(targetDate);
        console.log(`[TopPick] Morales Request for date: ${formattedDate}`);

        // 1. Fetch "Top Pick" (Main) from AJAX
        const responseAjax = await axios.post(TARGET_URL, new URLSearchParams({
            date: formattedDate
        }), {
            headers: {
                'User-Agent': USER_AGENT,
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'X-Requested-With': 'XMLHttpRequest'
            }
        });

        // 2. Fetch "Quick Draw" from Main Page (Assumption: Main page always has "Latest" for today)
        // If we want historical Quick Draw, we might need a different method, but for now let's grab what is on the homepage.
        // Actually, let's verify if there is an AJAX endpoint for Quick Draw history.
        // The main page has a "Load Results" button for Quick Draw too?
        // Analyzing main_page_full.html: 
        // <h3 class="title text-center">More Quick Draw Results</h3>... <button class="payment-btn" onclick="loadNumbers();">Load<span> Results</span></button>
        // It seems 'loadNumbers()' is used for BOTH? Maybe it reads the ID of the date picker?
        // But the ID for Top Pick date is 'date_selected__'.
        // Wait, looking at lines 336: id="date_selected" (Top Pick?)
        // The one for Quick Draw is at... lines not fully shown but likely similar.
        // Let's assume for now we Scrape the Main Page for the "Latest" Quick draws which cover the hourly ones.

        const responseMain = await axios.get('https://tplotto.com/', {
            headers: { 'User-Agent': USER_AGENT }
        });

        const resultsMap = new Map();

        // --- 1. PARSE AJAX (Top Pick Main) ---
        if (responseAjax.data && responseAjax.data.answer) {
            const $ = cheerio.load('<table>' + responseAjax.data.answer + '</table>');
            const parsedAjax = parseTable($, 'tr');
            parsedAjax.forEach(r => resultsMap.set(r.time, r));
        }

        // --- 2. PARSE MAIN PAGE (Both "Latest Top Pick" and "Quick Draw") ---
        if (responseMain.data) {
            const $ = cheerio.load(responseMain.data);

            // Table 1: "Latest Top Pick" (Top Block) -> ID: #pNumbers
            const parsedTopBlock = parseTable($, '#pNumbers tr');
            console.log(`[TopPick] Source Main Page (Top Block): Found ${parsedTopBlock.length} results.`);
            parsedTopBlock.forEach(r => {
                if (r.rowDate && r.rowDate !== formattedDate) return;
                resultsMap.set(r.time, r);
            });

            // Table 2: "Quick Draw" (Bottom Block) -> ID: #pfNumbers
            const parsedBottomBlock = parseTable($, '#pfNumbers tr');
            console.log(`[TopPick] Source Main Page (Bottom Block): Found ${parsedBottomBlock.length} results.`);

            parsedBottomBlock.forEach(r => {
                // Strict Date Filter
                if (r.rowDate && r.rowDate !== formattedDate) {
                    // console.log(`   > Skipping draw from ${r.rowDate} (Target: ${formattedDate})`);
                    return;
                }

                // Merge strategies: 
                // If collision, Top Block is usually "Latest Top Pick" and arguably more "featured".
                // But Bottom Block covers "history".
                // We just want ALL unique times.
                if (!resultsMap.has(r.time)) {
                    resultsMap.set(r.time, r);
                } else {
                    // console.log(`   > Duplicate time ${r.time} found in Quick Draw (ignored/already present).`);
                }
            });
        }

        const results = Array.from(resultsMap.values());

        // Sort explicitly by time for DB
        results.sort((a, b) => {
            const timeToMin = (t) => {
                const [time, period] = t.split(' ');
                let [h, m] = time.split(':').map(Number);
                if (period === 'PM' && h !== 12) h += 12;
                if (period === 'AM' && h === 12) h = 0;
                return h * 60 + m;
            };
            return timeToMin(b.time) - timeToMin(a.time); // Descending
        });

        await saveResultsToDB(results, formattedDate);

        // --- VALIDATION & ALERTING ---
        const todayStr = new Date().toLocaleDateString('en-CA');
        if (formattedDate === todayStr) {
            await validateCompleteness(formattedDate, results);
        }

    } catch (error) {
        console.error('[TopPick] Error:', error.message);
        await triggerAlert(
            'SCRAPER_FAILURE',
            `Top Pick Scraper Error: ${error.message}`,
            { error: error.message },
            'HIGH'
        );
    }
}

async function validateCompleteness(dateStr, results) {
    // Schedule: Daily 12:00 AM to 11:00 PM (Hourly) -> 00:00 to 23:00
    const startHour = 0;
    const endHour = 23;
    const intervalMins = 60;

    const targetDate = new Date(dateStr + 'T00:00:00');
    const now = new Date();

    // Check if target date is today
    const isToday = now.toDateString() === targetDate.toDateString();



    if (!isToday) return;

    const expectedTimes = [];
    let current = new Date(targetDate);
    current.setHours(startHour, 0, 0, 0);

    const end = new Date(targetDate);
    end.setHours(endHour, 0, 0, 0);

    // Buffer: 15 mins grace
    const threshold = new Date(now.getTime() - 15 * 60000);

    while (current <= end) {
        if (current > threshold) break;

        // Format: "12:00 AM", "1:00 AM" ... "11:00 PM"
        let hours = current.getHours();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        const mins = String(current.getMinutes()).padStart(2, '0');

        const timeLabel = `${hours}:${mins} ${ampm}`;
        expectedTimes.push(timeLabel);

        current.setMinutes(current.getMinutes() + intervalMins);
    }

    const actualTimes = new Set(results.map(r => r.time.replace(/^0/, '').trim()));
    const missing = [];

    expectedTimes.forEach(exp => {
        if (!actualTimes.has(exp.replace(/^0/, '').trim())) {
            missing.push(exp);
        }
    });

    if (missing.length > 0) {
        console.warn(`[TopPick] ⚠️ MISSING DRAWS DETECTED: ${missing.join(', ')}`);
        await triggerAlert(
            'MISSING_DATA',
            `Top Pick Missing ${missing.length} Draws for ${dateStr}`,
            { missingDraws: missing, date: dateStr },
            'HIGH'
        );
    } else {
        console.log(`[TopPick] ✅ Validation Passed: All ${expectedTimes.length} expected draws found.`);
    }
}

// Helper function to extract results from Cheerio rows
function parseTable($, rowSelector) {
    const rows = $(rowSelector);
    const parsed = [];

    for (let i = 0; i < rows.length; i++) {
        const row = rows.eq(i);
        // Date Span: <span class="winning-date">...</span>
        const dateSpan = row.find('span.winning-date');

        if (dateSpan.length > 0) {
            const fullDateStr = dateSpan.text().trim(); // e.g. "Jan 7 2026 11:00 PM"
            // Extract Time
            const timeMatch = fullDateStr.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
            const timeStr = timeMatch ? timeMatch[1] : fullDateStr;

            // Extract Date (YYYY-MM-DD) for filtering
            // Format: "Jan 7 2026"
            // Let's rely on Date.parse or manual
            const dateMatch = fullDateStr.match(/([a-zA-Z]{3}\s+\d{1,2}\s+\d{4})/);
            let rowDate = null;
            if (dateMatch) {
                const d = new Date(dateMatch[1]);
                if (!isNaN(d.getTime())) {
                    const y = d.getFullYear();
                    const m = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    rowDate = `${y}-${m}-${day}`;
                }
            }

            // Data should be in next available row. 
            if (i + 1 < rows.length) {
                const dataRow = rows.eq(i + 1);
                const draws = {};

                dataRow.find('ul.number-list').each((j, ul) => {
                    const $ul = $(ul);
                    const listItems = $ul.find('li');
                    let currentGame = null;
                    let currentNumbers = [];

                    const saveCurrentGame = () => {
                        if (currentGame && currentNumbers.length > 0) {
                            let count = 0;
                            if (currentGame === 'Pick 2') count = 2;
                            else if (currentGame === 'Pick 3') count = 3;
                            else if (currentGame === 'Pick 4') count = 4;
                            else if (currentGame === 'Pick 5') count = 5;

                            if (count > 0 && currentNumbers.length >= count) {
                                draws[currentGame] = currentNumbers.slice(0, count).join('');
                            }
                        }
                    };

                    listItems.each((k, li) => {
                        const $li = $(li);
                        const $img = $li.find('img');
                        if ($img.length === 0) return;

                        const src = $img.attr('src') || '';

                        let newGameType = null;
                        if (src.includes('pick2') || src.includes('/1st.png')) newGameType = 'Pick 2';
                        else if (src.includes('pick3')) newGameType = 'Pick 3';
                        else if (src.includes('pick4')) newGameType = 'Pick 4';
                        else if (src.includes('pick5')) newGameType = 'Pick 5';

                        if (newGameType) {
                            saveCurrentGame();
                            currentGame = newGameType;
                            currentNumbers = [];
                            return;
                        }
                        const ballMatch = src.match(/number(\d)\.png/);
                        if (ballMatch && currentGame) {
                            currentNumbers.push(ballMatch[1]);
                        }
                    });
                    saveCurrentGame();
                });

                if (Object.keys(draws).length > 0) {
                    parsed.push({ time: timeStr, rowDate, draws });
                }
            }
        }
    }
    return parsed;
}

async function saveResultsToDB(results, dateStr) {
    if (results.length === 0) {
        console.log('[TopPick] No results to save.');
        return;
    }

    try {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGODB_URI);
        }

        // Schema requires: resultId, country, lotteryName, drawName, numbers, drawDate
        const payload = {
            resultId: 'special/top-pick',
            country: 'SPECIAL',
            lotteryName: 'Top Pick Lotto',
            drawName: 'All Day',
            drawDate: dateStr, // String YYYY-MM-DD
            numbers: JSON.stringify(results),
            scrapedAt: new Date()
        };

        const doc = await LotteryResult.findOneAndUpdate(
            { resultId: payload.resultId, drawDate: payload.drawDate },
            payload,
            { upsert: true, new: true, runValidators: true }
        );

        // NEW: Sync to Secondary DB
        firebaseService.syncToFirestore('results', payload.resultId, payload);

        console.log(`[TopPick] Saved to DB. ID: ${doc._id}`);
    } catch (err) {
        console.error('[TopPick] DB Error:', err);
    } finally {
        // Do not disconnect if running in server mode
        // await mongoose.disconnect();
    }
}

if (require.main === module) {
    const args = process.argv.slice(2);
    let date = new Date();
    if (args.length > 0) {
        // Append Time to avoid UTC rollback
        date = new Date(args[0] + 'T12:00:00');
    }
    scrapeTopPick(date);
}

module.exports = scrapeTopPick;
