const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;
const AcademicYear = require("./academicYear.model");
const AcademicTerm = require("./academicTerm.model");

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
    academicTermName: {
      type: String,
      required: true,
      enum: ["1st Term", "2nd Term", "3rd Term"],
    },
    createdBy: {
      type: ObjectId,
      ref: "Admin",
      required: true,
    },
    duration: {
      type: String,
      required: true,
      default: "3 months",
    },
  },
  { timestamps: true }
);

// Pre-save hook to validate academicYear and academicTermName
subjectSchema.pre("save", async function (next) {
  try {
    const subject = this;

    // Find the referenced AcademicYear
    const academicYear = await AcademicYear.findById(subject.academicYear);
    if (!academicYear) {
      throw new Error("Referenced AcademicYear does not exist");
    }

    // Find the AcademicTerm(s) referenced by the AcademicYear
    const academicTerm = await AcademicTerm.findOne({
      _id: { $in: academicYear.academicTerms },
    });
    if (!academicTerm) {
      throw new Error("No AcademicTerm found for the referenced AcademicYear");
    }

    // Validate that the academicTermName exists in the AcademicTerm's terms array
    const termExists = academicTerm.terms.some((term) => term.name === subject.academicTermName);
    if (!termExists) {
      throw new Error(`Term ${subject.academicTermName} does not exist in the referenced AcademicTerm`);
    }

    next();
  } catch (error) {
    next(error);
  }
});

const Subject = mongoose.model("Subject", subjectSchema);

module.exports = Subject;