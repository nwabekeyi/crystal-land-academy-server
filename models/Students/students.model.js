const mongoose = require("mongoose");

const guardianSchema = new mongoose.Schema({
  name: String,
  relationship: String,
  phone: String,
  email: String,
  address: String,
}, { _id: false });

const studentSchema = new mongoose.Schema(
  {
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
      enum: ["Male", "Female", "Other"],
    },
    role: {
      type: String,
      default: "student",
    },
    profilePictureUrl: String,
    section: String,
    religion: String,
    tribe: String,
    NIN: String,
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

    currentClassLevels: [
      {
        type: String,
      },
    ],
    academicYear: String,
    program: String,
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

    examResults: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Result",
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Student", studentSchema);
