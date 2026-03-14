const Ticket = require('../models/Ticket');
const Jugada = require('../models/Jugada');
const GlobalConfig = require('../models/GlobalConfig');
const { RESULTS_CATALOG, WAGER_LIMITS } = require('../constants-backend');
const LotteryResult = require('../models/LotteryResult');
const TrackConfig = require('../models/TrackConfig');

// Helper to get formatted date string "YYYY-MM-DD" in LOCAL timezone
const getTodayStr = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const localDate = new Date(now.getTime() - offset);
    return localDate.toISOString().split('T')[0];
};

// 1. Get Current Limits (DB or Fallback)
const getLimits = async () => {
    try {
        const config = await GlobalConfig.findOne({ key: 'WAGER_LIMITS' });
        if (config && config.value) return config.value;
        return WAGER_LIMITS;
    } catch (e) {
        console.error("Error fetching limits:", e);
        return WAGER_LIMITS;
    }
};

// 2. Calculate Total Exposure for a specific Target
const calculateExposure = async (trackName, dateStr, betNumber, gameMode) => {
    try {
        const trackRegex = new RegExp(trackName, 'i');
        const dateRegex = new RegExp(dateStr, 'i');

        const aggregation = await Jugada.aggregate([
            {
                $match: {
                    betNumber: betNumber.trim(),
                    gameMode: gameMode,
                    tracks: { $regex: trackRegex },
                    betDates: { $regex: dateRegex },
                    isCancelled: { $ne: true }
                }
            },
            {
                $group: {
                    _id: null,
                    totalStraight: {
                        $sum: { $cond: [{ $eq: ["$isRelocation", true] }, { $multiply: ["$straight", -1] }, "$straight"] }
                    },
                    totalBox: {
                        $sum: { $cond: [{ $eq: ["$isRelocation", true] }, { $multiply: ["$box", -1] }, "$box"] }
                    },
                    totalCombo: {
                        $sum: { $cond: [{ $eq: ["$isRelocation", true] }, { $multiply: ["$combo", -1] }, "$combo"] }
                    }
                }
            }
        ]);

        if (aggregation.length > 0) {
            return {
                str: aggregation[0].totalStraight,
                box: aggregation[0].totalBox,
                com: aggregation[0].totalCombo
            };
        }
        return { str: 0, box: 0, com: 0 };
    } catch (e) {
        console.error("Risk calc error:", e);
        return { str: 0, box: 0, com: 0 };
    }
};

// 3. Validate Plays
const validatePlays = async (ticketPayload) => {
    // BYPASS FOR DROPS/RELOCATIONS
    const tNum = ticketPayload.ticketNumber || "";
    if (ticketPayload.isRelocation || tNum.startsWith('RELOCATE-') || tNum.startsWith('DROP-') || tNum.startsWith('AUTO-DROP-')) {
        return { allowed: true, failures: [] };
    }

    const limits = await getLimits();
    const failures = [];
    const tracks = Array.isArray(ticketPayload.tracks) ? ticketPayload.tracks : [ticketPayload.tracks];
    const dates = Array.isArray(ticketPayload.betDates) ? ticketPayload.betDates : [ticketPayload.betDates];

    const pendingAggregator = new Map();
    ticketPayload.plays.forEach(play => {
        const key = `${play.gameMode}|${play.betNumber.trim()}`;
        const existing = pendingAggregator.get(key) || { str: 0, box: 0, com: 0 };
        existing.str += (play.straightAmount || 0);
        existing.box += (play.boxAmount || 0);
        existing.com += (play.comboAmount || 0);
        pendingAggregator.set(key, existing);
    });

    for (const track of tracks) {
        for (const date of dates) {
            for (const [key, pendingTotal] of pendingAggregator.entries()) {
                const [gameMode, betNumber] = key.split('|');
                const currentRisk = await calculateExposure(track, date, betNumber, gameMode);

                const totalStr = currentRisk.str + pendingTotal.str;
                const totalBox = currentRisk.box + pendingTotal.box;
                const totalCom = currentRisk.com + pendingTotal.com;

                let limitKey = gameMode;
                if (gameMode.includes('Pulito')) limitKey = 'Pulito';
                if (gameMode.includes('Single Action')) limitKey = 'Single Action';
                const modeLimits = limits[limitKey];
                if (!modeLimits) continue;

                if (pendingTotal.str > 0 && totalStr > modeLimits.STRAIGHT) {
                    failures.push({ number: betNumber, track, type: 'STRAIGHT', current: currentRisk.str, proposed: pendingTotal.str, limit: modeLimits.STRAIGHT });
                }
                if (pendingTotal.box > 0 && totalBox > modeLimits.BOX) {
                    failures.push({ number: betNumber, track, type: 'BOX', current: currentRisk.box, proposed: pendingTotal.box, limit: modeLimits.BOX });
                }
                if (pendingTotal.com > 0 && totalCom > modeLimits.COMBO) {
                    failures.push({ number: betNumber, track, type: 'COMBO', current: currentRisk.com, proposed: pendingTotal.com, limit: modeLimits.COMBO });
                }
            }
        }
    }
    return { allowed: failures.length === 0, failures };
};

