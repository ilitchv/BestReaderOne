const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, index: true },
    username: { type: String, unique: true, sparse: true },
    referralCode: { type: String, unique: true, sparse: true }, // Added for legacy compatibility
    password: { type: String, required: true }, // Will store hashed password
    name: { type: String, required: true },
    balance: { type: Number, default: 0 },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    btcpayCustomerId: { type: String }, // For BTCPay integration
    walletHash: { type: String }, // Integrity check (Hash of last transaction)
    savedWalletAddress: { type: String }, // Saved BTC/USDT address for withdrawals
    status: { type: String, enum: ['active', 'suspended'], default: 'active' }
}, {
    timestamps: true
});

module.exports = mongoose.model('User', userSchema);
