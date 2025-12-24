require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User'); // Adjust path if needed
const connectDB = require('./database');

async function checkAdmin() {
    await connectDB();
    console.log("🔍 Checking for admin user...");
    const admin = await User.findOne({ email: 'admin@beast.com' });
    if (admin) {
        console.log("✅ Admin Found:");
        console.log(`ID: ${admin._id}`);
        console.log(`Email: ${admin.email}`);
        console.log(`Balance: ${admin.balance}`);
    } else {
        console.log("❌ Admin User NOT Found!");
    }

    console.log("🔍 Listing ALL Users:");
    const all = await User.find({}, 'email _id role');
    all.forEach(u => console.log(`- ${u.email} (${u.role}): ${u._id}`));

    process.exit();
}

checkAdmin();
