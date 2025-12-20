require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const BeastLedger = require('../models/BeastLedger');
const connectDB = require('../database');

const seedUsers = async () => {
    await connectDB();

    const users = [
        {
            email: 'admin@beast.com',
            username: 'admin',
            referralCode: 'REF_ADMIN',
            password: 'admin', // In production, hash this!
            name: 'System Admin',
            role: 'admin',
            balance: 1000000,
            walletHash: 'GENESIS'
        },
        {
            email: 'pedro@demo.com',
            username: 'pedro_martinez',
            referralCode: 'REF_PEDRO',
            password: '123',
            name: 'Pedro Martinez',
            role: 'user',
            balance: 0.00,
            walletHash: 'GENESIS'
        },
        {
            email: 'user@demo.com',
            username: 'demo_player',
            referralCode: 'REF_DEMO',
            password: '123',
            name: 'Demo Player',
            role: 'user',
            balance: 100, // Initial Credit
            walletHash: 'GENESIS'
        }
    ];

    try {
        // Clear logic commented out to avoid destructive actions on legacy data
        // Check for existing before creating

        for (const u of users) {
            // Check by email OR username OR referralCode to be safe
            const exists = await User.findOne({
                $or: [
                    { email: u.email },
                    { username: u.username },
                    { referralCode: u.referralCode }
                ]
            });

            if (!exists) {
                await User.create(u);
                console.log(`✅ Created User: ${u.email}`);
            } else {
                console.log(`⚠️ User already exists: ${u.email}`);
            }
        }
        console.log('🌱 Seeding Complete');
        process.exit(0);
    } catch (e) {
        console.error('Seeding Error:', e);
        process.exit(1);
    }
};

seedUsers();
