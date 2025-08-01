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
      required: false, // Optional for subclass filtering
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
    submissions: {
      type: [SubmissionSchema],
      default: [],
    },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true }, 
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

module.exports = mongoose.model('Assignment', AssignmentSchema);