const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Student = require("./models/Students/students.model");

dotenv.config();

const MONGO_URI = process.env.DB;

const runMigration = async () => {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Add `role: "student"` to all student documents that don't have it
    const studentUpdateResult = await Student.updateMany(
      { role: { $exists: false } },
      { $set: { role: "student" } }
    );
    console.log(`Updated ${studentUpdateResult.modifiedCount} student documents with role: "student".`);

    mongoose.disconnect();
  } catch (error) {
    console.error("Migration error:", error);
    mongoose.disconnect();
  }
};

runMigration();
