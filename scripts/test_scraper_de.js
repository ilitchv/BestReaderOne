
const { scrapeState } = require('../services/scraperEngine');

async function test() {
    console.log("--- Testing Delaware Scraper (Isolated) ---");
    const config = {
        name: "Delaware",
        p3: {
            mid: { urls: ['https://www.lotteryusa.com/delaware/play-3-midday/year'], label: 'Day' },
            eve: { urls: ['https://www.lotteryusa.com/delaware/play-3/year'], label: 'Night' }
        },
        p4: {}
    };

    try {
        const res = await scrapeState('de', config);
        console.log(JSON.stringify(res, null, 2));
    } catch (e) {
        console.error(e);
    }
}

test();
