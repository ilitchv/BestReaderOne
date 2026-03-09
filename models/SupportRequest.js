const mongoose = require('mongoose');

const supportRequestSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    reason: { type: String, required: true },
    status: { type: String, enum: ['unseen', 'read', 'resolved'], default: 'unseen' },
    timestamp: { type: Date, default: Date.now }
});

const SupportRequest = mongoose.model('SupportRequest', supportRequestSchema);

module.exports = SupportRequest;
