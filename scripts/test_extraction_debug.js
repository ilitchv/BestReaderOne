
const axios = require('axios');
const cheerio = require('cheerio');

async function debug() {
    console.log("\n--- FUZZING /results URLs ---");
    const candidates = [
        'https://www.lotteryusa.com/delaware/play-3/results',
        'https://www.lotteryusa.com/tennessee/cash-3/results',
        'https://www.lotteryusa.com/massachusetts/numbers/results',
        'https://www.lotteryusa.com/massachusetts/numbers-game/results',
        'https://www.lotteryusa.com/virginia/pick-3/results',
        'https://www.lotteryusa.com/north-carolina/pick-3/results'
    ];

    for (const url of candidates) {
        try {
            const { data } = await axios.get(url);
            const $ = cheerio.load(data);
            const title = $('title').text().trim();
            const rows = $('tr').length;
            // Dump first row if exists
            const firstRow = $('tr').eq(1).text().replace(/\s+/g, ' ').trim();
            console.log(`[200] ${url} | Rows: ${rows} | First: ${firstRow}`);
        } catch (e) {
            console.log(`[${e.response?.status || 'ERR'}] ${url}`);
        }
    }
}

debug();
