// models/Academic/subject.model.js
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
    classLevels: [
      {
        classLevel: {
          type: ObjectId,
          ref: "ClassLevel",
          required: true,
        },
        teachers: [
          {
            type: ObjectId,
            ref: "Teacher",
          },
        ],
      },
    ],
    createdBy: {
      type: ObjectId,
      ref: "Admin",
      required: true,
    },
  },
  { timestamps: true }
);

// Pre-save hook to validate academicYear and classLevels
subjectSchema.pre("save", async function (next) {
  try {
    const subject = this;

    // Validate academicYear
    const academicYear = await AcademicYear.findById(subject.academicYear);
    if (!academicYear) {
      throw new Error("Referenced AcademicYear does not exist");
    }

    // Validate classLevels and teachers
    if (subject.classLevels && subject.classLevels.length > 0) {
      for (const cl of subject.classLevels) {
        // Validate classLevel
        const classLevel = await mongoose.model("ClassLevel").findById(cl.classLevel);
        if (!classLevel) {
          throw new Error(`ClassLevel with ID ${cl.classLevel} does not exist`);
        }
        // Validate teachers if provided
        if (cl.teachers && cl.teachers.length > 0) {
          const validTeachers = await mongoose.model("Teacher").find({
            _id: { $in: cl.teachers },
          });
          if (validTeachers.length !== cl.teachers.length) {
            throw new Error(`One or more Teachers for ClassLevel ${cl.classLevel} are invalid`);
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