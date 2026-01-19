const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
// removed TS import


dayjs.extend(utc);
dayjs.extend(timezone);

// Hardcoded Times (Fallback if constants import issues)
const CUTOFF_TIMES = {
    "New York AM": "14:18", "New York PM": "22:18",
    "Georgia Midday": "12:15", "Georgia Evening": "18:32", "Georgia Night": "23:00",
    "New Jersey AM": "12:47", "New Jersey PM": "22:45",
    "Florida AM": "13:23", "Florida PM": "21:33",
    "Connect AM": "13:33", "Connect PM": "22:02",
    "Pennsylvania AM": "12:58", "Pennsylvania PM": "18:48"
};

/**
 * Validates a scraped result before saving to DB
 * @param {string} resultId - e.g. 'usa/ny/Evening'
 * @param {string} dateISO - 'YYYY-MM-DD'
 * @param {string} numbers - '123-4567'
 * @returns {object} { valid: boolean, reason: string }
 */
function validateResult(resultId, dateISO, numbers) {
    if (!resultId || !dateISO || !numbers) return { valid: false, reason: 'Missing Fields' };

    // 1. Future Date Check
    const nowNY = dayjs().tz('America/New_York');
    const todayISO = nowNY.format('YYYY-MM-DD');
    const inputDate = dayjs(dateISO);

    if (inputDate.isAfter(nowNY, 'day')) {
        return { valid: false, reason: 'Future Date Detected' };
    }

    // 2. Early Bird Check (Prevent "Today's Evening" appearing at Noon)
    // Only applies if Date == Today
    if (dateISO === todayISO) {
        if (!isDrawTimePassed(resultId, nowNY)) {
            // Exception: If result is verified from official source (TODO)
            // For now, if scraper returns it, we assume scraper logic (which now caps future) handled it.
            // But strict validation means: Don't accept Evening result at 10AM.
            return { valid: false, reason: 'Too Early for Result' };
        }
    }

    // 3. Format Check
    if (numbers.includes('undefined') || numbers.length < 3) {
        return { valid: false, reason: 'Invalid Number Format' };
    }

    return { valid: true };
}

function isDrawTimePassed(resultId, nowObj) {
    // Map ID to Cutoff Key (Simplified)
    let key = '';
    if (resultId.includes('ny/Evening')) key = 'New York PM';
    else if (resultId.includes('ny/Midday')) key = 'New York AM';
    else if (resultId.includes('ga/Evening')) key = 'Georgia Evening';
    else if (resultId.includes('ga/Midday')) key = 'Georgia Midday';
    // Add others if needed... 

    if (!key || !CUTOFF_TIMES[key]) return true; // Default accept if unknown

    const [h, m] = CUTOFF_TIMES[key].split(':');
    const drawTime = nowObj.clone().hour(parseInt(h)).minute(parseInt(m));

    // Add 5 min buffer
    return nowObj.isAfter(drawTime.add(5, 'minute'));
}

module.exports = { validateResult };
