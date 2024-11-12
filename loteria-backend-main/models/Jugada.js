const mongoose = require('mongoose');

const jugadaSchema = new mongoose.Schema({
  "Ticket Number": { type: String, required: true },
  "Transaction DateTime": { type: String, required: true },
  "Bet Dates": { type: String, required: true },
  "Tracks": { type: String, required: true },
  "Bet Number": { type: String, required: true },
  "Game Mode": { type: String, required: true },
  "Straight ($)": { type: String },
  "Box ($)": { type: String },
  "Combo ($)": { type: String },
  "Total ($)": { type: String },
  "Jugada Number": { type: String },
  "Timestamp": { type: Date, default: Date.now }
});

module.exports = mongoose.model('Jugada', jugadaSchema);
