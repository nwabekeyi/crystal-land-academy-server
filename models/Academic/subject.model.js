const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;
const AcademicYear = require("./academicYear.model");

const subjectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
    },
    teacher: {
      type: ObjectId,
      ref: "Teacher",
    },
    academicYear: {
      type: ObjectId,
      ref: "AcademicYear",
      required: true,
    },
    createdBy: {
      type: ObjectId,
      ref: "Admin",
      required: true,
    },
  },
  { timestamps: true }
);

// Pre-save hook to validate academicYear
subjectSchema.pre("save", async function (next) {
  try {
    const subject = this;

    // Find the referenced AcademicYear
    const academicYear = await AcademicYear.findById(subject.academicYear);
    if (!academicYear) {
      throw new Error("Referenced AcademicYear does not exist");
    }

    next();
  } catch (error) {
    next(error);
  }
});

const Subject = mongoose.model("Subject", subjectSchema);

module.exports = Subject;