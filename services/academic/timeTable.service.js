const Timetable = require('../../models/Academic/timeTable.model');
const ClassLevel = require('../../models/Academic/class.model');
const Subject = require('../../models/Academic/subject.model');
const Student = require('../../models/Students/students.model');
const AcademicYear = require('../../models/Academic/academicYear.model');
const Teacher = require('../../models/Staff/teachers.model');
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
 * Calculate end time based on start time and number of periods (assuming 45 minutes per period)
 */
const calculateEndTime = (startTime, numberOfPeriods) => {
  const [hours, minutes] = startTime.split(':').map(Number);
  const totalMinutes = (hours * 60 + minutes) + numberOfPeriods * 45;
  const endHours = Math.floor(totalMinutes / 60);
  const endMinutes = totalMinutes % 60;
  return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
};

/**
 * Check if two time ranges overlap
 */
const isTimeOverlap = (startTime1, numberOfPeriods1, startTime2, numberOfPeriods2) => {
  const endTime1 = calculateEndTime(startTime1, numberOfPeriods1);
  const endTime2 = calculateEndTime(startTime2, numberOfPeriods2);

  const [startH1, startM1] = startTime1.split(':').map(Number);
  const [endH1, endM1] = endTime1.split(':').map(Number);
  const [startH2, startM2] = startTime2.split(':').map(Number);
  const [endH2, endM2] = endTime2.split(':').map(Number);

  const startMinutes1 = startH1 * 60 + startM1;
  const endMinutes1 = endH1 * 60 + endM1;
  const startMinutes2 = startH2 * 60 + startM2;
  const endMinutes2 = endH2 * 60 + endM2;

  return startMinutes1 <= endMinutes2 && startMinutes2 <= endMinutes1;
};

/**
 * Get timetables by classLevel and subclassLetter for the current academic year
 */
const getTimetablesService = async (classLevel, subclassLetter, subject, res) => {
  try {
    if (!classLevel || !subclassLetter) {
      return responseStatus(res, 400, 'failed', 'classLevel and subclassLetter are required');
    }

    const currentAcademicYear = await getCurrentAcademicYear();

    const classLevelDoc = await ClassLevel.findById(classLevel).select('name section subclasses');
    if (!classLevelDoc) {
      return responseStatus(res, 404, 'failed', 'ClassLevel not found');
    }

    const subclassExists = classLevelDoc.subclasses.some((sub) => sub.letter === subclassLetter);
    if (!subclassExists) {
      return responseStatus(res, 400, 'failed', `Subclass ${subclassLetter} not found for ClassLevel ${classLevel}`);
    }

    // Fetch valid subject IDs for the classLevel and subclassLetter
    const subjectDocs = await Subject.find({
      'classLevelSubclasses.classLevel': classLevel,
      'classLevelSubclasses.subclassLetter': subclassLetter,
    }).select('_id name classLevelSubclasses teachers');

    const validSubjectIds = subjectDocs.map((doc) => doc._id.toString());

    // If subject is provided, validate it
    if (subject) {
      if (!validSubjectIds.includes(subject.toString())) {
        const subjectDoc = await Subject.findById(subject);
        return responseStatus(res, 400, 'failed', `Subject ${subjectDoc?.name || subject} is not assigned to ClassLevel ${classLevel} subclass ${subclassLetter}`);
      }
    }

    // Map subjects to their assigned teacher IDs
    const teacherMap = {};
    subjectDocs.forEach((subjectDoc) => {
      const assignment = subjectDoc.classLevelSubclasses.find(
        (cls) => cls.classLevel.toString() === classLevel.toString() && cls.subclassLetter === subclassLetter
      );
      if (assignment && assignment.teachers.length > 0) {
        teacherMap[subjectDoc._id.toString()] = assignment.teachers[0]; // Use the first teacher
      }
    });

    // Fetch teacher details
    const teacherIds = Object.values(teacherMap);
    const teachers = await Teacher.find({ _id: { $in: teacherIds } }).select('_id firstName lastName');

    // Create a map of teacher IDs to their details
    const teacherDetailsMap = {};
    teachers.forEach((teacher) => {
      teacherDetailsMap[teacher._id.toString()] = {
        _id: teacher._id,
        firstName: teacher.firstName,
        lastName: teacher.lastName,
      };
    });

    // Fetch timetables
    const query = {
      classLevel,
      subclassLetter,
      academicYear: currentAcademicYear,
      subject: { $in: validSubjectIds }, // Restrict to valid subjects
    };

    if (subject) {
      query.subject = subject;
    }

    let timetables = await Timetable.find(query)
      .populate('classLevel', 'name section') // Include section
      .populate('subject', 'name')
      .populate('academicYear', 'name');

    // Add teacher details to each timetable entry
    timetables = timetables.map((timetable) => {
      const timetableObj = timetable.toObject();
      const subjectId = timetable.subject?._id.toString();
      const teacherId = teacherMap[subjectId];
      timetableObj.teacher = teacherId ? teacherDetailsMap[teacherId.toString()] || { _id: teacherId, firstName: 'N/A', lastName: '' } : null;
      return timetableObj;
    });

    return responseStatus(res, 200, 'success', timetables);
  } catch (error) {
    return responseStatus(res, 500, 'failed', `Error fetching timetables: ${error.message}`);
  }
};

