require('dotenv').config();
const mongoose = require('mongoose');
const scraperService = require('../services/scraperService');

// Connect to Database
const connectDB = async () => {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI, { dbName: 'beastbet' });
        console.log('✅ MongoDB Connected');
    } catch (err) {
        console.error('❌ MongoDB Connection Error:', err);
        process.exit(1);
    }
};

const run = async () => {
    await connectDB();

    try {
        console.log('🚀 Triggering Scraper...');
        // Execute the scraper logic
        await scraperService.fetchAndParse();
        console.log('✅ Scraper Cycle Completed');

        // Wait a bit for async saves to finish (just in case)
        setTimeout(() => {
            console.log('👋 Exiting...');
            process.exit(0);
        }, 5000);

    } catch (error) {
        console.error('❌ Scraper Execution Failed:', error);
        process.exit(1);
    }
};

run();
