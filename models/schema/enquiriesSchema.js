const mongoose = require('mongoose');

const EnquirySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
    },
    phoneNumber: {
      type: String,
      required: [true, 'Phone number is required'],
      validate: {
        validator: function (v) {
          return /^(234|0)\d{10}$/.test(v); // Ensure phone number starts with 234 or 0 and has 11 digits
        },
        message: (props) => `${props.value} is not a valid phone number! Phone number should start with '234' or '0' and have 11 digits.`,
      },
    },
    read: {
      type: Boolean,
      default: false, // Default value for read status
    },
    createdAt: {
      type: Date,
      default: Date.now, // Automatically set to the current timestamp
    },
  },
  {
    timestamps: true, // Adds `createdAt` and `updatedAt` fields
  }
);

module.exports = mongoose.model('Enquiry', EnquirySchema);
