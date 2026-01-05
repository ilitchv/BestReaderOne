const connectDB = require('../database');
const GlobalConfig = require('../models/GlobalConfig');

const run = async () => {
    try {
        console.log("Connecting to DB...");
        await connectDB();

        console.log("Fetching Global Config...");
        const config = await GlobalConfig.findOne({ key: 'WAGER_LIMITS' });

        if (!config) {
            console.log("No WAGER_LIMITS config found in DB. Nothing to update (defaults will take over).");
        } else {
            console.log("Found Config. Current Palé Combo:", config.value['Palé']?.COMBO);

            // Update
            if (!config.value['Palé']) config.value['Palé'] = {};
            config.value['Palé'].COMBO = 35;

            // Mark as modified if it's a Mixed type mongoose might miss it
            config.markModified('value');

            await config.save();
            console.log("✅ Updated Palé Combo limit to 35 in DB.");
        }

        process.exit(0);

    } catch (e) {
        console.error("Error:", e);
        process.exit(1);
    }
};

run();
