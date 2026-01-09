
require('dotenv').config();
const connectDB = require('../database');
const { fetchAndParse } = require('../services/scraperService');
const mongoose = require('mongoose');

async function forceRun() {
    console.log("🚀 FORCE RUNNING SCRAPER (Production Logic)");

    try {
        console.log("1. Connecting to Database...");
        await connectDB();

        console.log("2. Starting Scraper...");
        await fetchAndParse();

        console.log("✅ Scrape Complete!");

        // Wait a small buffer to ensure writes are flushed if detached
        setTimeout(() => {
            console.log("👋 Exiting...");
            mongoose.disconnect();
            process.exit(0);
        }, 5000);

    } catch (e) {
        console.error("❌ Fatal Error:", e);
        process.exit(1);
    }
}

forceRun();
