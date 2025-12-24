const axios = require('axios');
const cheerio = require('cheerio');

async function check() {
    const url = 'https://www.lottery.net/new-york/numbers';
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    console.log("--- Results on Lottery.net ---");
    $('.result-block').each((i, el) => {
        console.log(`\nBlock ${i}:`);
        console.log($(el).text().trim().replace(/\s+/g, ' '));
    });

    if ($('.result-block').length === 0) {
        console.log("No .result-block found, trying generic search...");
        $('h2, h3').each((i, el) => {
            if ($(el).text().toLowerCase().includes('result')) {
                console.log(`\nHeader: ${$(el).text()}`);
                console.log($(el).next().text().trim().replace(/\s+/g, ' '));
            }
        });
    }
}

check();
