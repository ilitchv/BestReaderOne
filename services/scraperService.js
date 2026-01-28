
const cron = require('node-cron');
const LotteryResult = require('../models/LotteryResult');
const Track = require('../models/Track');
const { scrapeState } = require('./scraperEngine');
const scraperRD = require('./scraperRD'); // Import RD Scraper
const scraperTopPick = require('./scraperTopPick');
// const scraperInstantCashHeadless = require('./scraperInstantCashHeadless'); // LAZY LOADED TO PREVENT PUPPETEER CRASH
const { validateResult } = require('./validationService');
const SystemAlert = require('../models/SystemAlert');
const firebaseService = require('./firebaseService'); // NEW: Dual-Store

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
            mid: { urls: ['https://www.lotteryusa.com/new-york/midday-numbers/', 'https://www.lottery.net/new-york/numbers-midday/numbers'], label: 'Midday' },
            eve: { urls: ['https://www.lotteryusa.com/new-york/numbers/', 'https://www.lottery.net/new-york/numbers-evening/numbers'], label: 'Evening' }
        },
        p4: {
            mid: { urls: ['https://www.lotteryusa.com/new-york/midday-win-4/', 'https://www.lottery.net/new-york/win-4-midday/numbers'], label: 'Midday' },
            eve: { urls: ['https://www.lotteryusa.com/new-york/win-4/', 'https://www.lottery.net/new-york/win-4-evening/numbers'], label: 'Evening' }
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
            mid: { urls: ['https://www.lotteryusa.com/pennsylvania/midday-pick-3/'], label: 'Midday' },
            eve: { urls: ['https://www.lotteryusa.com/pennsylvania/pick-3/'], label: 'Evening' }
        },
        p4: {
            mid: { urls: ['https://www.lotteryusa.com/pennsylvania/midday-pick-4/'], label: 'Midday' },
            eve: { urls: ['https://www.lotteryusa.com/pennsylvania/pick-4/'], label: 'Evening' }
        }
    },
    // --- NEW STATES EXPANSION ---
    tx: {
        name: "Texas",
        p3: {
            mor: { urls: ['https://www.lotteryusa.com/texas/morning-pick-3/'], label: 'Morning' },
            mid: { urls: ['https://www.lotteryusa.com/texas/midday-pick-3/'], label: 'Day' },
            eve: { urls: ['https://www.lotteryusa.com/texas/evening-pick-3/'], label: 'Evening' },
            ngt: { urls: ['https://www.lotteryusa.com/texas/pick-3/'], label: 'Night' }
        },
        p4: {
            mor: { urls: ['https://www.lotteryusa.com/texas/morning-pick-4/'], label: 'Morning' },
            mid: { urls: ['https://www.lotteryusa.com/texas/midday-4/'], label: 'Day' },
            eve: { urls: ['https://www.lotteryusa.com/texas/evening-pick-4/'], label: 'Evening' },
            ngt: { urls: ['https://www.lotteryusa.com/texas/daily-4/'], label: 'Night' }
        }
    },
    md: {
        name: "Maryland",
        p3: {
            mid: { urls: ['https://www.lotteryusa.com/maryland/midday-pick-3/'], label: 'Midday' },
            eve: { urls: ['https://www.lotteryusa.com/maryland/pick-3/'], label: 'Evening' }
        },
        p4: {
            mid: { urls: ['https://www.lotteryusa.com/maryland/midday-pick-4/'], label: 'Midday' },
            eve: { urls: ['https://www.lotteryusa.com/maryland/pick-4/'], label: 'Evening' }
        }
    },
    sc: {
        name: "South Carolina",
        p3: {
            mid: { urls: ['https://www.lotteryusa.com/south-carolina/midday-pick-3/'], label: 'Midday' },
            eve: { urls: ['https://www.lotteryusa.com/south-carolina/pick-3/'], label: 'Evening' }
        },
        p4: {
            mid: { urls: ['https://www.lotteryusa.com/south-carolina/midday-pick-4/'], label: 'Midday' },
            eve: { urls: ['https://www.lotteryusa.com/south-carolina/pick-4/'], label: 'Evening' }
        }
    },
    mi: {
        name: "Michigan",
        p3: {
            mid: { urls: ['https://www.lotteryusa.com/michigan/midday-3/'], label: 'Day' },
            eve: { urls: ['https://www.lotteryusa.com/michigan/daily-3/'], label: 'Evening' }
        },
        p4: {
            mid: { urls: ['https://www.lotteryusa.com/michigan/midday-4/'], label: 'Day' },
            eve: { urls: ['https://www.lotteryusa.com/michigan/daily-4/'], label: 'Evening' }
        }
    },
    de: {
        name: "Delaware",
        p3: {
            mid: { urls: ['https://www.lotteryusa.com/delaware/play-3-midday/year'], label: 'Day' },
            eve: { urls: ['https://www.lotteryusa.com/delaware/play-3-night/year', 'https://www.lotteryusa.com/delaware/play-3/year'], label: 'Night' }
        },
        p4: {
            mid: { urls: ['https://www.lotteryusa.com/delaware/play-4-midday/year'], label: 'Day' },
            eve: { urls: ['https://www.lotteryusa.com/delaware/play-4-night/year', 'https://www.lotteryusa.com/delaware/play-4/year'], label: 'Night' }
        }
    },
    tn: {
        name: "Tennessee",
        p3: {
            mid: { urls: ['https://www.lotteryusa.com/tennessee/cash-3/year'], label: 'Midday' },
            eve: { urls: ['https://www.lotteryusa.com/tennessee/cash-3/year'], label: 'Evening' },
            mor: { urls: ['https://www.lotteryusa.com/tennessee/morning-cash-3/year', 'https://www.lotteryusa.com/tennessee/cash-3/year'], label: 'Morning' }
        },
        p4: {
            mid: { urls: ['https://www.lotteryusa.com/tennessee/cash-4/year'], label: 'Midday' },
            eve: { urls: ['https://www.lotteryusa.com/tennessee/cash-4/year'], label: 'Evening' },
            mor: { urls: ['https://www.lotteryusa.com/tennessee/morning-cash-4/year', 'https://www.lotteryusa.com/tennessee/cash-4/year'], label: 'Morning' }
        }
    },
    ma: {
        name: "Massachusetts",
        p3: {
            mid: { urls: ['https://www.lotteryusa.com/massachusetts/numbers/year'], label: 'Midday' },
            eve: { urls: ['https://www.lotteryusa.com/massachusetts/numbers/year'], label: 'Evening' }
        },
        p4: {
            mid: { urls: ['https://www.lotteryusa.com/massachusetts/numbers/year'], label: 'Midday' },
            eve: { urls: ['https://www.lotteryusa.com/massachusetts/numbers/year'], label: 'Evening' }
        }
    },
    va: {
        name: "Virginia",
        p3: {
            mid: { urls: ['https://www.lotteryusa.com/virginia/pick-3/year'], label: 'Day' },
            eve: { urls: ['https://www.lotteryusa.com/virginia/pick-3/year'], label: 'Night' }
        },
        p4: {
            mid: { urls: ['https://www.lotteryusa.com/virginia/pick-4/year'], label: 'Day' },
            eve: { urls: ['https://www.lotteryusa.com/virginia/pick-4/year'], label: 'Night' }
        }
    },
    nc: {
        name: "North Carolina",
        p3: {
            mid: { urls: ['https://www.lotteryusa.com/north-carolina/pick-3/year'], label: 'Day' },
            eve: { urls: ['https://www.lotteryusa.com/north-carolina/pick-3/year'], label: 'Evening' }
        },
        p4: {
            mid: { urls: ['https://www.lotteryusa.com/north-carolina/pick-4/year'], label: 'Day' },
            eve: { urls: ['https://www.lotteryusa.com/north-carolina/pick-4/year'], label: 'Evening' }
        }
    }
};

