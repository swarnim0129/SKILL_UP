const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

const seedAdmin = async () => {
    try {
        // Fix for "db already exists with different case"
        let uri = process.env.MONGODB_URI;
        if (uri.includes('localhost') && uri.endsWith('/seeker')) {
            uri = uri.replace('/seeker', '/Seeker');
        }
        
        await mongoose.connect(uri);
        console.log(`MongoDB Connected: ${mongoose.connection.host}`);

        const adminEmail = process.env.ADMIN_EMAIL || 'admin@seeker.com';
        const adminPass = process.env.ADMIN_PASS || 'helloseeker@123';

        // Check if exists
        const userExists = await User.findOne({ email: adminEmail });

        if (userExists) {
            console.log('Admin user already exists');
            userExists.password = adminPass;
            userExists.role = 'admin';
            userExists.name = 'Super Admin';
            userExists.clerkId = userExists.clerkId || 'admin_local_' + Date.now();
            
            await userExists.save();
            console.log('Admin updated');
        } else {
            const user = await User.create({
                name: 'Super Admin',
                email: adminEmail,
                password: adminPass,
                role: 'admin',
                clerkId: 'admin_local_' + Date.now(), 
                status: 'active'
            });
            console.log('Admin user created');
        }

        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

seedAdmin();
