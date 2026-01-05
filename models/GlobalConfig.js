const mongoose = require('mongoose');

const GlobalConfigSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true }, // e.g., 'WAGER_LIMITS'
    value: { type: mongoose.Schema.Types.Mixed, required: true }, // Flexible JSON
    updatedAt: { type: Date, default: Date.now },
    updatedBy: { type: String }
});

module.exports = mongoose.model('GlobalConfig', GlobalConfigSchema);
