require('dotenv').config({ path: '../.env' }); // Load env from root
const mongoose = require('mongoose');
const User = require('../models/User'); // Path relative to scripts/
const connectDB = require('../database'); // Path relative to scripts/

const promoteUser = async () => {
    try {
        await connectDB();
        console.log("🔌 Connected to DB");

        const email = "ilitchvasquez@gmail.com";
        const user = await User.findOne({ email });

        if (!user) {
            console.log(`❌ User not found: ${email}`);
            process.exit(1);
        }

        user.role = 'admin';
        await user.save();
        console.log(`✅ SUCCESS: ${user.name} (${user.email}) is now an ADMIN.`);
        console.log(`🆔 ID: ${user._id}`);

        process.exit(0);
    } catch (err) {
        console.error("❌ Error:", err);
        process.exit(1);
    }
};

promoteUser();
