const mongoose = require('mongoose');

const lotteryResultSchema = new mongoose.Schema({
    // Unique ID used in frontend (e.g., 'usa/ny/Evening')
    resultId: { type: String, required: true, index: true }, 
    
    country: { type: String, required: true, enum: ['USA', 'SD', 'SPECIAL'] },
    lotteryName: { type: String, required: true }, // e.g. "New York"
    drawName: { type: String, required: true },    // e.g. "Evening"
    
    // The actual numbers as a string (e.g. "123-4567" or "12-34-56")
    numbers: { type: String, required: true },
    
    // ISO Date string of the draw (YYYY-MM-DD)
    drawDate: { type: String, required: true },
    
    // Timestamps
    scrapedAt: { type: Date, default: Date.now },
    lastDrawTime: { type: String }, // Display time e.g. "22:30"
    closeTime: { type: String }     // Display time e.g. "22:10"
}, {
    timestamps: true
});

// Compound index to ensure uniqueness per lottery per day
lotteryResultSchema.index({ resultId: 1, drawDate: 1 }, { unique: true });

module.exports = mongoose.model('LotteryResult', lotteryResultSchema);