const mongoose = require('mongoose');
const connectDB = require('../database');
const User = require('../models/User');

async function verifyTree() {
    try {
        await connectDB();

        const users = await User.find({}).populate('sponsorId', 'name');

        console.log("--- FINAL TREE STRUCTURE ---");

        const admin = users.find(u => !u.sponsorId);
        if (admin) {
            console.log(`ROOT: ${admin.name} (${admin.email})`);
            printChildren(admin, users, 1);
        } else {
            console.log("No Root Found!");
        }

        process.exit(0);

    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

function printChildren(parent, allUsers, level) {
    const children = allUsers.filter(u => u.sponsorId && u.sponsorId._id.equals(parent._id));
    const indent = "  ".repeat(level);
    children.forEach(child => {
        console.log(`${indent}└─ ${child.name} (${child.email})`);
        printChildren(child, allUsers, level + 1);
    });
}

verifyTree();
