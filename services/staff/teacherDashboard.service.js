const mongoose = require('mongoose');
const Teacher = require('../../models/Staff/teachers.model');
const Student = require('../../models/Students/students.model');
const ClassLevel = require('../../models/Academic/class.model');
const AcademicTerm = require('../../models/Academic/academicTerm.model');
const AcademicYear = require('../../models/Academic/academicYear.model');
const Timetable = require('../../models/Academic/timeTable.model');
const Subject = require('../../models/Academic/subject.model');
const Assignment = require('../../models/Academic/assignment.model');

const getNextClass = async (teacherId) => {
  try {
    // Get current academic year
    const currentAcademicYear = await AcademicYear.findOne({ isCurrent: true });
    if (!currentAcademicYear) {
      return null;
    }

    const now = new Date('2025-08-09T19:09:00.000+01:00'); // Current date and time (WAT)
    const currentDay = now.toLocaleString('en-US', { weekday: 'long' });
    const currentTime = now.toTimeString().slice(0, 5); // HH:mm format
    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

    // Find subjects where the teacher is assigned
    const subjects = await Subject.find({
      'classLevelSubclasses.teachers': teacherId,
    }).select('_id name classLevelSubclasses');

    if (!subjects || subjects.length === 0) {
      return null;
    }

    // Collect classLevel and subclassLetter combinations for the teacher
    const classSubclasses = [];
    subjects.forEach((subject) => {
      subject.classLevelSubclasses.forEach((cls) => {
        if (cls.teachers.some((id) => id.toString() === teacherId.toString())) {
          classSubclasses.push({
            classLevel: cls.classLevel,
            subclassLetter: cls.subclassLetter,
            subject: subject._id,
          });
        }
      });
    });

    if (classSubclasses.length === 0) {
      return null;
    }

    // Find all timetable entries for the teacher's subjects
    const timetables = await Timetable.find({
      $or: classSubclasses.map(({ classLevel, subclassLetter, subject }) => ({
        classLevel,
        subclassLetter,
        subject,
        academicYear: currentAcademicYear._id,
      })),
    }).populate('subject', 'name');

    if (!timetables || timetables.length === 0) {
      return null;
    }

    // Calculate the next class
    let earliestClass = null;
    let minTimeDiff = Infinity;

    for (const timetable of timetables) {
      const dayIndex = daysOfWeek.indexOf(timetable.dayOfWeek);
      if (dayIndex === -1) continue;

      // Calculate the next occurrence of this day
      const currentDayIndex = daysOfWeek.indexOf(currentDay);
      let daysUntilNext = (dayIndex - currentDayIndex + 7) % 7;
      if (daysUntilNext === 0 && timetable.startTime <= currentTime) {
        daysUntilNext = 7; // If today and time has passed, look for next week
      }

      const nextDate = new Date(now);
      nextDate.setDate(now.getDate() + daysUntilNext);
      nextDate.setHours(
        parseInt(timetable.startTime.split(':')[0]),
        parseInt(timetable.startTime.split(':')[1]),
        0,
        0
      );

      const timeDiff = nextDate - now;
      if (timeDiff > 0 && timeDiff < minTimeDiff) {
        minTimeDiff = timeDiff;
        earliestClass = {
          subject: timetable.subject?.name || 'Unknown',
          date: nextDate.toISOString().split('T')[0],
          time: timetable.startTime,
          location: timetable.location,
        };
      }
    }

    return earliestClass;
  } catch (error) {
    console.error('Error in getNextClass:', error);
    return null;
  }
};

const getStudentPerformance = async (classLevels, teacherId) => {
  try {
    if (!classLevels || !classLevels.length) {
      return { topStudents: [], leastActiveStudents: [] };
    }

    // Get all students in the teacher's classes
    const studentIds = classLevels.flatMap((cls) =>
      cls.subclasses.flatMap((sub) => sub.students.map((s) => s.id))
    );
    const students = await Student.find({ _id: { $in: studentIds } });

    // Get timetable entries for the teacher's subjects
    const subjects = await Subject.find({
      'classLevelSubclasses.teachers': teacherId,
    }).select('_id');
    const subjectIds = subjects.map((s) => s._id);
    const timetables = await Timetable.find({
      subject: { $in: subjectIds },
      classLevel: { $in: classLevels.map((cls) => cls._id) },
    });

    // Calculate attendance rate for each student
    const studentPerformance = [];
    for (const student of students) {
      let totalPresent = 0;
      let totalPeriods = 0;

      for (const timetable of timetables) {
        for (const period of timetable.periods) {
          if (period.date.getTime() === 0) continue; // Skip placeholder periods
          totalPeriods++;
          const attendance = period.attendance.find(
            (a) => a.studentId.toString() === student._id.toString()
          );
          if (attendance && attendance.status === 'Present') {
            totalPresent++;
          }
        }
      }

      const attendanceRate = totalPeriods > 0 ? (totalPresent / totalPeriods) * 100 : 0;
      studentPerformance.push({
        firstName: student.firstName,
        lastName: student.lastName,
        profilePicture: student.profilePictureUrl || '',
        attendanceRate,
      });
    }

    // Sort for top and least active students
    const topStudents = studentPerformance
      .sort((a, b) => b.attendanceRate - a.attendanceRate)
      .slice(0, 3);
    const leastActiveStudents = studentPerformance
      .sort((a, b) => a.attendanceRate - b.attendanceRate)
      .slice(0, 3);

    return { topStudents, leastActiveStudents };
  } catch (error) {
    console.error('Error in getStudentPerformance:', error);
    return { topStudents: [], leastActiveStudents: [] };
  }
};

