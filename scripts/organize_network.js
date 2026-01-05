const mongoose = require('mongoose');
const connectDB = require('../database');
const User = require('../models/User');

async function organizeTree() {
    try {
        await connectDB();

        // 1. Fetch Key Users
        const admin = await User.findOne({ email: 'admin@beast.com' });
        const pedro = await User.findOne({ email: 'pedro@demo.com' });
        const demoUser = await User.findOne({ email: 'user@demo.com' });
        let guest = await User.findOne({ email: 'guest@session' });

        // 2. Restore "The Girl" (Maria)
        let maria = await User.findOne({ email: 'maria@demo.com' });

        if (!maria) {
            // Check by name just in case
            maria = await User.findOne({ name: /Maria/i });
        }

        if (!maria) {
            console.log("Restoring missing user 'Maria'...");
            try {
                maria = new User({
                    name: 'Maria Rodriguez',
                    email: 'maria@demo.com',
                    username: 'maria_dev', // Explicit username
                    password: 'password123',
                    role: 'user',
                    status: 'active',
                    rank: 'Agente',
                    referralCode: 'MARIA-123',
                    // Initialize new fields
                    sponsorId: null,
                    personalVolume: 0,
                    groupVolume: 0,
                    commissionBalance: { tokens: 0, btc: 0 },
                    networkLevels: { direct: 0, indirect: 0, deep: 0 }
                });
                await maria.save();
                console.log("Maria created successfully.");
            } catch (err) {
                // If collision on username, try another
                if (err.code === 11000) {
                    console.log("Collision detected, trying alternate...");
                    maria = new User({
                        name: 'Maria Rodriguez',
                        email: 'maria@demo.com',
                        username: 'maria_dev_' + Date.now(),
                        password: 'password123',
                        role: 'user',
                        status: 'active',
                        rank: 'Agente',
                        referralCode: 'MARIA-' + Date.now(),
                        sponsorId: null,
                        personalVolume: 0,
                        groupVolume: 0,
                        commissionBalance: { tokens: 0, btc: 0 },
                        networkLevels: { direct: 0, indirect: 0, deep: 0 }
                    });
                    await maria.save();
                } else {
                    throw err;
                }
            }
        }

        if (!admin || !pedro || !demoUser || !maria) {
            console.error("Critical users missing. Aborting.");
            console.log({ admin: !!admin, pedro: !!pedro, demoUser: !!demoUser, maria: !!maria });
            process.exit(1);
        }

        // 3. Reset Hierarchy
        console.log("Organizing Tree...");

        // Level 0: Admin
        admin.sponsorId = null;
        await admin.save();
        console.log(`Updated Admin (Root).`);

        // Level 1: Pedro (Right) & Maria (Left) -> Under Admin
        pedro.sponsorId = admin._id;
        await pedro.save();
        console.log(`Updated Pedro -> Admin.`);

        maria.sponsorId = admin._id;
        await maria.save();
        console.log(`Updated Maria -> Admin.`);

        // Level 2: Demo User -> Pedro
        demoUser.sponsorId = pedro._id;
        await demoUser.save();
        console.log(`Updated Demo User -> Pedro.`);

        // Level 2: Guest -> Maria
        if (guest) {
            guest.sponsorId = maria._id;
            await guest.save();
            console.log(`Updated Guest -> Maria.`);
        }

        console.log("Tree structure updated successfully.");
        process.exit(0);

    } catch (error) {
        console.error("Organization failed:", error);
        process.exit(1);
    }
}

organizeTree();
