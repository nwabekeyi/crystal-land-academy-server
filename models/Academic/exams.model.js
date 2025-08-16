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
      type: Number,
      required: true,
      min: [1, "Duration must be at least 1 minute"],
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
      required: true,
    },
    createdBy: {
      type: ObjectId,
      required: true,
    },
    academicTerm: {
      type: ObjectId,
      required: true,
    },
    academicYear: {
      type: ObjectId,
      required: true,
    },
    subclassLetter: {
      type: String,
      match: [/^[A-Z]$/, "Subclass letter must be a single capital letter (A-Z)"],
    },
    startDate: {
      type: Date,
    },
    startTime: {
      type: String,
    },
    completedBy: [
      {
        student: {
          type: ObjectId,
          ref: "Student",
        },
        completedDate: {
          type: Date,
          default: Date.now,
        },
        completedTime: {
          type: String,
        },
      },
    ],
  },
  { timestamps: true }
);

// Pre-save middleware to validate passMark <= totalMark
examSchema.pre("save", function (next) {
  if (this.passMark > this.totalMark) {
    const error = new Error("Pass mark cannot exceed total mark");
    error.statusCode = 400;
    throw error;
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
    error.statusCode = 400;
    throw error;
  }
  next();
});

// Pre-remove hook to delete associated questions
examSchema.pre("remove", async function (next) {
  const Question = require("./question.model");
  await Question.deleteMany({ _id: { $in: this.questions } });
  console.log(`Deleted questions for exam: ${this._id}`);
  next();
});

const Exam = mongoose.model("Exam", examSchema);
module.exports = Exam;