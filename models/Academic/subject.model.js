const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const SubjectName = require("./subjectName.model.js");

const subjectSchema = new mongoose.Schema(
  {
    name: {
      type: ObjectId,
      ref: "SubjectName", // ensures population works everywhere
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
          match: /^[A-Z]$/, // Single capital letter
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
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Automatically populate 'name' on all finds
// subjectSchema.pre(/^find/, function (next) {
//   this.populate({
//     path: "name",
//     model: "SubjectName",
//     select: "name -_id", // only the actual subject name
//   });
//   next();
// });

// Pre-save validation
subjectSchema.pre("save", async function (next) {
  try {
    const subject = this;

    // Validate SubjectName reference
    const subjectName = await SubjectName.findById(subject.name);
    if (!subjectName) {
      throw new Error("Referenced SubjectName does not exist");
    }

    // Validate classLevelSubclasses
    if (subject.classLevelSubclasses?.length) {
      for (const cls of subject.classLevelSubclasses) {
        const classLevel = await mongoose
          .model("ClassLevel")
          .findById(cls.classLevel);

        if (!classLevel) {
          throw new Error(`ClassLevel with ID ${cls.classLevel} does not exist`);
        }

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

        if (cls.teachers?.length) {
          const validTeachers = await mongoose
            .model("Teacher")
            .find({ _id: { $in: cls.teachers } });
          if (validTeachers.length !== cls.teachers.length) {
            throw new Error(
              `Invalid teacher IDs for ClassLevel ${cls.classLevel} subclass ${
                cls.subclassLetter || "all"
              }`
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
