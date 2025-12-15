const axios = require('axios');
const cheerio = require('cheerio');

const HTTP = {
    timeout: 30000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123 Safari/537.36'
    }
};

async function run() {
    try {
        console.log('Fetching https://www.lottery.net/texas/pick-3-morning ...');
        // Try the base page or date specific page
        const { data } = await axios.get('https://www.lottery.net/texas/pick-3-morning', HTTP);

        const $ = cheerio.load(data);
        const title = $('title').text();
        console.log(`Page Title: ${title}`);

        // Check for common classes
        console.log('--- CLASSES SNIPPET ---');
        // Dump the html of the first content area
        console.log($('body').html().substring(0, 1000));

        // Look for balls
        const balls = $('.ball').length;
        console.log(`Found ${balls} .ball elements`);

        $('.ball').each((i, el) => {
            if (i < 5) console.log('Ball:', $(el).text());
        });

        // Look for 'li' related to results
        $('li').each((i, el) => {
            const txt = $(el).text().replace(/\s+/g, ' ').trim();
            if (txt.includes('2025') && txt.includes('-')) {
                console.log(`Potential Result Row: ${txt.substring(0, 50)}...`);
            }
        });

    } catch (e) {
        console.error('Fetch error:', e.message);
    }
}

run();
