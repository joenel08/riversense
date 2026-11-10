// backend/seedAdmin.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const Admin = require('./models/Admin');

dotenv.config();

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    const email = 'admin@riversense.gov.ph';
    const plainPassword = 'password123'; // You can change this later
    
    // Check if admin already exists
    const existing = await Admin.findOne({ email });
    if (existing) {
      console.log('Admin already exists!');
      process.exit();
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(plainPassword, salt);

    const newAdmin = new Admin({ email, password: hashedPassword });
    await newAdmin.save();

    console.log('Admin created successfully!');
    console.log(`Email: ${email}`);
    console.log(`Password: ${plainPassword}`);
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

createAdmin();