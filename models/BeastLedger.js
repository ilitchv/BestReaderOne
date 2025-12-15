const mongoose = require('mongoose');

const beastLedgerSchema = new mongoose.Schema({
    index: { type: Number, required: true, unique: true, index: true }, // Sequence Number
    timestamp: { type: Date, required: true, default: Date.now },
    action: {
        type: String,
        required: true,
        enum: ['GENESIS', 'DEPOSIT', 'WITHDRAW', 'WAGER', 'PAYOUT']
    },
    userId: { type: String, required: true, index: true },
    amount: { type: Number, required: true }, // Signed Amount (+/-)
    balanceAfter: { type: Number, required: true },
    referenceId: { type: String, required: true }, // Ticket ID, Invoice ID, etc.
    description: { type: String, required: true },
    previousHash: { type: String, required: true }, // The Chain Link
    hash: { type: String, required: true, unique: true } // SHA-256 of this block
}, {
    timestamps: true
});

module.exports = mongoose.model('BeastLedger', beastLedgerSchema);
