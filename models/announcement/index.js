const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  message: {
    type: String,
    required: true,
    trim: true,
  },
  dueDate: {
    type: Date,
    required: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'createdByModel', // Dynamic reference
  },
  createdByModel: {
    type: String,
    required: true,
    enum: ['Admin', 'Teacher'], // Model names (case-sensitive)
  },
  type: {
    type: String,
    enum: ['general', 'class'],
    default: 'general',
    required: true,
  },
  targets: [
    {
      classLevel: {
        type: mongoose.Schema.Types.ObjectId,
      },
      subclass: {
        type: String,
        match: /^[A-Z]$/,
      },
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update `updatedAt` on save
announcementSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Announcement', announcementSchema);
