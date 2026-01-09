
const axios = require('axios');
const cheerio = require('cheerio');

const BASE = 'https://www.lotteryusa.com';

const STATES = [
    { st: 'tennessee', game: 'cash-3', draws: ['', '-midday', '-evening', '-morning', '-night'] },
    { st: 'massachusetts', game: 'numbers-game', draws: ['', '-midday', '-evening'] }, // "numbers-game" is standard? or "numbers"?
    { st: 'massachusetts', game: 'numbers', draws: ['', '-midday', '-evening'] },
    { st: 'virginia', game: 'pick-3', draws: ['', '-day', '-night'] },
    { st: 'north-carolina', game: 'pick-3', draws: ['', '-day', '-evening'] }
];

async function fuzz() {
    console.log("--- Fuzzing Year/Archive URLs ---");
    for (const s of STATES) {
        for (const draw of s.draws) {
            const slug = `${s.st}/${s.game}${draw}`;
            const url = `${BASE}/${slug}/year`; // Try /year

            try {
                const { status, data } = await axios.get(url, { validateStatus: () => true });
                if (status === 200) {
                    const $ = cheerio.load(data);
                    const rows = $('tr').length;
                    console.log(`[FOUND] ${url} (Rows: ${rows})`);
                } else {
                    // console.log(`[${status}] ${url}`);
                }
            } catch (e) {
                console.error(e.message);
            }
        }
    }
}

fuzz();
