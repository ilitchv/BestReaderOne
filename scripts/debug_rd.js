const axios = require('axios');
const cheerio = require('cheerio');

const HTTP = {
    timeout: 30000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
    }
};

async function run() {
    try {
        console.log('Fetching https://www.conectate.com.do/loterias/ ...');
        const { data } = await axios.get('https://www.conectate.com.do/loterias/', HTTP);
        console.log('--- START HTML SNIPPET ---');
        console.log(data.substring(0, 2000)); // Print first 2000 chars

        const $ = cheerio.load(data);
        const titles = $('.game-title').length;
        console.log(`Found ${titles} .game-title elements`);

        $('.game-title').each((i, el) => {
            const title = $(el).text().trim();
            if (title.includes('Gana Más')) {
                console.log(`Analyzing siblings for: ${title}`);
                let next = el.nextSibling;
                let count = 0;
                while (next && count < 20) {
                    const raw = next.data ? next.data.replace(/\n/g, '\\n').trim() : '';
                    console.log(`[Sib ${count}] Type: ${next.type}, Tag: ${next.name}, Raw: "${raw}"`);
                    next = next.nextSibling;
                    count++;
                }
            }
        });

    } catch (e) {
        console.error('Fetch error:', e.message);
    }
}

run();
