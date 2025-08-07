// models/Academic/period.model.js
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Schema;

const attendanceSchema = new mongoose.Schema(
  {
    studentId: { type: ObjectId, ref: 'Student', required: true },
    status: {
      type: String,
      enum: ['Present', 'Absent', 'Late', 'Excused'],
      required: true,
    },
    notes: { type: String, trim: true, maxlength: 200 },
  },
  { _id: false }
);

const periodSchema = new mongoose.Schema(
  {
    timetableId: { type: ObjectId, ref: 'Timetable', required: true, index: true },
    classLevelId: { type: ObjectId, ref: 'ClassLevel', required: true, index: true },
    subclassLetter: { type: String, required: true, match: /^[A-Z]$/, index: true },
    subjectId: { type: ObjectId, ref: 'Subject', required: true },
    date: { type: Date, required: true, index: true }, // Specific date of the period
    periodIndex: { type: Number, required: true, min: 0 }, // Period number (0-based)
    attendance: [attendanceSchema], // Attendance records for this period
    academicYear: { type: ObjectId, ref: 'AcademicYear', required: true, index: true },
  },
  { timestamps: true }
);

// Ensure unique period per timetable, date, and periodIndex
periodSchema.index({ timetableId: 1, date: 1, periodIndex: 1 }, { unique: true });

module.exports = mongoose.model('Period', periodSchema);