const mongoose = require('mongoose');
const connectDB = require('../database');
const User = require('../models/User');

async function listUsers() {
    try {
        await connectDB();
        const users = await User.find({}, 'name email role status sponsorId');
        console.log('--- CURRENT USERS ---');
        users.forEach(u => {
            console.log(`ID: ${u._id} | Name: ${u.name} | Email: ${u.email} | Role: ${u.role} | Sponsor: ${u.sponsorId}`);
        });
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

listUsers();
