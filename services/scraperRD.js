const axios = require('axios');
const cheerio = require('cheerio');
const dayjs = require('dayjs');
const LotteryResult = require('../models/LotteryResult');
const Track = require('../models/Track');

// --- CONFIGURATION ---
const GLOBAL_ADMIN_ID = "sniper_global_master_v1";

const RD_MAPPING = {
    'Gana Más': { id: 'rd/ganamas/Tarde', name: 'Gana Mas', draw: 'Tarde' },
    'Lotería Nacional': { id: 'rd/nacional/Noche', name: 'Nacional', draw: 'Noche' },
    'Quiniela Palé': { id: 'rd/quiniela/Diario', name: 'Quiniela Pale', draw: 'Diario' },
    'Lotería Real': { id: 'rd/real/Mediodía', name: 'Loteria Real', draw: 'Mediodia' },
    'Loteka': { id: 'rd/loteka/Noche', name: 'Loteka', draw: 'Noche' },
    'Leidsa': { id: 'rd/leidsa/Noche', name: 'Leidsa', draw: 'Noche' },
    'La Primera': { id: 'rd/primer/AM', name: 'La Primera', draw: 'AM' },
    'Lotedom': { id: 'rd/lotedom/Tarde', name: 'Lotedom', draw: 'Tarde' },
    'La Suerte': { id: 'rd/suerte/AM', name: 'La Suerte', draw: 'AM' }
};

const HTTP = {
    timeout: 30000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123 Safari/537.36'
    }
};

function cleanNumber(text) {
    if (!text) return null;
    const clean = text.replace(/\D/g, '').trim();
    return clean.length > 0 && clean.length <= 2 ? clean.padStart(2, '0') : null;
}

async function fetchAndProcess() {
    console.log('🇩🇴 Starting RD Scraper (Conectate)...');
    try {
        const url = 'https://www.conectate.com.do/loterias/';
        const { data } = await axios.get(url, HTTP);
        const $ = cheerio.load(data);

        const results = [];

        $('.game-title').each((_, el) => {
            const $el = $(el);
            const title = $el.text().trim();

            let mapKey = null;
            Object.keys(RD_MAPPING).forEach(k => {
                if (title.includes(k)) mapKey = k;
            });

            if (!mapKey) return;

            const config = RD_MAPPING[mapKey];
            const numbers = [];

            // Traversal Helper
            const traverse = (node, context) => {
                let next = node.nextSibling;
                let limit = 0;
                while (next && limit < 20) {
                    if (config.name === 'Gana Mas') {
                        const raw = next.data ? next.data.replace(/\n/g, '\\n').trim() : $(next).text().trim();
                        console.log(`   [Traversal ${context}] Type: ${next.type}, Name: ${next.name}, Raw: "${raw}"`);
                    }

                    if (next.type === 'text') {
                        const txt = $(next).text().trim();
                        if (txt) {
                            const clean = cleanNumber(txt);
                            if (clean) numbers.push(clean);
                        }
                    } else if (next.type === 'tag') {
                        // Check if this tag contains numbers (e.g. the div wrapper we saw)
                        const rawText = $(next).text().trim();
                        // Simple heuristic: does it contain digits?
                        if (/\d/.test(rawText)) {
                            // Use regex to find all 2-digit numbers in the string
                            const matches = rawText.match(/\b\d{1,2}\b/g);
                            if (matches) {
                                matches.forEach(m => {
                                    const clean = cleanNumber(m);
                                    if (clean) numbers.push(clean);
                                });
                            }
                        }

                        // Stop if we hit a clearly new section block, but be careful not to stop on the number container
                        // The number container was a 'div' with class 'session-date'?? No, log said 'div'.
                        // Let's rely on standard block tags for stopping *only if* they look like titles.
                        if (['h3', 'h4', 'section', 'header', 'footer', 'nav'].includes(next.name)) {
                            break;
                        }
                        // If it's an 'a' tag that looks like a game title, stop
                        if (next.name === 'a' && $(next).hasClass('game-title')) {
                            break;
                        }
                    }
                    next = next.nextSibling;
                    limit++;
                }
            };

            // 1. Try Direct Siblings
            traverse(el, 'Direct');

            // 2. Try Parent Siblings if empty
            if (numbers.length === 0 && el.parentNode) {
                if (config.name === 'Gana Mas') console.log(`   [RD DEBUG] Trying Parent Siblings...`);
                traverse(el.parentNode, 'Parent');
            }

            const date = dayjs().format('YYYY-MM-DD');

            if (numbers.length >= 1) {
                results.push({ config, numbers, date });
            }
        });

        console.log(`   Found ${results.length} RD results.`);

        for (const res of results) {
            await saveResult(res);
        }

    } catch (e) {
        console.error('❌ Error scraping RD:', e.message);
    }
}

async function saveResult({ config, numbers, date }) {
    if (!config || !numbers.length) return;

    const p1 = numbers[0];
    const p2 = numbers[1] || "00";
    const p3 = numbers[2] || "00";
    const dashNumbers = numbers.join('-');

    try {
        await LotteryResult.updateOne(
            { resultId: config.id, drawDate: date },
            {
                $set: {
                    resultId: config.id,
                    country: 'RD',
                    lotteryName: config.name,
                    drawName: config.draw,
                    numbers: dashNumbers,
                    drawDate: date,
                    scrapedAt: new Date()
                }
            },
            { upsert: true }
        );
        console.log(`   ✅ [Dashboard] Saved RD: ${config.name} (${dashNumbers})`);
    } catch (e) {
        console.error(`      Error saving RD Dashboard: ${e.message}`);
    }

    try {
        const trackExists = await Track.findOne({
            userId: GLOBAL_ADMIN_ID,
            lottery: config.name,
            date: date,
            time: config.draw
        });

        if (!trackExists) {
            await Track.create({
                userId: GLOBAL_ADMIN_ID,
                lottery: config.name,
                date: date,
                time: config.draw,
                p3: p1,
                pick3: p1,
                w4: p2,
                pick4: p2,
                first: p1,
                second: p2,
                third: p3,
                trackName: config.draw,
                source: 'AutoScraper-RD',
                createdAt: new Date()
            });
            console.log(`   ✅ [Sniper] Saved Track: ${config.name} ${config.draw}`);
        }
    } catch (e) {
        if (e.code !== 11000) console.error(`      Error saving RD Track: ${e.message}`);
    }
}

module.exports = { fetchAndProcess };
