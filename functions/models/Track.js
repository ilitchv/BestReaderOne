const mongoose = require('mongoose');

const TrackSchema = new mongoose.Schema({
    id: { type: String, unique: true }, // Format: DATE-LOTTERY-USER (e.g., 2023-10-27-NY_MID-user123)
    date: String,    // YYYY-MM-DD
    time: String,    // HH:mm
    lottery: String, // e.g., NY_MID
    numbers: String, // Raw Results e.g., "12 34 56" (Optional/Deprecated if using structured)

    // Structured Data
    first: String,
    second: String,
    third: String,
    pick3: String,
    pick4: String,

    createdAt: { type: Date, default: Date.now },
    userId: { type: String, default: 'default_user' }, // Partitioning

    // Metadata for Sniper Strategy
    meta: { type: Object, default: {} }
});

// Compound Index to prevent duplicates per user per draw
TrackSchema.index({ date: 1, lottery: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('Track', TrackSchema, 'sniper_records');
