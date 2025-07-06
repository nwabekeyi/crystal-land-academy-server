// models/Academic/classLevel.model.js
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Schema;

// Reusable fee schema per term
const feeSchema = new mongoose.Schema(
  {
    termName: {
      type: String,
      enum: ['1st Term', '2nd Term', '3rd Term'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    description: {
      type: String,
      default: '',
    },
  },
  { _id: false }
);

// Subclass schema (e.g., Primary 2A, SS1A)
const subclassSchema = new mongoose.Schema(
  {
    letter: {
      type: String,
      required: true,
      match: /^[A-Z]$/, // Single capital letter (A, B, etc.)
    },
    subjects: [
      {
        type: ObjectId,
        ref: 'Subject',
      },
    ], // Subjects allowed for all classes
    feesPerTerm: [feeSchema], // Fees for each term in this subclass
    students: [
      {
        type: ObjectId,
      },
    ], // Students in this specific subclass
  },
  { _id: false }
);

// Main ClassLevel schema
const ClassLevelSchema = new mongoose.Schema(
  {
    section: {
      type: String,
      required: true,
      enum: ['Primary', 'Secondary'],
    },
    name: {
      type: String,
      required: true,
      index: true,
      enum: [
        'Kindergarten', 'Reception', 'Nursery 1', 'Nursery 2', 'Primary 1',
        'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6',
        'JSS 1', 'JSS 2', 'JSS 3', 'SS 1', 'SS 2', 'SS 3',
      ],
    },
    subclasses: [subclassSchema],
    description: {
      type: String,
    },
    createdBy: {
      type: ObjectId,
      ref: 'Admin',
      required: true,
    },
    academicYear: {
      type: ObjectId,
      ref: 'AcademicYear',
      required: true,
    },
    students: [
      {
        type: ObjectId,
      },
    ], // Optional: Keep for backward compatibility or aggregate all subclass students
    teachers: [
      {
        teacherId: {
          type: ObjectId,
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
      },
    ],
  },
  { timestamps: true }
);

// Pre-validation middleware to ensure consistency
ClassLevelSchema.pre('validate', async function (next) {
  try {
    const primary = [
      'Kindergarten', 'Reception', 'Nursery 1', 'Nursery 2',
      'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6',
    ];
    const secondary = ['JSS 1', 'JSS 2', 'JSS 3', 'SS 1', 'SS 2', 'SS 3'];

    // Validate section and name
    if (this.section === 'Primary' && !primary.includes(this.name)) {
      return next(new Error(`Invalid class name for Primary: ${this.name}`));
    }
    if (this.section === 'Secondary' && !secondary.includes(this.name)) {
      return next(new Error(`Invalid class name for Secondary: ${this.name}`));
    }

    // Ensure unique subclass letters
    const subclassLetters = this.subclasses.map((sub) => sub.letter);
    if (new Set(subclassLetters).size !== subclassLetters.length) {
      return next(new Error('Subclass letters must be unique'));
    }

    // Validate subjects and students for all subclasses
    for (const subclass of this.subclasses) {
      if (Array.isArray(subclass.subjects)) {
        const subjectIds = subclass.subjects.map(String);
        if (new Set(subjectIds).size !== subjectIds.length) {
          return next(new Error(`Duplicate subjects in subclass ${subclass.letter}`));
        }

        for (const subjectId of subclass.subjects) {
          const subjectExists = await mongoose.model('Subject').exists({ _id: subjectId });
          if (!subjectExists) {
            return next(new Error(`Invalid subject ID ${subjectId} in subclass ${subclass.letter}`));
          }
        }
      }

      if (Array.isArray(subclass.students)) {
        const studentIds = subclass.students.map(String);
        if (new Set(studentIds).size !== studentIds.length) {
          return next(new Error(`Duplicate students in subclass ${subclass.letter}`));
        }

        for (const studentId of subclass.students) {
          const studentExists = await mongoose.model('Student').exists({ _id: studentId });
          if (!studentExists) {
            return next(new Error(`Invalid student ID ${studentId} in subclass ${subclass.letter}`));
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

    // Ensure unique teacher IDs
    if (Array.isArray(this.teachers)) {
      const teacherIds = this.teachers.map((t) => t.teacherId.toString());
      if (new Set(teacherIds).size !== teacherIds.length) {
        return next(new Error('Duplicate teacher IDs in teachers array'));
      }
    }

    // Optional: Validate that ClassLevel.students matches all subclass students
    if (Array.isArray(this.students)) {
      const allSubclassStudents = this.subclasses.flatMap((sub) => sub.students || []).map(String);
      const classLevelStudents = this.students.map(String);
      if (!allSubclassStudents.every((id) => classLevelStudents.includes(id))) {
        return next(new Error('All subclass students must be included in ClassLevel.students'));
      }
      if (!classLevelStudents.every((id) => allSubclassStudents.includes(id))) {
        return next(new Error('ClassLevel.students contains students not in any subclass'));
      }
    }

    next();
  } catch (error) {
    next(error);
  }
});

const ClassLevel = mongoose.model('ClassLevel', ClassLevelSchema);
module.exports = ClassLevel;