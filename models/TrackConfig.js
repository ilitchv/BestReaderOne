const mongoose = require('mongoose');

const TrackConfigSchema = new mongoose.Schema({
    trackId: { type: String, required: true }, // e.g. "NY_Horses", "101"
    date: { type: String, required: true },    // "YYYY-MM-DD"

    // Configuration Type
    closingType: {
        type: String,
        enum: ['GENERAL', 'PER_DIGIT'],
        default: 'GENERAL'
    },

    // 1. General Closing Time (Applies to all digits/sub-events if not overridden)
    generalTime: { type: String }, // "HH:mm" (24h)

    // 2. Per-Digit Closing Times (Specific overrides)
    // Map of "Digit Index" -> "Time"
    // e.g. { "0": "12:50", "1": "13:00" } 
    digitTimes: { type: Map, of: String },

    updatedBy: { type: String },
    updatedAt: { type: Date, default: Date.now }
});

// Composite Index for fast lookup
TrackConfigSchema.index({ trackId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('TrackConfig', TrackConfigSchema);
