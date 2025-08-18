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
      ref: "ClassLevel",
      required: true,
    },
    createdBy: {
      type: ObjectId,
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
    subclassLetter: [
      {
        type: String,
        match: [/^[A-Z]$/, "Each subclass letter must be a single capital letter (A-Z)"],
      },
    ],
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

// Pre-save middleware to validate passMark <= totalMark and subclassLetter for SS classes
examSchema.pre("save", async function (next) {
  // Validate passMark <= totalMark
  if (this.passMark > this.totalMark) {
    const error = new Error("Pass mark cannot exceed total mark");
    error.statusCode = 400;
    throw error;
  }

  // Validate subclassLetter for SS classes
  const ClassLevel = require("./class.model"); // Adjust path to your ClassLevel model
  const classLevel = await ClassLevel.findById(this.classLevel);
  if (!classLevel) {
    const error = new Error("Class level not found");
    error.statusCode = 404;
    throw error;
  }

  const isSSClass = ["SS 1", "SS 2", "SS 3"].includes(classLevel.name);
  if (isSSClass && (!this.subclassLetter || this.subclassLetter.length === 0)) {
    const error = new Error("At least one subclass letter is required for SS classes");
    error.statusCode = 400;
    throw error;
  }
  if (isSSClass && this.subclassLetter.length > 0) {
    const validSubclasses = classLevel.subclasses.map((sub) => sub.letter);
    const invalidSubclasses = this.subclassLetter.filter((letter) => !validSubclasses.includes(letter));
    if (invalidSubclasses.length > 0) {
      const error = new Error(`Invalid subclass letter(s) for this class: ${invalidSubclasses.join(", ")}`);
      error.statusCode = 400;
      throw error;
    }
  }
  if (!isSSClass && this.subclassLetter && this.subclassLetter.length > 0) {
    const error = new Error("Subclass letters are not allowed for non-SS classes");
    error.statusCode = 400;
    throw error;
  }

  next();
});

// Pre-update middleware to validate passMark <= totalMark and subclassLetter for SS classes
examSchema.pre(["updateOne", "findOneAndUpdate"], async function (next) {
  const update = this.getUpdate();
  const passMark = update.passMark !== undefined ? update.passMark : this._update.$set?.passMark;
  const totalMark = update.totalMark !== undefined ? update.totalMark : this._update.$set?.totalMark;
  const subclassLetter = update.subclassLetter !== undefined ? update.subclassLetter : this._update.$set?.subclassLetter;
  const classLevelId = update.classLevel !== undefined ? update.classLevel : this._update.$set?.classLevel;

  // Validate passMark <= totalMark
  if (passMark !== undefined && totalMark !== undefined && passMark > totalMark) {
    const error = new Error("Pass mark cannot exceed total mark");
    error.statusCode = 400;
    throw error;
  }

  // Validate subclassLetter for SS classes if classLevel or subclassLetter is updated
  if (classLevelId || subclassLetter !== undefined) {
    const ClassLevel = require("./class.model"); // Adjust path to your ClassLevel model
    const classLevel = await ClassLevel.findById(classLevelId || this.getQuery().classLevel);
    if (!classLevel) {
      const error = new Error("Class level not found");
      error.statusCode = 404;
      throw error;
    }

    const isSSClass = ["SS 1", "SS 2", "SS 3"].includes(classLevel.name);
    if (isSSClass && (!subclassLetter || subclassLetter.length === 0)) {
      const error = new Error("At least one subclass letter is required for SS classes");
      error.statusCode = 400;
      throw error;
    }
    if (isSSClass && subclassLetter && subclassLetter.length > 0) {
      const validSubclasses = classLevel.subclasses.map((sub) => sub.letter);
      const invalidSubclasses = subclassLetter.filter((letter) => !validSubclasses.includes(letter));
      if (invalidSubclasses.length > 0) {
        const error = new Error(`Invalid subclass letter(s) for this class: ${invalidSubclasses.join(", ")}`);
        error.statusCode = 400;
        throw error;
      }
    }
    if (!isSSClass && subclassLetter && subclassLetter.length > 0) {
      const error = new Error("Subclass letters are not allowed for non-SS classes");
      error.statusCode = 400;
      throw error;
    }
  }

  next();
});

// Pre-remove hook to delete associated questions
examSchema.pre("remove", async function (next) {
  const Question = require("./question.model"); // Adjust path to your Question model
  await Question.deleteMany({ _id: { $in: this.questions } });
  console.log(`Deleted questions for exam: ${this._id}`);
  next();
});

const Exam = mongoose.model("Exam", examSchema);
module.exports = Exam;