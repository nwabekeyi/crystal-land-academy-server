const mongoose = require("mongoose");

const guardianSchema = new mongoose.Schema({
  name: { type: String, required: true },
  relationship: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, lowercase: true },
  address: String,
}, { _id: false });

const classLevelSchema = new mongoose.Schema({
  
  section: {
    type: String,
    enum: ["Primary", "Secondary"],
    required: true,
  },
  className: {
    type: String,
    required: true,
    enum: [
      "Kindergarten",
      "Reception",
      "Nursery 1",
      "Nursery 2",
      "Primary 1",
      "Primary 2",
      "Primary 3",
      "Primary 4",
      "Primary 5",
      "Primary 6",
      "JSS 1",
      "JSS 2",
      "JSS 3",
      "SS 1",
      "SS 2",
      "SS 3",
    ],
  },
  subclass: {
    type: String,
    required: true,
    match: /^[A-Z]$/, // Single uppercase letter (e.g., "A", "B")
  },
  academicYear: {
    type: String,
    required: true, // e.g., "2024/2025"
  },
}, { _id: false });

// Validate className based on section
classLevelSchema.pre('validate', function (next) {
  const primaryClasses = [
    "Kindergarten",
    "Reception",
    "Nursery 1",
    "Nursery 2",
    "Primary 1",
    "Primary 2",
    "Primary 3",
    "Primary 4",
    "Primary 5",
    "Primary 6",
  ];
  const secondaryClasses = ["JSS 1", "JSS 2", "JSS 3", "SS 1", "SS 2", "SS 3"];

  if (this.section === "Primary" && !primaryClasses.includes(this.className)) {
    next(new Error(`Invalid class name for Primary section: ${this.className}`));
  } else if (this.section === "Secondary" && !secondaryClasses.includes(this.className)) {
    next(new Error(`Invalid class name for Secondary section: ${this.className}`));
  }
  next();
});

const boardingDetailsSchema = new mongoose.Schema({
  hall: {
    type: String,
    required: true, // e.g., "Hall A", "Hall B"
  },
  roomNumber: {
    type: String, // e.g., "Room 101"
    required: true,
  },
  bedNumber: {
    type: String, // e.g., "Bed 1"
  },
  houseMaster: {
    type: String, // Name or ID of the house master
  },
}, { _id: false });

const studentSchema = new mongoose.Schema(
  {
    studentId: {
      type: String,
      unique: true,
      required: true,
    },
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    middleName: String,
    gender: {
      type: String,
      enum: ["Male", "Female"],
      required: true,
    },
    role: {
      type: String,
      default: "student",
    },
    profilePictureUrl: String,
    religion: String,
    tribe: String,
    NIN: { type: String, unique: true },
    formalSchool: String,
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    guardians: [guardianSchema],
    currentClassLevel: classLevelSchema,
    boardingStatus: {
      type: String,
      enum: ["Boarder", "Day Student"],
      required: true,
      default: "Day Student",
    },
    boardingDetails: {
      type: boardingDetailsSchema,
      required: function () {
        return this.boardingStatus === "Boarder";
      },
    },
    prefectName: String,
    isGraduated: {
      type: Boolean,
      default: false,
    },
    isSuspended: {
      type: Boolean,
      default: false,
    },
    isWithdrawn: {
      type: Boolean,
      default: false,
    },
    yearGraduated: String,
  },
  {
    timestamps: true,
  }
);

// Validation to ensure boardingDetails is not provided for Day Students
studentSchema.pre("validate", function (next) {
  if (this.boardingStatus === "Day Student") {
    this.boardingDetails = undefined;
  }
  next();
});

studentSchema.index({ "currentClassLevel.section": 1, "currentClassLevel.className": 1, "currentClassLevel.subclass": 1 });
studentSchema.index({ boardingStatus: 1, "boardingDetails.hall": 1 });

module.exports = mongoose.model("Student", studentSchema);