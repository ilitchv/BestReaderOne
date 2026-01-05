require('dotenv').config({ path: '../.env' }); // Load env from root
const mongoose = require('mongoose');
const User = require('../models/User');
const connectDB = require('../database');

async function migrateNetworkToggle() {
    try {
        await connectDB();
        console.log("🔌 Connected to DB. Disabling network access for all users by default...");

        const result = await User.updateMany(
            {},
            { $set: { networkEnabled: false } }
        );

        console.log(`✅ Update complete. Modified/Matched ${result.nModified || result.modifiedCount} users.`);
        process.exit(0);
    } catch (e) {
        console.error("Migration failed:", e);
        process.exit(1);
    }
}

migrateNetworkToggle();
