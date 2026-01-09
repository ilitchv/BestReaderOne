
const { scrapeState } = require('../services/scraperEngine');
const axios = require('axios');
const cheerio = require('cheerio');

async function test() {
    console.log("Testing Michigan Scraper...");

    // Config from scraperService.js
    const config = {
        p3: {
            mid: { urls: ['https://www.lotteryusa.com/michigan/midday-3/'], label: 'Day' },
            eve: { urls: ['https://www.lotteryusa.com/michigan/daily-3/'], label: 'Night' }
        },
        p4: {
            mid: { urls: ['https://www.lotteryusa.com/michigan/midday-4/'], label: 'Day' },
            eve: { urls: ['https://www.lotteryusa.com/michigan/daily-4/'], label: 'Night' }
        }
    };

    // Run actual scrapeState
    try {
        const res = await scrapeState('mi', config);
        console.log("\n--- RESULT ---");
        console.log(JSON.stringify(res, null, 2));
    } catch (e) {
        console.error(e);
    }

    // Manual Inspection of Michigan Daily 3
    console.log("\n--- INSPECTING URL: https://www.lotteryusa.com/michigan/daily-3/ ---");
    const { data } = await axios.get('https://www.lotteryusa.com/michigan/daily-3/');
    const $ = cheerio.load(data);

    // Check specific labels context
    const labels = ['Day', 'Night', 'Midday', 'Evening'];
    console.log("\n--- LABEL CONTEXT ---");
    $('*').each((i, el) => {
        const t = $(el).clone().children().remove().end().text().trim(); // text of own node only
        if (labels.some(l => t.toLowerCase() === l.toLowerCase() || t.toLowerCase().includes(l.toLowerCase() + ' '))) {
            const tag = $(el).prop('tagName');
            const parent = $(el).parent().prop('tagName');
            const next = $(el).next().prop('tagName');
            console.log(`Found '${t}' in <${tag}> (Parent: <${parent}>, Next: <${next}>)`);
            // If it's a header, print next siblings text
            if (['H2', 'H3', 'H4', 'DIV', 'SPAN'].includes(tag)) {
                console.log(`   -> Next Sibling Text: ${$(el).next().text().replace(/\s+/g, ' ').slice(0, 100)}`);
            }
        }
    });

    const text = $('body').text().replace(/\s+/g, ' ').slice(0, 500);
    console.log("Body Preview:", text);
}

test();
