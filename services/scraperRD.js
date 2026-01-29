const axios = require('axios');
const cheerio = require('cheerio');
const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
dayjs.extend(customParseFormat);

const LotteryResult = require('../models/LotteryResult');

const Track = require('../models/Track');
const firebaseService = require('./firebaseService'); // NEW: Dual-Store

// --- CONFIGURATION ---
const GLOBAL_ADMIN_ID = "sniper_global_master_v1";
const URL_CONECTATE = 'https://www.conectate.com.do/loterias/';
const URL_DOMLOT = 'https://www.loteriasdominicanas.com/';

// Mapping: Keys are "Search Phrases" (flexible for both sites if possible, or specific)
const LOTTERY_CONFIGS = [
    { id: 'rd/ganamas/Tarde', name: 'Gana Mas', draw: 'Tarde', tags: ['Gana Más'] },
    { id: 'rd/nacional/Noche', name: 'Nacional', draw: 'Noche', tags: ['Lotería Nacional'] },
    { id: 'rd/leidsa/Noche', name: 'Leidsa', draw: 'Noche', tags: ['Quiniela Leidsa', 'Leidsa'] },
    { id: 'rd/real/Mediodía', name: 'Loteria Real', draw: 'Mediodia', tags: ['Quiniela Real'] },
    { id: 'rd/loteka/Noche', name: 'Loteka', draw: 'Noche', tags: ['Quiniela Loteka'] },

    // Specific (Noche/PM) MUST come before Generic (AM) to prevent partial matching
    { id: 'rd/primer/Noche', name: 'La Primera', draw: 'Noche', tags: ['Primera Noche'] },
    { id: 'rd/primer/AM', name: 'La Primera', draw: 'AM', tags: ['La Primera', 'La Primera Día'] },

    { id: 'rd/lotedom/Tarde', name: 'Lotedom', draw: 'Tarde', tags: ['LoteDom', 'Quiniela LoteDom'] },

    // Specific (PM) before Generic (AM)
    { id: 'rd/suerte/PM', name: 'La Suerte', draw: 'PM', tags: ['La Suerte 18:00', 'La Suerte 6PM', 'Quiniela Tarde'] },
    { id: 'rd/suerte/AM', name: 'La Suerte', draw: 'AM', tags: ['La Suerte', 'La Suerte MD'] }, // 12:30

    // NEW LOTTERIES
    { id: 'rd/king/Dia', name: 'King Lottery', draw: 'Dia', tags: ['King Lottery 12:30'] },
    { id: 'rd/king/Noche', name: 'King Lottery', draw: 'Noche', tags: ['King Lottery 7:30'] },
    { id: 'rd/anguila/10', name: 'Anguilla', draw: '10 AM', tags: ['Anguila 10:00 AM', 'Anguila 10'] },
    { id: 'rd/anguila/13', name: 'Anguilla', draw: '1 PM', tags: ['Anguila 1:00 PM', 'Anguila 13'] },
    { id: 'rd/anguila/18', name: 'Anguilla', draw: '6 PM', tags: ['Anguila 6:00 PM', 'Anguila 18'] },
    { id: 'rd/anguila/21', name: 'Anguilla', draw: '9 PM', tags: ['Anguila 9:00 PM', 'Anguila 21'] },
];

const HTTP = {
    timeout: 30000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8'
    }
};

function cleanNumber(text) {
    if (!text) return null;
    const clean = text.replace(/\D/g, '').trim();
    return clean.length > 0 ? clean.padStart(2, '0').slice(-2) : null;
}

// Identify lottery from raw title using tags
function identifyLottery(rawTitle) {
    if (!rawTitle) return null;
    const lower = rawTitle.toLowerCase().trim();
    for (const config of LOTTERY_CONFIGS) {
        for (const tag of config.tags) {

            // Special Casings
            if (tag === 'La Primera' && (lower.includes('noche') || lower.includes('night'))) continue; // Don't match Noche with generic ID

            if (lower.includes(tag.toLowerCase())) {
                return config;
            }
        }
    }
    return null;
}

// --- PRIMARY SOURCE: CONECTATE.COM.DO ---
async function fetchConectate() {
    console.log('   Trying Primary Source: Conectate.com.do ...');
    const { data } = await axios.get(URL_CONECTATE, HTTP);
    const $ = cheerio.load(data);
    const results = [];

    $('.game-block').each((_, el) => {
        const $el = $(el);
        // Title
        let rawTitle = $el.find('.game-title span').first().text().trim();
        // Fallback title
        if (!rawTitle) rawTitle = $el.find('.company-title a').first().text().trim();

        const config = identifyLottery(rawTitle);
        if (!config) return;

        // Date (Format: DD-MM) e.g., "06-01"
        const dateStr = $el.find('.session-date').text().trim();
        const date = parseDate(dateStr);

        // Numbers
        const nums = [];
        $el.find('.game-scores .score').each((i, scoreEl) => {
            const n = cleanNumber($(scoreEl).text());
            if (n) nums.push(n);
        });

        if (nums.length > 0) {
            results.push({ config, numbers: nums, date, source: 'Conectate' });
        }
    });

    if (results.length === 0) throw new Error("Conectate returned 0 results");
    return results;
}

