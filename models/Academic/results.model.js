const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const examResultSchema = new mongoose.Schema(
  {
    student: {
      type: ObjectId,
      ref: "Student",
      required: true,
    },
    exam: {
      type: ObjectId,
      ref: "Exam",
      required: true,
    },
    score: {
      type: Number,
      required: true,
      min: [0, "Score cannot be negative"],
    },
    passMark: {
      type: Number,
      required: true,
      min: [0, "Pass mark cannot be negative"],
    },
    answeredQuestions: [
      {
        type: Object,
      },
    ],
    status: {
      type: String,
      required: true,
      enum: ["failed", "passed"],
    },
    remarks: {
      type: String,
      required: true,
      enum: ["Excellent", "Good", "Poor"],
    },
    position: {
      type: Number,
      required: true,
    },
    teacher: {
      type: ObjectId,
      ref: "Teacher",
      required: true,
    },
    subject: {
      type: ObjectId,
      ref: "Subject",
    },
    classLevel: {
      type: ObjectId,
      ref: "ClassLevel",
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
    subclass: {
      type: String,
      match: /^[A-Z]$/,
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

examResultSchema.index({ exam: 1, student: 1 }, { unique: true });
examResultSchema.index({ academicYear: 1, academicTerm: 1, classLevel: 1, subclass: 1, subject: 1 });

const ExamResult = mongoose.model("ExamResult", examResultSchema);

module.exports = ExamResult;