/**
 * Get timetable for a student based on their classLevel and subclassLetter
 */
const getStudentTimetableService = async (studentId, res) => {
  try {
    const student = await Student.findById(studentId).select('classLevelId currentClassLevel.subclass');
    if (!student) {
      return responseStatus(res, 404, 'failed', 'Student not found');
    }

    const { classLevelId, currentClassLevel } = student;
    if (!classLevelId || !currentClassLevel?.subclass) {
      return responseStatus(res, 400, 'failed', 'Student is not assigned to a class or subclass');
    }

    return await getTimetablesService(classLevelId, currentClassLevel.subclass, null, res);
  } catch (error) {
    return responseStatus(res, 500, 'failed', `Error fetching student timetable: ${error.message}`);
  }
};

/**
 * Get timetable for a teacher based on their assigned subjects
 */
const getTeacherTimetableService = async (teacherId, res) => {
  try {
    const subjects = await Subject.find({
      'classLevelSubclasses.teachers': teacherId,
    }).select('_id classLevelSubclasses name');

    if (!subjects || subjects.length === 0) {
      return responseStatus(res, 404, 'failed', 'No subjects assigned to this teacher');
    }

    const currentAcademicYear = await getCurrentAcademicYear();

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
      return responseStatus(res, 404, 'failed', 'No class or subclass assignments found for this teacher');
    }

    const teacher = await Teacher.findById(teacherId).select('_id firstName lastName');
    if (!teacher) {
      return responseStatus(res, 404, 'failed', 'Teacher not found');
    }

    const validSubjectIds = subjects.map((s) => s._id);

    let timetables = await Timetable.find({
      $or: classSubclasses.map(({ classLevel, subclassLetter, subject }) => ({
        classLevel,
        subclassLetter,
        subject,
        academicYear: currentAcademicYear,
      })),
      subject: { $in: validSubjectIds }, // Restrict to valid subjects
    })
      .populate('classLevel', 'name section') // Include section
      .populate('subject', 'name')
      .populate('academicYear', 'name');

    timetables = timetables.map((timetable) => {
      const timetableObj = timetable.toObject();
      timetableObj.teacher = {
        _id: teacher._id,
        firstName: teacher.firstName,
        lastName: teacher.lastName,
      };
      return timetableObj;
    });

    return responseStatus(res, 200, 'success', timetables);
  } catch (error) {
    return responseStatus(res, 500, 'failed', `Error fetching teacher timetable: ${error.message}`);
  }
};

/**
 * Create a timetable (admin only)
 */