// --- FALLBACK SOURCE: LOTERIASDOMINICANAS.COM ---
async function fetchLoteriasDominicanas() {
    console.log('   Trying Fallback Source: LoteriasDominicanas.com ...');
    const { data } = await axios.get(URL_DOMLOT, HTTP);
    const $ = cheerio.load(data);
    const results = [];

    $('.game-block').each((_, el) => {
        const $el = $(el);
        const rawTitle = $el.find('.game-title span').first().text().trim() ||
            $el.find('.company-title a').first().text().trim();

        const config = identifyLottery(rawTitle);
        if (!config) return;

        const dateStr = $el.find('.session-date').text().trim();
        const date = parseDate(dateStr);

        const nums = [];
        $el.find('.game-scores .score').each((i, scoreEl) => {
            const n = cleanNumber($(scoreEl).text());
            if (n) nums.push(n);
        });

        // Filter out bad parses (sometimes LoteriasDominicanas puts text in scores)
        const validNums = nums.filter(n => !isNaN(parseInt(n)));

        if (validNums.length > 0) {
            results.push({ config, numbers: validNums, date, source: 'DomLotteries' });
        }
    });

    if (results.length === 0) throw new Error("LoteriasDominicanas returned 0 results");
    return results;
}

// Helper: Normalize Date "DD-MM" -> "YYYY-MM-DD"
function parseDate(dateStr) {
    if (!dateStr || dateStr.length < 5) return dayjs().format('YYYY-MM-DD');
    // dateStr is DD-MM. We assume current year.
    // Logic: If date represents Today or Yesterday or recent past, fine.
    // If it's "31-12" and we are "01-01", it's last year.
    const today = dayjs();
    const currentYear = today.year();

    // Attempt parse with current year
    let parsed = dayjs(`${dateStr}-${currentYear}`, 'DD-MM-YYYY');

    // If parsed is in the future (e.g. today Jan 1, date is Dec 31 -> Dec 31 2026), subtract year
    if (parsed.isAfter(today.add(1, 'day'))) {
        parsed = parsed.subtract(1, 'year');
    }

    return parsed.isValid() ? parsed.format('YYYY-MM-DD') : today.format('YYYY-MM-DD');
}

// --- MAIN ORCHESTRATOR ---
async function fetchAndProcess() {
    console.log('🇩🇴 Starting RD Scraper (Dual-Source)...');
    let results = [];
    let successSource = null;

    // 1. Try Primary
    try {
        results = await fetchConectate();
        successSource = 'Conectate';
        console.log(`   ✅ Primary Source Success: ${results.length} results found.`);
    } catch (e) {
        console.warn(`   ⚠️ Primary Source Failed: ${e.message}`);
        // 2. Try Fallback
        try {
            results = await fetchLoteriasDominicanas();
            successSource = 'DomLotteries';
            // console.log(`   ✅ Fallback Source Success: ${results.length} results found.`);
        } catch (ex) {
            console.error(`   ❌ All Sources Failed: ${ex.message}`);
            throw ex;
        }
    }

    // 3. Save Results
    for (const res of results) {
        await saveResult(res, successSource);
    }
}

async function saveResult({ config, numbers, date }, sourceName) {
    if (!config || !numbers.length) return;

    const p1 = numbers[0];
    const p2 = numbers[1] || "---";
    const p3 = numbers[2] || "---";
    const dashNumbers = numbers.join('-');

    // 1. Dashboard Update
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
            { upsert: true, new: true }
        );

        // NEW: Sync to Secondary DB
        firebaseService.syncToFirestore('results', config.id, {
            resultId: config.id,
            country: 'RD',
            lotteryName: config.name,
            drawName: config.draw,
            numbers: dashNumbers,
            drawDate: date,
            scrapedAt: new Date()
        });
        // console.log(`      Saved ${config.name} (${config.draw})`);
    } catch (e) {
        console.error(`      Error saving Dashboard: ${e.message}`);
    }

    // 2. Sniper Track Update
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
                date: date, // String YYYY-MM-DD
                time: config.draw,
                p3: p1,
                pick3: p1,
                w4: p2 === "---" ? "00" : p2,
                pick4: p2 === "---" ? "00" : p2,
                first: p1,
                second: p2,
                third: p3,
                trackName: config.draw,
                source: `AutoScraper-${sourceName}`,
                createdAt: new Date()
            });
            console.log(`   ✅ [Sniper] New Track: ${config.name} ${config.draw} [${dashNumbers}]`);
        }
    } catch (e) {
        if (e.code !== 11000) console.error(`      Error saving Track: ${e.message}`);
    }
}

module.exports = { fetchAndProcess };
