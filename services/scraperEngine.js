const axios = require('axios');
const cheerio = require('cheerio');
const dayjs = require('dayjs');

const HTTP = {
    timeout: 30000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache'
    },
    maxRedirects: 5
};

async function fetchHtml(url) {
    // Add random delay to be polite (500ms - 1500ms)
    await new Promise(r => setTimeout(r, 500 + Math.random() * 1000));
    try {
        const { data } = await axios.get(url, { ...HTTP, params: { t: Date.now() } });
        return data;
    } catch (e) {
        throw new Error(`Fetch failed: ${e.message}`);
    }
}

// ── Helpers ───────────────────────────────────────────────────────────
function cleanTextBlocks(txt) {
    let t = (txt || '').replace(/\s+/g, ' ');
    t = t.replace(/\$[0-9][0-9,.]*/g, ' ');
    t = t.replace(/\b\d{1,2}:\d{2}(\s?[ap]m)?\b/gi, ' ');
    t = t.replace(/\b(prize|top prize|payout|how to|odds|draws? at)\b[^.!?\n]*/gi, ' ');
    return t;
}

function pickConsecutiveSingleDigitNodes($, $container, n) {
    const nodes = $container.find('span,div,li,p').toArray()
        .map(el => $(el).text().trim())
        .map(t => t && /^[0-9]$/.test(t) ? t : null);
    for (let i = 0; i <= nodes.length - n; i++) {
        const slice = nodes.slice(i, i + n);
        if (slice.every(x => x !== null)) return slice.join('');
    }
    return null;
}

function pickNDigitsFromTextSafe($, $container, n) {
    const txt = cleanTextBlocks($container.text());
    const mSpan = txt.match(new RegExp(`(?:\\d\\D*){${n}}`));
    if (mSpan) {
        const d = mSpan[0].replace(/\D+/g, '').slice(0, n);
        if (d.length === n) return d;
    }
    const mTight = txt.match(new RegExp(`\\d{${n}}`));
    return mTight ? mTight[0] : null;
}

// Date Parsing
function eastCoastDateISO(d = new Date()) {
    const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' });
    return fmt.format(d);
}

function parseDateFromText(text) {
    const y = dayjs().year();
    const t = (text || '').replace(/\s+/g, ' ');

    // Month-name format
    const m1 = t.match(/\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2})(?:,\s*(\d{4}))?/i);
    if (m1) {
        const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        const M = monthNames.findIndex(x => m1[1].toLowerCase().startsWith(x)) + 1;
        const D = parseInt(m1[2], 10);
        const Y = m1[3] ? parseInt(m1[3], 10) : y;
        return dayjs(`${Y}-${String(M).padStart(2, '0')}-${String(D).padStart(2, '0')}`);
    }

    // Numeric format
    const m2 = t.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
    if (m2) {
        const M = parseInt(m2[1], 10), D = parseInt(m2[2], 10);
        let Y = m2[3] ? parseInt(m2[3], 10) : y;
        if (Y < 100) Y = 2000 + Y;
        return dayjs(`${Y}-${String(M).padStart(2, '0')}-${String(D).padStart(2, '0')}`);
    }
    return null;
}

function eastCoastISOFromDayjs(dj) {
    if (!dj) return null;
    const todayNY = dayjs(eastCoastDateISO());
    return dj.isAfter(todayNY) ? todayNY.format('YYYY-MM-DD') : dj.format('YYYY-MM-DD');
}

function maxISO(...djs) {
    const arr = djs.filter(Boolean);
    if (!arr.length) return null;
    const latest = arr.sort((a, b) => a.valueOf() - b.valueOf()).pop();
    return eastCoastISOFromDayjs(latest);
}

// ── Extraction Logic ──────────────────────────────────────────────
const CT_LABEL_RE = {
    Day: /(day(?:time)?)/i,
    Night: /(night)/i,
    Midday: /(midday|day(?:time)?)/i,
    Evening: /(evening|night)/i
};

function extractFirstInLatest($, n) {
    const scopes = ['main', 'article', 'section', '.results', 'table', 'ul', 'ol'];
    for (const sel of scopes) {
        const $blk = $(sel).first();
        if ($blk.length) {
            const bySpans = pickConsecutiveSingleDigitNodes($, $blk, n);
            if (bySpans) return bySpans;
            const byText = pickNDigitsFromTextSafe($, $blk, n);
            if (byText) return byText;
        }
    }
    const bySpans = pickConsecutiveSingleDigitNodes($, $.root(), n);
    if (bySpans) return bySpans;
    return pickNDigitsFromTextSafe($, $.root(), n);
}

function extractByLabel($, label, n) {
    // 1) Find "Latest numbers" section
    let $section = $('section').filter((_, el) => {
        const h = $(el).find('h1,h2,h3').first().text().trim().toLowerCase();
        return h.includes('latest') && h.includes('number');
    }).first();
    if (!$section.length) $section = $.root();

    // 2) Find label
    const re = CT_LABEL_RE[label] || new RegExp(label, 'i');
    const $labelEl = $section.find('*').filter((_, el) =>
        re.test($(el).text().trim().toLowerCase())
    ).first();
    if (!$labelEl.length) return { digits: null, date: null };

    // 3) Walk forward looking for digits
    const candidates = [];
    let walker = $labelEl;
    for (let steps = 0; steps < 40; steps++) {
        const $next = walker.next();
        if (!$next.length) break;
        walker = $next;
        candidates.push(walker);
        candidates.push(...walker.find('li,div,p,span').toArray().map(el => $(el)));
        if (candidates.length > 80) break;
    }

    for (const $cand of candidates) {
        const d1 = pickConsecutiveSingleDigitNodes($, $cand, n);
        if (d1) return { digits: d1, date: parseDateFromText($cand.text()) || parseDateFromText($labelEl.text()) };
        const d2 = pickNDigitsFromTextSafe($, $cand, n);
        if (d2) return { digits: d2, date: parseDateFromText($cand.text()) || parseDateFromText($labelEl.text()) };
    }

    const d3 = pickConsecutiveSingleDigitNodes($, $labelEl, n) || pickNDigitsFromTextSafe($, $labelEl, n);
    return { digits: d3, date: parseDateFromText($labelEl.text()) };
}

