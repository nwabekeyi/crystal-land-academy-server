const mongoose = require("mongoose");
const dotenv = require("dotenv");
const ClassLevel = require("./models/Academic/class.model");
const Subject = require("./models/Academic/subject.model");

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

// Map subjects to streams for SS1-SS3
const subjectStreamMapping = {
  Mathematics: ["Science", "Arts"],
  "English Language": ["Science", "Arts"],
  "Civic Education": ["Science", "Arts"],
  "Computer Studies": ["Science", "Arts"],
  "Physical and Health Education": ["Science", "Arts"],
  Physics: ["Science"],
  Chemistry: ["Science"],
  Biology: ["Science"],
  "Further Mathematics": ["Science"],
  "Agricultural Science": ["Science"],
  "Literature in English": ["Arts"],
  Government: ["Arts"],
  "Christian Religious Studies": ["Arts"],
  "Islamic Religious Studies": ["Arts"],
  History: ["Arts"],
  French: ["Arts"],
  Economics: ["Commercial"],
  Commerce: ["Commercial"],
  Accounting: ["Commercial"],
  Marketing: ["Commercial"],
};

// Generate dummy data for all classes
const dummyClasses = classNames.map((name) => {
  const isSeniorSecondary = ["SS 1", "SS 2", "SS 3"].includes(name);
  const subclasses = [
    {
      letter: "A",
      subjects: [], // Initialize empty, populate for SS1-SS3
      timetables: [],
      feesPerTerm: [
        { termName: "1st Term", amount: 50000, description: "Tuition" },
        { termName: "2nd Term", amount: 50000, description: "Tuition" },
        { termName: "3rd Term", amount: 50000, description: "Tuition" },
      ],
    },
    // Add subclass B for Primary and SS classes
    ...(name.includes("Primary") || isSeniorSecondary
      ? [
          {
            letter: "B",
            subjects: [],
            timetables: [],
            feesPerTerm: [
              { termName: "1st Term", amount: 50000, description: "Tuition" },
              { termName: "2nd Term", amount: 50000, description: "Tuition" },
              { termName: "3rd Term", amount: 50000, description: "Tuition" },
            ],
          },
        ]
      : []),
  ];

  return {
    section: getSection(name),
    name,
    subclasses,
    description: `${name} class for the 2024/2025 academic year`,
    createdBy: new mongoose.Types.ObjectId("683e85cfde50e9f334665a24"),
    academicYear: new mongoose.Types.ObjectId("685180f8ad949e40eee0816d"),
    students: [],
    teachers: [],
  };
});

// Subject migration to fix createdBy field
async function migrateSubjects() {
  try {
    console.log("Starting Subject migration...");
    const subjects = await Subject.find({}).select("createdBy _id");

    if (!subjects.length) {
      console.log("No subjects found. Skipping Subject migration.");
      return { updated: 0, skipped: 0, errors: 0 };
    }

    const updates = [];
    let skippedCount = 0;
    let errorCount = 0;

    for (const subject of subjects) {
      const createdBy = subject.createdBy;

      // Skip if createdBy is a valid ObjectId
      if (mongoose.Types.ObjectId.isValid(createdBy) && typeof createdBy !== "object") {
        skippedCount++;
        continue;
      }

      // Handle object-type createdBy
      if (createdBy && typeof createdBy === "object" && createdBy._id) {
        const adminId = createdBy._id.toString();
        if (mongoose.Types.ObjectId.isValid(adminId)) {
          updates.push({
            updateOne: {
              filter: { _id: subject._id },
              update: { $set: { createdBy: new mongoose.Types.ObjectId(adminId) } },
            },
          });
        } else {
          console.warn(`Invalid admin ID ${adminId} in subject ${subject._id}`);
          errorCount++;
        }
      } else {
        console.warn(`Invalid createdBy data in subject ${subject._id}: ${JSON.stringify(createdBy)}`);
        errorCount++;
      }
    }

    let updatedCount = 0;
    if (updates.length > 0) {
      const result = await Subject.bulkWrite(updates, { ordered: false });
      updatedCount = result.modifiedCount || 0;
      console.log(`Bulk updated ${updatedCount} subjects.`);
    }

    console.log(
      `Subject migration completed. Updated: ${updatedCount}, Skipped: ${skippedCount}, Errors: ${errorCount}`
    );
    return { updated: updatedCount, skipped: skippedCount, errors: errorCount };
  } catch (error) {
    console.error("Subject migration failed:", error.message);
    throw error;
  }
}

// ClassLevel migration
async function migrateClassLevels() {
  try {
    console.log("Starting ClassLevel migration...");

    // Clear existing ClassLevel data (optional, comment out to keep existing data)
    await ClassLevel.deleteMany({});
    console.log("Cleared existing ClassLevel data");

    // Insert dummy classes
    const insertedClasses = await ClassLevel.insertMany(dummyClasses, { ordered: false });
    console.log(`Inserted ${insertedClasses.length} classes successfully`);

    // Fetch subjects for the academic year
    const academicYearId = new mongoose.Types.ObjectId("685180f8ad949e40eee0816d");
    const subjects = await Subject.find({ academicYear: academicYearId }).select("_id name");
    console.log(`Found ${subjects.length} subjects for academic year ${academicYearId}`);

    if (!subjects.length) {
      console.warn(`No subjects found for academic year ${academicYearId}. Skipping subject assignment.`);
      return;
    }

    // Assign subjects to SS1-SS3 subclasses
    for (const classLevel of insertedClasses) {
      if (!["SS 1", "SS 2", "SS 3"].includes(classLevel.name)) continue;

      const className = classLevel.name;
      for (const subclass of classLevel.subclasses) {
        const stream = subclass.letter === "A" ? "Science" : "Arts";
        const subjectIds = subjects
          .filter((subject) => {
            const streams = subjectStreamMapping[subject.name] || [];
            return streams.includes(stream);
          })
          .map((subject) => subject._id);

        if (subjectIds.length > 0) {
          await ClassLevel.updateOne(
            { _id: classLevel._id, "subclasses.letter": subclass.letter },
            { $set: { "subclasses.$.subjects": subjectIds } }
          );
          console.log(`Assigned ${subjectIds.length} subjects to ${className}${subclass.letter}`);
        }
      }
    }

    console.log("ClassLevel migration completed.");
  } catch (error) {
    console.error("ClassLevel migration failed:", error.message);
    throw error;
  }
}

// Main migration function
async function runMigration() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB");

    // Run Subject migration first
    const subjectResult = await migrateSubjects();
    console.log(`Subject migration summary: ${JSON.stringify(subjectResult)}`);

    // Run ClassLevel migration
    await migrateClassLevels();

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