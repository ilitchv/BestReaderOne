const mongoose = require('mongoose');
require('dotenv').config();
const { fetchAndProcess } = require('./services/scraperRD');
const database = require('./database');

async function runTest() {
    try {
        console.log('🔌 Connecting to DB...');
        await database();

        console.log('🚀 Running RD Scraper Manual Test...');
        await fetchAndProcess();

        console.log('✅ Test Complete.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Test Failed:', error);
        process.exit(1);
    }
}

runTest();
