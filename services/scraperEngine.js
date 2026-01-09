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
    const nodes = $container.find('span,div,li,p,td').toArray()
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
    const t = (text || '').replace(/\s+/g, ' ');

    // 1. React/Symfony Props Detection (PRIORITY)
    // Matches: "drawDate":"22-12-2025" or HTML encoded variant
    // We prioritize this because "Today" might appear in "Next Draw: Today" text, which is wrong for previous results.
    const reactDate = t.match(/drawDate(?:&quot;|"|\\")?:(?:&quot;|"|\\")?(\d{2}-\d{2}-\d{4})/);
    if (reactDate) {
        // Format is DD-MM-YYYY
        const [d, m, y] = reactDate[1].split('-');
        return dayjs(`${y}-${m}-${d}`);
    }

    // 2. Explicit "Today" check
    if (/\b(today)\b/i.test(t)) {
        return dayjs(eastCoastDateISO());
    }

    const y = dayjs().year();

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

// Date Capping (Ref Repo Logic)
function eastCoastISOFromDayjs(dj) {
    if (!dj) return null;
    const todayNY = dayjs(eastCoastDateISO());
    // If date is in the future, cap it to Today (Ref Repo Strategy)
    return dj.isAfter(todayNY) ? todayNY.format('YYYY-MM-DD') : dj.format('YYYY-MM-DD');
}

