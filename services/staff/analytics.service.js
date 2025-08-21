const mongoose = require('mongoose');
const AcademicYear = require('../../models/Academic/academicYear.model');
const ClassLevel = require('../../models/Academic/class.model');
const Results = require('../../models/Academic/results.model');
const Timetable = require('../../models/Academic/timeTable.model');
const Student = require('../../models/Students/students.model');
const Teacher = require('../../models/Staff/teachers.model');
const StudentPayment = require('../../models/Academic/schoolFees.model');
const responseStatus = require('../../handlers/responseStatus.handler');

// Validate academic parameters
const validateAcademicParams = async (academicYearId, academicTermId, res) => {
  try {
    if (!mongoose.isValidObjectId(academicYearId)) {
      return responseStatus(res, 400, 'failed', 'Invalid academicYearId format');
    }
    const academicYear = await AcademicYear.findById(academicYearId);
    if (!academicYear) {
      return responseStatus(res, 404, 'failed', 'Academic Year not found');
    }
    if (academicTermId && !mongoose.isValidObjectId(academicTermId)) {
      return responseStatus(res, 400, 'failed', 'Invalid academicTermId format');
    }
    if (academicTermId && !academicYear.academicTerms.includes(academicTermId)) {
      return responseStatus(res, 400, 'failed', 'Academic Term not valid for this Academic Year');
    }
    return { academicYear, academicTermId };
  } catch (error) {
    return responseStatus(res, 500, 'failed', 'Error validating academic parameters: ' + error.message);
  }
};

// 1. Overview Analytics Service
exports.getOverviewAnalyticsService = async (academicYearId, academicTermId, res) => {
  try {
    const validation = await validateAcademicParams(academicYearId, academicTermId, res);
    if (!validation.academicYear) return;

    const classPopulations = await ClassLevel.aggregate([
      {
        $match: {
          academicYear: new mongoose.Types.ObjectId(academicYearId),
        },
      },
      {
        $unwind: '$subclasses',
      },
      {
        $lookup: {
          from: 'students',
          localField: 'subclasses.students.id',
          foreignField: '_id',
          as: 'studentDetails',
        },
      },
      {
        $project: {
          className: { $concat: ['$name', ' ', '$subclasses.letter'] },
          studentCount: { $size: '$studentDetails' },
        },
      },
    ]);

    const classPopulationsWithSN = classPopulations.map((classData, index) => ({
      sn: index + 1,
      className: classData.className,
      studentCount: classData.studentCount,
    }));

    const { academicYear } = validation;
    const studentCount = academicYear.students.length;
    const teacherCount = academicYear.teachers.length;
    const studentToTeacherRatio = teacherCount ? `1:${Math.round(studentCount / teacherCount)}` : '1:0';

    const paymentCompliance = await StudentPayment.aggregate([
      {
        $match: {
          academicYear: new mongoose.Types.ObjectId(academicYearId),
          ...(academicTermId && { academicTerm: new mongoose.Types.ObjectId(academicTermId) }),
        },
      },
      {
        $group: {
          _id: null,
          totalStudents: { $addToSet: '$studentId' },
          paidStudents: { $sum: { $cond: [{ $gt: ['$amountPaid', 0] }, 1, 0] } },
        },
      },
      {
        $project: {
          complianceRate: {
            $multiply: [{ $divide: ['$paidStudents', { $size: '$totalStudents' }] }, 100],
          },
        },
      },
    ]);

    return responseStatus(res, 200, 'success', {
      classPopulations: classPopulationsWithSN,
      studentToTeacherRatio,
      feePaymentCompliance: paymentCompliance[0]?.complianceRate || 0,
    });
  } catch (error) {
    return responseStatus(res, 500, 'failed', 'Error fetching overview analytics: ' + error.message);
  }
};

