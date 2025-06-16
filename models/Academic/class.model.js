const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

// Reusable fee schema per term
const feeSchema = new mongoose.Schema(
  {
    termName: {
      type: String,
      enum: ["1st Term", "2nd Term", "3rd Term"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    description: {
      type: String,
      default: "",
    },
  },
  { _id: false }
);

// Timetable schema per subclass
const timetableSchema = new mongoose.Schema(
  {
    subject: {
      type: ObjectId,
      ref: "Subject",
      required: true,
    },
    teacher: {
      type: ObjectId,
      ref: "Teacher",
      required: true,
    },
    dayOfWeek: {
      type: String,
      enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      required: true,
    },
    startTime: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):([0-5]\d)$/, // HH:mm format
    },
    endTime: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):([0-5]\d)$/, // HH:mm format
    },
    location: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

// Subclass schema (e.g., Primary 2A)
const subclassSchema = new mongoose.Schema(
  {
    letter: {
      type: String,
      required: true,
      match: /^[A-Z]$/, // Single capital letter (A, B, etc.)
    },
    timetables: [timetableSchema],
    feesPerTerm: [feeSchema], // Fees for each term in this subclass
  },
  { _id: false }
);

// Main ClassLevel schema
const ClassLevelSchema = new mongoose.Schema(
  {
    section: {
      type: String,
      required: true,
      enum: ["Primary", "Secondary"],
    },
    name: {
      type: String,
      required: true,
      index: true,
      enum: [
        "Kindergarten", "Reception", "Nursery 1", "Nursery 2", "Primary 1",
        "Primary 2", "Primary 3", "Primary 4", "Primary 5", "Primary 6",
        "JSS 1", "JSS 2", "JSS 3", "SS 1", "SS 2", "SS 3",
      ],
    },
    subclasses: [subclassSchema],
    description: {
      type: String,
    },
    createdBy: {
      type: ObjectId,
      ref: "Admin",
      required: true,
    },
    academicYear: {
      type: ObjectId,
      ref: "AcademicYear",
      required: true,
    },
    students: [
      {
        type: ObjectId,
        ref: "Student",
      },
    ],
    subjectsPerTerm: [
      {
        termName: {
          type: String,
          required: true,
          enum: ["1st Term", "2nd Term", "3rd Term"],
        },
        subjects: [
          {
            subject: {
              type: ObjectId,
              ref: "Subject",
              required: true,
            },
            teacher: {
              type: ObjectId,
              ref: "Teacher",
              required: true,
            },
          },
        ],
      },
    ],
    teachers: [
      {
        type: ObjectId,
        ref: "Teacher",
      },
    ],
  },
  { timestamps: true }
);

// Pre-validation middleware to ensure consistency
ClassLevelSchema.pre("validate", function (next) {
  const primary = [
    "Kindergarten", "Reception", "Nursery 1", "Nursery 2",
    "Primary 1", "Primary 2", "Primary 3", "Primary 4", "Primary 5", "Primary 6",
  ];
  const secondary = ["JSS 1", "JSS 2", "JSS 3", "SS 1", "SS 2", "SS 3"];

  if (this.section === "Primary" && !primary.includes(this.name)) {
    return next(new Error(`Invalid class name for Primary: ${this.name}`));
  }
  if (this.section === "Secondary" && !secondary.includes(this.name)) {
    return next(new Error(`Invalid class name for Secondary: ${this.name}`));
  }

  // Ensure unique subclass letters (A, B, C...)
  const subclassLetters = this.subclasses.map((sub) => sub.letter);
  if (new Set(subclassLetters).size !== subclassLetters.length) {
    return next(new Error("Subclass letters must be unique"));
  }

  // Validate timetable times and fees
  for (const subclass of this.subclasses) {
    if (Array.isArray(subclass.timetables)) {
      for (const tt of subclass.timetables) {
        const start = parseInt(tt.startTime.replace(":", ""));
        const end = parseInt(tt.endTime.replace(":", ""));
        if (start >= end) {
          return next(new Error(`End time must be after start time for subclass ${subclass.letter}`));
        }
      }
    }

    if (Array.isArray(subclass.feesPerTerm)) {
      const seenTerms = new Set();
      for (const fee of subclass.feesPerTerm) {
        if (seenTerms.has(fee.termName)) {
          return next(new Error(`Duplicate fee term in subclass ${subclass.letter}`));
        }
        seenTerms.add(fee.termName);
        if (fee.amount < 0) {
          return next(new Error(`Fee amount must be non-negative in subclass ${subclass.letter}`));
        }
      }
    }
  }

  next();
});

const ClassLevel = mongoose.model("ClassLevel", ClassLevelSchema);
module.exports = ClassLevel;
