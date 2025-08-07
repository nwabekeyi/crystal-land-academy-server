const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const examSchema = new mongoose.Schema(
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
    subject: {
      type: ObjectId,
      ref: "Subject",
      required: true,
    },
    passMark: {
      type: Number,
      required: true,
    },
    totalMark: {
      type: Number,
      required: true,
    },
    duration: {
      type: String,
      required: true,
      default: "30 minutes",
    },
    examDate: {
      type: Date,
      required: true,
      default: new Date(),
    },
    examTime: {
      type: String,
      required: true,
    },
    startDate: {
      type: Date,
      required: false,
    },
    startTime: {
      type: String,
      required: false,
    },
    examType: {
      type: String,
      required: true,
      enum: ["test", "exam"],
    },
    examStatus: {
      type: String,
      required: true,
      default: "pending",
      enum: ["pending", "approved"],
    },
    questions: [
      {
        type: ObjectId,
        ref: "Question",
      },
    ],
    classLevel: {
      type: ObjectId,
      ref: "ClassLevel",
      required: true,
    },
    createdBy: {
      type: ObjectId,
      ref: "Teacher",
      required: true,
    },
    academicTerm: {
      type: ObjectId,
      ref: "AcademicTerm",
      required: true,
    },
    academicYear: {
      type: ObjectId,
      ref: "AcademicYear",
      required: true,
    },
  },
  { timestamps: true }
);

const Exam = mongoose.model("Exam", examSchema);
module.exports = Exam;