const mongoose = require('mongoose');

const playSchema = new mongoose.Schema({
    betNumber: { type: String, required: true },
    gameMode: { type: String, required: true },
    straightAmount: { type: Number, default: 0 },
    boxAmount: { type: Number, default: 0 },
    comboAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    jugadaNumber: { type: Number, required: true }
}, { _id: false });

const ticketSchema = new mongoose.Schema({
    ticketNumber: { type: String, required: true, unique: true, index: true },
    transactionDateTime: { type: Date, required: true },
    betDates: { type: [String], required: true },
    tracks: { type: [String], required: true },
    grandTotal: { type: Number, required: true },
    plays: [playSchema],
    ticketImage: { type: String }, // Low-res base64 for quick preview
}, {
    timestamps: true 
});

module.exports = mongoose.model('Ticket', ticketSchema);