// 2. Class Performance Analytics Service
exports.getClassPerformanceAnalyticsService = async (academicYearId, academicTermId, res) => {
  try {
    const validation = await validateAcademicParams(academicYearId, academicTermId, res);
    if (!validation.academicYear) return;

    const classPerformance = await Results.aggregate([
      {
        $match: {
          academicYear: new mongoose.Types.ObjectId(academicYearId),
          ...(academicTermId && { academicTerm: new mongoose.Types.ObjectId(academicTermId) }),
        },
      },
      {
        $lookup: {
          from: 'subjects',
          localField: 'subject',
          foreignField: '_id',
          as: 'subject',
        },
      },
      { $unwind: '$subject' },
      {
        $group: {
          _id: {
            classLevel: '$classLevel.className',
            subclass: '$classLevel.subclass',
          },
          avgScore: { $avg: '$score' },
          totalStudents: { $sum: 1 },
          passedStudents: { $sum: { $cond: [{ $eq: ['$status', 'passed'] }, 1, 0] } },
          subjects: { $addToSet: { name: '$subject.name.name', score: '$score' } },
        },
      },
      {
        $project: {
          id: { $concat: ['$_id.classLevel', ' ', '$_id.subclass'] },
          class: { $concat: ['$_id.classLevel', ' ', '$_id.subclass'] },
          avgGrade: { $round: ['$avgScore', 2] },
          passRate: { $multiply: [{ $divide: ['$passedStudents', '$totalStudents'] }, 100] },
          mathAvg: {
            $avg: {
              $map: {
                input: {
                  $filter: {
                    input: '$subjects',
                    as: 'sub',
                    cond: { $eq: ['$$sub.name', 'Mathematics'] },
                  },
                },
                as: 'math',
                in: '$$math.score',
              },
            },
          },
          englishAvg: {
            $avg: {
              $map: {
                input: {
                  $filter: {
                    input: '$subjects',
                    as: 'sub',
                    cond: { $eq: ['$$sub.name', 'English Language'] },
                  },
                },
                as: 'eng',
                in: '$$eng.score',
              },
            },
          },
          date: { $dateToString: { format: '%Y-%m-%d', date: new Date() } },
        },
      },
    ]);

    const classPerformanceWithSN = classPerformance.map((item, index) => ({
      ...item,
      sn: index + 1,
    }));

    return responseStatus(res, 200, 'success', classPerformanceWithSN);
  } catch (error) {
    return responseStatus(res, 500, 'failed', 'Error fetching class performance analytics: ' + error.message);
  }
};

