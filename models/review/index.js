const mongoose = require('mongoose');
const { ObjectId } = mongoose.Schema;

const reviewSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true }, // Custom review ID
    studentId: { type: String, required: true }, // Matches Student.studentId (e.g., "CLIA/PRI/01")
    teacherId: { type: ObjectId, ref: 'Teacher', required: true }, // New field for teacher
    classId: { type: String, required: true }, // e.g., "Primary_Primary6_A"
    rating: { type: Number, min: 1, max: 5, required: true },
    reviewText: { type: String },
    academicYearId: { type: ObjectId, ref: 'AcademicYear', required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Review', reviewSchema);