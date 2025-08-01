const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;
const Student = require('../../models/Students/students.model');
const AcademicYear = require('../../models/Academic/academicYear.model');
const AcademicTerm = require('../../models/Academic/academicTerm.model');
const ClassLevel = require('../../models/Academic/class.model');
const StudentPayment = require('../../models/Academic/schoolFees.model');
const ExamResult = require('../../models/Academic/exams.model');
const Subject = require('../../models/Academic/subject.model');
const Assignment = require('../../models/Academic/assignment.model'); // Correct import

// Placeholder for Attendance model (check if defined elsewhere)
const Attendance = mongoose.models.Attendance || mongoose.model('Attendance', new mongoose.Schema({
  student: { type: ObjectId, ref: 'Student', required: true },
  timetable: { type: ObjectId, ref: 'Timetable', required: true },
  academicTerm: { type: ObjectId, ref: 'AcademicTerm', required: true },
  present: { type: Boolean, required: true },
  date: { type: Date, required: true },
}), 'attendances');

// Placeholder for Resource model (check if defined elsewhere)
const Resource = mongoose.models.Resource || mongoose.model('Resource', new mongoose.Schema({
  title: { type: String, required: true },
  url: { type: String, required: true },
  subject: { type: ObjectId, ref: 'Subject' },
  classLevel: { type: ObjectId, ref: 'ClassLevel' },
  academicYear: { type: ObjectId, ref: 'AcademicYear', required: true },
}), 'resources');

