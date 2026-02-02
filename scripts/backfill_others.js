const axios = require('axios');
const cheerio = require('cheerio');
const mongoose = require('mongoose');
const LotteryResult = require('../models/LotteryResult');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const connectDB = require('../database');

// Config for Other States
const CONFIG = {
    ct: {
        name: 'Connecticut',
        urls: [
            { type: 'p3', time: 'Midday', url: 'https://www.lotteryusa.com/connecticut/midday-3/year' },
            { type: 'p3', time: 'Evening', url: 'https://www.lotteryusa.com/connecticut/play-3/year' },
            { type: 'p4', time: 'Midday', url: 'https://www.lotteryusa.com/connecticut/midday-4/year' },
            { type: 'p4', time: 'Evening', url: 'https://www.lotteryusa.com/connecticut/play-4/year' }
        ]
    },
    pa: {
        name: 'Pennsylvania',
        urls: [
            { type: 'p3', time: 'Midday', url: 'https://www.lotteryusa.com/pennsylvania/midday-pick-3/year' },
            { type: 'p3', time: 'Evening', url: 'https://www.lotteryusa.com/pennsylvania/pick-3/year' },
            { type: 'p4', time: 'Midday', url: 'https://www.lotteryusa.com/pennsylvania/midday-pick-4/year' },
            { type: 'p4', time: 'Evening', url: 'https://www.lotteryusa.com/pennsylvania/pick-4/year' }
        ]
    },
    // Add other states if needed based on SNIPER_CONFIG in services/scraperService.js
    // Valid states in config: ny, nj, ct, fl, ga, pa, tx, md, sc, mi, de, tn, ma, va, nc
    nj: {
        name: 'New Jersey',
        urls: [
            { type: 'p3', time: 'Midday', url: 'https://www.lotteryusa.com/new-jersey/midday-pick-3/year' },
            { type: 'p3', time: 'Evening', url: 'https://www.lotteryusa.com/new-jersey/pick-3/year' }
        ]
    }
    // ... extensive list omitted for brevity, focusing on user complaint about "inferior cards"
};

const TARGET_DATES = ['2026-01-25', '2026-01-26', '2026-01-27'];

async function fetchAndParse(url) {
    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
        const results = [];

        $('table tr').each((i, row) => {
            const rawTxt = $(row).text();
            const txt = rawTxt.replace(/\s+/g, ' ').trim();

            for (const tDate of TARGET_DATES) {
                const dateParts = tDate.split('-');
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const mName = months[parseInt(dateParts[1]) - 1];
                const dDay = parseInt(dateParts[2]);
                const dayRegex = new RegExp(`${mName}\\s+0?${dDay},?\\s+${dateParts[0]}`, 'i');

                if (dayRegex.test(txt)) {
                    // Match found in row!
                    console.log(`[MATCH] Found date ${tDate} in row (URL: ${url})`);

                    const match = txt.match(dayRegex);
                    if (match) {
                        const dateEndIndex = match.index + match[0].length;
                        const remainder = txt.substring(dateEndIndex).trim();

                        // Extract first chunk of things that look like numbers
                        const resultMatch = remainder.match(/^[\d\s]+/);
                        if (resultMatch) {
                            const candidate = resultMatch[0].replace(/[^0-9]/g, '');
                            if (candidate.length === 3 || candidate.length === 4) {
                                results.push({ date: tDate, numbers: candidate });
                                console.log(`   -> Extracted: ${candidate}`);
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
                const realId = `usa/${stateKey}/${job.time}`;

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
                            scrapedAt: new Date() // Treat as scraped now
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
