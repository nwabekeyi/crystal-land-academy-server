const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;
const AcademicYear = require("./academicYear.model");

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
    academicYear: {
      type: ObjectId,
      ref: "AcademicYear",
      required: true,
    },
    classLevelSubclasses: [
      {
        classLevel: {
          type: ObjectId,
          ref: "ClassLevel",
          required: true,
        },
        subclassLetter: {
          type: String,
          required: true,
          match: /^[A-Z]$/, // Single capital letter (A, B, etc.)
        },
        teachers: [
          {
            type: ObjectId,
            ref: "Teacher",
          },
        ],
      },
    ],
  },
  { timestamps: true }
);

// Pre-save hook to validate academicYear and classLevelSubclasses
subjectSchema.pre("save", async function (next) {
  try {
    const subject = this;

    // Validate academicYear
    const academicYear = await AcademicYear.findById(subject.academicYear);
    if (!academicYear) {
      throw new Error("Referenced AcademicYear does not exist");
    }

    // Validate classLevelSubclasses and teachers
    if (subject.classLevelSubclasses && subject.classLevelSubclasses.length > 0) {
      for (const cls of subject.classLevelSubclasses) {
        // Validate classLevel
        const classLevel = await mongoose.model("ClassLevel").findById(cls.classLevel);
        if (!classLevel) {
          throw new Error(`ClassLevel with ID ${cls.classLevel} does not exist`);
        }
        // Validate subclassLetter exists in classLevel.subclasses
        const subclassExists = classLevel.subclasses.some(
          (sub) => sub.letter === cls.subclassLetter
        );
        if (!subclassExists) {
          throw new Error(
            `Subclass ${cls.subclassLetter} does not exist in ClassLevel ${cls.classLevel}`
          );
        }
        // Validate teachers if provided
        if (cls.teachers && cls.teachers.length > 0) {
          const validTeachers = await mongoose.model("Teacher").find({
            _id: { $in: cls.teachers },
          });
          if (validTeachers.length !== cls.teachers.length) {
            throw new Error(
              `One or more Teachers for ClassLevel ${cls.classLevel} subclass ${cls.subclassLetter} are invalid`
            );
          }
        }
      }
    }

    next();
  } catch (error) {
    next(error);
  }
});

const Subject = mongoose.model("Subject", subjectSchema);

module.exports = Subject;