const createTimetableService = async (data, res) => {
  try {
    const {
      classLevel,
      subclassLetter,
      subject,
      dayOfWeek,
      startTime,
      numberOfPeriods,
      location,
      academicYear,
      teacher,
    } = data;

    const currentAcademicYear = await getCurrentAcademicYear();
    if (academicYear && academicYear.toString() !== currentAcademicYear.toString()) {
      return responseStatus(res, 400, 'failed', 'Timetables can only be created for the current academic year');
    }

    if (!numberOfPeriods || numberOfPeriods < 1) {
      return responseStatus(res, 400, 'failed', 'numberOfPeriods must be a positive integer');
    }

    const classLevelDoc = await ClassLevel.findById(classLevel).select('name section subclasses');
    if (!classLevelDoc) {
      return responseStatus(res, 404, 'failed', 'ClassLevel not found');
    }

    const subclassExists = classLevelDoc.subclasses.some((sub) => sub.letter === subclassLetter);
    if (!subclassExists) {
      return responseStatus(res, 400, 'failed', `Subclass ${subclassLetter} not found for ClassLevel ${classLevel}`);
    }

    const subjectDoc = await Subject.findById(subject);
    if (!subjectDoc) {
      return responseStatus(res, 404, 'failed', 'Subject not found');
    }

    const subjectAssignment = subjectDoc.classLevelSubclasses.find(
      (cls) => cls.classLevel.toString() === classLevel.toString() && cls.subclassLetter === subclassLetter
    );
    if (!subjectAssignment) {
      return responseStatus(res, 400, 'failed', `Subject ${subjectDoc.name} is not assigned to ClassLevel ${classLevel} subclass ${subclassLetter}`);
    }

    if (teacher) {
      const teacherDoc = await Teacher.findById(teacher);
      if (!teacherDoc) {
        return responseStatus(res, 404, 'failed', 'Teacher not found');
      }
      if (!subjectAssignment.teachers.some((id) => id.toString() === teacher.toString())) {
        return responseStatus(res, 400, 'failed', `Teacher is not assigned to subject ${subjectDoc.name} for ClassLevel ${classLevel} subclass ${subclassLetter}`);
      }
    }

    const existingTimetables = await Timetable.find({
      classLevel,
      subclassLetter,
      dayOfWeek,
      academicYear: currentAcademicYear,
      subject: { $in: await Subject.find({
        'classLevelSubclasses.classLevel': classLevel,
        'classLevelSubclasses.subclassLetter': subclassLetter,
      }).distinct('_id') },
    });

    for (const existing of existingTimetables) {
      if (existing.subject.toString() !== subject.toString() && isTimeOverlap(startTime, numberOfPeriods, existing.startTime, existing.numberOfPeriods)) {
        const conflictingSubject = await Subject.findById(existing.subject);
        return responseStatus(res, 400, 'failed', `Conflict: Another subject (${conflictingSubject.name}) is scheduled for ${classLevel} ${subclassLetter} on ${dayOfWeek} during the requested time`);
      }
    }

    if (teacher) {
      const teacherTimetables = await Timetable.find({
        teacher,
        dayOfWeek,
        academicYear: currentAcademicYear,
      });

      for (const existing of teacherTimetables) {
        if (isTimeOverlap(startTime, numberOfPeriods, existing.startTime, existing.numberOfPeriods)) {
          const conflictingSubject = await Subject.findById(existing.subject);
          return responseStatus(res, 400, 'failed', `Conflict: Teacher is already scheduled for subject ${conflictingSubject.name} on ${dayOfWeek} during the requested time`);
        }
      }
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
      academicYear: currentAcademicYear,
    });

    return responseStatus(res, 201, 'success', timetable);
  } catch (error) {
    return responseStatus(res, 500, 'failed', `Error creating timetable: ${error.message}`);
  }
};

/**
 * Update a timetable (admin only)
 */