// 4. Autopilot Drop Logic
async function processAutoDrops() {
    try {
        const config = await GlobalConfig.findOne({ key: 'AUTOPILOT_RELOCATION_ENABLED' });
        if (!config || !config.value) return;

        const now = new Date();
        const nowTimeSecs = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

        // 20 minute threshold = 1200 seconds
        const imminentTracks = RESULTS_CATALOG.filter(track => {
            if (!track.closeTime) return false;
            const [h, m, s] = track.closeTime.split(':').map(val => Number(val || 0));
            const closeSecs = h * 3600 + m * 60 + (s || 0);
            const diff = closeSecs - nowTimeSecs;
            return diff > 0 && diff <= 1260; // 21 mins roughly
        });

        if (imminentTracks.length === 0) return;
        const limits = await getLimits();

        for (const trackObj of imminentTracks) {
            console.log(`🤖 [Autopilot] Checking ${trackObj.lottery} ${trackObj.draw}...`);
            const todayStr = getTodayStr();

            // 1. Find all risky plays for THIS track today
            const tickets = await Ticket.find({
                isRelocation: { $ne: true },
                tracks: trackObj.lottery,
                betDates: todayStr,
                status: { $ne: 'void' }
            }).populate('plays');

            if (tickets.length === 0) continue;

            // 2. Aggregate current risk for this track
            const aggregator = new Map();
            tickets.forEach(t => {
                t.plays.forEach(p => {
                    const key = `${p.gameMode}|${p.betNumber}`;
                    const existing = aggregator.get(key) || { str: 0, box: 0, com: 0 };
                    existing.str += (p.straightAmount || 0);
                    existing.box += (p.boxAmount || 0);
                    existing.com += (p.comboAmount || 0);
                    aggregator.set(key, existing);
                });
            });

            // 3. Identify excess risk per play
            const drops = [];
            for (const [key, total] of aggregator.entries()) {
                const [gameMode, betNumber] = key.split('|');

                let limitKey = gameMode;
                if (gameMode.includes('Pulito')) limitKey = 'Pulito';
                if (gameMode.includes('Single Action')) limitKey = 'Single Action';
                const modeLimits = limits[limitKey];
                if (!modeLimits) continue;

                const dropStraight = Math.max(0, total.str - modeLimits.STRAIGHT);
                const dropBox = Math.max(0, total.box - modeLimits.BOX);
                const dropCombo = Math.max(0, total.com - modeLimits.COMBO);

                if (dropStraight > 0 || dropBox > 0 || dropCombo > 0) {
                    drops.push({
                        betNumber,
                        gameMode,
                        straightAmount: Number(dropStraight.toFixed(2)),
                        boxAmount: Number(dropBox.toFixed(2)),
                        comboAmount: Number(dropCombo.toFixed(2))
                    });
                }
            }

            // 4. Create AUTO-DROP ticket if needed
            if (drops.length > 0) {
                // Check if we already created an AUTO-DROP for this track/draw/date recently
                const existingAuto = await Ticket.findOne({
                    ticketNumber: { $regex: new RegExp(`^AUTO-DROP-${trackObj.id.replace(/\//g, '-')}-${todayStr}`, 'i') }
                });

                if (!existingAuto) {
                    const tNum = `AUTO-DROP-${trackObj.id.replace(/\//g, '-')}-${todayStr}-${Date.now().toString().slice(-4)}`;
                    const newTicket = new Ticket({
                        ticketNumber: tNum,
                        ticketId: tNum,
                        userId: 'SYSTEM',
                        tracks: [trackObj.lottery],
                        betDates: [todayStr],
                        plays: drops,
                        totalWager: drops.reduce((sum, d) => sum + (d.straightAmount || 0) + (d.boxAmount || 0) + (d.comboAmount || 0), 0),
                        isRelocation: true,
                        status: 'pending-share', // Important: User must share to finalize
                        transactionDateTime: new Date()
                    });
                    await newTicket.save();
                    console.log(`✅ [Autopilot] Generated Drop Ticket: ${tNum}`);
                }
            }
        }

    } catch (e) {
        console.error("Autopilot Cron Error:", e);
    }
}

