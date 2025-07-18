// models/Academic/timetable.model.js
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
    date: { type: Date, default: Date.now },
    notes: { type: String, trim: true, maxlength: 200 },
  },
  { _id: false }
);

const periodAttendanceSchema = new mongoose.Schema(
  {
    periodIndex: { type: Number, required: true, min: 0 },
    attendance: [attendanceSchema],
  },
  { _id: false }
);

const timetableSchema = new mongoose.Schema(
  {
    classLevel: { type: ObjectId, ref: 'ClassLevel', required: true, index: true },
    subclassLetter: { type: String, required: true, match: /^[A-Z]$/ },
    subject: { type: ObjectId, ref: 'Subject', required: true },
    dayOfWeek: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      required: true,
    },
    startTime: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):([0-5]\d)$/,
    },
    endTime: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):([0-5]\d)$/,
    },
    numberOfPeriods: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer',
      },
    },
    periodAttendance: [periodAttendanceSchema],
    location: { type: String, required: true },
    academicYear: { type: ObjectId, ref: 'AcademicYear', required: true, index: true },
  },
  { timestamps: true }
);

// Calculate endTime based on startTime and numberOfPeriods
timetableSchema.pre('validate', function (next) {
  if (!this.startTime || !this.numberOfPeriods) {
    return next(new Error('startTime and numberOfPeriods are required'));
  }

  const [hours, minutes] = this.startTime.split(':').map(Number);
  const startDate = new Date(2000, 0, 1, hours, minutes);
  const endDate = new Date(startDate.getTime() + this.numberOfPeriods * 45 * 60 * 1000);
  const endHours = String(endDate.getHours()).padStart(2, '0');
  const endMinutes = String(endDate.getMinutes()).padStart(2, '0');
  this.endTime = `${endHours}:${endMinutes}`;

  // Initialize periodAttendance if not provided
  if (!this.periodAttendance || this.periodAttendance.length === 0) {
    this.periodAttendance = Array.from({ length: this.numberOfPeriods }, (_, i) => ({
      periodIndex: i,
      attendance: [],
    }));
  } else if (this.periodAttendance.length !== this.numberOfPeriods) {
    return next(new Error(`periodAttendance length must match numberOfPeriods (${this.numberOfPeriods})`));
  }

  next();
});

// Validate classLevel and subclassLetter
timetableSchema.pre('validate', async function (next) {
  try {
    const classLevel = await mongoose.model('ClassLevel').findById(this.classLevel);
    if (!classLevel) {
      return next(new Error(`Invalid ClassLevel ID: ${this.classLevel}`));
    }
    if (!classLevel.subclasses.some((sub) => sub.letter === this.subclassLetter)) {
      return next(new Error(`Invalid subclass letter ${this.subclassLetter} for ClassLevel ${this.classLevel}`));
    }
    const validStudentIds = classLevel.subclasses
      .find((sub) => sub.letter === this.subclassLetter)
      .students.map((id) => id.toString());
    for (const period of this.periodAttendance) {
      if (period.attendance && period.attendance.length > 0) {
        for (const record of period.attendance) {
          if (!validStudentIds.includes(record.studentId.toString())) {
            return next(
              new Error(`Student ${record.studentId} is not in subclass ${this.subclassLetter} of ClassLevel ${this.classLevel}`)
            );
          }
        }
      }
    }
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('Timetable', timetableSchema);