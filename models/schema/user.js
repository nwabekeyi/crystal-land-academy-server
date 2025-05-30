const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, auto: true }, // Use default MongoDB ObjectId for userId
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true }, // Store hashed passwords
  role: { type: String, required: true, default: "student" },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  idCardUrl: { type: String, required: false },
  createdAt: { type: Date, required: true, default: Date.now },
  updatedAt: { type: Date, required: true, default: Date.now },

  // Student-specific fields
  studentId: { type: String, required: true, unique: true },
  amountPaid: { type: Number, required: true, default: 0 },
  program: { type: String, required: true },
  instructors: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Instructor" }],
    required: true,
  },
  profilePictureUrl: { type: String, required: false },
});

// Virtual field to expose _id as userId
studentSchema.virtual("userId").get(function () {
  return this._id.toHexString();
});

// Ensure that virtual fields are included in JSON output
studentSchema.set("toJSON", {
  virtuals: true,
});

const Student = mongoose.model("Student", studentSchema);

module.exports = Student;
