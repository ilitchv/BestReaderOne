const { scrapeState } = require('../services/scraperEngine');
const { SNIPER_CONFIG } = require('../services/scraperService');

async function test() {
    console.log("--- Testing Fallback Strategy (NY) ---");

    // Inject Failure
    const nyConf = SNIPER_CONFIG.ny;
    // Unshift a bad URL to force fallback
    nyConf.p3.mid.urls.unshift("https://httpstat.us/404");
    console.log("Modified URLs:", nyConf.p3.mid.urls);

    try {
        const res = await scrapeState('ny', nyConf);
        console.log("Result:");
        console.log(JSON.stringify(res, null, 2));

        // We only check for stored digits or date. Note: Lottery.net might be delayed on updating "Today" vs "Yesterday". 
        // As long as we get *some* valid structure back, the scraping logic worked.

        if (res && (res.midday || res.evening)) {
            console.log("✅ SUCCESS: Retrieved data despite first URL failure.");
        } else {
            console.error("❌ FAILURE: No data retrieved.");
        }

    } catch (e) {
        console.error(e);
    }
}

test();
