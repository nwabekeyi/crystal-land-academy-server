const mongoose = require('mongoose');

const FeedbackSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['student', 'instructor', 'worker'],
    required: true,
  },
  date: {
    type: String, // ISO string format
    required: true,
  },
  comments: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model('Feedback', FeedbackSchema);