const GLOBAL_ADMIN_ID = "sniper_global_master_v1";

async function processDraw(stateKey, stateName, timeLabel, result) {
    if (!result || !result.p3 || !result.w4 || !result.date) return;

    const resultId = `usa/${stateKey}/${timeLabel}`;
    const numbers = `${result.p3}-${result.w4}`;

    // --- VALIDATION GATEKEEPER ---
    const check = validateResult(resultId, result.date, numbers);
    if (!check.valid) {
        console.warn(`[VALIDATION BLOCKED] ${resultId}: ${check.reason} (Data: ${numbers} Date: ${result.date})`);
        return;
    }
    // -----------------------------

    // 1. Save to Sniper Track Model
    try {
        const dateObj = new Date(result.date + 'T12:00:00Z');
        const exists = await Track.findOne({
            userId: GLOBAL_ADMIN_ID,
            lottery: stateName,
            date: dateObj,
            time: timeLabel
        });

        if (!exists) {
            if (result.p3.includes('---') || result.w4.includes('---')) {
                console.log(`      ⚠️ Skipping Track Save: ${stateName} ${timeLabel} (Contains Dashed/Empty Data)`);
            } else {
                await Track.create({
                    userId: GLOBAL_ADMIN_ID,
                    lottery: stateName,
                    date: result.date,
                    time: timeLabel,
                    p3: result.p3,
                    pick3: result.p3,
                    pick4: result.w4,
                    first: result.p3,
                    second: "---",
                    third: "---",
                    source: 'AutoScraper',
                    createdAt: new Date()
                });
                console.log(`   ✅ Saved Track: ${stateName} ${timeLabel} [${result.date}]`);
            }
        }
    } catch (e) {
        if (e.code !== 11000) console.error(`      Error saving Track: ${e.message}`);
    }

    // 2. Save to LotteryResult (Main Dashboard)
    try {
        const resultId = `usa/${stateKey}/${timeLabel}`;
        const numbers = `${result.p3}-${result.w4}`;

        // INTEGRITY CHECK
        if (result.p3.includes('---') && result.w4.includes('---')) {
            console.log(`      ⚠️ Skipping Dashboard Save: ${stateName} ${timeLabel} (Both Empty)`);
            return;
        }

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
                }
            },
            { upsert: true, new: true }
        );

        // NEW: Sync to Secondary DB
        firebaseService.syncToFirestore('results', resultId, {
            resultId,
            country: 'USA',
            lotteryName: stateName,
            drawName: timeLabel,
            numbers: numbers,
            drawDate: result.date,
            scrapedAt: new Date()
        });

        // --- DERIVED RESULTS LOGIC (NEW YORK ONLY) ---
        // Brooklyn = Last 3 digits of Win 4
        // Front = First 3 digits of Win 4
        if (stateKey === 'ny' && result.w4 && result.w4.length === 4 && result.w4 !== '----') {
            const win4 = result.w4;
            const brooklyn = win4.substring(1, 4); // Index 1,2,3 (Last 3)
            const front = win4.substring(0, 3);    // Index 0,1,2 (First 3)

            console.log(`      🗽 NY DETECTED (${timeLabel}): Deriving Brooklyn (${brooklyn}) & Front (${front})`);

            // Common Metadata
            const derivedBase = {
                country: 'USA', // Or 'SPECIAL'
                drawDate: result.date,
                scrapedAt: new Date()
            };

            // BROOKLYN
            // Map Midday -> Midday, Evening -> Evening
            const bkId = `special/bk/${timeLabel}`;
            await LotteryResult.updateOne(
                { resultId: bkId, drawDate: result.date },
                {
                    $set: {
                        ...derivedBase,
                        resultId: bkId,
                        lotteryName: 'Brooklyn',
                        drawName: timeLabel,
                        numbers: brooklyn // Just 3 digits
                    }
                }, { upsert: true }
            );

            // FRONT
            const frontId = `special/front/${timeLabel}`;
            await LotteryResult.updateOne(
                { resultId: frontId, drawDate: result.date },
                {
                    $set: {
                        ...derivedBase,
                        resultId: frontId,
                        lotteryName: 'Win-4 Front',
                        drawName: timeLabel === 'Midday' ? 'AM' : 'PM', // User asked for AM/PM label
                        numbers: front // Just 3 digits
                    }
                }, { upsert: true }
            );
        }

    } catch (e) {
        console.error(`      Error saving LotteryResult: ${e.message}`);
    }
}

