const mongoose = require('mongoose');

// Fallback to the known Atlas cluster if env var is missing
// BUT relying on this fallback in Vercel often fails due to IP Whitelisting
const DEFAULT_URI = "mongodb+srv://BeastBetTwo:Amiguito2468@beastbet.lleyk.mongodb.net/beastbetdb?retryWrites=true&w=majority&appName=Beastbet";

const connectDB = async () => {
    try {
        const uri = process.env.MONGODB_URI || DEFAULT_URI;

        console.log("🔌 Attempting to connect to MongoDB...");
        // Log stripped URI for debug (hide password)
        console.log(`Target: ${uri.split('@')[1] || 'Local/Malformatted'}`);

        const conn = await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 5000
        });
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`❌ Error connecting to MongoDB: ${error.message}`);
        // In serverless, we might want to throw so the request fails cleanly
        // throw error; 
    }
};

mongoose.connection.on('disconnected', () => {
    console.log('⚠️ MongoDB disconnected');
});

mongoose.connection.on('connected', () => {
    console.log('✅ MongoDB connected event received');
});

module.exports = connectDB;