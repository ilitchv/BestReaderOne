const mongoose = require('mongoose');

// Use the same hardcoded URI from the original project as default
const DEFAULT_URI = "mongodb+srv://BeastBetTwo:Amiguito2468@beastbet.lleyk.mongodb.net/beastbetdb?retryWrites=true&w=majority&appName=Beastbet";
const MONGODB_URI = process.env.MONGODB_URI || DEFAULT_URI;

if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable');
}

let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
    if (cached.conn && mongoose.connection.readyState === 1) {
        return cached.conn;
    }

    if (cached.promise) {
        try {
            cached.conn = await cached.promise;
            if (mongoose.connection.readyState === 1) {
                return cached.conn;
            }
        } catch (e) {
            console.error("⚠️ Cached promise failed, retrying...");
            cached.promise = null;
        }
    }

    const opts = {
        serverSelectionTimeoutMS: 5000,
    };

    console.log("🔌 Creating new MongoDB connection...");
    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
        console.log("✅ New MongoDB connection established");
        return mongoose;
    });

    try {
        cached.conn = await cached.promise;
    } catch (e) {
        cached.promise = null;
        console.error("❌ MongoDB Connection Error:", e);
        throw e;
    }

    return cached.conn;
}

module.exports = connectDB;
