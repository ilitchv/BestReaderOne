const Jugada = require('../models/Jugada');
const GlobalConfig = require('../models/GlobalConfig');
const LotteryResult = require('../models/LotteryResult'); // NEW
const TrackConfig = require('../models/TrackConfig'); // NEW
const { WAGER_LIMITS } = require('../constants-backend.js');

// Helper to get formatted date string "YYYY-MM-DD"
const getTodayStr = () => new Date().toISOString().split('T')[0];

const riskService = {

    // 1. Get Current Limits (DB or Fallback)
    getLimits: async () => {
        try {
            const config = await GlobalConfig.findOne({ key: 'WAGER_LIMITS' });
            if (config && config.value) {
                return config.value;
            }
            return WAGER_LIMITS; // Default from code
        } catch (e) {
            console.error("Error fetching limits:", e);
            return WAGER_LIMITS;
        }
    },

    // 2. Set Limits
    setLimits: async (newLimits, userId) => {
        const query = { key: 'WAGER_LIMITS' };
        const update = { value: newLimits, updatedBy: userId, updatedAt: new Date() };
        const options = { upsert: true, new: true };
        return await GlobalConfig.findOneAndUpdate(query, update, options);
    },

    // 3. Calculate Total Exposure for a specific Target
    calculateExposure: async (trackName, dateStr, betNumber, gameMode) => {
        try {
            const trackRegex = new RegExp(trackName, 'i');
            const dateRegex = new RegExp(dateStr, 'i');

            const aggregation = await Jugada.aggregate([
                {
                    $match: {
                        betNumber: betNumber.trim(),
                        gameMode: gameMode,
                        tracks: { $regex: trackRegex },
                        betDates: { $regex: dateRegex }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalStraight: { $sum: "$straight" },
                        totalBox: { $sum: "$box" },
                        totalCombo: { $sum: "$combo" }
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
    },

    // 4. Validate Time & Closing (Result Existence + Cutoff)
    validateTime: async (ticketPayload) => {
        const failures = [];
        const tracks = Array.isArray(ticketPayload.tracks) ? ticketPayload.tracks : [ticketPayload.tracks];
        const dates = Array.isArray(ticketPayload.betDates) ? ticketPayload.betDates : [ticketPayload.betDates];
        const plays = ticketPayload.plays || [];

        // Current Time for comparison (Server Time - assumed accurate)
        const now = new Date();
        const nowTimeStr = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }); // "14:30"

        // Loop Tracks/Dates
        for (const track of tracks) {
            for (const date of dates) {
                // A. HARD STOP: Result Already Exists?
                // We check if a result was entered *before* now.
                // Actually, if a result EXISTS at all for this track/date, we block.
                // EXCEPT if the result is empty or placeholder?
                // Logic: If LotteryResult doc exists and has numbers -> Block.
                const exists = await LotteryResult.findOne({
                    resultId: track, // Assuming track is ID. If Name, adjustment needed. 
                    drawDate: date,
                    numbers: { $ne: null }
                });

                if (exists && exists.numbers && exists.numbers !== '---') {
                    return { allowed: false, reason: `Result already exists for ${track} on ${date}` };
                }

                // B. CLOSING TIME CHECK
                // 1. Get Config
                const config = await TrackConfig.findOne({ trackId: track, date: date });

                // 2. Determine Effective Closing Time
                // Default: 12:20 PM if no config (Prototype Hardcode for NY Horses Midday)
                // Real system would look up Catalog. For now, rely on Config or lenient default.
                let isClosed = false;

                if (config) {
                    if (config.closingType === 'GENERAL' && config.generalTime) {
                        if (nowTimeStr > config.generalTime) isClosed = true;
                    } else if (config.closingType === 'PER_DIGIT' && config.digitTimes) {
                        // Complex: Check each play's number.
                        // Implies we need to loop plays here.
                        for (const play of plays) {
                            // Heuristic: If betting on "1", check digit "1".
                            // If betting "12", check "1" and "2"?
                            // Simplification: Check the first digit of the bet.
                            const firstDigit = play.betNumber.charAt(0);
                            const closeTime = config.digitTimes.get(firstDigit) || config.generalTime || "23:59";

                            if (nowTimeStr > closeTime) {
                                return { allowed: false, reason: `Bet on #${play.betNumber} is closed (Cutoff: ${closeTime})` };
                            }
                        }
                    }
                } else {
                    // No Config -> Open? Or Default?
                    // Safe approach: Open unless Result exists (handled above).
                }

                if (isClosed) {
                    return { allowed: false, reason: `Track ${track} is Closed for ${date}` };
                }
            }
        }

        return { allowed: true };
    },

    // 5. Validate Exposure (Risk)
    validatePlays: async (ticketPayload) => {
        const limits = await riskService.getLimits();
        const failures = [];

        const tracks = Array.isArray(ticketPayload.tracks) ? ticketPayload.tracks : [ticketPayload.tracks];
        const dates = Array.isArray(ticketPayload.betDates) ? ticketPayload.betDates : [ticketPayload.betDates];

        // --- PRE-AGGREGATION OF PENDING TICKET ---
        const pendingAggregator = new Map();

        ticketPayload.plays.forEach(play => {
            const key = `${play.gameMode}|${play.betNumber.trim()}`;
            const existing = pendingAggregator.get(key) || { str: 0, box: 0, com: 0 };

            existing.str += (play.straightAmount || 0);
            existing.box += (play.boxAmount || 0);
            existing.com += (play.comboAmount || 0);

            pendingAggregator.set(key, existing);
        });

        // Loop through aggregated pending plays
        for (const track of tracks) {
            for (const date of dates) {

                for (const [key, pendingTotal] of pendingAggregator.entries()) {
                    const [gameMode, betNumber] = key.split('|');

                    // 1. Get DB Exposure
                    const currentRisk = await riskService.calculateExposure(track, date, betNumber, gameMode);

                    // 2. Sum Total
                    const totalStr = currentRisk.str + pendingTotal.str;
                    const totalBox = currentRisk.box + pendingTotal.box;
                    const totalCom = currentRisk.com + pendingTotal.com;

                    // 3. Get Limit
                    let limitKey = gameMode;
                    if (gameMode.startsWith('Pulito-')) limitKey = 'Pulito';
                    if (gameMode.startsWith('Single Action-')) limitKey = 'Single Action';

                    const modeLimits = limits[limitKey];
                    if (!modeLimits) continue;

                    // 4. Verify
                    if (pendingTotal.str > 0 && totalStr > modeLimits.STRAIGHT) {
                        failures.push({
                            number: betNumber, track, type: 'STRAIGHT',
                            current: currentRisk.str, proposed: pendingTotal.str, limit: modeLimits.STRAIGHT
                        });
                    }
                    if (pendingTotal.box > 0 && totalBox > modeLimits.BOX) {
                        failures.push({
                            number: betNumber, track, type: 'BOX',
                            current: currentRisk.box, proposed: pendingTotal.box, limit: modeLimits.BOX
                        });
                    }
                    if (pendingTotal.com > 0 && totalCom > modeLimits.COMBO) {
                        failures.push({
                            number: betNumber, track, type: 'COMBO',
                            current: currentRisk.com, proposed: pendingTotal.com, limit: modeLimits.COMBO
                        });
                    }
                }
            }
        }

        return {
            allowed: failures.length === 0,
            failures: failures
        };
    }
};

module.exports = riskService;
