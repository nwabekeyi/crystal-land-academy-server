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
      required: true,
    },
    classLevelSubclasses: [
      {
        classLevel: {
          type: ObjectId,
          required: true,
        },
        subclassLetter: {
          type: String,
          match: /^[A-Z]$/, // Single capital letter (A, B, etc.)
          // Validation moved to service layer to avoid synchronous ClassLevel query
        },
        teachers: [
          {
            type: ObjectId,
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

    // Validate classLevelSubclasses
    if (subject.classLevelSubclasses && subject.classLevelSubclasses.length > 0) {
      for (const cls of subject.classLevelSubclasses) {
        const classLevel = await mongoose.model("ClassLevel").findById(cls.classLevel);
        if (!classLevel) {
          throw new Error(`ClassLevel with ID ${cls.classLevel} does not exist`);
        }

        // Validate subclassLetter
        if (["SS 1", "SS 2", "SS 3"].includes(classLevel.name)) {
          if (!cls.subclassLetter) {
            throw new Error(`Subclass letter required for ${classLevel.name}`);
          }
          const subclassExists = classLevel.subclasses.some(
            (s) => s.letter === cls.subclassLetter
          );
          if (!subclassExists) {
            throw new Error(
              `Subclass ${cls.subclassLetter} does not exist in ${classLevel.name}`
            );
          }
        } else {
          if (cls.subclassLetter) {
            throw new Error(`Subclass letter not allowed for ${classLevel.name}`);
          }
        }

        // Validate teachers
        if (cls.teachers && cls.teachers.length > 0) {
          const validTeachers = await mongoose
            .model("Teacher")
            .find({ _id: { $in: cls.teachers } });
          if (validTeachers.length !== cls.teachers.length) {
            throw new Error(
              `Invalid teacher IDs for ClassLevel ${cls.classLevel} subclass ${cls.subclassLetter || "all"}`
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