const getStudentDashboardData = async (studentId) => {
  try {
    // Validate student
    const student = await Student.findById(studentId);
    if (!student) {
      return { error: 'Student not found' };
    }
    if (student.isSuspended || student.isWithdrawn) {
      return { error: 'Student is suspended or withdrawn' };
    }

    // Find current academic year
    const academicYear = await AcademicYear.findOne({ isCurrent: true }).select('name fromYear toYear isCurrent');
    if (!academicYear) {
      return { error: 'No current academic year found' };
    }

    // Find current term
    const academicTerm = await AcademicTerm.findOne({
      academicYear: academicYear._id,
      'terms.isCurrent': true,
    });
    const currentTerm = academicTerm?.terms.find((term) => term.isCurrent);
    if (!currentTerm) {
      return { error: 'No current academic term found' };
    }

    // Calculate session progress
    const today = new Date();
    const yearStart = new Date(academicYear.fromYear);
    const yearEnd = new Date(academicYear.toYear);
    const totalDays = (yearEnd - yearStart) / (1000 * 60 * 60 * 24);
    const daysPassed = (today - yearStart) / (1000 * 60 * 60 * 24);
    const sessionProgress = totalDays > 0 ? Math.min(Math.round((daysPassed / totalDays) * 100), 100) : 0;

    // Calculate term attendance
    const attendanceRecords = await Attendance.find({
      student: studentId,
      academicTerm: academicTerm._id,
      date: { $gte: currentTerm.startDate, $lte: currentTerm.endDate },
    });
    const totalClasses = attendanceRecords.length;
    const attendedClasses = attendanceRecords.filter((record) => record.present).length;
    const termAttendance = totalClasses > 0 ? Math.round((attendedClasses / totalClasses) * 100) : 0;

    // Fetch fee status
    const payment = await StudentPayment.findOne({
      studentId,
      academicYear: academicYear._id,
    });
    let feeStatus = { percentagePaid: 0, totalOutstanding: 0 };
    if (payment) {
      const termPayment = payment.termPayments.find((tp) => tp.termName === currentTerm.name);
      const classLevel = await ClassLevel.findById(payment.classLevelId);
      const subclass = classLevel?.subclasses.find((sc) => sc.letter === termPayment?.subclassLetter);
      const termFee = subclass?.feesPerTerm.find((f) => f.termName === currentTerm.name)?.amount || 0;
      const amountPaid = termPayment ? termPayment.totalPaidInTerm : 0;
      feeStatus = {
        percentagePaid: termFee > 0 ? Math.round((amountPaid / termFee) * 100) : 0,
        totalOutstanding: Math.max(termFee - amountPaid, 0),
      };
    }

    // Fetch next class
    const classLevel = await ClassLevel.findById(student.currentClassLevel.classLevelId);
    let nextClass = null;
    if (classLevel) {
      const subclass = classLevel.subclasses.find((sc) => sc.letter === student.currentClassLevel.subclass);
      if (subclass && subclass.timetables.length > 0) {
        const now = new Date();
        const currentDay = now.toLocaleString('en-US', { weekday: 'long', timeZone: 'Africa/Lagos' });
        const currentTime = now.toTimeString().slice(0, 5); // HH:mm in WAT
        const timetable = subclass.timetables
          .map((tt) => ({
            ...tt,
            nextDate: getNextOccurrence(tt.dayOfWeek, tt.startTime, now),
          }))
          .filter((tt) => tt.nextDate > now)
          .sort((a, b) => a.nextDate - b.nextDate)[0];
        if (timetable) {
          const subject = await Subject.findById(timetable.subject);
          nextClass = {
            subject: subject?.name || 'Unknown',
            date: timetable.nextDate.toISOString().split('T')[0],
            time: timetable.startTime,
            location: timetable.location,
          };
        }
      }
    }

    // Fetch missed classes
    const missedClasses = await Attendance.find({
      student: studentId,
      academicTerm: academicTerm._id,
      present: false,
      date: { $gte: currentTerm.startDate, $lte: today },
    })
      .populate({
        path: 'timetable',
        populate: { path: 'subject' },
      })
      .then((attendances) =>
        attendances
          .filter((att) => att.timetable && att.timetable.subject)
          .map((att) => ({
            id: att.timetable._id.toString(),
            subject: att.timetable.subject.name,
            date: att.date.toISOString().split('T')[0],
            time: att.timetable.startTime,
            location: att.timetable.location,
          }))
      );

    // Fetch subject performance
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const examResults = await ExamResult.find({
      student: studentId,
      academicTerm: academicTerm._id,
      isPublished: true,
    }).populate('subject');
    const subjectPerformance = [];
    const subjects = [...new Set(examResults.map((er) => er.subject._id.toString()))];
    subjects.forEach((subjectId, index) => {
      const subject = examResults.find((er) => er.subject._id.toString() === subjectId)?.subject;
      if (!subject) return;
      const scores = examResults
        .filter((er) => er.subject._id.toString() === subjectId)
        .reduce((acc, er) => {
          const monthIndex = new Date(er.createdAt).getMonth();
          if (monthIndex >= 0 && monthIndex <= new Date().getMonth()) {
            acc[monthIndex] = acc[monthIndex] || { total: 0, count: 0 };
            acc[monthIndex].total += er.score;
            acc[monthIndex].count += 1;
          }
          return acc;
        }, {});
      const data = months.map((month, i) => ({
        x: month,
        y: scores[i] ? Math.round(scores[i].total / scores[i].count) : 0,
      }));
      subjectPerformance.push({
        id: subject.name,
        color: ['#1e88e5', '#43a047', '#d81b60', '#8e24aa', '#ff8f00'][index % 5],
        data,
      });
    });

    // Fetch resources
    const allResources = await Resource.find({
      classLevel: student.currentClassLevel.classLevelId,
      academicYear: academicYear._id,
    }).select('title url');

    // Fetch assignments
    const assignments = await Assignment.find({
      classId: student.currentClassLevel.classLevelId, // Adjusted to match schema
      term: currentTerm.name, // Adjusted to match schema
    }).select('id title dueDate description submissions');

    // Fetch timetable with attendance
    const timetable = await Attendance.find({
      student: studentId,
      academicTerm: academicTerm._id,
      date: { $gte: currentTerm.startDate, $lte: today },
    })
      .populate({
        path: 'timetable',
        populate: { path: 'subject' },
      })
      .then((attendances) =>
        attendances
          .filter((att) => att.timetable && att.timetable.subject)
          .map((att) => ({
            date: att.date.toISOString().split('T')[0],
            done: true, // Past classes are done
            attendance: att.present ? [studentId] : [],
          }))
      );

    return {
      currentAcademicYear: {
        _id: academicYear._id,
        name: academicYear.name,
        fromYear: academicYear.fromYear,
        toYear: academicYear.toYear,
        isCurrent: academicYear.isCurrent,
      },
      sessionProgress,
      termAttendance,
      feeStatus,
      nextClass,
      missedClasses,
      subjectPerformance: subjectPerformance.length > 0 ? subjectPerformance : null,
      allResources,
      assignments,
      timetable,
    };
  } catch (error) {
    console.error('Error in getStudentDashboardData:', error);
    return { error: error.message || 'Failed to fetch student dashboard data' };
  }
};

// Helper to calculate the next occurrence of a timetable slot
function getNextOccurrence(dayOfWeek, startTime, now) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const currentDayIndex = days.indexOf(now.toLocaleString('en-US', { weekday: 'long', timeZone: 'Africa/Lagos' }));
  const targetDayIndex = days.indexOf(dayOfWeek);
  let daysUntilNext = (targetDayIndex - currentDayIndex + 7) % 7;
  if (daysUntilNext === 0 && startTime <= now.toTimeString().slice(0, 5)) {
    daysUntilNext = 7; // If today’s slot has passed, schedule for next week
  }
  const nextDate = new Date(now);
  nextDate.setDate(now.getDate() + daysUntilNext);
  const [hours, minutes] = startTime.split(':').map(Number);
  nextDate.setHours(hours, minutes, 0, 0);
  return nextDate;
}

module.exports = { getStudentDashboardData };