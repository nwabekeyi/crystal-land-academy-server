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
    notes: { type: String, trim: true, maxlength: 200 },
  },
  { _id: false }
);

const periodSchema = new mongoose.Schema(
  {
    periodIndex: { type: Number, required: true, min: 0 }, // Period number (0-based)
    date: { type: Date, required: true, index: true }, // Date of attendance
    attendance: [attendanceSchema], // Attendance records for this period
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
    periods: [periodSchema], // Array of periods with attendance
    location: { type: String, required: true },
    academicYear: { type: ObjectId, ref: 'AcademicYear', required: true, index: true },
    teacher: { type: ObjectId, ref: 'Teacher' }, // Optional teacher reference
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

  // Initialize periods array if not already set
  if (!this.periods || this.periods.length === 0) {
    this.periods = Array.from({ length: this.numberOfPeriods }, (_, index) => ({
      periodIndex: index,
      date: new Date(0), // Placeholder date, will be updated when marking attendance
      attendance: [],
    }));
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
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('Timetable', timetableSchema);