function parseDateFromText(text) {
    const t = (text || '').replace(/\s+/g, ' ');

    // 1. React/Symfony Props Detection (PRIORITY)
    // Matches: "drawDate":"22-12-2025"
    const reactDate = t.match(/drawDate(?:&quot;|"|\\")?:(?:&quot;|"|\\")?(\d{2}-\d{2}-\d{4})/);
    if (reactDate) {
        const [d, m, y] = reactDate[1].split('-');
        return dayjs(`${y}-${m}-${d}`);
    }

    // REF REPO CHANGE: Removed explicit "Today" check here.
    // We only parse specific dates. Defaulting happens in scrapeState/maxISO.

    const y = dayjs().year();

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

function maxISO(...djs) {
    const arr = djs.filter(Boolean);
    if (!arr.length) return null; // Let caller default if needed
    // Sort by time value
    const latest = arr.sort((a, b) => a.valueOf() - b.valueOf()).pop();
    // Cap at today (Ref Repo Logic)
    return eastCoastISOFromDayjs(latest);
}

// ── Extraction Logic ──────────────────────────────────────────────
const CT_LABEL_RE = {
    Day: /(day(?:time)?)/i,
    Night: /(night)/i,
    Midday: /(midday|day(?:time)?)/i,
    Evening: /(evening|night)/i,
    Morning: /(morning)/i
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
    let $section = $('section').filter((_, el) => {
        const h = $(el).find('h1,h2,h3').first().text().trim().toLowerCase();
        return h.includes('latest') && h.includes('number');
    }).first();
    if (!$section.length) $section = $.root();

    const re = CT_LABEL_RE[label] || new RegExp(label, 'i');
    const $labelEl = $section.find('*').filter((_, el) =>
        re.test($(el).text().trim().toLowerCase())
    ).first();
    if (!$labelEl.length) return { digits: null, date: null };

    // REF REPO CHANGE: Stop walking if we hit the next label
    const NEXT_LABEL_RE = /\b(day|night|midday|evening|morning)\b/i;

    const candidates = [];
    let walker = $labelEl;
    for (let steps = 0; steps < 40; steps++) {
        const $next = walker.next();
        if (!$next.length) break;
        walker = $next;

        const text = walker.text();
        // Check if we hit another draw label (avoid bleeding into next draw)
        if (steps > 0 && NEXT_LABEL_RE.test(text) && !re.test(text)) break;

        candidates.push(walker);
        candidates.push(...walker.find('li,div,p,span').toArray().map(el => $(el)));
        if (candidates.length > 80) break;
    }

    for (const $cand of candidates) {
        const dateText = $cand.text() + ' ' + ($cand.attr('data-symfony--ux-react--react-props-value') || '');
        const candDate = parseDateFromText(dateText);
        const labelDate = parseDateFromText($labelEl.text() + ' ' + ($labelEl.attr('data-symfony--ux-react--react-props-value') || ''));

        const d1 = pickConsecutiveSingleDigitNodes($, $cand, n);
        if (d1) return { digits: d1, date: candDate || labelDate };
        const d2 = pickNDigitsFromTextSafe($, $cand, n);
        if (d2) return { digits: d2, date: candDate || labelDate };
    }

    const labelDateFull = parseDateFromText($labelEl.text() + ' ' + ($labelEl.attr('data-symfony--ux-react--react-props-value') || ''));
    const d3 = pickConsecutiveSingleDigitNodes($, $labelEl, n) || pickNDigitsFromTextSafe($, $labelEl, n);
    return { digits: d3, date: labelDateFull };
}

// NEW STRATEGY: Find Header then Find Table
function extractTableAfterLabel($, label, n) {
    const labelRe = CT_LABEL_RE[label] || new RegExp(label, 'i');
    const NEXT_LABEL_RE = /\b(day|night|midday|evening|morning|prizes|odds)\b/i;

    // Find all potential headers
    const candidates = $('h2, h3, h4, th, div, span, p').filter((_, el) => {
        const t = $(el).text().trim();
        return labelRe.test(t) && t.length < 50;
    });

    for (const cand of candidates.toArray()) {
        console.log(`[DEBUG] Candidate: ${$(cand).text().trim()} (${$(cand).prop('tagName')})`);
        let $walker = $(cand).next();
        let steps = 0;
        while ($walker.length && steps < 10) {
            console.log(`  [DEBUG] Step ${steps}: <${$walker.prop('tagName')}> class=${$walker.attr('class')}`);
            // Check if we hit another label
            const text = $walker.text();
            if (NEXT_LABEL_RE.test(text) && !labelRe.test(text) && (text.length < 30)) {
                console.log(`  [DEBUG] Hit next label: ${text}`);
                break;
            }

            // Check for table rows or table
            const $rows = $walker.is('table') ? $walker.find('tr') : $walker.find('tr, li, .row, .result');
            console.log(`  [DEBUG] Found ${$rows.length} rows`);

            if ($rows.length > 0) {
                // Iterate rows to find latest date
                for (const row of $rows.toArray()) {
                    const $r = $(row);
                    console.log(`    [DEBUG] Row: ${$r.text().replace(/\s+/g, ' ').slice(0, 50)}`);
                    const d1 = pickConsecutiveSingleDigitNodes($, $r, n);
                    const d2 = d1 || pickNDigitsFromTextSafe($, $r, n);
                    console.log(`    [DEBUG] Digits: ${d2}`);
                    if (d2) {
                        // Extract Date
                        const reactProps = $r.attr('data-symfony--ux-react--react-props-value') || '';
                        let date = parseDateFromText($r.text() + ' ' + reactProps);
                        console.log(`    [DEBUG] Date (Direct): ${date}`);
                        // Fallback to searching children
                        if (!date) {
                            const childProps = $r.find('*').map((_, el) => $(el).attr('data-symfony--ux-react--react-props-value') || '').get().join(' ');
                            date = parseDateFromText(childProps);
                            console.log(`    [DEBUG] Date (Child): ${date}`);
                        }
                        if (date) return { digits: d2, date };
                    }
                }
            }
            $walker = $walker.next();
            steps++;
        }
    }
    return { digits: null, date: null };
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

    // Check React props on Best Node
    const reactProps = best.attr('data-symfony--ux-react--react-props-value') || '';
    const dateText = best.text() + ' ' + reactProps;
    let date = parseDateFromText(dateText);

    // If no date found checking the row text, try checking children
    if (!date) {
        const childProps = best.find('*').map((_, el) => $(el).attr('data-symfony--ux-react--react-props-value') || '').get().join(' ');
        date = parseDateFromText(childProps);
    }

    const d1 = pickConsecutiveSingleDigitNodes($, best, n);
    const d2 = d1 || pickNDigitsFromTextSafe($, best, n);

    return d2 ? { digits: d2, date } : { digits: null, date: null };
}

// NEW STRATEGY: Extract from /year table (Chronological)
function extractYearTable($, n) {
    console.log("[DEBUG] Entering extractYearTable");
    let best = { digits: null, date: null };

    $('table').each((tIdx, tbl) => {
        if (best.digits) return; // Stop if found
        console.log(`[DEBUG] Table ${tIdx} found`);

        const rows = $(tbl).find('tr');
        rows.each((i, row) => {
            if (best.digits) return;

            const $r = $(row);
            const txt = $r.text().trim();
            if (txt.length < 20) return; // Skip short rows (header detection)
            if (!/\d/.test(txt)) return;

            // Extract Date (Assumes first col or text match)
            const date = parseDateFromText(txt);
            console.log(`  [DEBUG] Row ${i}: ${txt.slice(0, 30)}... Date: ${date ? date.format('YYYY-MM-DD') : 'null'}`);
            if (!date) return;

            // Extract Digits
            const d1 = pickConsecutiveSingleDigitNodes($, $r, n);
            const d2 = d1 || pickNDigitsFromTextSafe($, $r, n);
            console.log(`  [DEBUG] Row ${i} Digits: ${d2}`);

            if (d2) {
                best = { digits: d2, date };
            }
        });
    });

    return best;
}

async function tryUrls(urls, label, n, tag) {
    if (!urls || urls.length === 0) return { digits: null, date: null }; // Guard clause



    for (const u of urls) {

        // console.log(`[DEBUG] tryUrls Checking: ${u} (YearPage: ${u.endsWith('/year')})`);

        try {
            const html = await fetchHtml(u);
            const $ = cheerio.load(html);

            const isCT = /\/connecticut\//i.test(u);
            const isCtDedicated = /\/connecticut\/(midday|night)-[34]\//i.test(u) || (label === 'Night' && /\/connecticut\/play-[34]\//i.test(u));
            const isGA = /\/georgia\//i.test(u);
            const isGaDedicated = /\/georgia\/(midday-[34]|cash-[34](?:-evening)?\/?)$/i.test(u);

            // Generic dedicated page check (if url ends in specific draw name)
            const isDedicated = isCtDedicated || isGaDedicated || /morning|midday|evening|night/i.test(u.split('/').pop());

            let digits = null, date = null;

            const isYearPage = u.endsWith('/year');

            if (isYearPage) {
                // STRATEGY: /year page
                const res = extractYearTable($, n);
                if (res.digits) { digits = res.digits; date = res.date; }
            } else if (isCT && isCtDedicated) {
                digits = extractFirstInLatest($, n);
                date = parseDateFromText($.root().text());
            } else if (isCT) {


                const res = extractTableAfterLabel($, label, n);


                if (res.digits) { digits = res.digits; date = res.date; }
                else {
                    const rowRes = extractRowByLabel($, label, n);

                    ({ digits, date } = rowRes);
                }
            } else if (isGA && isGaDedicated) {
                digits = extractFirstInLatest($, n);
                date = parseDateFromText($.root().text()) || null;
            } else if (isDedicated) {
                // Aggressive first match for dedicated pages
                digits = extractFirstInLatest($, n);
                date = parseDateFromText($.root().text());
            } else {
                // Try Table After Label FIRST (Consolidated Pages)
                const res = extractTableAfterLabel($, label, n);

                if (res.digits) {
                    digits = res.digits;
                    date = res.date;
                } else {
                    ({ digits, date } = extractByLabel($, label, n));
                }
            }

            if (digits) {

                return { digits, date };
            }
        } catch (e) {
            console.log(`[WARN] ${tag} ${u} -> ${e?.response?.status || e.message}`);
        }
    }
    return { digits: null, date: null };
}

// ── Main Export ───────────────────────────────────────────────────────────
async function scrapeState(stateKey, config) {
    // 1. Define Jobs for Standard Draws
    const jobs = [
        tryUrls(config.p3.mid?.urls, config.p3.mid?.label || 'Midday', 3, `${stateKey}.p3.mid`),
        tryUrls(config.p3.eve?.urls, config.p3.eve?.label || 'Evening', 3, `${stateKey}.p3.eve`),
        tryUrls(config.p4.mid?.urls, config.p4.mid?.label || 'Midday', 4, `${stateKey}.p4.mid`),
        tryUrls(config.p4.eve?.urls, config.p4.eve?.label || 'Evening', 4, `${stateKey}.p4.eve`)
    ];

    // 2. Add Night Support
    let hasNight = config.p3.ngt && config.p4.ngt;
    if (hasNight) {
        jobs.push(
            tryUrls(config.p3.ngt.urls, config.p3.ngt.label, 3, `${stateKey}.p3.ngt`),
            tryUrls(config.p4.ngt.urls, config.p4.ngt.label, 4, `${stateKey}.p4.ngt`)
        );
    } else {
        jobs.push(Promise.resolve({ digits: null, date: null }), Promise.resolve({ digits: null, date: null }));
    }

    // 3. Add Morning Support (Texas)
    let hasMorning = config.p3.mor && config.p4.mor;
    if (hasMorning) {
        jobs.push(
            tryUrls(config.p3.mor.urls, config.p3.mor.label, 3, `${stateKey}.p3.mor`),
            tryUrls(config.p4.mor.urls, config.p4.mor.label, 4, `${stateKey}.p4.mor`)
        );
    } else {
        jobs.push(Promise.resolve({ digits: null, date: null }), Promise.resolve({ digits: null, date: null }));
    }

    const results = await Promise.all(jobs);
    const ok = (s, n) => typeof s === 'string' && /^\d+$/.test(s) && s.length === n;

    // Destructure results [Mid, Eve, Night, Morning]
    const [mid3, eve3, mid4, eve4, n3, n4, mor3, mor4] = results;

    const m3 = ok(mid3?.digits, 3) ? mid3.digits : null;
    const m4 = ok(mid4?.digits, 4) ? mid4.digits : null;
    const e3 = ok(eve3?.digits, 3) ? eve3.digits : null;
    const e4 = ok(eve4?.digits, 4) ? eve4.digits : null;
    const nn3 = ok(n3?.digits, 3) ? n3.digits : null;
    const nn4 = ok(n4?.digits, 4) ? n4.digits : null;
    const mo3 = ok(mor3?.digits, 3) ? mor3.digits : null;
    const mo4 = ok(mor4?.digits, 4) ? mor4.digits : null;

    const dateISO_mid = (m3 && m4) ? maxISO(mid3.date, mid4.date) : null;
    const dateISO_eve = (e3 && e4) ? maxISO(eve3.date, eve4.date) : null;
    const dateISO_ngt = (nn3 && nn4) ? maxISO(n3?.date, n4?.date) : null;
    const dateISO_mor = (mo3 && mo4) ? maxISO(mor3?.date, mor4?.date) : null;

    // Special Case: Michigan 'Evening' is displayed as 'Night' in UI
    const finalNight = (stateKey === 'mi' && e3 && e4) ? { p3: e3, w4: e4, date: dateISO_eve } : ((nn3 && nn4) ? { p3: nn3, w4: nn4, date: dateISO_ngt } : null);

    return {
        midday: (m3 && m4) ? { p3: m3, w4: m4, date: dateISO_mid } : null,
        evening: (e3 && e4) ? { p3: e3, w4: e4, date: dateISO_eve } : null,
        night: finalNight,
        morning: (mo3 && mo4) ? { p3: mo3, w4: mo4, date: dateISO_mor } : null
    };
}

module.exports = { scrapeState };
