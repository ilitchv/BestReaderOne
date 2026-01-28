const { scrapeState } = require('../services/scraperEngine');
const { SNIPER_CONFIG } = require('../services/scraperService');

// Mock specific config for testing one state (e.g., FL or NY)
async function testScrape() {
    const state = 'fl'; // Testing Florida
    const config = SNIPER_CONFIG[state];

    console.log(`------ TESTING SCRAPER FOR ${state.toUpperCase()} ------`);
    console.log(`Time: ${new Date().toISOString()}`);

    try {
        const result = await scrapeState(state, config);
        console.log("\n------ EXTRACTION RESULT ------");
        console.log(JSON.stringify(result, null, 2));
    } catch (e) {
        console.error("Scrape Failed:", e);
    }
}

testScrape();
