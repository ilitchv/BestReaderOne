const { scrapeState } = require('../services/scraperEngine');
const { SNIPER_CONFIG } = require('../services/scraperService');

async function runDiagnosis() {
    const states = ['tx', 'md', 'ny', 'sc']; // States user mentioned as stale
    console.log(`🔍 Starting Diagnosis for: ${states.join(', ')}`);

    for (const state of states) {
        console.log(`\n--- Checking ${state.toUpperCase()} ---`);
        const config = SNIPER_CONFIG[state];
        if (!config) {
            console.error(`❌ No config found for ${state}`);
            continue;
        }

        try {
            const start = Date.now();
            const data = await scrapeState(state, config);
            const duration = (Date.now() - start) / 1000;

            console.log(`✅ Scraped in ${duration.toFixed(2)}s`);
            console.log("   Midday:", formatResult(data.midday));
            console.log("   Evening:", formatResult(data.evening));
            console.log("   Night:  ", formatResult(data.night));
        } catch (e) {
            console.error(`❌ Error scraping ${state}:`, e.message);
        }
    }
}

function formatResult(res) {
    if (!res) return "NULL";
    // Check if date matches today (Jan 8)
    return `[${res.p3}] Date: ${res.date}`;
}

runDiagnosis();
