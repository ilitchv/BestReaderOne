const cron = require('node-cron');
const LotteryResult = require('../models/LotteryResult');
const Track = require('../models/Track');
const { scrapeState } = require('./scraperEngine');

// --- CONFIGURATION ---
// Maps our internal IDs to Sniper Config Keys and external IDs
const STATE_MAP = {
    'ny': { id: 'ny', name: 'New York', country: 'USA' },
    'nj': { id: 'nj', name: 'New Jersey', country: 'USA' },
    'ct': { id: 'ct', name: 'Connecticut', country: 'USA' },
    'fl': { id: 'fl', name: 'Florida', country: 'USA' },
    'ga': { id: 'ga', name: 'Georgia', country: 'USA' },
    'pa': { id: 'pa', name: 'Pennsylvania', country: 'USA' }
};

const SNIPER_CONFIG = {
    ny: {
        name: "New York",
        p3: {
            mid: { urls: ['https://www.lotteryusa.com/new-york/midday-numbers/'], label: 'Midday' },
            eve: { urls: ['https://www.lotteryusa.com/new-york/numbers/'], label: 'Evening' }
        },
        p4: {
            mid: { urls: ['https://www.lotteryusa.com/new-york/midday-win-4/'], label: 'Midday' },
            eve: { urls: ['https://www.lotteryusa.com/new-york/win-4/'], label: 'Evening' }
        }
    },
    nj: {
        name: "New Jersey",
        p3: {
            mid: { urls: ['https://www.lotteryusa.com/new-jersey/midday-pick-3/'], label: 'Midday' },
            eve: { urls: ['https://www.lotteryusa.com/new-jersey/pick-3/'], label: 'Evening' }
        },
        p4: {
            mid: { urls: ['https://www.lotteryusa.com/new-jersey/midday-pick-4/'], label: 'Midday' },
            eve: { urls: ['https://www.lotteryusa.com/new-jersey/pick-4/'], label: 'Evening' }
        }
    },
    ct: {
        name: "Connecticut",
        p3: {
            mid: { urls: ['https://www.lotteryusa.com/connecticut/midday-3/'], label: 'Midday' },
            eve: { urls: ['https://www.lotteryusa.com/connecticut/play-3/'], label: 'Night' }
        },
        p4: {
            mid: { urls: ['https://www.lotteryusa.com/connecticut/midday-4/'], label: 'Midday' },
            eve: { urls: ['https://www.lotteryusa.com/connecticut/play-4/'], label: 'Night' }
        }
    },
    fl: {
        name: "Florida",
        p3: {
            mid: { urls: ['https://www.lotteryusa.com/florida/midday-pick-3/'], label: 'Midday' },
            eve: { urls: ['https://www.lotteryusa.com/florida/pick-3/'], label: 'Evening' }
        },
        p4: {
            mid: { urls: ['https://www.lotteryusa.com/florida/midday-pick-4/'], label: 'Midday' },
            eve: { urls: ['https://www.lotteryusa.com/florida/pick-4/'], label: 'Evening' }
        }
    },
    ga: {
        name: "Georgia",
        p3: {
            mid: { urls: ['https://www.lotteryusa.com/georgia/midday-3/'], label: 'Midday' },
            eve: { urls: ['https://www.lotteryusa.com/georgia/cash-3-evening/'], label: 'Evening' },
            ngt: { urls: ['https://www.lotteryusa.com/georgia/cash-3/'], label: 'Night' }
        },
        p4: {
            mid: { urls: ['https://www.lotteryusa.com/georgia/midday-4/'], label: 'Midday' },
            eve: { urls: ['https://www.lotteryusa.com/georgia/cash-4-evening/'], label: 'Evening' },
            ngt: { urls: ['https://www.lotteryusa.com/georgia/cash-4/'], label: 'Night' }
        }
    },
    pa: {
        name: "Pennsylvania",
        p3: {
            mid: { urls: ['https://www.lotteryusa.com/pennsylvania/midday-pick-3/'], label: 'Day' },
            eve: { urls: ['https://www.lotteryusa.com/pennsylvania/pick-3/'], label: 'Evening' }
        },
        p4: {
            mid: { urls: ['https://www.lotteryusa.com/pennsylvania/midday-pick-4/'], label: 'Day' },
            eve: { urls: ['https://www.lotteryusa.com/pennsylvania/pick-4/'], label: 'Evening' }
        }
    }
};

