
const { scrapeState } = require('../services/scraperEngine');

async function test() {
    console.log("--- Testing MA Scraper (Isolated) ---");
    const config = {
        name: "Massachusetts",
        p3: {
            mid: { urls: ['https://www.lotteryusa.com/massachusetts/numbers/year'], label: 'Midday' },
            eve: { urls: ['https://www.lotteryusa.com/massachusetts/numbers/year'], label: 'Evening' }
        },
        p4: {}
    };

    try {
        const res = await scrapeState('ma', config);
        console.log(JSON.stringify(res, null, 2));
    } catch (e) {
        console.error(e);
    }
}

test();
