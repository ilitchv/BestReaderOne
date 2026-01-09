
const { scrapeState } = require('../services/scraperEngine');
const { SNIPER_CONFIG } = require('../services/scraperService');

async function test() {
    console.log("--- Testing Service Integration (MA) ---");
    const conf = SNIPER_CONFIG.ma;
    try {
        const res = await scrapeState('ma', conf);
        console.log(JSON.stringify(res, null, 2));
    } catch (e) {
        console.error(e);
    }
}

test();
