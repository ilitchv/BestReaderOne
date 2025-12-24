const axios = require('axios');
const cheerio = require('cheerio');
const dayjs = require('dayjs');

// --- MOCK HELPERS ---
const HTTP = {
    timeout: 30000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123 Safari/537.36',
    }
};

function cleanTextBlocks(txt) {
    let t = (txt || '').replace(/\s+/g, ' ');
    return t;
}

function eastCoastDateISO() {
    return "2025-12-22"; // Mock
}

function parseDateFromText(text) {
    const t = (text || '').replace(/\s+/g, ' ');
    // console.log(`      [Check Date] "${t.substring(0, 40)}..."`);

    if (/\b(today)\b/i.test(t)) {
        console.log(`      >>>> MATCHED "TODAY" <<<<`);
        return eastCoastDateISO();
    }

    // Simple Regex for date
    if (/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}/i.test(t)) {
        console.log(`      >>>> MATCHED DATE STRING: ${t.substring(0, 20)}... <<<<`);
    }

    return null;
}

async function debugUrl(url, label) {
    console.log(`\n--- DEBUGGING URL: ${url} ---`);
    const { data } = await axios.get(url, HTTP);
    const $ = cheerio.load(data);

    // 1. Find "Latest numbers" section
    let $section = $('section').filter((_, el) => {
        const h = $(el).find('h1,h2,h3').first().text().trim().toLowerCase();
        return h.includes('latest') && h.includes('number');
    }).first();

    if ($section.length) {
        console.log(`\n✅ FOUND "Latest numbers" SECTION <${$section[0].name}>`);
        console.log(`   Section Text Preview: "${cleanTextBlocks($section.text()).substring(0, 200)}..."`);

        // Check for Label inside Section
        const labelRe = new RegExp(label, 'i');
        const $labelEl = $section.find('*').filter((_, el) => labelRe.test($(el).text().trim())).first();

        if ($labelEl.length) {
            console.log(`   ✅ Label '${label}' FOUND inside section: <${$labelEl[0].name}> "${cleanTextBlocks($labelEl.text())}"`);
            console.log(`   Parent: <${$labelEl.parent()[0].name}>`);

            // Walk from Label
            let walker = $labelEl;
            for (let i = 0; i < 10; i++) {
                const $next = walker.next();
                if (!$next.length) break;
                walker = $next;
                console.log(`      +${i + 1} Sibling <${walker[0].name}>: "${cleanTextBlocks(walker.text()).substring(0, 100)}..."`);
                parseDateFromText(walker.text());
            }

            // ALSO CHECK PARENT SIBLINGS (Often label is in a header/div, and result is next div)
            console.log(`   --- Checking Parent Siblings ---`);
            let parentWalker = $labelEl.parent();
            for (let i = 0; i < 5; i++) {
                const $next = parentWalker.next();
                if (!$next.length) break;
                parentWalker = $next;
                console.log(`      (P)+${i + 1} Sibling <${parentWalker[0].name}>: "${cleanTextBlocks(parentWalker.text()).substring(0, 100)}..."`);
                parseDateFromText(parentWalker.text());
            }

        } else {
            console.log(`   ❌ Label '${label}' NOT FOUND inside section.`);
        }

    } else {
        console.log(`\n❌ "Latest numbers" SECTION NOT FOUND. Falling back to root.`);
    }
}

(async () => {
    // New York EVENING (Problematic: shows yesterday's nums with today's date?)
    await debugUrl('https://www.lotteryusa.com/new-york/numbers/', 'Evening');
})();
