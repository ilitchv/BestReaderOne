const mongoose = require('mongoose');

const withdrawRequestSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amount: { type: Number, required: true },
    walletAddress: { type: String, required: true },
    network: { type: String, required: true, default: 'BTC' }, // BTC, ETH, TRC20, etc.
    status: {
        type: String,
        required: true,
        enum: ['PENDING', 'APPROVED', 'REJECTED', 'PENDING_SIGNATURE', 'COMPLETED'],
        default: 'PENDING',
        index: true
    },
    ledgerTransactionId: { type: String, required: true }, // Link to the specific debit block details (referenceId or Hash)
    adminNote: { type: String }, // Optional note for rejection/approval
    processedAt: { type: Date }
}, {
    timestamps: true
});

module.exports = mongoose.model('WithdrawRequest', withdrawRequestSchema);