function extractRowByLabel($, label, n) {
    const labelRe = CT_LABEL_RE[label] || new RegExp(label, 'i');
    const rowSel = 'tr, li, .row, .result, .draw, .results-row, .c-results-card, section, article, div';
    let best = null, bestSize = Infinity;
    $(rowSel).each((_, el) => {
        const $el = $(el);
        const text = $el.text();
        if (!labelRe.test(text)) return;
        const hasNDigits = new RegExp(`\\d[^\\d]*`.repeat(n)).test(text);
        if (!hasNDigits) return;
        const size = $el.text().length;
        if (size < bestSize) { best = $el; bestSize = size; }
    });
    if (!best) return { digits: null, date: null };
    const d1 = pickConsecutiveSingleDigitNodes($, best, n);
    const d2 = d1 || pickNDigitsFromTextSafe($, best, n);
    const date = parseDateFromText(best.text());
    return d2 ? { digits: d2, date } : { digits: null, date: null };
}

async function tryUrls(urls, label, n, tag) {
    for (const u of urls) {
        try {
            const html = await fetchHtml(u);
            const $ = cheerio.load(html);

            const isCT = /\/connecticut\//i.test(u);
            const isCtDedicated = /\/connecticut\/(midday|night)-[34]\//i.test(u) || (label === 'Night' && /\/connecticut\/play-[34]\//i.test(u));
            const isGA = /\/georgia\//i.test(u);
            const isGaDedicated = /\/georgia\/(midday-[34]|cash-[34](?:-evening)?\/?)$/i.test(u);

            let digits = null, date = null;

            if (isCT && isCtDedicated) {
                digits = extractFirstInLatest($, n);
                date = parseDateFromText($.root().text());
            } else if (isCT) {
                ({ digits, date } = extractRowByLabel($, label, n));
            } else if (isGA && isGaDedicated) {
                digits = extractFirstInLatest($, n);
                date = parseDateFromText($.root().text()) || null;
            } else {
                ({ digits, date } = extractByLabel($, label, n));
            }

            if (digits) return { digits, date };
        } catch (e) {
            console.log(`[WARN] ${tag} ${u} -> ${e?.response?.status || e.message}`);
        }
    }
    return { digits: null, date: null };
}

// ── Main Export ───────────────────────────────────────────────────────────
async function scrapeState(stateKey, config) {
    const jobs = [
        tryUrls(config.p3.mid.urls, config.p3.mid.label, 3, `${stateKey}.p3.mid`),
        tryUrls(config.p3.eve.urls, config.p3.eve.label, 3, `${stateKey}.p3.eve`),
        tryUrls(config.p4.mid.urls, config.p4.mid.label, 4, `${stateKey}.p4.mid`),
        tryUrls(config.p4.eve.urls, config.p4.eve.label, 4, `${stateKey}.p4.eve`)
    ];

    let hasNight = config.p3.ngt && config.p4.ngt;
    if (hasNight) {
        jobs.push(
            tryUrls(config.p3.ngt.urls, config.p3.ngt.label, 3, `${stateKey}.p3.ngt`),
            tryUrls(config.p4.ngt.urls, config.p4.ngt.label, 4, `${stateKey}.p4.ngt`)
        );
    }

    const results = await Promise.all(jobs);
    const ok = (s, n) => typeof s === 'string' && /^\d+$/.test(s) && s.length === n;

    const [mid3, eve3, mid4, eve4, n3, n4] = hasNight ? results : [...results, { digits: null, date: null }, { digits: null, date: null }];

    const m3 = ok(mid3.digits, 3) ? mid3.digits : null;
    const m4 = ok(mid4.digits, 4) ? mid4.digits : null;
    const e3 = ok(eve3.digits, 3) ? eve3.digits : null;
    const e4 = ok(eve4.digits, 4) ? eve4.digits : null;
    const nn3 = ok(n3.digits, 3) ? n3.digits : null;
    const nn4 = ok(n4.digits, 4) ? n4.digits : null;

    const dateISO_midday = (m3 && m4) ? maxISO(mid3.date, mid4.date) : null;
    const dateISO_evening = (e3 && e4) ? maxISO(eve3.date, eve4.date) : null;
    const dateISO_night = (nn3 && nn4) ? maxISO(n3?.date, n4?.date) : null;

    return {
        midday: (m3 && m4) ? { p3: m3, w4: m4, date: dateISO_midday } : null,
        evening: (e3 && e4) ? { p3: e3, w4: e4, date: dateISO_evening } : null,
        night: (nn3 && nn4) ? { p3: nn3, w4: nn4, date: dateISO_night } : null
    };
}

module.exports = { scrapeState };
