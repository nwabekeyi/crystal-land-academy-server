// services/timetable.service.js
const mongoose = require('mongoose');
const Timetable = require('../../models/Academic/timeTable.model');
const ClassLevel = require('../../models/Academic/class.model');
const Student = require('../../models/Students/students.model');
const AcademicYear = require('../../models/Academic/academicYear.model');
const responseStatus = require('../../handlers/responseStatus.handler');

/**
 * Get the current academic year
 */
const getCurrentAcademicYear = async () => {
  const currentYear = await AcademicYear.findOne({ isCurrent: true });
  if (!currentYear) {
    throw new Error('No current academic year found');
  }
  return currentYear._id;
};

/**
 * Create a timetable (admin only)
 */
exports.createTimetableService = async (data, res) => {
  try {
    const {
      classLevel,
      subclassLetter,
      subject,
      teacher,
      dayOfWeek,
      startTime,
      numberOfPeriods,
      location,
      academicYear,
    } = data;

    const currentAcademicYear = await getCurrentAcademicYear();
    if (academicYear && academicYear.toString() !== currentAcademicYear.toString()) {
      return responseStatus(res, 400, 'failed', 'Timetables can only be created for the current academic year');
    }

    if (!numberOfPeriods || numberOfPeriods < 1) {
      return responseStatus(res, 400, 'failed', 'numberOfPeriods must be a positive integer');
    }

    const timetable = await Timetable.create({
      classLevel,
      subclassLetter,
      subject,
      teacher,
      dayOfWeek,
      startTime,
      numberOfPeriods,
      location,
      academicYear: currentAcademicYear, // Force current academic year
    });

    return responseStatus(res, 201, 'success', timetable);
  } catch (error) {
    return responseStatus(res, 500, 'failed', `Error creating timetable: ${error.message}`);
  }
};

/**
 * Update a timetable (admin only)
 */
exports.updateTimetableService = async (timetableId, data, res) => {
  try {
    const {
      classLevel,
      subclassLetter,
      subject,
      teacher,
      dayOfWeek,
      startTime,
      numberOfPeriods,
      location,
      academicYear,
    } = data;

    const currentAcademicYear = await getCurrentAcademicYear();
    if (academicYear && academicYear.toString() !== currentAcademicYear.toString()) {
      return responseStatus(res, 400, 'failed', 'Timetables can only be updated for the current academic year');
    }

    if (numberOfPeriods !== undefined && numberOfPeriods < 1) {
      return responseStatus(res, 400, 'failed', 'numberOfPeriods must be a positive integer');
    }

    const updateData = {
      classLevel,
      subclassLetter,
      subject,
      teacher,
      dayOfWeek,
      startTime,
      numberOfPeriods,
      location,
      academicYear: currentAcademicYear, // Force current academic year
    };

    Object.keys(updateData).forEach((key) => updateData[key] === undefined && delete updateData[key]);

    const timetable = await Timetable.findByIdAndUpdate(
      timetableId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!timetable) {
      return responseStatus(res, 404, 'failed', 'Timetable not found');
    }

    return responseStatus(res, 200, 'success', timetable);
  } catch (error) {
    return responseStatus(res, 500, 'failed', `Error updating timetable: ${error.message}`);
  }
};

/**
 * Get timetables for a teacher
 */
exports.getTeacherTimetablesService = async (teacherId, res) => {
  try {
    const teacher = await mongoose.model('Teacher').findById(teacherId);
    if (!teacher) {
      return responseStatus(res, 404, 'failed', 'Teacher not found');
    }

    const currentAcademicYear = await getCurrentAcademicYear();

    const classLevels = await ClassLevel.find({
      $or: teacher.teachingAssignments.map((assignment) => ({
        section: assignment.section,
        name: assignment.className,
        'subclasses.letter': { $in: assignment.subclasses },
      })),
    });

    const classLevelIds = classLevels.map((cl) => cl._id);
    const timetables = await Timetable.find({
      classLevel: { $in: classLevelIds },
      subclassLetter: { $in: teacher.teachingAssignments.flatMap((a) => a.subclasses) },
      teacher: teacherId,
      academicYear: currentAcademicYear, // Filter by current academic year
    }).populate('classLevel subject teacher academicYear');

    return responseStatus(res, 200, 'success', timetables);
  } catch (error) {
    return responseStatus(res, 500, 'failed', `Error fetching timetables: ${error.message}`);
  }
};

/**
 * Get timetables for a student
 */
exports.getStudentTimetablesService = async (studentId, res) => {
  try {
    const student = await Student.findById(studentId);
    if (!student) {
      return responseStatus(res, 404, 'failed', 'Student not found');
    }

    const currentAcademicYear = await getCurrentAcademicYear();

    const timetables = await Timetable.find({
      classLevel: student.classLevelId,
      subclassLetter: student.currentClassLevel.subclass,
      academicYear: currentAcademicYear, // Filter by current academic year
    }).populate('classLevel subject teacher academicYear');

    return responseStatus(res, 200, 'success', timetables);
  } catch (error) {
    return responseStatus(res, 500, 'failed', `Error fetching timetables: ${error.message}`);
  }
};

/**
 * Mark attendance for a timetable period
 */
exports.markAttendanceService = async (timetableId, periodIndex, attendanceData, teacherId, res) => {
  try {
    const timetable = await Timetable.findById(timetableId);
    if (!timetable) {
      return responseStatus(res, 404, 'failed', 'Timetable not found');
    }

    if (timetable.teacher.toString() !== teacherId) {
      return responseStatus(res, 403, 'failed', 'Only the assigned teacher can mark attendance');
    }

    if (periodIndex < 0 || periodIndex >= timetable.numberOfPeriods) {
      return responseStatus(res, 400, 'failed', 'Invalid period index');
    }

    const classLevel = await ClassLevel.findById(timetable.classLevel);
    const subclass = classLevel.subclasses.find((sub) => sub.letter === timetable.subclassLetter);
    const validStudentIds = subclass.students.map((id) => id.toString());

    for (const record of attendanceData) {
      if (!validStudentIds.includes(record.studentId.toString())) {
        return responseStatus(res, 400, 'failed', `Student ${record.studentId} is not in subclass ${timetable.subclassLetter}`);
      }
      if (!['Present', 'Absent', 'Late', 'Excused'].includes(record.status)) {
        return responseStatus(res, 400, 'failed', `Invalid status for student ${record.studentId}`);
      }
    }

    timetable.periodAttendance[periodIndex].attendance = attendanceData.map((record) => ({
      studentId: record.studentId,
      status: record.status,
      notes: record.notes,
      date: new Date(),
    }));

    await timetable.save();

    for (const record of attendanceData) {
      const student = await Student.findById(record.studentId);
      if (student) {
        const allAttendance = await Timetable.aggregate([
          { $match: { classLevel: student.classLevelId, subclassLetter: student.currentClassLevel.subclass } },
          { $unwind: '$periodAttendance' },
          { $unwind: '$periodAttendance.attendance' },
          { $match: { 'periodAttendance.attendance.studentId': student._id } },
          { $project: { status: '$periodAttendance.attendance.status' } },
        ]);

        const totalRecords = allAttendance.length;
        const presentOrLate = allAttendance.filter((a) => ['Present', 'Late'].includes(a.status)).length;
        student.attendanceRate = totalRecords > 0 ? (presentOrLate / totalRecords) * 100 : 0;
        await student.save();
      }
    }

    return responseStatus(res, 200, 'success', 'Attendance marked successfully');
  } catch (error) {
    return responseStatus(res, 500, 'failed', `Error marking attendance: ${error.message}`);
  }
};