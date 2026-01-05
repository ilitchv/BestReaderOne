const connectDB = require('../database');
const GlobalConfig = require('../models/GlobalConfig');

const run = async () => {
    try {
        console.log("Connecting to DB...");
        await connectDB();

        console.log("Fetching Global Config...");
        const config = await GlobalConfig.findOne({ key: 'WAGER_LIMITS' });

        if (!config) {
            console.log("No WAGER_LIMITS config found in DB. Nothing to update.");
        } else {
            let updated = false;

            // Helper to safe update
            const updateMode = (mode, newVal) => {
                if (!config.value[mode]) config.value[mode] = {};
                if (config.value[mode].COMBO !== newVal) {
                    console.log(`Updating ${mode} COMBO limit from ${config.value[mode].COMBO} to ${newVal}`);
                    config.value[mode].COMBO = newVal;
                    updated = true;
                }
            };

            updateMode('Pick 2', 100);
            updateMode('Palé-RD', 20); // Matched Straight limit
            updateMode('Venezuela', 100);
            updateMode('RD-Quiniela', 100);
            updateMode('Pulito', 100);

            if (updated) {
                config.markModified('value');
                await config.save();
                console.log("✅ All Combo limits updated successfully in DB.");
            } else {
                console.log("Values were already up to date.");
            }
        }

        process.exit(0);

    } catch (e) {
        console.error("Error:", e);
        process.exit(1);
    }
};

run();
