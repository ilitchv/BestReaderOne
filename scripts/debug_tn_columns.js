
const axios = require('axios');
const cheerio = require('cheerio');

async function debug() {
    console.log("--- TN Column Check ---");
    const url = 'https://www.lotteryusa.com/tennessee/cash-3/year';
    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);

        $('table').each((i, tbl) => {
            console.log(`\nTable ${i}:`);
            const headers = $(tbl).find('th').map((j, th) => $(th).text().trim()).get();
            console.log("  Headers:", headers.join(' | '));

            $(tbl).find('tr').slice(0, 5).each((k, tr) => {
                const cells = $(tr).find('td, th').map((l, td) => $(td).text().replace(/\s+/g, ' ').trim()).get();
                console.log(`  Row ${k}:`, cells.join(' | '));
            });
        });
    } catch (e) {
        console.error(e.message);
    }
}

debug();
