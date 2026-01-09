const axios = require('axios');
const cheerio = require('cheerio');

const URL = 'https://tplotto.com/';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

(async () => {
    try {
        const res = await axios.get(URL, { headers: { 'User-Agent': USER_AGENT } });
        const $ = cheerio.load(res.data);

        console.log('--- FINDING TABLES ---');
        $('table').each((i, el) => {
            console.log(`Table ${i}: ID="${$(el).attr('id')}" Class="${$(el).attr('class')}"`);
        });

        console.log('\n--- FINDING HEADERS ---');
        $('h3').each((i, el) => {
            const text = $(el).text().trim();
            if (text.toLowerCase().includes('top pick') || text.toLowerCase().includes('quick draw')) {
                console.log(`Header: "${text}"`);
                console.log(`   Next Sibling: ${$(el).next().prop('tagName')}`);
                console.log(`   Next Sibling ID/Class: ${$(el).next().attr('id')} / ${$(el).next().attr('class')}`);
                // Look for closest table?
                const nextTable = $(el).nextAll('table').first();
                if (nextTable.length) {
                    console.log(`   Next Table ID: ${nextTable.attr('id')}`);
                }
                const nextDiv = $(el).nextAll('div').first();
                if (nextDiv.length) {
                    console.log(`   Next Div ID/Class: ${nextDiv.attr('id')} / ${nextDiv.attr('class')}`);
                }
            }
        });

    } catch (e) {
        console.error(e);
    }
})();
