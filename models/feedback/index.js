const mongoose = require('mongoose');

const FeedbackSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['Student', 'Instructor', 'Worker'], // Restrict roles to specific values
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    comments: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true, // Automatically add createdAt and updatedAt fields
  }
);

module.exports = mongoose.model('Feedback', FeedbackSchema);