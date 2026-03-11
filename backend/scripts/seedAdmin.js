const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User'); // Adjust path as needed based on where you run it from
const connectDB = require('../config/db'); // Adjust path as needed

// Load env vars
dotenv.config();

// Connect to DB
connectDB();

const seedAdmin = async () => {
    try {
        const adminEmail = 'admin@seeker.com';
        const adminPassword = 'admin123';

        // Check if admin already exists
        const userExists = await User.findOne({ email: adminEmail });

        if (userExists) {
            console.log('Admin user already exists');
            process.exit();
        }

        // Create admin user
        const user = await User.create({
            name: 'Super Admin',
            email: adminEmail,
            password: adminPassword,
            role: 'admin',
            status: 'active'
        });

        console.log(`Admin created successfully: ${user.email}`);
        process.exit();
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

seedAdmin();