// 3. Teacher Performance Analytics Service
exports.getTeacherPerformanceAnalyticsService = async (academicYearId, academicTermId, res) => {
  try {
    const validation = await validateAcademicParams(academicYearId, academicTermId, res);
    if (!validation.academicYear) return;

    const teacherPerformance = await Teacher.aggregate([
      {
        $match: {
          _id: { $in: validation.academicYear.teachers },
          isWithdrawn: false,
          isSuspended: false,
        },
      },
      {
        $lookup: {
          from: 'timetables',
          localField: '_id',
          foreignField: 'teacher',
          as: 'timetables',
        },
      },
      {
        $lookup: {
          from: 'subjects',
          localField: 'subject',
          foreignField: '_id',
          as: 'subjects',
        },
      },
      {
        $project: {
          id: '$_id',
          name: { $concat: ['$firstName', ' ', '$lastName'] },
          subject: { $arrayElemAt: ['$subjects.name.name', 0] },
          attendanceRate: {
            $let: {
              vars: {
                relevantTimetables: {
                  $filter: {
                    input: '$timetables',
                    as: 'timetable',
                    cond: {
                      $eq: ['$$timetable.academicYear', new mongoose.Types.ObjectId(academicYearId)],
                    },
                  },
                },
              },
              in: {
                $cond: [
                  { $eq: [{ $size: '$$relevantTimetables' }, 0] },
                  0,
                  {
                    $round: [
                      {
                        $multiply: [
                          {
                            $divide: [
                              {
                                $sum: {
                                  $map: {
                                    input: '$$relevantTimetables',
                                    as: 'timetable',
                                    in: {
                                      $size: {
                                        $filter: {
                                          input: '$$timetable.periods',
                                          as: 'period',
                                          cond: {
                                            $gte: [
                                              {
                                                $size: {
                                                  $filter: {
                                                    input: '$$period.attendance',
                                                    as: 'att',
                                                    cond: { $eq: ['$$att.status', 'Present'] },
                                                  },
                                                },
                                              },
                                              1,
                                            ],
                                          },
                                        },
                                      },
                                    },
                                  },
                                },
                              },
                              {
                                $sum: {
                                  $map: {
                                    input: '$$relevantTimetables',
                                    as: 'timetable',
                                    in: { $size: '$$timetable.periods' },
                                  },
                                },
                              },
                            ],
                          },
                          100,
                        ],
                      },
                      2, // Round to 2 decimal places
                    ],
                  },
                ],
              },
            },
          },
          classesTaught: {
            $map: {
              input: '$teachingAssignments',
              as: 'assignment',
              in: { $concat: ['$$assignment.className', ' ', { $reduce: { input: '$$assignment.subclasses', initialValue: '', in: { $concat: ['$$value', '$$this', ', '] } } }] },
            },
          },
          date: { $dateToString: { format: '%Y-%m-%d', date: '$updatedAt' } },
        },
      },
    ]);

    const teacherPerformanceWithSN = teacherPerformance.map((item, index) => ({
      ...item,
      sn: index + 1,
    }));

    return responseStatus(res, 200, 'success', teacherPerformanceWithSN);
  } catch (error) {
    return responseStatus(res, 500, 'failed', 'Error fetching teacher performance analytics: ' + error.message);
  }
};

// 4. Attendance Analytics Service
exports.getAttendanceAnalyticsService = async (academicYearId, academicTermId, res) => {
  try {
    const validation = await validateAcademicParams(academicYearId, academicTermId, res);
    if (!validation.academicYear) return;

    const monthlyTrends = await Timetable.aggregate([
      {
        $match: {
          academicYear: new mongoose.Types.ObjectId(academicYearId),
        },
      },
      { $unwind: '$periods' },
      {
        $project: {
          classLevel: '$classLevel',
          subclassLetter: '$subclassLetter',
          year: { $year: '$periods.date' },
          month: { $month: '$periods.date' },
          attendance: '$periods.attendance',
        },
      },
      {
        $group: {
          _id: {
            year: '$year',
            month: '$month',
            classLevel: '$classLevel',
            subclassLetter: '$subclassLetter',
          },
          totalRecords: { $sum: 1 },
          presentRecords: {
            $sum: {
              $size: {
                $filter: {
                  input: '$attendance',
                  as: 'att',
                  cond: { $eq: ['$$att.status', 'Present'] },
                },
              },
            },
          },
        },
      },
      {
        $lookup: {
          from: 'classlevels',
          localField: '_id.classLevel',
          foreignField: '_id',
          as: 'classLevel',
        },
      },
      { $unwind: '$classLevel' },
      {
        $project: {
          month: {
            $concat: [
              { $toString: '$_id.year' },
              '-M',
              { $cond: [{ $lt: ['$_id.month', 10] }, { $concat: ['0', { $toString: '$_id.month' }] }, { $toString: '$_id.month' }] },
            ],
          },
          class: { $concat: ['$classLevel.name', ' ', '$_id.subclassLetter'] },
          attendanceRate: { $round: [{ $multiply: [{ $divide: ['$presentRecords', '$totalRecords'] }, 100] }, 2] },
        },
      },
      {
        $group: {
          _id: '$month',
          classes: { $push: { class: '$class', attendanceRate: '$attendanceRate' } },
        },
      },
      {
        $project: {
          month: '$_id',
          classes: {
            $arrayToObject: {
              $map: {
                input: '$classes',
                as: 'c',
                in: { k: '$$c.class', v: '$$c.attendanceRate' },
              },
            },
          },
        },
      },
      { $sort: { month: 1 } },
    ]);

    const classParticipation = await Timetable.aggregate([
      {
        $match: {
          academicYear: new mongoose.Types.ObjectId(academicYearId),
        },
      },
      { $unwind: '$periods' },
      {
        $group: {
          _id: { classLevel: '$classLevel', subclassLetter: '$subclassLetter' },
          totalRecords: { $sum: 1 },
          presentRecords: {
            $sum: {
              $size: {
                $filter: {
                  input: '$periods.attendance',
                  as: 'att',
                  cond: { $eq: ['$$att.status', 'Present'] },
                },
              },
            },
          },
        },
      },
      {
        $lookup: {
          from: 'classlevels',
          localField: '_id.classLevel',
          foreignField: '_id',
          as: 'classLevel',
        },
      },
      { $unwind: '$classLevel' },
      {
        $project: {
          id: '$classLevel._id',
          class: { $concat: ['$classLevel.name', ' ', '$_id.subclassLetter'] },
          participationRate: { $round: [{ $multiply: [{ $divide: ['$presentRecords', '$totalRecords'] }, 100] }, 2] },
          date: { $dateToString: { format: '%Y-%m-%d', date: '$classLevel.updatedAt' } },
        },
      },
    ]);

    const classParticipationWithSN = classParticipation.map((item, index) => ({
      ...item,
      sn: index + 1,
    }));

    return responseStatus(res, 200, 'success', { monthlyTrends, classParticipation: classParticipationWithSN });
  } catch (error) {
    return responseStatus(res, 500, 'failed', 'Error fetching attendance analytics: ' + error.message);
  }
};

