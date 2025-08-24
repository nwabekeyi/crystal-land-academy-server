// models/ClassLevel.js
const mongoose = require("mongoose");
const { Schema, Types } = mongoose;
const ObjectId = Types.ObjectId;

// Reusable fee schema per term
const feeSchema = new Schema(
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
    student: [
      {
        type: ObjectId,
      },
    ],
  },
  { _id: false }
);

// Subclass schema
const subclassSchema = new Schema(
  {
    letter: {
      type: String,
      required: true,
      match: /^[A-Z]$/,
    },
    subjects: [
      {
        subject: {
          type: ObjectId,
          required: true,
        },
        teachers: [
          {
            type: ObjectId,
          },
        ],
      },
    ],
    feesPerTerm: [feeSchema],
    students: [
      {
        id: {
          type: ObjectId,
          required: true,
        },
        amountPaid: {
          type: Number,
          default: 0,
        },
      },
    ],
  },
  { _id: false }
);

// Main ClassLevel schema
const ClassLevelSchema = new Schema(
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
    subjects: [
      {
        type: ObjectId,
      },
    ],
    subclasses: [subclassSchema],
    description: {
      type: String,
    },
    createdBy: {
      type: ObjectId,
      required: true,
    },
    academicYear: {
      type: ObjectId,
      required: true,
    },
    students: [
      {
        type: ObjectId,
      },
    ],
    teachers: [
      {
        teacherId: {
          type: ObjectId,
          required: true,
        },
        firstName: {
          type: String,
          required: true,
        },
        lastName: {
          type: String,
          required: true,
        },
      },
    ],
  },
  { timestamps: true }
);

// Pre-validation middleware
ClassLevelSchema.pre("validate", async function (next) {
  try {
    const primary = [
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
    const secondary = ["JSS 1", "JSS 2", "JSS 3", "SS 1", "SS 2", "SS 3"];

    // Validate section and name
    if (this.section === "Primary" && !primary.includes(this.name)) {
      return next(new Error(`Invalid class name for Primary: ${this.name}`));
    }
    if (this.section === "Secondary" && !secondary.includes(this.name)) {
      return next(new Error(`Invalid class name for Secondary: ${this.name}`));
    }

    // Validate academicYear
    const academicYear = await mongoose.model("AcademicYear").findById(this.academicYear);
    if (!academicYear) {
      return next(new Error("Referenced AcademicYear does not exist"));
    }

    // Validate subclass letters
    const subclassLetters = this.subclasses.map((sub) => sub.letter);
    if (new Set(subclassLetters).size !== subclassLetters.length) {
      return next(new Error("Subclass letters must be unique"));
    }

    // Validate subjects based on class level
    if (["SS 1", "SS 2", "SS 3"].includes(this.name)) {
      if (this.subjects && this.subjects.length > 0) {
        return next(new Error(`Subjects not allowed at class level for ${this.name}`));
      }
      for (const subclass of this.subclasses) {
        if (subclass.subjects && subclass.subjects.length > 0) {
          const subjectIds = subclass.subjects.map((s) => s.subject.toString());
          if (new Set(subjectIds).size !== subjectIds.length) {
            return next(new Error(`Duplicate subjects in subclass ${subclass.letter}`));
          }
          for (const subjectEntry of subclass.subjects) {
            const subjectExists = await mongoose.model("Subject").findById(subjectEntry.subject);
            if (!subjectExists) {
              return next(new Error(`Invalid subject ID ${subjectEntry.subject} in subclass ${subclass.letter}`));
            }
            if (subjectEntry.teachers && subjectEntry.teachers.length > 0) {
              const validTeachers = await mongoose
                .model("Teacher")
                .find({ _id: { $in: subjectEntry.teachers } });
              if (validTeachers.length !== subjectEntry.teachers.length) {
                return next(new Error(`Invalid teacher IDs in subclass ${subclass.letter} for subject ${subjectEntry.subject}`));
              }
            }
          }
        }
      }
    } else {
      if (this.subjects && this.subjects.length > 0) {
        const subjectIds = this.subjects.map(String);
        if (new Set(subjectIds).size !== subjectIds.length) {
          return next(new Error("Duplicate subjects in class level"));
        }
        for (const subjectId of this.subjects) {
          const subjectExists = await mongoose.model("Subject").findById(subjectId);
          if (!subjectExists) {
            return next(new Error(`Invalid subject ID ${subjectId}`));
          }
        }
      }
      // for (const subclass of this.subclasses) {
      //   if (subclass.subjects && subclass.subjects.length > 0) {
      //     return next(new Error(`Subjects not allowed in subclasses for ${this.name}`));
      //   }
      // }
    }
    // Validate students
    for (const subclass of this.subclasses) {
      if (subclass.students && subclass.students.length > 0) {
        const studentIds = subclass.students.map((s) => s.id.toString());
        if (new Set(studentIds).size !== studentIds.length) {
          return next(new Error(`Duplicate students in subclass ${subclass.letter}`));
        }
        for (const student of subclass.students) {
          const studentExists = await mongoose
            .model("Student")
            .exists({ _id: student.id });
          if (!studentExists) {
            return next(new Error(`Invalid student ID ${student.id} in subclass ${subclass.letter}`));
          }
        }
      }
    }

    // Validate fees
    for (const subclass of this.subclasses) {
      if (subclass.feesPerTerm && subclass.feesPerTerm.length > 0) {
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

    // Validate teachers
    if (this.teachers && this.teachers.length > 0) {
      const teacherIds = this.teachers.map((t) => t.teacherId.toString());
      if (new Set(teacherIds).size !== teacherIds.length) {
        return next(new Error("Duplicate teacher IDs in teachers array"));
      }
      const validTeachers = await mongoose
        .model("Teacher")
        .find({ _id: { $in: teacherIds } });
      if (validTeachers.length !== teacherIds.length) {
        return next(new Error("Invalid teacher IDs in teachers array"));
      }
      // Ensure firstName and lastName match the Teacher documents
      // for (const teacher of this.teachers) {
      //   const teacherDoc = validTeachers.find(t => t._id.toString() === teacher.teacherId.toString());
      //   if (!teacherDoc || teacher.firstName !== teacherDoc.firstName || teacher.lastName !== teacherDoc.lastName) {
      //     return next(new Error(`Teacher data mismatch for ID ${teacher.teacherId}`));
      //   }
      // }
    }

    // Validate students aggregation
    // if (this.students && this.students.length > 0) {
    //   const allSubclassStudents = this.subclasses
    //     .flatMap((sub) => sub.students || [])
    //     .map((s) => s.id.toString());
    //   const classLevelStudents = this.students.map(String);
    //   if (!classLevelStudents.every((id) => allSubclassStudents.includes(id))) {
    //     return next(new Error("ClassLevel.students contains students not in any subclass"));
    //   }
    // }

    next();
  } catch (error) {
    next(error);
  }
});

const ClassLevel = mongoose.model("ClassLevel", ClassLevelSchema);
module.exports = ClassLevel;

