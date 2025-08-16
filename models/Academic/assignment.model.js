const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SubmissionSchema = new Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  cloudinaryLink: {
    type: String,
    required: false,
  },
  submissionDate: {
    type: Date,
    default: Date.now,
  },
  comments: {
    type: [String],
    default: [],
  },
  submitted: {
    type: Boolean,
    default: true,
  },
  viewed: {
    type: Boolean,
    default: false,
  },
  viewedAt: {
    type: Date,
    default: null,
  },
  deletionScheduledAt: {
    type: Date,
    default: null,
  },
  deleted: {
    type: Boolean,
    default: false,
  },
  deletedAt: {
    type: Date,
    default: null,
  },
});

const AssignmentSchema = new Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
    },
    session: {
      type: String,
      required: true,
    },
    term: {
      type: String,
      required: true,
    },
    classLevelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClassLevel',
      required: true,
    },
    subclass: {
      type: String,
      required: false,
    },
    title: {
      type: String,
      required: true,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
    },
    submissions: {
      type: [SubmissionSchema],
      default: [],
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      required: true,
    },
    deletionScheduledAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Automatically populate subjectId
AssignmentSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'subjectId',
    select: 'name description',
  });
  next();
});

// Index for faster queries
AssignmentSchema.index({ subjectId: 1 });

module.exports = mongoose.model('Assignment', AssignmentSchema);