// Helper to Create Alert (Deduped)
const triggerAlert = async (type, message, metadata = {}, severity = 'MEDIUM') => {
    try {
        // Prevent spamming the same alert if one is already active
        const existing = await SystemAlert.findOne({ type, message, active: true });
        if (!existing) {
            await SystemAlert.create({ type, message, metadata, severity });
            console.log(`🚨 ALERT GENERATED: ${message}`);
        }
    } catch (e) {
        console.error("Failed to generate alert:", e);
    }
};

// --- SCHEDULER LOGIC ---

// Flags to prevent overlapping runs (Robustness)
let isFastRunning = false;
let isHeavyRunning = false;

// Queue A: Fast Scrapers (RD + USA) - Runs every 2 minutes
const runFastQueue = async () => {
    if (isFastRunning) {
        console.warn('⚠️ [Fast Queue] Previous run still active. Skipping this cycle.');
        return;
    }
    isFastRunning = true;
    console.log('🚀 [Fast Queue] Starting Cycle: RD + USA Scrapers');
    const start = Date.now();

    try {
        // 1. RD Scraper
        try {
            await scraperRD.fetchAndProcess();
        } catch (e) {
            console.error("   ❌ RD Scraper Failed:", e.message);
            await triggerAlert('SCRAPER_FAILURE', 'RD Scraper Logic Failed', { error: e.message }, 'HIGH');
        }

        // 2. USA Scrapers
        const fastPromises = [];
        // 2. USA Scrapers (Batched to prevent Vercel Resource Exhaustion)
        const entries = Object.entries(SNIPER_CONFIG);
        const BATCH_SIZE = 3; // Process 3 states at a time

        for (let i = 0; i < entries.length; i += BATCH_SIZE) {
            const batch = entries.slice(i, i + BATCH_SIZE);
            const batchPromises = batch.map(async ([stateKey, config]) => {
                try {
                    const data = await scrapeState(stateKey, config);

                    // Process Midday
                    if (data?.midday) await processDraw(stateKey, config.name, config.p3.mid?.label || 'Midday', data.midday);
                    // Process Evening
                    if (data?.evening) await processDraw(stateKey, config.name, config.p3.eve?.label || 'Evening', data.evening);
                    // Process Night/Morning if exist
                    if (data?.night) await processDraw(stateKey, config.name, config.p3.ngt?.label || 'Night', data.night);
                    if (data?.morning) await processDraw(stateKey, config.name, config.p3.mor?.label || 'Morning', data.morning);

                } catch (e) {
                    console.error(`   ❌ Error scraping ${stateKey}: `, e.message);
                    triggerAlert('SCRAPER_FAILURE', `Failed to scrape ${config.name}`, { error: e.message, state: stateKey }, 'HIGH').catch(console.error);
                }
            });

            // Wait for this batch to finish before starting the next
            await Promise.allSettled(batchPromises);
        }
    } catch (err) {
        console.error('🔥 [Fast Queue] Critical Error:', err);
    } finally {
        isFastRunning = false;
        const duration = ((Date.now() - start) / 1000).toFixed(1);
        console.log(`✅ [Fast Queue] Finished in ${duration}s`);
    }
};