const GLOBAL_ADMIN_ID = "sniper_global_master_v1";

const fetchAndParse = async () => {
    console.log('📡 Starting Data Cycle (Real Scraper)...');

    for (const [stateKey, config] of Object.entries(SNIPER_CONFIG)) {
        try {
            console.log(`   Running ${config.name}...`);
            const data = await scrapeState(stateKey, config);

            // Process Draws (Midday, Evening, Night)
            await processDraw(stateKey, config.name, 'Midday', data?.midday);
            await processDraw(stateKey, config.name, 'Evening', data.evening);
            if (data?.night) await processDraw(stateKey, config.name, 'Night', data.night);

        } catch (e) {
            console.error(`❌ Error scraping ${stateKey}:`, e.message);
        }
    }
};

async function processDraw(stateKey, stateName, timeLabel, result) {
    if (!result || !result.p3 || !result.w4 || !result.date) return;

    // 1. Save to Sniper Track Model
    try {
        const dateObj = new Date(result.date + 'T12:00:00Z');
        // Composite check
        const exists = await Track.findOne({
            userId: GLOBAL_ADMIN_ID,
            lottery: stateName,
            date: dateObj,
            time: timeLabel
        });

        if (!exists) {
            await Track.create({
                userId: GLOBAL_ADMIN_ID,
                lottery: stateName,
                date: dateObj, // Stored as Date object in Schema? Or String? 
                // Wait, Schema has 'date: String' (YYYY-MM-DD) OR Date? 
                // Checking Schema: date: String is what I wrote in Step 279.
                // But original Track might have been Date. 
                // Let's stick to String YYYY-MM-DD to be consistent with Schema I wrote.
                // Actually my Schema in Step 279 says: `date: String, // YYYY-MM-DD`.
                // So I should save as String.

                // Correction:
                date: result.date, // ISO String YYYY-MM-DD
                time: timeLabel,
                p3: result.p3,
                pick3: result.p3, // alias
                pick4: result.w4, // alias
                first: result.p3, // simplified mapping
                second: "---",
                third: "---",

                source: 'AutoScraper',
                createdAt: new Date()
            });
            console.log(`   ✅ Saved Track: ${stateName} ${timeLabel} [${result.date}]`);
        }
    } catch (e) {
        if (e.code !== 11000) console.error(`      Error saving Track: ${e.message}`);
    }

    // 2. Save to LotteryResult (Main Dashboard)
    // Map to LotteryResult schema: { resultId, country, lotteryName, drawName, numbers, drawDate... }
    try {
        const resultId = `usa/${stateKey}/${timeLabel}`;
        const numbers = `${result.p3}-${result.w4}`; // Combined format? Or Mock format?
        // Mock format was typically specific to game. 
        // Let's optimize for display.

        await LotteryResult.updateOne(
            { resultId: resultId, drawDate: result.date },
            {
                $set: {
                    resultId: resultId,
                    country: 'USA',
                    lotteryName: stateName,
                    drawName: timeLabel,
                    numbers: numbers,
                    drawDate: result.date,
                    scrapedAt: new Date(),
                    // lastDrawTime, closeTime - optional or static
                }
            },
            { upsert: true }
        );
        // console.log(`   ✅ Saved LotteryResult: ${resultId}`);
    } catch (e) {
        console.error(`      Error saving LotteryResult: ${e.message}`);
    }
}

// Initialize Cron Job
const startResultScheduler = () => {
    // Run every 10 minutes
    cron.schedule('*/10 * * * *', () => {
        fetchAndParse();
    });

    // RUN IMMEDIATELY (with slight delay)
    console.log('⏳ Scheduler started. Initial scrape in 5s...');
    setTimeout(fetchAndParse, 5000);
};

module.exports = {
    startResultScheduler,
    fetchAndParse
};