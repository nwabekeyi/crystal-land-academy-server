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
  resources: [{
    type: String,
    trim: true,
  }],
  isCompleted: {
    type: Boolean,
    default: false,
  },
}, { _id: true });

const curriculumSchema = new mongoose.Schema({
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true,
  },
  classLevelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ClassLevel',
    required: true,
  },
  topics: [topicSchema],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: false,
  },
  completionRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
}, { timestamps: true });

module.exports = mongoose.model('Curriculum', curriculumSchema);