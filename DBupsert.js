const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Exams = require("./models/Academic/exams.model"); // Adjust path to your Exam model

dotenv.config();

const MONGO_URI = process.env.DB || "mongodb://localhost:27017/your_database_name";

async function addCompletedByFieldToExams() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Connected to MongoDB");

    // Find all exams
    const exams = await Exams.find();
    if (exams.length === 0) {
      console.log("⚠️ No exams found in the database");
    } else {
      console.log(`📚 Found ${exams.length} exams`);

      // Update each exam to include completedBy field if missing
      let updatedCount = 0;
      for (const exam of exams) {
        if (!exam.completedBy) {
          await Exams.updateOne(
            { _id: exam._id },
            { $set: { completedBy: [] } }
          );
          updatedCount++;
          console.log(`✅ Added completedBy field to exam: ${exam.name} (ID: ${exam._id})`);
        } else {
          console.log(`ℹ️ Exam ${exam.name} (ID: ${exam._id}) already has completedBy field`);
        }
      }

      console.log(`🎉 Updated ${updatedCount} exams with completedBy field.`);
    }

    console.log("🎉 Migration completed.");
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
    process.exit(1);
  }
}

addCompletedByFieldToExams();