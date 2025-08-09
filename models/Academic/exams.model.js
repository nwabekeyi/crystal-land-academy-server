// models/Academic/exams.model.js
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
      min: [0, "Pass mark cannot be negative"],
    },
    totalMark: {
      type: Number,
      required: true,
      min: [0, "Total mark cannot be negative"],
      max: [100, "Total mark cannot exceed 100"],
    },
    duration: {
      type: String,
      required: true,
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

// Pre-save middleware to validate passMark <= totalMark
examSchema.pre("save", function (next) {
  if (this.passMark > this.totalMark) {
    const error = new Error("Pass mark cannot exceed total mark");
    return next(error);
  }
  next();
});

// Pre-update middleware to validate passMark <= totalMark for updates
examSchema.pre(["updateOne", "findOneAndUpdate"], function (next) {
  const update = this.getUpdate();
  const passMark = update.passMark !== undefined ? update.passMark : this._update.$set?.passMark;
  const totalMark = update.totalMark !== undefined ? update.totalMark : this._update.$set?.totalMark;

  if (passMark !== undefined && totalMark !== undefined && passMark > totalMark) {
    const error = new Error("Pass mark cannot exceed total mark");
    return next(error);
  }
  next();
});

// Pre-remove hook to delete associated questions
examSchema.pre("remove", async function (next) {
  const Question = require("./question.model");
  await Question.deleteMany({ _id: { $in: this.questions } });
  next();
});

const Exam = mongoose.model("Exam", examSchema);
module.exports = Exam;