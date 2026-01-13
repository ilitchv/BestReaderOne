const mongoose = require('mongoose');
require('dotenv').config();

// Define minimal schema
const UserSchema = new mongoose.Schema({ name: String, email: String });
const User = mongoose.model('User', UserSchema);

async function run() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const user = await User.findOne();
        if (user) {
            console.log("VALID_USER_ID:", user._id.toString());
        } else {
            console.log("NO_USERS_FOUND");
        }
        await mongoose.disconnect();
    } catch (e) {
        console.error(e);
    }
}

run();
