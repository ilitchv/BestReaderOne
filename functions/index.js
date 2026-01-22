const functions = require('firebase-functions');
const admin = require('firebase-admin');
const connectDB = require('./database');
const { runScraperJob } = require('./services/scraperService');
require('dotenv').config();

admin.initializeApp();

// Scheduled Function: Runs every 5 minutes
// Timeout: 540 seconds (9 minutes) - Max for Google Cloud Functions Gen 1
// Memory: 2GB - Increased for Puppeteer (Headless Chrome)
exports.scheduledScraper = functions.runWith({
    timeoutSeconds: 540,
    memory: '2GB'
}).pubsub.schedule('every 5 minutes').onRun(async (context) => {
    console.log('⏰ Cloud Scheduler Triggered');

    try {
        // 1. Ensure DB Connection
        await connectDB();

        // 2. Run Scraper Logic
        await runScraperJob();

    } catch (error) {
        console.error('🔥 Fatal Job Error:', error);
    }

    console.log('💤 Job Finished');
    return null;
});

// Manual Trigger
exports.manualScrape = functions.runWith({
    timeoutSeconds: 540,
    memory: '2GB'
}).https.onRequest(async (req, res) => {
    try {
        await connectDB();
        await runScraperJob();
        res.json({ success: true, message: 'Scrape completed manually.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
