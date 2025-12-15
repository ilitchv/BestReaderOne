const path = require('path');
// Load from backend/.env explicitly to ensure we use the same config as the server
// Use resolve to be robust
const envPath = path.resolve(__dirname, '../backend/.env');
console.log(`Loading .env from: ${envPath}`);
require('dotenv').config({ path: envPath });

const mongoose = require('mongoose');
const scraperService = require('../services/scraperService');

const run = async () => {
    console.log('🔌 Connecting to MongoDB...');

    if (!process.env.MONGODB_URI) {
        console.error('❌ MONGODB_URI is missing from environment variables!');
        // Try root .env as fallback
        console.log('Trying root .env...');
        require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
    }

    if (!process.env.MONGODB_URI) {
        console.error('❌ FATAL: MONGODB_URI still missing.');
        process.exit(1);
    }

    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            dbName: 'beastbet',
            serverSelectionTimeoutMS: 5000
        });
        console.log('✅ MongoDB Connected');

        console.log('🚀 Triggering Scraper (fetchAndParse)...');
        await scraperService.fetchAndParse();
        console.log('✅ Scraper Cycle Completed');

    } catch (err) {
        console.error('❌ Error during execution:', err);
    } finally {
        console.log('👋 Closing connection...');
        await mongoose.disconnect();
        process.exit(0);
    }
};

run();
