
const { scrapeState } = require('./services/scraperEngine');
const scraperService = require('./services/scraperService');

// Modify config to ONLY point to the year page for NY Eve
const output = async () => {
    console.log("DEBUG: Scraping NY Evening Year Page...");
    const url = 'https://www.lotteryusa.com/new-york/numbers/year';

    // Using internal functions would be better but they are not exported.
    // So I will use the scrapeState wrapper with a custom config.
    const customConfig = {
        name: "New York Debug",
        p3: {
            mid: { urls: [], label: 'Midday' }, // Skip
            eve: { urls: [url], label: 'Evening' }
        },
        p4: { mid: {}, eve: {} } // Skip
    };

    try {
        const res = await scrapeState('ny', customConfig);
        console.log("RESULT:", JSON.stringify(res, null, 2));
    } catch (e) {
        console.error(e);
    }
}

output();
