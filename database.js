const mongoose = require('mongoose');

const DEFAULT_URI = "mongodb+srv://BeastBetTwo:Amiguito2468@beastbet.lleyk.mongodb.net/beastbetdb?retryWrites=true&w=majority&appName=Beastbet";
const MONGODB_URI = process.env.MONGODB_URI || DEFAULT_URI;

if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable');
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
    // Check if we have a connection AND it's actually ready (readyState 1 = connected)
    if (cached.conn && mongoose.connection.readyState === 1) {
        // console.log("✅ Using cached MongoDB connection");
        return cached.conn;
    }

    // If we have a promise but connection isn't ready, await it
    if (cached.promise) {
        try {
            // console.log("⏳ Awaiting existing connection promise...");
            cached.conn = await cached.promise;
            if (mongoose.connection.readyState === 1) {
                return cached.conn;
            }
        } catch (e) {
            console.error("⚠️ Cached promise failed, retrying...");
            cached.promise = null; // Reset promise on failure
        }
    }

    // If execution reaches here, we need to create a new connection
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