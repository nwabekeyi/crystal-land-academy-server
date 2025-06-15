const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

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

const academicYearSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      index: true,
    },
    fromYear: {
      type: Date,
      required: true,
    },
    toYear: {
      type: Date,
      required: true,
    },
    isCurrent: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: ObjectId,
      ref: "Admin",
      required: true,
    },
    students: [
      {
        type: ObjectId,
        ref: "Student",
      },
    ],
    teachers: [
      {
        type: ObjectId,
        ref: "Teacher",
      },
    ],
    terms: [academicTermSubSchema],
  },
  { timestamps: true }
);

const AcademicYear = mongoose.model("AcademicYear", academicYearSchema);

module.exports = AcademicYear;