const getTeacherDashboardData = async (teacherId) => {
  try {
    // Fetch teacher details
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) throw new Error('Teacher not found');

    // Get current academic year and term
    const currentAcademicYear = await AcademicYear.findOne({ isCurrent: true });
    if (!currentAcademicYear) throw new Error('No current academic year found');

    const currentTerm = await AcademicTerm.findOne({
      academicYear: currentAcademicYear._id,
      'terms.isCurrent': true,
    });
    if (!currentTerm) throw new Error('No current term found');

    const currentSubTerm = currentTerm.terms.find((term) => term.isCurrent);
    if (!currentSubTerm) throw new Error('No current sub-term found');

    // Calculate term progress
    const termStart = new Date(currentSubTerm.startDate);
    const termEnd = new Date(currentSubTerm.endDate);
    const now = new Date('2025-08-09T19:09:00.000+01:00'); // Current date and time (WAT)
    const totalDays = (termEnd - termStart) / (1000 * 60 * 60 * 24);
    const daysPassed = (now - termStart) / (1000 * 60 * 60 * 24);
    const termProgress = Math.min(Math.round((daysPassed / totalDays) * 100), 100);

    // Fetch classes assigned to the teacher
    const classLevels = await ClassLevel.find({
      'teachers.teacherId': teacherId,
      academicYear: currentAcademicYear._id,
    }).populate('students');

    // Calculate student attendance rate
    let studentAttendance = 0;
    if (classLevels.length > 0) {
      const subjects = await Subject.find({
        'classLevelSubclasses.teachers': teacherId,
      }).select('_id');
      const subjectIds = subjects.map((s) => s._id);
      const timetables = await Timetable.find({
        subject: { $in: subjectIds },
        classLevel: { $in: classLevels.map((cls) => cls._id) },
        academicYear: currentAcademicYear._id,
      });

      let totalPresent = 0;
      let totalPossibleAttendance = 0;

      const studentIds = classLevels.flatMap((cls) =>
        cls.subclasses.flatMap((sub) => sub.students.map((s) => s.id))
      );
      const uniqueStudentIds = [...new Set(studentIds.map(String))];

      for (const timetable of timetables) {
        for (const period of timetable.periods) {
          if (period.date.getTime() === 0) continue; // Skip placeholder periods
          totalPossibleAttendance += uniqueStudentIds.length;
          period.attendance.forEach((att) => {
            if (att.status === 'Present') {
              totalPresent++;
            }
          });
        }
      }

      studentAttendance = totalPossibleAttendance > 0 ? (totalPresent / totalPossibleAttendance) * 100 : 0;
    }

    // Calculate assignment submission rate
    let assignmentSubmissionRate = { totalAssignmentRate: 0 };
    if (classLevels.length > 0) {
      const assignments = await Assignment.find({ teacherId });
      const studentIds = classLevels.flatMap((cls) =>
        cls.subclasses.flatMap((sub) => sub.students.map((s) => s.id))
      );
      const uniqueStudentIds = [...new Set(studentIds.map(String))];

      let totalSubmissions = 0;
      let totalPossibleSubmissions = assignments.length * uniqueStudentIds.length;

      assignments.forEach((assignment) => {
        totalSubmissions += assignment.submissions.filter((s) => s.submitted).length;
      });

      assignmentSubmissionRate.totalAssignmentRate = totalPossibleSubmissions > 0
        ? (totalSubmissions / totalPossibleSubmissions) * 100
        : 0;
    }

    // Find next class
    const nextClass = await getNextClass(teacherId);

    // Get top and least active students
    const { topStudents, leastActiveStudents } = await getStudentPerformance(classLevels, teacherId);

    return {
      termProgress,
      studentAttendance: Math.round(studentAttendance),
      assignmentSubmissionRate,
      nextClass,
      topStudents,
      leastActiveStudents,
      loading: false,
      error: null,
    };
  } catch (error) {
    console.error('Error in getTeacherDashboardData:', error);
    return { loading: false, error: error.message };
  }
};

module.exports = { getTeacherDashboardData };