// 5. Validate Time (Market Open/Closed)
const validateTime = async (ticketData) => {
    try {
        const now = new Date();
        const nowStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
        const todayStr = getTodayStr();

        const tracks = Array.isArray(ticketData.tracks) ? ticketData.tracks : [ticketData.tracks];
        const dates = Array.isArray(ticketData.betDates) ? ticketData.betDates : [ticketData.betDates];

        for (const trackName of tracks) {
            const catalogItem = RESULTS_CATALOG.find(c =>
                c.lottery === trackName ||
                `${c.lottery} ${c.draw}` === trackName ||
                (c.lottery + " " + c.draw).trim() === trackName.trim()
            );

            if (!catalogItem) continue;

            for (const dateStr of dates) {
                if (dateStr < todayStr) {
                    return { allowed: false, reason: `Track ${trackName} para la fecha ${dateStr} ya cerró (Fecha pasada).` };
                }

                if (dateStr === todayStr) {
                    if (catalogItem.closeTime && nowStr >= catalogItem.closeTime) {
                        return { allowed: false, reason: `El sorteo ${trackName} ya cerró (${catalogItem.closeTime}).` };
                    }
                }
            }
        }

        return { allowed: true };
    } catch (e) {
        console.error("validateTime error:", e);
        return { allowed: true };
    }
};

/**
 * Real-time drop trigger for new tickets in the 20min window
 */
async function triggerRealTimeDrop(ticketData) {
    try {
        const config = await GlobalConfig.findOne({ key: 'AUTOPILOT_RELOCATION_ENABLED' });
        if (!config || !config.value) return;

        const now = new Date();
        const nowSecs = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
        const todayStr = getTodayStr();

        for (const trackName of ticketData.tracks) {
            const trackObj = RESULTS_CATALOG.find(c => c.lottery === trackName);
            if (!trackObj || !trackObj.closeTime) continue;

            const [h, m, s] = trackObj.closeTime.split(':').map(Number);
            const closeSecs = h * 3600 + m * 60 + (s || 0);

            // If we are within 20 mins of close
            if (closeSecs - nowSecs > 0 && closeSecs - nowSecs <= 1260) {
                const limits = await getLimits();
                const drops = [];

                for (const p of ticketData.plays) {
                    const currentRisk = await calculateExposure(trackName, todayStr, p.betNumber, p.gameMode);

                    let limitKey = p.gameMode;
                    if (p.gameMode.includes('Pulito')) limitKey = 'Pulito';
                    if (p.gameMode.includes('Single Action')) limitKey = 'Single Action';
                    const modeLimits = limits[limitKey];
                    if (!modeLimits) continue;

                    // Note: Current Risk ALREADY includes the play being saved if called POST-save, 
                    // or we check if it hits the limit. 
                    // Let's assume we call this AFTER save to check the NEW state.
                    const dropStraight = Math.max(0, currentRisk.str - modeLimits.STRAIGHT);
                    const dropBox = Math.max(0, currentRisk.box - modeLimits.BOX);
                    const dropCombo = Math.max(0, currentRisk.com - modeLimits.COMBO);

                    if (dropStraight > 0 || dropBox > 0 || dropCombo > 0) {
                        drops.push({
                            betNumber: p.betNumber,
                            gameMode: p.gameMode,
                            straightAmount: Number(dropStraight.toFixed(2)),
                            boxAmount: Number(dropBox.toFixed(2)),
                            comboAmount: Number(dropCombo.toFixed(2))
                        });
                    }
                }

                if (drops.length > 0) {
                    const tNum = `AUTO-DROP-RT-${trackObj.id.replace(/\//g, '-')}-${todayStr}-${Date.now().toString().slice(-4)}`;
                    const newTicket = new Ticket({
                        ticketNumber: tNum,
                        ticketId: tNum,
                        userId: 'SYSTEM-RT',
                        tracks: [trackName],
                        betDates: [todayStr],
                        plays: drops,
                        totalWager: drops.reduce((sum, d) => sum + (d.straightAmount || 0) + (d.boxAmount || 0) + (d.comboAmount || 0), 0),
                        isRelocation: true,
                        status: 'pending-share',
                        transactionDateTime: new Date()
                    });
                    await newTicket.save();
                    console.log(`⚡ [Autopilot-RT] Real-time Drop generated: ${tNum}`);
                }
            }
        }
    } catch (e) {
        console.error("Real-time Drop Error:", e);
    }
}

module.exports = {
    calculateExposure,
    validatePlays,
    processAutoDrops,
    triggerRealTimeDrop,
    getLimits,
    validateTime
};