const updateTimetableService = async (timetableId, data, res) => {
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

    const existingTimetable = await Timetable.findById(timetableId);
    if (!existingTimetable) {
      return responseStatus(res, 404, 'failed', 'Timetable not found');
    }

    const finalClassLevel = classLevel || existingTimetable.classLevel;
    const finalSubclassLetter = subclassLetter || existingTimetable.subclassLetter;
    const finalSubject = subject || existingTimetable.subject;

    const classLevelDoc = await ClassLevel.findById(finalClassLevel).select('name section subclasses');
    if (!classLevelDoc) {
      return responseStatus(res, 404, 'failed', 'ClassLevel not found');
    }

    const subclassExists = classLevelDoc.subclasses.some((sub) => sub.letter === finalSubclassLetter);
    if (!subclassExists) {
      return responseStatus(res, 400, 'failed', `Subclass ${finalSubclassLetter} not found for ClassLevel ${finalClassLevel}`);
    }

    if (subject) {
      const subjectDoc = await Subject.findById(subject);
      if (!subjectDoc) {
        return responseStatus(res, 404, 'failed', 'Subject not found');
      }

      const subjectAssignment = subjectDoc.classLevelSubclasses.find(
        (cls) => cls.classLevel.toString() === finalClassLevel.toString() && cls.subclassLetter === finalSubclassLetter
      );
      if (!subjectAssignment) {
        return responseStatus(res, 400, 'failed', `Subject ${subjectDoc.name} is not assigned to ClassLevel ${finalClassLevel} subclass ${finalSubclassLetter}`);
      }

      if (teacher) {
        const teacherDoc = await Teacher.findById(teacher);
        if (!teacherDoc) {
          return responseStatus(res, 404, 'failed', 'Teacher not found');
        }
        if (!subjectAssignment.teachers.some((id) => id.toString() === teacher.toString())) {
          return responseStatus(res, 400, 'failed', `Teacher is not assigned to subject ${subjectDoc.name} for ClassLevel ${finalClassLevel} subclass ${finalSubclassLetter}`);
        }
      }
    }

    if (finalClassLevel && finalSubclassLetter && dayOfWeek && startTime && numberOfPeriods) {
      const existingTimetables = await Timetable.find({
        classLevel: finalClassLevel,
        subclassLetter: finalSubclassLetter,
        dayOfWeek,
        academicYear: currentAcademicYear,
        _id: { $ne: timetableId },
        subject: { $in: await Subject.find({
          'classLevelSubclasses.classLevel': finalClassLevel,
          'classLevelSubclasses.subclassLetter': finalSubclassLetter,
        }).distinct('_id') },
      });

      for (const existing of existingTimetables) {
        if (existing.subject.toString() !== finalSubject.toString() && isTimeOverlap(startTime, numberOfPeriods, existing.startTime, existing.numberOfPeriods)) {
          const conflictingSubject = await Subject.findById(existing.subject);
          return responseStatus(res, 400, 'failed', `Conflict: Another subject (${conflictingSubject.name}) is scheduled for ${finalClassLevel} ${finalSubclassLetter} on ${dayOfWeek} during the requested time`);
        }
      }

      if (teacher) {
        const teacherTimetables = await Timetable.find({
          teacher,
          dayOfWeek,
          academicYear: currentAcademicYear,
          _id: { $ne: timetableId },
        });

        for (const existing of teacherTimetables) {
          if (isTimeOverlap(startTime, numberOfPeriods, existing.startTime, existing.numberOfPeriods)) {
            const conflictingSubject = await Subject.findById(existing.subject);
            return responseStatus(res, 400, 'failed', `Conflict: Teacher is already scheduled for subject ${conflictingSubject.name} on ${dayOfWeek} during the requested time`);
          }
        }
      }
    }

    const updateData = {
      classLevel: finalClassLevel,
      subclassLetter: finalSubclassLetter,
      subject: finalSubject,
      teacher,
      dayOfWeek,
      startTime,
      numberOfPeriods,
      location,
      academicYear: currentAcademicYear,
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
 * Delete a timetable (admin only)
 */

const deleteTimetableService = async (timetableId, res) => {
  try {
    const timetable = await Timetable.findByIdAndDelete(timetableId);
    if (!timetable) {
      return responseStatus(res, 404, 'failed', 'Timetable not found');
    }

    const classLevel = await ClassLevel.findById(timetable.classLevel);
    if (!classLevel) {
      return responseStatus(res, 404, 'failed', 'ClassLevel not found');
    }

    const subclass = classLevel.subclasses.find((sub) => sub.letter === timetable.subclassLetter);
    if (!subclass) {
      return responseStatus(res, 400, 'failed', `Subclass ${timetable.subclassLetter} not found`);
    }

    // Extract student IDs, handling both ObjectId and object formats
    const studentIds = subclass.students.map((student) => {
      if (student && typeof student === 'object' && student.id) {
        return student.id; // Extract ObjectId from { id, amountPaid }
      }
      return student; // Assume it's already an ObjectId
    }).filter((id) => id && mongoose.Types.ObjectId.isValid(id)); // Filter valid ObjectIds

    for (const studentId of studentIds) {
      console.log('Student ID:', studentId)
      const student = await Student.findById(studentId);
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

    return responseStatus(res, 200, 'success', 'Timetable deleted successfully');
  } catch (error) {
    return responseStatus(res, 500, 'failed', `Error deleting timetable: ${error.message}`);
  }
};

/**
 * Mark attendance for a timetable period
 */
const markAttendanceService = async (timetableId, periodIndex, attendanceData, res) => {
  try {
    const timetable = await Timetable.findById(timetableId);
    if (!timetable) {
      return responseStatus(res, 404, 'failed', 'Timetable not found');
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

module.exports = {
  getTimetablesService,
  getStudentTimetableService,
  getTeacherTimetableService,
  createTimetableService,
  updateTimetableService,
  deleteTimetableService,
  markAttendanceService,
};