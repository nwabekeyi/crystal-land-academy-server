const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;
const Student = require('../../models/Students/students.model');
const AcademicYear = require('../../models/Academic/academicYear.model');
const AcademicTerm = require('../../models/Academic/academicTerm.model');
const ClassLevel = require('../../models/Academic/class.model');
const StudentPayment = require('../../models/Academic/schoolFees.model');
const ExamResult = require('../../models/Academic/exams.model');
const Subject = require('../../models/Academic/subjectName.model');
const Timetable = require('../../models/Academic/timeTable.model');

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
    const today = new Date('2025-07-23T14:39:00+01:00'); // Fixed to 02:39 PM WAT, July 23, 2025
    const yearStart = new Date(academicYear.fromYear);
    const yearEnd = new Date(academicYear.toYear);
    const totalDays = (yearEnd - yearStart) / (1000 * 60 * 60 * 24);
    const daysPassed = (today - yearStart) / (1000 * 60 * 60 * 24);
    const sessionProgress = totalDays > 0 && daysPassed >= 0 ? Math.min(Math.round((daysPassed / totalDays) * 100), 100) : 0;

    // Calculate term attendance using Timetable.periodAttendance
    const timetableRecords = await Timetable.find({
      classLevel: student.classLevelId,
      subclassLetter: student.currentClassLevel.subclass,
      academicYear: academicYear._id,
      'periodAttendance.attendance.date': { $gte: currentTerm.startDate, $lte: currentTerm.endDate },
    });

    const totalClasses = timetableRecords.reduce(
      (sum, tt) => sum + tt.periodAttendance.reduce((acc, period) => acc + period.attendance.length, 0),
      0
    );
    const attendedClasses = timetableRecords.reduce(
      (sum, tt) =>
        sum +
        tt.periodAttendance.reduce(
          (acc, period) =>
            acc +
            period.attendance.filter(
              (att) => att.studentId.toString() === studentId.toString() && att.status === 'Present'
            ).length,
          0
        ),
      0
    );
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

    // Define subjectPerformance, allResources, assignments to prevent ReferenceError
    const subjectPerformance = [];
    const allResources = [];
    const assignments = [];

    // Fetch next class
    let nextClass = null;
    const classLevel = await ClassLevel.findById(student.classLevelId);
    
    if (classLevel) {
      const now = new Date('2025-07-23T14:39:00+01:00'); // 02:39 PM WAT, July 23, 2025
      const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      const currentDayIndex = daysOfWeek.indexOf(now.toLocaleString('en-US', { weekday: 'long', timeZone: 'Africa/Lagos' }));
      const timetables = await Timetable.find({
        classLevel: student.classLevelId,
        subclassLetter: student.currentClassLevel.subclass,
        academicYear: academicYear._id,
        dayOfWeek: { $in: daysOfWeek },
      }).populate('subject');

      if (timetables.length > 0) {
        const timetable = await Promise.all(timetables.map(async (tt) => {
          let subjectName = tt.subject?.name || 'Unknown';
          if (tt.subject?.name && mongoose.isValidObjectId(tt.subject.name)) {
            const subjectDoc = await Subject.findById(tt.subject.name);
            subjectName = subjectDoc?.name || 'Unknown';
          }
          const nextDate = getNextOccurrence(tt.dayOfWeek, tt.startTime, now);
          return {
            subject: subjectName,
            startTime: tt.startTime,
            location: tt.location,
            dayOfWeek: tt.dayOfWeek,
            nextDate,
          };
        }));
        const upcomingClasses = timetable
          .filter((tt) => {
            const isSameDay = daysOfWeek.indexOf(tt.dayOfWeek) === currentDayIndex;
            return isSameDay ? tt.startTime > now.toTimeString().slice(0, 5) : tt.nextDate > now;
          })
          .sort((a, b) => a.nextDate - b.nextDate);
        if (upcomingClasses.length > 0) {
          nextClass = {
            subject: upcomingClasses[0].subject,
            date: upcomingClasses[0].nextDate.toISOString().split('T')[0],
            time: upcomingClasses[0].startTime,
            location: upcomingClasses[0].location,
          };
        }
      }
    }

    // Fetch missed classes
    const missedClasses = [];
    if (classLevel) {
      const weekStart = new Date('2025-07-21T00:00:00+01:00'); // Monday, July 21, 2025
      const timetables = await Timetable.find({
        classLevel: student.currentClassLevel.classLevelId,
        subclassLetter: student.currentClassLevel.subclass,
        academicYear: academicYear._id,
        dayOfWeek: { $in: ['Monday', 'Tuesday', 'Wednesday'] }, // Up to today (Wednesday)
      }).populate('subject');
      console.log('Missed classes timetables:', JSON.stringify(timetables, null, 2)); // Debug log
      for (const tt of timetables) {
        const classDate = getNextOccurrence(tt.dayOfWeek, tt.startTime, weekStart);
        if (classDate < today) {
          let subjectName = tt.subject?.name || 'Unknown';
          if (tt.subject?.name && mongoose.isValidObjectId(tt.subject.name)) {
            const subjectDoc = await Subject.findById(tt.subject.name);
            subjectName = subjectDoc?.name || 'Unknown';
          }
          const classEnd = new Date(classDate);
          const [endHours, endMinutes] = tt.endTime.split(':').map(Number);
          classEnd.setHours(endHours, endMinutes, 0, 0);
          for (const period of tt.periodAttendance) {
            const attendance = period.attendance.find(
              (att) => att.studentId.toString() === studentId.toString()
            );
            if (!attendance || attendance.status !== 'Present') {
              missedClasses.push({
                id: tt._id.toString(),
                subject: subjectName,
                date: classDate.toISOString().split('T')[0],
                time: tt.startTime,
                location: tt.location,
              });
            }
          }
        }
      }
    }

    // Fetch timetable with attendance
    const timetable = [];
    if (classLevel) {
      const weekStart = new Date('2025-07-21T00:00:00+01:00'); // Monday, July 21, 2025
      const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      const timetables = await Timetable.find({
        classLevel: student.currentClassLevel.classLevelId,
        subclassLetter: student.currentClassLevel.subclass,
        academicYear: academicYear._id,
        dayOfWeek: { $in: daysOfWeek },
      }).populate('subject');
      for (const tt of timetables) {
        const dayIndex = daysOfWeek.indexOf(tt.dayOfWeek);
        if (dayIndex === -1) continue;
        const classDate = new Date(weekStart);
        classDate.setDate(weekStart.getDate() + dayIndex);
        const classEnd = new Date(classDate);
        const [endHours, endMinutes] = tt.endTime.split(':').map(Number);
        classEnd.setHours(endHours, endMinutes, 0, 0);
        let subjectName = tt.subject?.name || 'Unknown';
        if (tt.subject?.name && mongoose.isValidObjectId(tt.subject.name)) {
          const subjectDoc = await Subject.findById(tt.subject.name);
          subjectName = subjectDoc?.name || 'Unknown';
        }
        const attendance = tt.periodAttendance
          .flatMap((period) =>
            period.attendance
              .filter((att) => att.studentId.toString() === studentId.toString() && att.status === 'Present')
              .map(() => studentId.toString())
          );
        timetable.push({
          date: classDate.toISOString().split('T')[0],
          done: classEnd < today,
          attendance,
        });
      }
      timetable.sort((a, b) => new Date(a.date) - new Date(b.date));
    }

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
        subjectPerformance,
        allResources,
        assignments,
        timetable,
    };
  } catch (error) {
    console.error('Error in getStudentDashboardData:', error);
    return { status: 'error', error: error.message || 'Failed to fetch student dashboard data' };
  }
};

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