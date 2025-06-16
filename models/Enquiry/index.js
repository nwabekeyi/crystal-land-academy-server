const mongoose = require('mongoose');

const enquirySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },
  email: { // Added email field
    type: String,
    required: true,
    match: [/\S+@\S+\.\S+/, 'Please enter a valid email address'], // Validation for email format
  },
  message: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ['read', 'unread'], 
    default: 'unread',
  },
});

module.exports = mongoose.model('Enquiry', enquirySchema);