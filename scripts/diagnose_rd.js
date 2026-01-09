require('dotenv').config();
const scraperRD = require('../services/scraperRD');
const mongoose = require('mongoose');

async function runDiagnosis() {
    // Connect to DB (RD scraper needs it)
    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sniper_db');
    }

    console.log(`\n--- Checking RD Scraper ---`);
    try {
        const start = Date.now();
        await scraperRD.fetchAndProcess();
        const duration = (Date.now() - start) / 1000;
        console.log(`✅ RD Scraped in ${duration.toFixed(2)}s`);
        console.log("Check Dashboard for updates.");
    } catch (e) {
        console.error(`❌ Error scraping RD:`, e.message);
    }

    // Close DB
    setTimeout(() => {
        mongoose.connection.close();
    }, 5000);
}

runDiagnosis();
