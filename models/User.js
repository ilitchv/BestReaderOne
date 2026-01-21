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
    status: { type: String, enum: ['active', 'suspended', 'pending'], default: 'active' },
    networkEnabled: { type: Boolean, default: false }, // Feature toggle for User Network Module

    // Auth Extension
    firebaseUid: { type: String, unique: true, sparse: true },
    avatarUrl: { type: String },


    // Network Module Extension
    rank: { type: String, default: 'Normal' }, // UserRank enum
    sponsorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // Upline
    personalVolume: { type: Number, default: 0 },
    groupVolume: { type: Number, default: 0 },
    commissionBalance: {
        tokens: { type: Number, default: 0 },
        btc: { type: Number, default: 0 }
    },
    networkLevels: {
        direct: { type: Number, default: 0 },
        indirect: { type: Number, default: 0 },
        deep: { type: Number, default: 0 }
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('User', userSchema);
