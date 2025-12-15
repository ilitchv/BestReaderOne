const mongoose = require('mongoose');

// Schema matching the specific "Jugadas" screenshot structure provided by user
const jugadaSchema = new mongoose.Schema({
    ticketNumber: { type: String, required: true, index: true },
    transactionDateTime: { type: Date, required: true },
    betDates: { type: String, required: true }, // Screenshot shows single string "02-10-2025" for possibly merged dates? or just first one. We will store comma joined or primary.
    tracks: { type: String, required: true }, // Screenshot shows "New York Evening"
    betNumber: { type: String, required: true },
    gameMode: { type: String, required: true },
    straight: { type: Number, default: 0 }, // Renamed from straightAmount to match screenshot "straight"
    box: { type: Number, default: 0 },      // Renamed "box"
    combo: { type: Number, default: 0 },    // Renamed "combo"
    total: { type: Number, required: true }, // Renamed "total"

    // Additional fields from screenshot
    paymentMethod: { type: String, default: 'Balance' },
    jugadaNumber: { type: String }, // Screenshot shows "47882603", likely a unique ID for the play

    // Link to User
    userId: { type: String, index: true }
}, {
    timestamps: true, // timestamp, __v
    collection: 'jugadas' // Explicitly set collection name
});

module.exports = mongoose.model('Jugada', jugadaSchema);
