const crypto = require('crypto');
const mongoose = require('mongoose');
const User = require('../models/User');
const BeastLedger = require('../models/BeastLedger');

// Helper to generate SHA-256 Hash
const generateHash = (data) => {
    return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
};

const ledgerService = {
    // 1. ADD TO LEDGER (Mining a Block)
    addToLedger: async ({ action, userId, amount, referenceId, description }) => {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // A. Get User
            // console.log(`🔍 Ledger Lookup User: ${userId}`);
            const user = await User.findById(userId).session(session);
            if (!user) {
                console.error(`❌ Ledger Error: User not found for ID '${userId}'`);
                throw new Error(`User not found for ledger transaction (ID: ${userId})`);
            }

            // B. Get Last Block (or check for Genesis)
            const lastBlock = await BeastLedger.findOne().sort({ index: -1 }).session(session);

            let newIndex = 0;
            let previousHash = '0'; // Default for Genesis

            if (!lastBlock) {
                // GENESIS BLOCK LOGIC
                // (Optional: Explicitly create Genesis, but effectively the first block acts as one if prevHash is 0)
                // For strict compliance with prompt, we assign index 0 if it's the first.
                console.log("Creating Genesis Block structure...");
            } else {
                newIndex = lastBlock.index + 1;
                previousHash = lastBlock.hash;
            }

            // C. Calculate Balance
            // Logic: Amount passed should be absolute usually, but logic here applies signs.
            // However, to follow the Prompt requirements strictly:
            // "DEPOSIT/PAYOUT (+), WITHDRAW/WAGER (-)"

            const absAmount = Math.abs(amount);
            let finalAmount = absAmount;

            if (action === 'WITHDRAW' || action === 'WAGER') {
                finalAmount = -absAmount;
            }

            // Recalculate User Balance
            // Note: We use the Ledger to calculate the 'balanceAfter', 
            // but we MUST also update the User document for fast access.
            const newBalance = user.balance + finalAmount;

            // D. Balance Check (No credit for wagers)
            if (newBalance < 0 && (action === 'WAGER' || action === 'WITHDRAW')) {
                throw new Error('Insufficient funds');
            }

            // E. Create Block Data
            const timestamp = new Date();

            // Block Data to Hash (Minimizing fields to ensure determinism)
            const blockDataToHash = {
                index: newIndex,
                previousHash: previousHash,
                timestamp: timestamp.toISOString(), // Ensure ISO string stability
                action,
                userId: user.id, // Mongoose ID is valid string
                amount: finalAmount,
                balanceAfter: newBalance,
                referenceId,
                description
            };

            const newHash = generateHash(blockDataToHash);

            // F. Save to DB
            const newBlock = new BeastLedger({
                ...blockDataToHash,
                hash: newHash,
                userId: userId // Explicitly ensuring userId field matches schema
            });

            await newBlock.save({ session });

            // G. Update User Balance & Link
            user.balance = newBalance;
            user.walletHash = newHash; // Link latest block to user for quick verify
            await user.save({ session });

            await session.commitTransaction();
            console.log(`✅ Block #${newIndex} Mined. Action: ${action}. Hash: ${newHash.substring(0, 10)}...`);
            return newBlock;

        } catch (error) {
            await session.abortTransaction();
            console.error("❌ Ledger Transaction Failed:", error.message);
            throw error;
        } finally {
            session.endSession();
        }
    },

    // 2. VERIFY INTEGRITY (Auditor)
    verifyIntegrity: async () => {
        try {
            console.log("🕵️ Starting Ledger Integrity Check...");
            const chain = await BeastLedger.find().sort({ index: 1 });

            if (chain.length === 0) return { valid: true, message: "Ledger is empty." };

            for (let i = 0; i < chain.length; i++) {
                const block = chain[i];

                // 1. Re-calculate Hash
                const dataToHash = {
                    index: block.index,
                    previousHash: block.previousHash,
                    timestamp: block.timestamp.toISOString(),
                    action: block.action,
                    userId: block.userId,
                    amount: block.amount,
                    balanceAfter: block.balanceAfter,
                    referenceId: block.referenceId,
                    description: block.description
                };

                const calculatedHash = generateHash(dataToHash);

                if (calculatedHash !== block.hash) {
                    return {
                        valid: false,
                        message: `❌ CORRUPTION DETECTED at Block #${block.index}`,
                        details: `Stored Hash: ${block.hash} | Calc Hash: ${calculatedHash}`
                    };
                }

                // 2. Check Chain Link
                if (i > 0) {
                    const prevBlock = chain[i - 1];
                    if (block.previousHash !== prevBlock.hash) {
                        return {
                            valid: false,
                            message: `❌ BROKEN CHAIN at Block #${block.index}`,
                            details: `PrevHash: ${block.previousHash} | Real Prev Hash: ${prevBlock.hash}`
                        };
                    }
                }
            }

            console.log("✅ Ledger Integrity Verified. Chain is valid.");
            return { valid: true, message: "Ledger is valid." };

        } catch (error) {
            console.error("Verification Error:", error);
            return { valid: false, message: "Verification process failed.", error };
        }
    },

    // 3. GET USER BALANCE (From User Doc)
    getBalance: async (userId) => {
        const user = await User.findById(userId);
        return user ? user.balance : 0;
    }
};

module.exports = ledgerService;
