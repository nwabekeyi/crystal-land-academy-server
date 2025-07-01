const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Teacher = require("./models/Staff/teachers.model"); // Adjust path if needed

dotenv.config();

const MONGO_URI = process.env.DB || "mongodb://localhost:27017/your_database_name";

async function pushRatingToTeachers() {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Connected to MongoDB");

    const result = await Teacher.updateMany(
      { rating: { $exists: false } }, // Only add if rating does not exist
      { $set: { rating: 0 } }
    );

    console.log(`✅ Updated ${result.modifiedCount} teacher(s) with default rating of 0.`);

    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error updating teachers:", error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

pushRatingToTeachers();
