const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Teacher = require("./models/Staff/teachers.model");
const { hashPassword } = require("./handlers/passHash.handler"); // Import hashPassword

dotenv.config();

const MONGO_URI = process.env.DB;

// Sample teacher data conforming to the updated schema
const sampleTeachers = [
  {
    firstName: "Mary",
    lastName: "Johnson",
    middleName: "B",
    email: "mary.johnson@example.com",
    password: "hashedPassword123", // Will be hashed in the script
    gender: "Female",
    NIN: "12345678901",
    address: "789 Oak St",
    qualification: "BSc",
    phoneNumber: "2345678901",
    tribe: "Igbo",
    religion: "Christianity",
    bankAccountDetails: {
      accountName: "Mary Johnson",
      accountNumber: "1234567890",
      bank: "First Bank",
    },
    subject: "60d21b4667d0d8992e610c85", // Sample Subject ObjectId
    teachingAssignments: [
      {
        section: "Secondary",
        className: "JSS1",
        subclasses: ["A", "B"],
        academicYear: "60d21b4667d0d8992e610c86", // Sample AcademicYear ObjectId
      },
      {
        section: "Secondary",
        className: "SS2",
        subclasses: ["A"],
        academicYear: "60d21b4667d0d8992e610c86",
      },
    ],
    profilePictureUrl: "https://example.com/mary.jpg",
    linkedInProfile: "https://linkedin.com/in/maryjohnson",
    role: "teacher",
    applicationStatus: "approved",
    isWithdrawn: false,
    isSuspended: false,
    createdBy: "60d21b4667d0d8992e610c87", // Sample Admin ObjectId
    examsCreated: [],
  },
  {
    firstName: "James",
    lastName: "Brown",
    email: "james.brown@example.com",
    password: "hashedPassword456",
    gender: "Male",
    NIN: "98765432109",
    address: "456 Pine St",
    qualification: "MSc",
    phoneNumber: "0987654321",
    tribe: "Hausa",
    religion: "Islam",
    bankAccountDetails: {
      accountName: "James Brown",
      accountNumber: "0987654321",
      bank: "Zenith Bank",
    },
    subject: "60d21b4667d0d8992e610c88",
    teachingAssignments: [
      {
        section: "Primary",
        className: "Primary 1",
        subclasses: ["A", "B"],
        academicYear: "60d21b4667d0d8992e610c86",
      },
    ],
    profilePictureUrl: "https://example.com/james.jpg",
    role: "teacher",
    applicationStatus: "approved",
    isWithdrawn: false,
    isSuspended: false,
    createdBy: "60d21b4667d0d8992e610c87",
    examsCreated: [],
  },
];

const runMigration = async () => {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB");



    // Hash passwords for sample teachers
    const hashedTeachers = await Promise.all(
      sampleTeachers.map(async (teacher) => ({
        ...teacher,
        password: await hashPassword(teacher.password),
      }))
    );

    // Delete all existing teacher documents
    const deleteResult = await Teacher.deleteMany({});
    console.log(`Deleted ${deleteResult.deletedCount} teacher documents.`);

    // Insert new teacher documents
    const insertResult = await Teacher.insertMany(hashedTeachers);
    console.log(`Inserted ${insertResult.length} new teacher documents.`);

    await mongoose.disconnect();
    console.log("Migration completed successfully.");
  } catch (error) {
    console.error("Migration error:", error);
    await mongoose.disconnect();
  }
};

runMigration();