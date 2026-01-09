
const { scrapeState } = require('../services/scraperEngine');

async function test() {
    console.log("--- Testing Michigan Scraper (Isolated) ---");
    const config = {
        name: "Michigan",
        p3: {
            mid: { urls: ['https://www.lotteryusa.com/michigan/midday-3/'], label: 'Day' },
            eve: { urls: ['https://www.lotteryusa.com/michigan/daily-3/'], label: 'Evening' }
        },
        p4: {
            mid: { urls: ['https://www.lotteryusa.com/michigan/midday-4/'], label: 'Day' },
            eve: { urls: ['https://www.lotteryusa.com/michigan/daily-4/'], label: 'Evening' }
        }
    };

    try {
        const res = await scrapeState('mi', config);
        console.log(JSON.stringify(res, null, 2));
    } catch (e) {
        console.error(e);
    }
}

test();
