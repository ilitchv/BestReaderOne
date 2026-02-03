
const { scrapeState } = require('./services/scraperEngine');

async function debugFL() {
    console.log("🔍 Debugging Florida Scraper...");

    const config = {
        name: "Florida",
        p3: {
            mid: { urls: ['https://www.lotteryusa.com/florida/midday-pick-3/'], label: 'Midday' },
            eve: { urls: ['https://www.lotteryusa.com/florida/pick-3/'], label: 'Evening' }
        },
        p4: {
            mid: { urls: ['https://www.lotteryusa.com/florida/midday-pick-4/'], label: 'Midday' },
            eve: { urls: ['https://www.lotteryusa.com/florida/pick-4/'], label: 'Evening' }
        }
    };

    try {
        console.log("--- Scraping FL ---");
        const data = await scrapeState('fl', config);
        console.log("Result:", JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("Error:", e);
    }
}

debugFL();
