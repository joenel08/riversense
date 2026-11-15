// backend/seedAdmin.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const Admin = require('./models/Admin');

dotenv.config();

const createAdmin = async () => {
  try {
    // Connect to the CLOUD database
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to DB:", mongoose.connection.name); 

    const email = 'admin@riversense.gov.ph'; // Use the exact email you are typing in the login form
    const plainPassword = 'password123'; // Use the exact password you are typing

    // Delete existing to start fresh
    await Admin.deleteMany({ email }); 

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(plainPassword, salt);

    await Admin.create({ email, password: hashedPassword });

    console.log(`\n✅ Admin created in database: ${mongoose.connection.name}`);
    console.log(`Email: ${email}`);
    console.log(`Password: ${plainPassword}\n`);
    process.exit();
  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  }
};

createAdmin();