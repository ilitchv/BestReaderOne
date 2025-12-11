import { scrapeState } from './engine.js';
import { MongoClient } from 'mongodb';
import 'dotenv/config';

// --- CONFIGURATION ---
const GLOBAL_ADMIN_ID = "sniper_global_master_v1";
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = "beastbet"; // Or whatever DB name is in URI

const STATE_CONFIG = {
    ny: {
        name: "New York",
        p3: {
            mid: { urls: ['https://www.lotteryusa.com/new-york/midday-numbers/', 'https://www.lotteryusa.com/new-york/numbers/'], label: 'Midday' },
            eve: { urls: ['https://www.lotteryusa.com/new-york/numbers/'], label: 'Evening' }
        },
        p4: {
            mid: { urls: ['https://www.lotteryusa.com/new-york/midday-win-4/', 'https://www.lotteryusa.com/new-york/win-4/'], label: 'Midday' },
            eve: { urls: ['https://www.lotteryusa.com/new-york/win-4/'], label: 'Evening' }
        }
    },
    nj: {
        name: "New Jersey",
        p3: {
            mid: { urls: ['https://www.lotteryusa.com/new-jersey/midday-pick-3/', 'https://www.lotteryusa.com/new-jersey/pick-3/'], label: 'Midday' },
            eve: { urls: ['https://www.lotteryusa.com/new-jersey/pick-3/', 'https://www.lotteryusa.com/new-jersey/numbers/'], label: 'Evening' }
        },
        p4: {
            mid: { urls: ['https://www.lotteryusa.com/new-jersey/midday-pick-4/', 'https://www.lotteryusa.com/new-jersey/pick-4/'], label: 'Midday' },
            eve: { urls: ['https://www.lotteryusa.com/new-jersey/pick-4/', 'https://www.lotteryusa.com/new-jersey/win-4/'], label: 'Evening' }
        }
    },
    ct: {
        name: "Connecticut",
        p3: {
            mid: { urls: ['https://www.lotteryusa.com/connecticut/midday-3/', 'https://www.lotteryusa.com/connecticut/play-3/'], label: 'Midday' },
            eve: { urls: ['https://www.lotteryusa.com/connecticut/play-3/'], label: 'Night' }
        },
        p4: {
            mid: { urls: ['https://www.lotteryusa.com/connecticut/midday-4/', 'https://www.lotteryusa.com/connecticut/play-4/'], label: 'Midday' },
            eve: { urls: ['https://www.lotteryusa.com/connecticut/play-4/'], label: 'Night' }
        }
    },
    fl: {
        name: "Florida",
        p3: {
            mid: { urls: ['https://www.lotteryusa.com/florida/midday-pick-3/', 'https://www.lotteryusa.com/florida/pick-3/'], label: 'Midday' },
            eve: { urls: ['https://www.lotteryusa.com/florida/pick-3/'], label: 'Evening' }
        },
        p4: {
            mid: { urls: ['https://www.lotteryusa.com/florida/midday-pick-4/', 'https://www.lotteryusa.com/florida/pick-4/'], label: 'Midday' },
            eve: { urls: ['https://www.lotteryusa.com/florida/pick-4/'], label: 'Evening' }
        }
    },
    ga: {
        name: "Georgia",
        p3: {
            mid: { urls: ['https://www.lotteryusa.com/georgia/midday-3/', 'https://www.lotteryusa.com/georgia/'], label: 'Midday' },
            eve: { urls: ['https://www.lotteryusa.com/georgia/cash-3-evening/', 'https://www.lotteryusa.com/georgia/'], label: 'Evening' },
            ngt: { urls: ['https://www.lotteryusa.com/georgia/cash-3/', 'https://www.lotteryusa.com/georgia/'], label: 'Night' }
        },
        p4: {
            mid: { urls: ['https://www.lotteryusa.com/georgia/midday-4/', 'https://www.lotteryusa.com/georgia/'], label: 'Midday' },
            eve: { urls: ['https://www.lotteryusa.com/georgia/cash-4-evening/', 'https://www.lotteryusa.com/georgia/'], label: 'Evening' },
            ngt: { urls: ['https://www.lotteryusa.com/georgia/cash-4/', 'https://www.lotteryusa.com/georgia/'], label: 'Night' }
        }
    },
    pa: {
        name: "Pennsylvania",
        p3: {
            mid: { urls: ['https://www.lotteryusa.com/pennsylvania/midday-pick-3/', 'https://www.lotteryusa.com/pennsylvania/'], label: 'Day' },
            eve: { urls: ['https://www.lotteryusa.com/pennsylvania/pick-3/', 'https://www.lotteryusa.com/pennsylvania/'], label: 'Evening' }
        },
        p4: {
            mid: { urls: ['https://www.lotteryusa.com/pennsylvania/midday-pick-4/', 'https://www.lotteryusa.com/pennsylvania/'], label: 'Day' },
            eve: { urls: ['https://www.lotteryusa.com/pennsylvania/pick-4/', 'https://www.lotteryusa.com/pennsylvania/'], label: 'Evening' }
        }
    }
};

// ── Main Execution ────────────────────────────────────────────────
async function run() {
    console.log('🚀 Starting Sniper Scraper...');
    if (!MONGODB_URI) { console.error('❌ Missing MONGODB_URI'); process.exit(1); }

    let client;
    try {
        client = new MongoClient(MONGODB_URI);
        await client.connect();
        const db = client.db(DB_NAME);
        const col = db.collection('sniper_records');
        console.log('📦 Connected into MongoDB');

        // Scrape States
        for (const [key, config] of Object.entries(STATE_CONFIG)) {
            console.log(`\n🔍 Scraping ${config.name} (${key})...`);
            try {
                const data = await scrapeState(key, config);

                // Process each draw type found
                await saveDraw(col, config.name, "Midday", data?.midday);
                await saveDraw(col, config.name, "Evening", data?.evening);
                await saveDraw(col, config.name, "Night", data?.night);

            } catch (e) {
                console.error(`❌ Error scraping ${key}:`, e.message);
            }
        }

    } catch (e) {
        console.error('❌ Critical Error:', e);
    } finally {
        if (client) await client.close();
        console.log('\n🏁 Scraper Job Finished.');
        process.exit(0);
    }
}

async function saveDraw(collection, lottery, time, result) {
    if (!result) return;
    if (!result.date || !result.p3 || !result.w4) return;

    // Use UTC date object for storage to match server format logic
    const dateObj = new Date(result.date + 'T12:00:00Z');

    // DUPLICATE CHECK
    // Look for existing record with same Global ID, Lottery, Date, Time
    const exists = await collection.findOne({
        userId: GLOBAL_ADMIN_ID,
        lottery: lottery,
        // Match approximate date (ignoring time) or exact ISODate
        // Ideally use date string comparison in queries if possible, but schema uses Date
        // We'll search by range for safety or exact date match if reliable
        date: {
            $gte: new Date(result.date + 'T00:00:00Z'),
            $lt: new Date(result.date + 'T23:59:59Z')
        },
        time: time
    });

    if (exists) {
        console.log(`   ⏭️  Skipped ${lottery} ${time} [${result.date}] (Exists)`);
        return;
    }

    // INSERT
    await collection.insertOne({
        userId: GLOBAL_ADMIN_ID,
        lottery: lottery,
        date: dateObj,
        time: time,
        p3: result.p3,
        w4: result.w4,
        source: 'AutoScraper',
        track: lottery, // redundancy
        createdAt: new Date()
    });
    console.log(`   ✅ SAVED ${lottery} ${time}: P3:${result.p3} W4:${result.w4}`);
}

run();
