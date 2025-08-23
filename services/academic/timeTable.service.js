// services/academic/timetable.service.js
const mongoose = require('mongoose');
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
 * Validate time range (07:00 AM - 06:00 PM)
 */
const validateTimeRange = (startTime, numberOfPeriods) => {
  const [hours, minutes] = startTime.split(':').map(Number);
  const startMinutes = hours * 60 + minutes;
  if (startMinutes < 7 * 60 || startMinutes > 18 * 60) {
    throw new Error('Start time must be between 07:00 AM and 06:00 PM');
  }
  const endTime = calculateEndTime(startTime, numberOfPeriods);
  const [endHours, endMinutes] = endTime.split(':').map(Number);
  const endMinutesTotal = endHours * 60 + endMinutes;
  if (endMinutesTotal > 18 * 60) {
    throw new Error('End time cannot exceed 06:00 PM');
  }
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
 * Find Subject by name alone
 */
const findSubjectByName = async (subjectName) => {
  return await Subject.findById(subjectName);
};

/**
 * Validate Subject assignment in classLevelSubclasses
 */
const validateSubjectAssignment = (subject, classLevel, subclassLetter) => {
  if (!subject) {
    return false;
  }
  return subject.classLevelSubclasses.some(
    (cls) => cls.classLevel.toString() === classLevel.toString() && cls.subclassLetter === subclassLetter
  );
};

/**
 * Get timetables by classLevel and subclassLetter for the current academic year
 */
const getTimetablesService = async (classLevel, subclassLetter, subjectName, res) => {
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

    // Fetch valid subjects for the classLevel and subclassLetter
    const subjectDocs = await Subject.find({
      'classLevelSubclasses.classLevel': classLevel,
      'classLevelSubclasses.subclassLetter': subclassLetter,
    })
      .populate('name')
      .select('_id name classLevelSubclasses teachers');

    const validSubjectIds = subjectDocs.map((doc) => doc._id.toString());

    // If subjectName is provided, validate it
    let subjectId = null;
    if (subjectName) {
      const subject = await findSubjectByName(subjectName);
      if (!subject) {
        return responseStatus(res, 400, 'failed', `Subject ${subjectName} not found`);
      }
      if (!validateSubjectAssignment(subject, classLevel, subclassLetter)) {
        return responseStatus(res, 400, 'failed', `Subject ${subjectName} is not assigned to ClassLevel ${classLevel} subclass ${subclassLetter}`);
      }
      subjectId = subject._id;
    }

    // Map subjects to their assigned teacher IDs
    const teacherMap = {};
    subjectDocs.forEach((subjectDoc) => {
      const assignment = subjectDoc.classLevelSubclasses.find(
        (cls) => cls.classLevel.toString() === classLevel.toString() && cls.subclassLetter === subclassLetter
      );
      if (assignment && assignment.teachers.length > 0) {
        teacherMap[subjectDoc._id.toString()] = assignment.teachers[0];
      }
    });

    // Fetch teacher details
    const teacherIds = Object.values(teacherMap).filter((id) => id);
    const teachers = await Teacher.find({ _id: { $in: teacherIds } }).select('_id firstName lastName');

    const teacherDetailsMap = {};
    teachers.forEach((teacher) => {
      teacherDetailsMap[teacher._id.toString()] = {
        _id: teacher._id,
        firstName: teacher.firstName,
        lastName: teacher.lastName,
      };
    });

    // Fetch timetables, excluding periods.attendance
    const query = {
      classLevel,
      subclassLetter,
      academicYear: currentAcademicYear,
      subject: { $in: validSubjectIds },
    };

    if (subjectId) {
      query.subject = subjectId;
    }

    let timetables = await Timetable.find(query)
      .select('-periods.attendance') // Exclude attendance from periods
      .populate('classLevel', 'name section')
      .populate({
        path: 'subject',
        populate: { path: 'name', select: 'name' },
      })
      .populate('academicYear', 'name')
      .populate('teacher', 'firstName lastName');

    // Transform timetables to include subject name as string
    timetables = timetables.map((timetable) => {
      const timetableObj = timetable.toObject();
      const subjectId = timetable.subject?._id.toString();
      timetableObj.subjectName = timetable.subject?.name?.name || 'N/A';
      timetableObj.teacher = teacherMap[subjectId]
        ? teacherDetailsMap[teacherMap[subjectId].toString()] || timetable.teacher || { _id: teacherMap[subjectId], firstName: 'N/A', lastName: '' }
        : null;
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
    })
      .populate('name')
      .select('_id name classLevelSubclasses');

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
      subject: { $in: validSubjectIds },
    })
      .select('-periods.attendance') // Exclude attendance from periods
      .populate('classLevel', 'name section')
      .populate({
        path: 'subject',
        populate: { path: 'name', select: 'name' },
      })
      .populate('academicYear', 'name')
      .populate('teacher', 'firstName lastName');

    timetables = timetables.map((timetable) => {
      const timetableObj = timetable.toObject();
      timetableObj.subjectName = timetable.subject?.name?.name || 'N/A';
      timetableObj.teacher = timetable.teacher || {
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
      subject: subjectName,
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

    validateTimeRange(startTime, numberOfPeriods);

    const classLevelDoc = await ClassLevel.findById(classLevel).select('name section subclasses');
    if (!classLevelDoc) {
      return responseStatus(res, 404, 'failed', 'ClassLevel not found');
    }

    const subclassExists = classLevelDoc.subclasses.some((sub) => sub.letter === subclassLetter);
    if (!subclassExists) {
      return responseStatus(res, 400, 'failed', `Subclass ${subclassLetter} not found for ClassLevel ${classLevel}`);
    }

    const subjectDoc = await findSubjectByName(subjectName);
    if (!subjectDoc) {
      return responseStatus(res, 404, 'failed', `Subject ${subjectName} not found`);
    }

    if (!validateSubjectAssignment(subjectDoc, classLevel, subclassLetter)) {
      return responseStatus(res, 400, 'failed', `Subject ${subjectName} is not assigned to ClassLevel ${classLevel} subclass ${subclassLetter}`);
    }

    if (teacher) {
      const teacherDoc = await Teacher.findById(teacher);
      if (!teacherDoc) {
        return responseStatus(res, 404, 'failed', 'Teacher not found');
      }
      const subjectAssignment = subjectDoc.classLevelSubclasses.find(
        (cls) => cls.classLevel.toString() === classLevel.toString() && cls.subclassLetter === subclassLetter
      );
      if (!subjectAssignment.teachers.some((id) => id.toString() === teacher.toString())) {
        return responseStatus(res, 400, 'failed', `Teacher is not assigned to subject ${subjectName} for ClassLevel ${classLevel} subclass ${subclassLetter}`);
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
    }).select('-periods.attendance');

    for (const existing of existingTimetables) {
      if (existing.subject.toString() !== subjectDoc._id.toString() && isTimeOverlap(startTime, numberOfPeriods, existing.startTime, existing.numberOfPeriods)) {
        const conflictingSubject = await Subject.findById(existing.subject).populate('name');
        return responseStatus(res, 400, 'failed', `Conflict: Another subject (${conflictingSubject.name?.name || 'Unknown'}) is scheduled for ${classLevel} ${subclassLetter} on ${dayOfWeek} during the requested time`);
      }
    }

    if (teacher) {
      const teacherTimetables = await Timetable.find({
        teacher,
        dayOfWeek,
        academicYear: currentAcademicYear,
      }).select('-periods.attendance');

      for (const existing of teacherTimetables) {
        if (isTimeOverlap(startTime, numberOfPeriods, existing.startTime, existing.numberOfPeriods)) {
          const conflictingSubject = await Subject.findById(existing.subject).populate('name');
          return responseStatus(res, 400, 'failed', `Conflict: Teacher is already scheduled for subject ${conflictingSubject.name?.name || 'Unknown'}) on ${dayOfWeek} during the requested time`);
        }
      }
    }

    const timetable = await Timetable.create({
      classLevel,
      subclassLetter,
      subject: subjectDoc._id,
      teacher,
      dayOfWeek,
      startTime,
      numberOfPeriods,
      location,
      academicYear: currentAcademicYear,
    });

    const populatedTimetable = await Timetable.findById(timetable._id)
      .select('-periods.attendance') // Exclude attendance from periods
      .populate('classLevel', 'name section')
      .populate({
        path: 'subject',
        populate: { path: 'name', select: 'name' },
      })
      .populate('academicYear', 'name')
      .populate('teacher', 'firstName lastName');

    const timetableObj = populatedTimetable.toObject();
    timetableObj.subjectName = populatedTimetable.subject?.name?.name || 'N/A';

    return responseStatus(res, 201, 'success', timetableObj);
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
      subject: subjectName,
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

    const existingTimetable = await Timetable.findById(timetableId).select('-periods.attendance');
    if (!existingTimetable) {
      return responseStatus(res, 404, 'failed', 'Timetable not found');
    }

    const finalClassLevel = classLevel || existingTimetable.classLevel;
    const finalSubclassLetter = subclassLetter || existingTimetable.subclassLetter;
    let finalSubject = existingTimetable.subject;

    if (subjectName) {
      const subjectDoc = await findSubjectByName(subjectName);
      if (!subjectDoc) {
        return responseStatus(res, 404, 'failed', `Subject ${subjectName} not found`);
      }
      if (!validateSubjectAssignment(subjectDoc, finalClassLevel, finalSubclassLetter)) {
        return responseStatus(res, 400, 'failed', `Subject ${subjectName} is not assigned to ClassLevel ${finalClassLevel} subclass ${finalSubclassLetter}`);
      }
      finalSubject = subjectDoc._id;
    }

    const finalStartTime = startTime || existingTimetable.startTime;
    const finalNumberOfPeriods = numberOfPeriods !== undefined ? numberOfPeriods : existingTimetable.numberOfPeriods;

    if (startTime || numberOfPeriods !== undefined) {
      validateTimeRange(finalStartTime, finalNumberOfPeriods);
    }

    const classLevelDoc = await ClassLevel.findById(finalClassLevel).select('name section subclasses');
    if (!classLevelDoc) {
      return responseStatus(res, 404, 'failed', 'ClassLevel not found');
    }

    const subclassExists = classLevelDoc.subclasses.some((sub) => sub.letter === finalSubclassLetter);
    if (!subclassExists) {
      return responseStatus(res, 400, 'failed', `Subclass ${finalSubclassLetter} not found for ClassLevel ${finalClassLevel}`);
    }

    if (finalSubject && (classLevel || subclassLetter || subjectName)) {
      const subjectDoc = await Subject.findById(finalSubject).populate('name');
      if (!validateSubjectAssignment(subjectDoc, finalClassLevel, finalSubclassLetter)) {
        return responseStatus(res, 400, 'failed', `Subject ${subjectDoc.name?.name || subjectName} is not assigned to ClassLevel ${finalClassLevel} subclass ${finalSubclassLetter}`);
      }

      if (teacher) {
        const teacherDoc = await Teacher.findById(teacher);
        if (!teacherDoc) {
          return responseStatus(res, 404, 'failed', 'Teacher not found');
        }
        const subjectAssignment = subjectDoc.classLevelSubclasses.find(
          (cls) => cls.classLevel.toString() === finalClassLevel.toString() && cls.subclassLetter === finalSubclassLetter
        );
        if (!subjectAssignment.teachers.some((id) => id.toString() === teacher.toString())) {
          return responseStatus(res, 400, 'failed', `Teacher is not assigned to subject ${subjectDoc.name?.name || subjectName} for ClassLevel ${finalClassLevel} subclass ${finalSubclassLetter}`);
        }
      }
    }

    if (finalClassLevel && finalSubclassLetter && dayOfWeek && finalStartTime && finalNumberOfPeriods) {
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
      }).select('-periods.attendance');

      for (const existing of existingTimetables) {
        if (existing.subject.toString() !== finalSubject.toString() && isTimeOverlap(finalStartTime, finalNumberOfPeriods, existing.startTime, existing.numberOfPeriods)) {
          const conflictingSubject = await Subject.findById(existing.subject).populate('name');
          return responseStatus(res, 400, 'failed', `Conflict: Another subject (${conflictingSubject.name?.name || 'Unknown'}) is scheduled for ${finalClassLevel} ${finalSubclassLetter} on ${dayOfWeek} during the requested time`);
        }
      }

      if (teacher) {
        const teacherTimetables = await Timetable.find({
          teacher,
          dayOfWeek,
          academicYear: currentAcademicYear,
          _id: { $ne: timetableId },
        }).select('-periods.attendance');

        for (const existing of teacherTimetables) {
          if (isTimeOverlap(finalStartTime, finalNumberOfPeriods, existing.startTime, existing.numberOfPeriods)) {
            const conflictingSubject = await Subject.findById(existing.subject).populate('name');
            return responseStatus(res, 400, 'failed', `Conflict: Teacher is already scheduled for subject ${conflictingSubject.name?.name || 'Unknown'}) on ${dayOfWeek} during the requested time`);
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
      startTime: finalStartTime,
      numberOfPeriods: finalNumberOfPeriods,
      location,
      academicYear: currentAcademicYear,
    };

    // If numberOfPeriods changes, adjust the periods array
    if (numberOfPeriods !== undefined && numberOfPeriods !== existingTimetable.numberOfPeriods) {
      const existingPeriods = (await Timetable.findById(timetableId).select('periods')).periods || [];
      const newPeriods = Array.from({ length: numberOfPeriods }, (_, index) => {
        const existing = existingPeriods.find((p) => p.periodIndex === index);
        return existing || {
          periodIndex: index,
          date: new Date(0),
          attendance: [],
        };
      });
      updateData.periods = newPeriods;
    }

    Object.keys(updateData).forEach((key) => updateData[key] === undefined && delete updateData[key]);

    const timetable = await Timetable.findByIdAndUpdate(
      timetableId,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .select('-periods.attendance') // Exclude attendance from periods
      .populate('classLevel', 'name section')
      .populate({
        path: 'subject',
        populate: { path: 'name', select: 'name' },
      })
      .populate('academicYear', 'name')
      .populate('teacher', 'firstName lastName');

    if (!timetable) {
      return responseStatus(res, 404, 'failed', 'Timetable not found');
    }

    const timetableObj = timetable.toObject();
    timetableObj.subjectName = timetable.subject?.name?.name || 'N/A';

    return responseStatus(res, 200, 'success', timetableObj);
  } catch (error) {
    return responseStatus(res, 500, 'failed', `Error updating timetable: ${error.message}`);
  }
};

/**
 * Delete a timetable (admin only)
 */
const deleteTimetableService = async (timetableId, res) => {
  try {
    const timetable = await Timetable.findByIdAndDelete(timetableId).select('-periods.attendance');
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

    const studentIds = subclass.students.map((student) => {
      if (student && typeof student === 'object' && student.id) {
        return student.id;
      }
      return student;
    }).filter((id) => id && mongoose.Types.ObjectId.isValid(id));

    for (const studentId of studentIds) {
      const student = await Student.findById(studentId);
      if (student) {
        const allAttendance = await Timetable.aggregate([
          {
            $match: {
              classLevel: student.classLevelId,
              subclassLetter: student.currentClassLevel.subclass,
            },
          },
          { $unwind: '$periods' },
          { $unwind: '$periods.attendance' },
          { $match: { 'periods.attendance.studentId': student._id } },
          { $project: { status: '$periods.attendance.status' } },
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

// services/academic/timetable.service.js
/**
 * Mark attendance for a timetable period
 */
const markAttendanceService = async (timetableId, periodIndex, attendanceData, date, res) => {
  // Validate res object
  if (!res || typeof res.status !== 'function' || typeof res.json !== 'function') {
    throw new Error('Invalid response object');
  }

  try {
    const timetable = await Timetable.findById(timetableId)
      .populate('classLevel', 'name section subclasses')
      .populate({
        path: 'subject',
        populate: { path: 'name', select: 'name' },
      });
    if (!timetable) {
      return responseStatus(res, 404, 'failed', 'Timetable not found');
    }

    if (!Number.isInteger(Number(periodIndex)) || periodIndex < 0 || periodIndex >= timetable.numberOfPeriods) {
      return responseStatus(res, 400, 'failed', `Invalid period index: ${periodIndex}`);
    }

    const classLevel = timetable.classLevel;
    const subclass = classLevel.subclasses.find((sub) => sub.letter === timetable.subclassLetter);
    if (!subclass) {
      return responseStatus(res, 400, 'failed', `Subclass ${timetable.subclassLetter} not found`);
    }

    const attendanceDate = date ? new Date(date) : new Date(); // Use current date (August 3, 2025, 2:34 PM WAT)
    if (isNaN(attendanceDate.getTime())) {
      return responseStatus(res, 400, 'failed', 'Invalid date format');
    }
    const normalizedDate = new Date(attendanceDate.setHours(0, 0, 0, 0));

    // Find existing period
    const existingPeriod = timetable.periods.find(
      (p) => p.periodIndex === Number(periodIndex) && p.date.getTime() === normalizedDate.getTime()
    );

    // Track which students already have attendance marked
    const existingStudentIds = existingPeriod
      ? existingPeriod.attendance.map((att) => att.studentId.toString())
      : [];

    // Filter out students who already have attendance marked
    const newAttendanceData = attendanceData.filter(
      (record) => !existingStudentIds.includes(record.studentId.toString())
    );

    // Validate new attendance data
    for (const record of newAttendanceData) {
      if (!['Present', 'Absent', 'Late', 'Excused'].includes(record.status)) {
        return responseStatus(res, 400, 'failed', `Invalid status for student ${record.studentId}`);
      }
    }

    // If no new attendance records to add, return early
    if (newAttendanceData.length === 0 && existingPeriod) {
      const populatedTimetable = await Timetable.findById(timetable._id)
        .select('-periods.attendance')
        .populate('classLevel', 'name section')
        .populate({
          path: 'subject',
          populate: { path: 'name', select: 'name' },
        })
        .populate('academicYear', 'name')
        .populate('teacher', 'firstName lastName');

      if (!populatedTimetable) {
        return responseStatus(res, 404, 'failed', 'Timetable not found after update');
      }

      const timetableObj = populatedTimetable.toObject();
      timetableObj.subjectName = populatedTimetable.subject?.name?.name || 'N/A';
      return responseStatus(res, 200, 'success', {
        message: 'No new attendance records to mark; all students already marked',
        timetable: timetableObj,
      });
    }

    // Update or create period
    if (existingPeriod) {
      // Add only new attendance records to existing period
      existingPeriod.attendance.push(
        ...newAttendanceData.map((record) => ({
          studentId: record.studentId,
          status: record.status,
          notes: record.notes || '',
        }))
      );
    } else {
      // Create new period with all provided attendance data
      timetable.periods.push({
        periodIndex: Number(periodIndex),
        date: normalizedDate,
        attendance: attendanceData.map((record) => ({
          studentId: record.studentId,
          status: record.status,
          notes: record.notes || '',
        })),
      });
    }

    await timetable.save();

    // Update attendance rate for affected students
    for (const record of newAttendanceData) {
      const student = await Student.findById(record.studentId);
      if (student) {
        const allAttendance = await Timetable.aggregate([
          {
            $match: {
              classLevel: student.classLevelId,
              subclassLetter: student.currentClassLevel.subclass,
            },
          },
          { $unwind: '$periods' },
          { $unwind: '$periods.attendance' },
          { $match: { 'periods.attendance.studentId': student._id } },
          { $project: { status: '$periods.attendance.status' } },
        ]);

        const totalRecords = allAttendance.length;
        const presentOrLate = allAttendance.filter((a) => ['Present', 'Late'].includes(a.status)).length;
        student.attendanceRate = totalRecords > 0 ? (presentOrLate / totalRecords) * 100 : 0;
        await student.save();
      }
    }

    const populatedTimetable = await Timetable.findById(timetable._id)
      .select('-periods.attendance')
      .populate('classLevel', 'name section')
      .populate({
        path: 'subject',
        populate: { path: 'name', select: 'name' },
      })
      .populate('academicYear', 'name')
      .populate('teacher', 'firstName lastName');

    if (!populatedTimetable) {
      return responseStatus(res, 404, 'failed', 'Timetable not found after update');
    }

    const timetableObj = populatedTimetable.toObject();
    timetableObj.subjectName = populatedTimetable.subject?.name?.name || 'N/A';

    return responseStatus(res, 200, 'success', {
      message: newAttendanceData.length === attendanceData.length
        ? 'Attendance marked successfully'
        : `Attendance marked for ${newAttendanceData.length} of ${attendanceData.length} students; others already marked`,
      timetable: timetableObj,
    });
  } catch (error) {
    console.error('Error in markAttendanceService:', error);
    return responseStatus(res, 500, 'failed', `Error marking attendance: ${error.message}`);
  }
};

/**
 * Get attendance for a timetable period
 */
const getAttendanceService = async (timetableId, periodIndex, date, res) => {
  try {
    // Validate timetable existence
    const timetable = await Timetable.findById(timetableId)
      .select('periods numberOfPeriods classLevel subclassLetter subject dayOfWeek startTime endTime location academicYear teacher')
      .populate('classLevel', 'name section')
      .populate({
        path: 'subject',
        populate: { path: 'name', select: 'name' },
      })
      .populate('academicYear', 'name')
      .populate('teacher', 'firstName lastName');

    if (!timetable) {
      return responseStatus(res, 404, 'failed', 'Timetable not found');
    }

    // Validate periodIndex
    if (!Number.isInteger(Number(periodIndex)) || periodIndex < 0 || periodIndex >= timetable.numberOfPeriods) {
      return responseStatus(res, 400, 'failed', `Invalid period index: ${periodIndex}`);
    }

    // Filter periods by periodIndex and optional date
    let periods = timetable.periods.filter((p) => p.periodIndex === Number(periodIndex));

    if (date) {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        return responseStatus(res, 400, 'failed', 'Invalid date format');
      }
      const normalizedDate = new Date(parsedDate.setHours(0, 0, 0, 0));
      periods = periods.filter((p) => p.date.getTime() === normalizedDate.getTime());
    }

    // Populate student details for attendance
    const populatedAttendance = await Promise.all(
      periods.map(async (period) => {
        const periodObj = {
          periodIndex: period.periodIndex,
          date: period.date,
          attendance: await Promise.all(
            period.attendance.map(async (record) => {
              const student = await Student.findById(record.studentId).select('firstName lastName');
              return {
                ...record.toObject(),
                student: student ? { _id: student._id, firstName: student.firstName, lastName: student.lastName } : null,
              };
            })
          ),
        };
        return periodObj;
      })
    );

    // Transform timetable data for response
    const timetableObj = timetable.toObject();
    delete timetableObj.periods; // Remove periods from timetable object
    timetableObj.subjectName = timetable.subject?.name?.name || 'N/A';

    return responseStatus(res, 200, 'success', { timetable: timetableObj, attendance: populatedAttendance });
  } catch (error) {
    return responseStatus(res, 500, 'failed', `Error fetching attendance: ${error.message}`);
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
  getAttendanceService,
};