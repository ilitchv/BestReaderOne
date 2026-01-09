
const axios = require('axios');
const cheerio = require('cheerio');

const states = ['delaware', 'tennessee', 'massachusetts', 'virginia', 'north-carolina'];

async function findLinks() {
    for (const state of states) {
        const url = `https://www.lotteryusa.com/${state}/`;
        console.log(`\nScanning ${state}: ${url}`);
        try {
            const { data } = await axios.get(url);
            const $ = cheerio.load(data);
            const links = new Set();
            $('a').each((_, el) => {
                const href = $(el).attr('href');
                if (href && href.startsWith(`/${state}/`) &&
                    (href.includes('pick') || href.includes('cash') || href.includes('number') || href.includes('play') || href.includes('daily'))) {
                    links.add(href);
                }
            });
            console.log([...links].sort());
        } catch (e) {
            console.error(`Failed to fetch ${state}: ${e.message}`);
        }
    }
}

findLinks();
