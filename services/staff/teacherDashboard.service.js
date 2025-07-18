const mongoose = require('mongoose');
const Teacher = require('../../models/Staff/teachers.model');
const Student = require('../../models/Students/students.model');
const ClassLevel = require('../../models/Academic/class.model');
const AcademicTerm = require('../../models/Academic/academicTerm.model');
const AcademicYear = require('../../models/Academic/academicYear.model');
const Timetable = require('../../models/Academic/timeTable.model');
const Subject = require('../../models/Academic/subject.model');

const getNextClass = async (teacherId) => {
  try {
    // Get current academic year
    const currentAcademicYear = await AcademicYear.findOne({ isCurrent: true });
    if (!currentAcademicYear) {
      return null;
    }

    const now = new Date();
    const currentDay = now.toLocaleString('en-US', { weekday: 'long' });
    const currentTime = now.toTimeString().slice(0, 5); // HH:mm format

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

    // Find the next timetable entry
    const timetable = await Timetable.findOne({
      $or: classSubclasses.map(({ classLevel, subclassLetter, subject }) => ({
        classLevel,
        subclassLetter,
        subject,
        academicYear: currentAcademicYear._id,
        dayOfWeek: currentDay,
        startTime: { $gt: currentTime },
      })),
    })
      .sort({ startTime: 1 }) // Get the earliest startTime after current time
      .populate('subject', 'name');

    if (!timetable) {
      return null;
    }

    return {
      subject: timetable.subject?.name || 'Unknown',
      date: now.toISOString().split('T')[0],
      time: timetable.startTime,
      location: timetable.location,
    };
  } catch (error) {
    console.error('Error in getNextClass:', error);
    return null;
  }
};

const getStudentPerformance = async (classLevels) => {
  // If no classLevels, return empty arrays
  if (!classLevels || !classLevels.length) {
    return { topStudents: [], leastActiveStudents: [] };
  }

  const students = [];
  for (const classLevel of classLevels) {
    for (const studentId of classLevel.students) {
      const student = await Student.findById(studentId);
      if (student) {
        students.push({
          ...student.toObject(),
          performanceScore: Math.floor(Math.random() * (100 - 60) + 60), // Mock data
          activityRate: Math.floor(Math.random() * (100 - 60) + 60), // Mock data
        });
      }
    }
  }

  // Sort for top and least active students
  const topStudents = students
    .sort((a, b) => b.performanceScore - a.performanceScore)
    .slice(0, 3)
    .map((s) => ({
      firstName: s.firstName,
      lastName: s.lastName,
      profilePicture: s.profilePictureUrl || '',
      performanceScore: s.performanceScore,
    }));

  const leastActiveStudents = students
    .sort((a, b) => a.activityRate - a.activityRate)
    .slice(0, 3)
    .map((s) => ({
      firstName: s.firstName,
      lastName: s.lastName,
      profilePicture: s.profilePictureUrl || '',
      activityRate: s.activityRate,
    }));

  return { topStudents, leastActiveStudents };
};

const getTeacherDashboardData = async (teacherId) => {
  try {
    // Fetch teacher details
    const teacher = await Teacher.findById(teacherId)
      .populate('subject')
      .populate('teachingAssignments');
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
    const now = new Date();
    const totalDays = (termEnd - termStart) / (1000 * 60 * 60 * 24);
    const daysPassed = (now - termStart) / (1000 * 60 * 60 * 24);
    const termProgress = Math.min(Math.round((daysPassed / totalDays) * 100), 100);

    // Fetch classes assigned to the teacher
    const classLevels = await ClassLevel.find({
      'teachers.teacherId': teacherId,
      academicYear: currentAcademicYear._id,
    }).populate('students');

    // Calculate student attendance (simplified: assume 90% if classes exist, 0% otherwise)
    const studentAttendance = classLevels.length ? 90 : 0; // Replace with actual logic if available

    // Calculate assignment submission rate (simplified: assume 85% if classes exist, 0% otherwise)
    const assignmentSubmissionRate = classLevels.length ? { totalAssignmentRate: 85 } : { totalAssignmentRate: 0 }; // Replace with actual logic

    // Find next class from timetable
    const nextClass = await getNextClass(teacherId);

    // Get top and least active students
    const { topStudents, leastActiveStudents } = await getStudentPerformance(classLevels);

    return {
      termProgress,
      studentAttendance,
      assignmentSubmissionRate,
      nextClass,
      topStudents,
      leastActiveStudents,
      loading: false,
      error: null,
    };
  } catch (error) {
    return { loading: false, error: error.message };
  }
};

module.exports = { getTeacherDashboardData };