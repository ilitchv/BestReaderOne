const axios = require('axios');
const cheerio = require('cheerio');
const mongoose = require('mongoose');
const LotteryResult = require('../models/LotteryResult');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const connectDB = require('../database');

// Config for States to Backfill
const CONFIG = {
    fl: {
        name: 'Florida',
        urls: [
            { type: 'p3', time: 'Midday', url: 'https://www.lotteryusa.com/florida/midday-pick-3/year' },
            { type: 'p3', time: 'Evening', url: 'https://www.lotteryusa.com/florida/pick-3/year' },
            { type: 'p4', time: 'Midday', url: 'https://www.lotteryusa.com/florida/midday-pick-4/year' },
            { type: 'p4', time: 'Evening', url: 'https://www.lotteryusa.com/florida/pick-4/year' }
        ]
    },
    ny: {
        name: 'New York',
        urls: [
            { type: 'p3', time: 'Midday', url: 'https://www.lotteryusa.com/new-york/midday-numbers/year' },
            { type: 'p3', time: 'Evening', url: 'https://www.lotteryusa.com/new-york/numbers/year' },
            { type: 'p4', time: 'Midday', url: 'https://www.lotteryusa.com/new-york/midday-win-4/year' },
            { type: 'p4', time: 'Evening', url: 'https://www.lotteryusa.com/new-york/win-4/year' }
        ]
    },
    ga: {
        name: 'Georgia',
        urls: [
            { type: 'p3', time: 'Midday', url: 'https://www.lotteryusa.com/georgia/midday-3/year' },
            { type: 'p3', time: 'Evening', url: 'https://www.lotteryusa.com/georgia/cash-3-evening/year' },
            { type: 'p4', time: 'Midday', url: 'https://www.lotteryusa.com/georgia/midday-4/year' },
            { type: 'p4', time: 'Evening', url: 'https://www.lotteryusa.com/georgia/cash-4-evening/year' }
        ]
    }
};

const TARGET_DATES = ['2026-01-25', '2026-01-26', '2026-01-27'];

async function fetchAndParse(url) {
    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
        const results = [];

        let rowCount = 0;

        // Loop through each row in the table
        $('table tr').each((i, row) => {
            const txt = $(row).text().trim();
            // Debug first few rows
            if (rowCount < 3) console.log(`[DEBUG Row]: ${txt.substring(0, 100)}...`);
            rowCount++;

            // For each target date we are looking for
            for (const tDate of TARGET_DATES) {
                const dateParts = tDate.split('-');
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const mName = months[parseInt(dateParts[1]) - 1]; // 0-indexed month
                const dDay = parseInt(dateParts[2]);
                // Regex: Month (space) Day (optional comma) (space) Year
                const dayRegex = new RegExp(`${mName}\\s+0?${dDay},?\\s+${dateParts[0]}`, 'i');

                if (dayRegex.test(txt)) {
                    // Strategy: Look for specific columns if possible, or parse generically
                    const $cols = $(row).find('td');
                    if ($cols.length >= 2) {
                        const dateCol = $($cols[0]).text().trim();
                        // Double check if the date column matches our date
                        if (dayRegex.test(dateCol)) {
                            // Helper to extract numbers: get column 1 (results)
                            const numCol = $($cols[1]).text().trim();
                            const cleanNums = numCol.replace(/[^0-9]/g, '');

                            // Basic validation
                            if (cleanNums.length >= 3) {
                                results.push({ date: tDate, numbers: cleanNums });
                            }
                        }
                    }
                }
            }
        });

        return results;
    } catch (e) {
        console.error(`Error fetching ${url}:`, e.message);
        return [];
    }
}

async function run() {
    await connectDB();

    for (const [stateKey, config] of Object.entries(CONFIG)) {
        console.log(`Processing ${config.name}...`);

        for (const job of config.urls) {
            const found = await fetchAndParse(job.url);

            for (const item of found) {
                const resultId = `usa/${stateKey}/${job.type}.${job.time.toLowerCase().substring(0, 3)}`; // Approximate ID or construct real one
                // Real ID format in scraperService: usa/ny/Midday
                const realId = `usa/${stateKey}/${job.time}`;

                // Handle P3 vs P4
                // If we have mixed p3/p4 we need to save correctly. 
                // But wait, the schema stores P3 and P4 together often?
                // No, LotteryResult model usually has a single 'numbers' string 
                // But for USA it might be combined?
                // Let's check scraperService.js: numbers = `${result.p3}-${result.w4}`;
                // This script fetches p3 and p4 separately.
                // We need to UPSERT and MERGE.

                // logic: Find existing for date/state, update specific part.
                try {
                    let doc = await LotteryResult.findOne({ resultId: realId, drawDate: item.date });
                    if (!doc) {
                        doc = new LotteryResult({
                            resultId: realId,
                            country: 'USA',
                            lotteryName: config.name,
                            drawName: job.time,
                            drawDate: item.date,
                            numbers: '---- ----',
                            scrapedAt: new Date()
                        });
                    }

                    let [currP3, currP4] = doc.numbers.split('-');
                    if (!currP3) currP3 = '---';
                    if (!currP4) currP4 = '----';

                    if (job.type === 'p3') currP3 = item.numbers;
                    if (job.type === 'p4') currP4 = item.numbers;

                    doc.numbers = `${currP3}-${currP4}`;
                    await doc.save();
                    console.log(`Verified/Saved: ${realId} [${item.date}] -> ${doc.numbers}`);
                } catch (err) {
                    console.error("Save Error:", err);
                }
            }
        }
    }
    console.log("Backfill Complete");
    process.exit();
}

run();
