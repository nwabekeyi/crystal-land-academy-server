const mongoose = require("mongoose");
const dotenv = require("dotenv");
const ClassLevel = require("./models/Academic/class.model");

dotenv.config();

const MONGO_URI = process.env.DB || "mongodb://localhost:27017/your_database_name";

// Define all class names from the enum
const classNames = [
  "Kindergarten", "Reception", "Nursery 1", "Nursery 2", "Primary 1",
  "Primary 2", "Primary 3", "Primary 4", "Primary 5", "Primary 6",
  "JSS 1", "JSS 2", "JSS 3", "SS 1", "SS 2", "SS 3",
];

// Map class names to sections
const getSection = (name) => {
  const primaryClasses = [
    "Kindergarten", "Reception", "Nursery 1", "Nursery 2",
    "Primary 1", "Primary 2", "Primary 3", "Primary 4", "Primary 5", "Primary 6",
  ];
  return primaryClasses.includes(name) ? "Primary" : "Secondary";
};

// Generate dummy data for all classes
const dummyClasses = classNames.map((name) => ({
  section: getSection(name),
  name,
  subclasses: [
    { letter: "A" }, // At least one subclass
    ...(name.includes("Primary") ? [{ letter: "B" }] : []), // Add subclass B for Primary classes
  ],
  description: `${name} class for the 2024/2025 academic year`,
  createdBy: new mongoose.Types.ObjectId("683e85cfde50e9f334665a24"), // Provided Admin ID
  academicYear: new mongoose.Types.ObjectId("685180f8ad949e40eee0816d"), // Provided AcademicYear ID
  students: [],
  subjectsPerTerm: [
    { termName: "1st Term", subjects: [] },
    { termName: "2nd Term", subjects: [] },
    { termName: "3rd Term", subjects: [] },
  ],
  teachers: [],
}));

// Migration function
async function runMigration() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB");

    // Clear existing ClassLevel data (optional, comment out to keep existing data)
    await ClassLevel.deleteMany({});
    console.log("Cleared existing ClassLevel data");

    // Insert dummy classes
    const result = await ClassLevel.insertMany(dummyClasses, { ordered: false });
    console.log(`Inserted ${result.length} classes successfully`);

    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the migration
runMigration();