// Queue B: Heavy Scrapers (TopPick + Instant Cash) - Runs every 10-15 minutes
const runHeavyQueue = async () => {
    if (isHeavyRunning) {
        console.warn('⚠️ [Heavy Queue] Previous run still active. Skipping this cycle.');
        return;
    }
    isHeavyRunning = true;
    console.log('🐢 [Heavy Queue] Starting Cycle: TopPick + Instant Cash');
    const start = Date.now();

    try {
        // 1. Top Pick
        try {
            console.log('   Running TopPick...');
            await scraperTopPick();
        } catch (e) {
            console.error("   ❌ TopPick Scraper Failed:", e.message);
        }

        // 2. Instant Cash (Headless - Slow)
        try {
            console.log('   Running Instant Cash (Headless)...');
            // LAZY LOAD to avoid Puppeteer cold start crash on Vercel
            const scraperInstantCashHeadless = require('./scraperInstantCashHeadless');
            await scraperInstantCashHeadless();
        } catch (e) {
            console.error("   ❌ InstantCash Scraper Failed (or Puppeteer missing):", e.message);
        }

    } catch (err) {
        console.error('🔥 [Heavy Queue] Critical Error:', err);
    } finally {
        isHeavyRunning = false;
        const duration = ((Date.now() - start) / 1000).toFixed(1);
        console.log(`✅ [Heavy Queue] Finished in ${duration}s`);
    }
};

// Initialize Cron Jobs
const startResultScheduler = () => {
    console.log('⏳ Scheduler Initializing...');

    // Schedule Queue A: Every 2 minutes (*/2 * * * *)
    cron.schedule('*/2 * * * *', () => {
        runFastQueue();
    });

    // Schedule Queue B: Every 5 minutes (*/5 * * * *) (Optimized)
    cron.schedule('*/5 * * * *', () => {
        runHeavyQueue();
    });

    console.log('✅ Cron Jobs Scheduled: Fast (2m), Heavy (10m)');

    // Run immediately on start (optional, staggered)
    setTimeout(() => runFastQueue(), 5000);
    setTimeout(() => runHeavyQueue(), 15000);
};

const scrapeAll = async () => {
    console.log('🚀 Triggering manual scrape (Fast + Heavy)...');
    await runFastQueue();
    // Attempt Heavy Queue (TopPick might work on Vercel, InstantCash will fail gracefully)
    await runHeavyQueue();
    console.log('✅ Manual scrape complete.');
};

module.exports = {
    startResultScheduler,
    scrapeAll,
    scrapeHeavy: runHeavyQueue,
    SNIPER_CONFIG
};