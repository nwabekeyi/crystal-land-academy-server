const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;
const AcademicYear = require("./academicYear.model");

const academicTermSubSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    enum: ["1st Term", "2nd Term", "3rd Term"],
  },
  description: {
    type: String,
    required: true,
  },
  duration: {
    type: String,
    required: true,
    default: "3 months",
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  createdBy: {
    type: ObjectId,
    ref: "Admin",
    required: true,
  },
  isCurrent: {
    type: Boolean,
    default: false,
  },
});

const academicTermSchema = new mongoose.Schema(
  {
    academicYear: {
      type: ObjectId,
      ref: "AcademicYear",
      required: true,
    },
    terms: {
      type: [academicTermSubSchema],
      required: true,
      validate: {
        validator: function (terms) {
          return (
            terms.length === 3 &&
            terms.every((term) => ["1st Term", "2nd Term", "3rd Term"].includes(term.name))
          );
        },
        message: "An AcademicTerm must have exactly three terms: 1st Term, 2nd Term, and 3rd Term.",
      },
    },
  },
  { timestamps: true }
);

// Pre-save hook to add AcademicTerm to AcademicYear's academicTerms array
academicTermSchema.pre("save", async function (next) {
  try {
    const academicTerm = this;

    // Validate that the referenced AcademicYear exists
    const academicYear = await AcademicYear.findById(academicTerm.academicYear);
    if (!academicYear) {
      throw new Error("Referenced AcademicYear does not exist");
    }

    // Add AcademicTerm to AcademicYear's academicTerms array if not already present
    if (!academicYear.academicTerms.includes(academicTerm._id)) {
      academicYear.academicTerms.push(academicTerm._id);
      await academicYear.save();
    }

    next();
  } catch (error) {
    next(error);
  }
});

const AcademicTerm = mongoose.model("AcademicTerm", academicTermSchema);

module.exports = AcademicTerm;