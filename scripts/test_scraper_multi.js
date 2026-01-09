
const { scrapeState } = require('../services/scraperEngine');

async function test() {
    console.log("Testing DE, TN, MA Scrapers...");

    // Subset of config
    const configs = {
        de: {
            name: "Delaware",
            p3: {
                mid: { urls: ['https://www.lotteryusa.com/delaware/play-3-midday/year'], label: 'Day' },
                eve: { urls: ['https://www.lotteryusa.com/delaware/play-3-night/year', 'https://www.lotteryusa.com/delaware/play-3/year'], label: 'Night' }
            },
            p4: {}
        },
        tn: {
            name: "Tennessee",
            p3: {
                mid: { urls: ['https://www.lotteryusa.com/tennessee/cash-3/'], label: 'Midday' },
                eve: { urls: ['https://www.lotteryusa.com/tennessee/cash-3/'], label: 'Evening' },
            },
            p4: {}
        },
        ma: {
            name: "Massachusetts",
            p3: {
                mid: { urls: ['https://www.lotteryusa.com/massachusetts/midday-numbers/'], label: 'Midday' },
                eve: { urls: ['https://www.lotteryusa.com/massachusetts/numbers/'], label: 'Evening' }
            },
            p4: {}
        },
        va: {
            name: "Virginia",
            p3: {
                mid: { urls: ['https://www.lotteryusa.com/virginia/pick-3/'], label: 'Day' },
                eve: { urls: ['https://www.lotteryusa.com/virginia/pick-3/'], label: 'Night' }
            },
            p4: {}
        },
        nc: {
            name: "North Carolina",
            p3: {
                mid: { urls: ['https://www.lotteryusa.com/north-carolina/pick-3/'], label: 'Day' },
                eve: { urls: ['https://www.lotteryusa.com/north-carolina/pick-3/'], label: 'Evening' }
            },
            p4: {}
        }
    };

    for (const [key, conf] of Object.entries(configs)) {
        console.log(`\n--- Testing ${conf.name} (${key}) ---`);
        try {
            const res = await scrapeState(key, conf);
            console.log(JSON.stringify(res, null, 2));
        } catch (e) {
            console.error(e);
        }
    }
}

test();
