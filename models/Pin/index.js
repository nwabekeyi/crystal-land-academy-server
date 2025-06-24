const mongoose = require('mongoose');

const pinSchema = new mongoose.Schema({
  pin: {
    type: String,
    required: true,
    unique: true,
    match: /^\d{11}$/, // Ensures 11-digit numeric PIN
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  isUsed: {
    type: Boolean,
    default: false,
  },
  usedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Reference to User model (optional, for tracking who used the PIN)
    default: null,
  },
}, { timestamps: true });

module.exports = mongoose.model('Pin', pinSchema);