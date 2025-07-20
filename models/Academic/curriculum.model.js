// models/Curriculum.js
const mongoose = require('mongoose');

const topicSchema = new mongoose.Schema({
  topic: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  duration: {
    type: String,
    required: true,
    trim: true,
  },
  resources: [{
    type: String,
    trim: true,
  }],
});

const curriculumSchema = new mongoose.Schema({
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true,
  },
  academicTermId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AcademicTerm',
    required: true,
  },
  classLevelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ClassLevel',
    required: true,
  },
  courseDuration: {
    type: String,
    required: true,
    trim: true,
  },
  topics: [topicSchema],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

module.exports = mongoose.model('Curriculum', curriculumSchema);