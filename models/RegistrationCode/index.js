const mongoose = require('mongoose');

const registrationCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  generatedDate: {
    type: String,
    required: true,
  },
  generatedTime: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  used: {
    type: Boolean,
    default: false,
  },
  usedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student', // References the Student model/collection
    default: null,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('RegistrationCode', registrationCodeSchema);