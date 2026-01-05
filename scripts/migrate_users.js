const mongoose = require('mongoose');
const connectDB = require('../database');
const User = require('../models/User');

async function migrateUsers() {
    try {
        console.log('Connecting to database...');
        await connectDB();
        console.log('Connected. Starting migration via updateMany...');

        // 1. Rank
        const resRank = await User.updateMany(
            { rank: { $exists: false } },
            { $set: { rank: 'Normal' } }
        );
        console.log(`Updated Rank: ${resRank.modifiedCount} users.`);

        // 2. SponsorId
        // Note: checking for missing sponsorId. Explicitly setting null if missing.
        const resSponsor = await User.updateMany(
            { sponsorId: { $exists: false } },
            { $set: { sponsorId: null } }
        );
        console.log(`Updated SponsorId: ${resSponsor.modifiedCount} users.`);

        // 3. Volumes
        const resPV = await User.updateMany(
            { personalVolume: { $exists: false } },
            { $set: { personalVolume: 0 } }
        );
        console.log(`Updated PersonalVolume: ${resPV.modifiedCount} users.`);

        const resGV = await User.updateMany(
            { groupVolume: { $exists: false } },
            { $set: { groupVolume: 0 } }
        );
        console.log(`Updated GroupVolume: ${resGV.modifiedCount} users.`);

        // 4. Commission Balance
        // Case A: Missing entirely
        const resCommMissing = await User.updateMany(
            { commissionBalance: { $exists: false } },
            { $set: { commissionBalance: { tokens: 0, btc: 0 } } }
        );
        console.log(`Updated CommissionBalance (Missing): ${resCommMissing.modifiedCount} users.`);

        // Case B: Partial match? Hard to do with updateMany efficiently for subfields without overwriting? 
        // Actually, if it exists, we assume it's correct or managed by app? 
        // Let's just ensure nested fields exist using dot notation if parent exists.
        const resCommTokens = await User.updateMany(
            { "commissionBalance.tokens": { $exists: false } },
            { $set: { "commissionBalance.tokens": 0 } }
        );
        console.log(`Updated CommissionBalance.Tokens: ${resCommTokens.modifiedCount} users.`);

        const resCommBTC = await User.updateMany(
            { "commissionBalance.btc": { $exists: false } },
            { $set: { "commissionBalance.btc": 0 } }
        );
        console.log(`Updated CommissionBalance.BTC: ${resCommBTC.modifiedCount} users.`);

        // 5. Network Levels
        const resLevels = await User.updateMany(
            { networkLevels: { $exists: false } },
            { $set: { networkLevels: { direct: 0, indirect: 0, deep: 0 } } }
        );
        console.log(`Updated NetworkLevels (Missing): ${resLevels.modifiedCount} users.`);

        const resLevelsDir = await User.updateMany(
            { "networkLevels.direct": { $exists: false } },
            { $set: { "networkLevels.direct": 0 } }
        );
        console.log(`Updated NetworkLevels.Direct: ${resLevelsDir.modifiedCount} users.`);

        const resLevelsInd = await User.updateMany(
            { "networkLevels.indirect": { $exists: false } },
            { $set: { "networkLevels.indirect": 0 } }
        );
        console.log(`Updated NetworkLevels.Indirect: ${resLevelsInd.modifiedCount} users.`);

        const resLevelsDeep = await User.updateMany(
            { "networkLevels.deep": { $exists: false } },
            { $set: { "networkLevels.deep": 0 } }
        );
        console.log(`Updated NetworkLevels.Deep: ${resLevelsDeep.modifiedCount} users.`);

        console.log('Migration complete.');
        process.exit(0);

    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrateUsers();
