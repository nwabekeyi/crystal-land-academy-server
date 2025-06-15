const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

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
      match: /^([01]\d|2[0-3]):([0-5]\d)$/, // HH:MM format
    },
    endTime: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):([0-5]\d)$/, // HH:MM format
    },
    location: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

const subclassSchema = new mongoose.Schema(
  {
    letter: {
      type: String,
      required: true,
      match: /^[A-Z]$/, // Single uppercase letter
    },
    timetables: [timetableSchema],
  },
  { _id: false }
);

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
        "Kindergarten",
        "Reception",
        "Nursery 1",
        "Nursery 2",
        "Primary 1",
        "Primary 2",
        "Primary 3",
        "Primary 4",
        "Primary 5",
        "Primary 6",
        "JSS 1",
        "JSS 2",
        "JSS 3",
        "SS 1",
        "SS 2",
        "SS 3",
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

// Pre-validation middleware
ClassLevelSchema.pre("validate", function (next) {
  const primaryClasses = [
    "Kindergarten",
    "Reception",
    "Nursery 1",
    "Nursery 2",
    "Primary 1",
    "Primary 2",
    "Primary 3",
    "Primary 4",
    "Primary 5",
    "Primary 6",
  ];
  const secondaryClasses = ["JSS 1", "JSS 2", "JSS 3", "SS 1", "SS 2", "SS 3"];

  if (this.section === "Primary" && !primaryClasses.includes(this.name)) {
    return next(new Error(`Invalid class name for Primary section: ${this.name}`));
  } else if (this.section === "Secondary" && !secondaryClasses.includes(this.name)) {
    return next(new Error(`Invalid class name for Secondary section: ${this.name}`));
  }

  // Ensure subclass letters are unique
  const subclassLetters = this.subclasses.map((sub) => sub.letter);
  if (new Set(subclassLetters).size !== subclassLetters.length) {
    return next(new Error("Subclass letters must be unique"));
  }

  // Validate timetable time range
  for (const subclass of this.subclasses) {
    if (subclass.timetables && Array.isArray(subclass.timetables)) {
      for (const timetable of subclass.timetables) {
        const start = parseInt(timetable.startTime.replace(":", ""));
        const end = parseInt(timetable.endTime.replace(":", ""));
        if (start >= end) {
          return next(
            new Error(`End time must be after start time for subclass ${subclass.letter}`)
          );
        }
      }
    }
  }

  next();
});

const ClassLevel = mongoose.model("ClassLevel", ClassLevelSchema);

module.exports = ClassLevel;
