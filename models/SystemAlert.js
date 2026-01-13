const mongoose = require('mongoose');

const SystemAlertSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: ['SCRAPER_FAILURE', 'SYSTEM_ERROR', 'VALIDATION_ERROR', 'MISSING_DATA']
    },
    severity: {
        type: String,
        enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
        default: 'MEDIUM'
    },
    message: { type: String, required: true },
    metadata: { type: mongoose.Schema.Types.Mixed }, // Flexible payload for details
    active: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SystemAlert', SystemAlertSchema);
