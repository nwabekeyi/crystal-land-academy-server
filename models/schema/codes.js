const mongoose = require("mongoose");

const codeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true }, // Unique alphanumeric code
  generatedDate: { type: String, required: true }, // Date when the code was generated
  generatedTime: { type: String, required: true }, // Time when the code was generated
  used: { type: Boolean, required: true, default: false }, // If code has been used
  usedDate: { type: String, default: null }, // Date when the code was used
  usedTime: { type: String, default: null }, // Time when the code was used
  error: { type: String, default: null }, // Error message if the code is invalid or already used
  isAuthenticated: { type: Boolean, default: false }, // Indicates if a user was authenticated successfully with this code
  userId: { type: String, default: null }, // Optional field to associate the code with a specific user ID
  amountPaid: { type: Number, default: null }, // Amount paid by online students
  studentType: { type: String, enum: ["online", "offline"], required: true }, // Online or offline student type
});

const Code = mongoose.model("Code", codeSchema);

module.exports = Code;
