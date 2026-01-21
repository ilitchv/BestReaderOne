
const mongoose = require('mongoose');
require('dotenv').config();
const TrackConfig = require('../models/TrackConfig');

async function checkConfig() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to DB");

        const today = new Date().toISOString().split('T')[0];
        console.log("Checking for Date:", today);

        const config = await TrackConfig.findOne({
            trackId: 'usa/ga/Midday',
            date: today
        });

        if (config) {
            console.log("✅ Config Found:", config);
        } else {
            console.log("❌ No TrackConfig found for Georgia Midday today.");
            // Check if there is a 'default' config? Not implemented in code usually
        }

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

checkConfig();
