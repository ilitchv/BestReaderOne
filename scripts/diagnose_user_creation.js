
const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/User');

const TEST_EMAIL = `diagnostic_${Date.now()}@test.com`;
const API_URL = 'http://localhost:8080/api/network/referral';
const MONGODB_URI = process.env.MONGODB_URI;

async function diagnose() {
    console.log("🔍 STARTING USER CREATION DIAGNOSIS");
    console.log("-----------------------------------");
    console.log(`Target Email: ${TEST_EMAIL}`);

    // 1. DB Connection Check
    try {
        console.log("\n[1/3] Testing Database Connection...");
        await mongoose.connect(MONGODB_URI);
        console.log("   ✅ MongoDB Connected");
    } catch (e) {
        console.error("   ❌ MongoDB Connection Failed:", e.message);
        return;
    }

    // 2. Direct Model Creation Scope
    try {
        console.log("\n[2/3] Testing Direct Model Insertion (Bypassing API)...");
        const directUser = new User({
            name: "Diagnostic Direct",
            email: "direct_" + TEST_EMAIL,
            password: "testpassword",
            role: "user"
        });
        await directUser.save();
        console.log("   ✅ Direct User Created via Mongoose. ID:", directUser._id);

        // Clean up
        await User.findByIdAndDelete(directUser._id);
        console.log("   ℹ️  Direct User Deleted (Cleanup)");
    } catch (e) {
        console.error("   ❌ Direct Insertion Failed:", e.message);
        if (e.code === 11000) console.error("      (Duplicate Key Error)");
    }

    // 3. API Route Check (Referral Endpoint)
    // IMPORTANT: Providing 'password' isn't handled by /api/network/referral based on code read previously (it sets tempPassword123)
    try {
        console.log(`\n[3/3] Testing API Endpoint: ${API_URL}...`);

        const payload = {
            name: "Diagnostic API",
            email: TEST_EMAIL,
            phone: "555-0000"
            // sponsorId optional
        };

        const res = await axios.post(API_URL, payload);

        if (res.status === 200) {
            console.log("   ✅ API Request Successful:", res.data);
            if (res.data.user && res.data.user._id) {
                // Cleanup
                await User.findByIdAndDelete(res.data.user._id);
                console.log("   ℹ️  API User Deleted (Cleanup)");
            }
        } else {
            console.warn(`   ⚠️ API Returned Unexpected Status: ${res.status}`);
        }

    } catch (e) {
        console.error("   ❌ API Request Failed:");
        if (e.response) {
            console.error(`      Status: ${e.response.status}`);
            console.error(`      Data:`, e.response.data);
        } else {
            console.error(`      Error: ${e.message}`);
        }
    }

    console.log("\n-----------------------------------");
    console.log("DIAGNOSIS COMPLETE");
    await mongoose.disconnect();
}

diagnose();
