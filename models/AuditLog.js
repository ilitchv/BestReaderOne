const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    },
    action: {
        type: String,
        required: true,
        uppercase: true,
        // Examples: FINANCE_DEPOSIT_BTC, FINANCE_DEPOSIT_SHOPIFY, FINANCE_ADMIN_ADJUST, USER_UPDATE
        index: true
    },
    user: {
        type: String, // Username or Email of the user AFFECTED
        index: true
    },
    performedBy: {
        type: String, // Who did it? "SYSTEM", "ADMIN", or specific Admin ID
        default: "SYSTEM"
    },
    amount: {
        type: Number, // Optional, for financial transactions
    },
    details: {
        type: String, // Human readable description
    },
    targetId: {
        type: String, // ID of the object (User ID, Ticket ID, etc.)
    },
    referenceId: {
        type: String, // Link to Ledger Block or External ID (e.g., SHOPIFY-123)
        index: true
    },
    ipAddress: String,
    metadata: mongoose.Schema.Types.Mixed // Flexible object for extra data
});

module.exports = mongoose.model('AuditLog', AuditLogSchema);
