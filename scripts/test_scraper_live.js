const { scrapeState } = require('../services/scraperEngine');

// Mock Config from scraperService.js
const CONFIG = {
    ny: {
        name: "New York",
        p3: {
            mid: { urls: ['https://www.lotteryusa.com/new-york/midday-numbers/'], label: 'Midday' },
            eve: { urls: ['https://www.lotteryusa.com/new-york/numbers/'], label: 'Evening' }
        },
        p4: {
            mid: { urls: ['https://www.lotteryusa.com/new-york/midday-win-4/'], label: 'Midday' },
            eve: { urls: ['https://www.lotteryusa.com/new-york/win-4/'], label: 'Evening' }
        }
    },
    ga: {
        name: "Georgia",
        p3: {
            mid: { urls: ['https://www.lotteryusa.com/georgia/midday-3/'], label: 'Midday' },
            eve: { urls: ['https://www.lotteryusa.com/georgia/cash-3-evening/'], label: 'Evening' }
        },
        p4: {
            mid: { urls: ['https://www.lotteryusa.com/georgia/midday-4/'], label: 'Midday' },
            eve: { urls: ['https://www.lotteryusa.com/georgia/cash-4-evening/'], label: 'Evening' }
        }
    }
};

(async () => {
    console.log("--- TESTING NY ---");
    const ny = await scrapeState('ny', CONFIG.ny);
    console.log(JSON.stringify(ny, null, 2));

    console.log("\n--- TESTING GA ---");
    const ga = await scrapeState('ga', CONFIG.ga);
    console.log(JSON.stringify(ga, null, 2));
})();
