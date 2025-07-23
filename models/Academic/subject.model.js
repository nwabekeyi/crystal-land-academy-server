const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;
const SubjectName = require("./subjectName.model.js");

const subjectSchema = new mongoose.Schema(
  {
    name: {
      type: ObjectId,
      ref: "SubjectName",
      required: true,
      index: true,
    },
    description: {
      type: String,
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

// Pre-save hook to validate classLevelSubclasses and name
subjectSchema.pre("save", async function (next) {
  try {
    const subject = this;

    // Validate name (SubjectName reference)
    const subjectName = await SubjectName.findById(subject.name);
    if (!subjectName) {
      throw new Error("Referenced SubjectName does not exist");
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