// 5. Other KPIs Analytics Service
exports.getOtherKPIsAnalyticsService = async (academicYearId, academicTermId, res) => {
  try {
    const validation = await validateAcademicParams(academicYearId, academicTermId, res);
    if (!validation.academicYear) return;

    const teacherWorkload = await Timetable.aggregate([
      {
        $match: {
          academicYear: new mongoose.Types.ObjectId(academicYearId),
        },
      },
      {
        $group: {
          _id: '$teacher',
          totalPeriods: { $sum: '$numberOfPeriods' },
        },
      },
      {
        $group: {
          _id: null,
          avgPeriodsPerWeek: { $avg: '$totalPeriods' },
        },
      },
      {
        $project: {
          avgTeacherWorkload: { $round: ['$avgPeriodsPerWeek', 2] },
        },
      },
    ]);

    const examCompletionRate = await Results.aggregate([
      {
        $match: {
          academicYear: new mongoose.Types.ObjectId(academicYearId),
          ...(academicTermId && { academicTerm: new mongoose.Types.ObjectId(academicTermId) }),
        },
      },
      {
        $group: {
          _id: null,
          totalStudents: { $addToSet: '$studentId' },
          completedExams: { $sum: 1 },
        },
      },
      {
        $project: {
          examCompletionRate: {
            $multiply: [{ $divide: ['$completedExams', { $size: '$totalStudents' }] }, 100],
          },
        },
      },
    ]);

    const { academicYear } = validation;
    const studentCount = academicYear.students.length;
    const teacherCount = academicYear.teachers.length;
    const studentToTeacherRatio = teacherCount ? `1:${Math.round(studentCount / teacherCount)}` : '1:0';

    return responseStatus(res, 200, 'success', {
      avgTeacherWorkload: teacherWorkload[0]?.avgTeacherWorkload || 0,
      examCompletionRate: examCompletionRate[0]?.examCompletionRate || 0,
      studentToTeacherRatio,
    });
  } catch (error) {
    return responseStatus(res, 500, 'failed', 'Error fetching other KPIs analytics: ' + error.message);
  }
};