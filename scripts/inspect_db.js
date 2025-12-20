require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User'); // Adjust path to models
const connectDB = require('../database');

const inspect = async () => {
    await connectDB();
    console.log("--- CURRENT DATABASE USERS ---");
    const users = await User.find({});
    users.forEach(u => {
        console.log(`Email: ${u.email} | Name: ${u.name} | Balance: ${u.balance} | Role: ${u.role}`);
    });
    console.log("--------------------------------");
    process.exit(0);
};

inspect();
