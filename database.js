const mongoose = require('mongoose');

// HARDCODED URI FOR IMMEDIATE DEPLOYMENT SUCCESS
// This ensures no env var issues prevent connection
const MONGODB_URI = "mongodb+srv://BeastBetTwo:Amiguito2468@beastbet.lleyk.mongodb.net/beastbetdb?retryWrites=true&w=majority&appName=Beastbet";

const connectDB = async () => {
    try {
        console.log("🔌 Attempting to connect to MongoDB Atlas...");
        const conn = await mongoose.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 5000
        });
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`❌ Error connecting to MongoDB: ${error.message}`);
    }
};

mongoose.connection.on('disconnected', () => {
    console.log('⚠️ MongoDB disconnected');
});

mongoose.connection.on('connected', () => {
    console.log('✅ MongoDB connected event received');
});

module.exports = connectDB;