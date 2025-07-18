// scripts/removeApplicationStatusFromTeachers.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Teacher = require('./models/Staff/teachers.model');

dotenv.config();

const MONGO_URI = process.env.DB || 'mongodb://localhost:27017/your_database_name';

async function removeApplicationStatusFromTeachers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Update all teacher documents to remove the applicationStatus field
    const result = await Teacher.updateMany(
      { applicationStatus: { $exists: true } },
      { $unset: { applicationStatus: "" } }
    );

    console.log(`✅ Removed 'applicationStatus' from ${result.modifiedCount} teacher(s)`);
  } catch (error) {
    console.error('❌ Error removing applicationStatus from teachers:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

removeApplicationStatusFromTeachers();
