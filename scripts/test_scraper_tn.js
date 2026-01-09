
const { scrapeState } = require('../services/scraperEngine');

async function test() {
    console.log("--- Testing Tennessee Scraper (Isolated) ---");
    const config = {
        name: "Tennessee",
        p3: {
            mid: { urls: ['https://www.lotteryusa.com/tennessee/cash-3/year'], label: 'Midday' },
            eve: { urls: ['https://www.lotteryusa.com/tennessee/cash-3/year'], label: 'Evening' }
        },
        p4: {}
    };

    try {
        const res = await scrapeState('tn', config);
        console.log(JSON.stringify(res, null, 2));
    } catch (e) {
        console.error(e);
    }
}

test();
