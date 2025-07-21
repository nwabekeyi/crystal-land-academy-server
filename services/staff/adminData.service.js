// services/academic/adminFinancialData.service.js
const Student = require("../../models/Students/students.model");
const Teacher = require("../../models/Staff/teachers.model");
const AcademicYear = require("../../models/Academic/academicYear.model");
const Enquiry = require("../../models/Enquiry/index");
const StudentPayment = require("../../models/Academic/schoolFees.model");
const ClassLevel = require("../../models/Academic/class.model");
const responseStatus = require("../../handlers/responseStatus.handler");
const mongoose = require("mongoose");

/**
 * Fetch school fees payment data for primary and secondary sections per academic year
 * @param {String} academicYearId - Optional academic year ID
 * @param {Object} res - Response object for error handling
 * @returns {Object} Payment data for primary and secondary sections
 */
exports.getSchoolFeesDataService = async (res) => {
  try {
    const payments = await StudentPayment.aggregate([
      {
        $lookup: {
          from: "academicyears",
          localField: "academicYear",
          foreignField: "_id",
          as: "academicYearInfo",
        },
      },
      { $unwind: "$academicYearInfo" },
      { $unwind: "$termPayments" },
      { $unwind: "$termPayments.payments" },
      {
        $group: {
          _id: {
            section: "$section",
            academicYearName: "$academicYearInfo.name",
          },
          totalPaid: { $sum: "$termPayments.payments.amountPaid" },
        },
      },
      {
        $project: {
          _id: 0,
          section: "$_id.section",
          academicYearName: "$_id.academicYearName",
          totalPaid: 1,
        },
      },
    ]);

    const primaryData = payments
      .filter((p) => p.section === "Primary")
      .map((p) => ({
        id: `Primary-${p.academicYearName}`,
        label: `${p.academicYearName} (Primary)`,
        value: p.totalPaid,
      }));

    const secondaryData = payments
      .filter((p) => p.section === "Secondary")
      .map((p) => ({
        id: `Secondary-${p.academicYearName}`,
        label: `${p.academicYearName} (Secondary)`,
        value: p.totalPaid,
      }));

    return { primary: primaryData, secondary: secondaryData };
  } catch (error) {
    return responseStatus(res, 400, "failed", "Error fetching school fees data: " + error.message);
  }
};

/**
 * Fetch outstanding fees per academic year
 * @param {Object} res - Response object for error handling
 * @returns {Array} Outstanding fees data for each academic year
 */
exports.getOutstandingFeesService = async (res) => {
  try {
    // Fetch all academic years to map IDs to names
    const academicYears = await AcademicYear.find({})
      .select("_id name")
      .lean();
    if (!academicYears.length) {
      return;
    }
    const academicYearMap = academicYears.reduce((map, ay) => {
      map[ay._id.toString()] = ay.name;
      return map;
    }, {});

    // Fetch all class levels with their academic years and subclasses
    const classLevels = await ClassLevel.find({})
      .select("name section academicYear students subclasses")
      .lean();
    if (!classLevels.length) {
      return responseStatus(res, 404, "failed", "No class levels found");
    }

    // Fetch all payments
    const payments = await StudentPayment.aggregate([
      { $unwind: "$termPayments" },
      { $unwind: "$termPayments.payments" },
      {
        $group: {
          _id: {
            studentId: "$studentId",
            academicYear: "$academicYear",
          },
          totalPaid: { $sum: "$termPayments.payments.amountPaid" },
        },
      },
    ]);

    // Map payments by studentId and academicYear
    const paymentMap = payments.reduce((map, payment) => {
      const key = `${payment._id.studentId.toString()}-${payment._id.academicYear.toString()}`;
      map[key] = payment.totalPaid || 0;
      return map;
    }, {});

    // Calculate outstanding fees per academic year
    const outstandingByYear = {};

    // Group class levels by academic year for efficiency
    const classLevelsByYear = classLevels.reduce((map, classLevel) => {
      const academicYearId = classLevel.academicYear.toString();
      if (!map[academicYearId]) map[academicYearId] = [];
      map[academicYearId].push(classLevel);
      return map;
    }, {});

    for (const [academicYearId, classes] of Object.entries(classLevelsByYear)) {
      const academicYearName = academicYearMap[academicYearId] || "Unknown";

      // Initialize outstanding for this academic year
      outstandingByYear[academicYearId] = {
        totalOutstanding: 0,
        name: academicYearName,
      };

      // Collect all student IDs for this academic year
      const allStudentIds = classes
        .flatMap((classLevel) => (classLevel.students || []).map((id) => id.toString()))
        .filter((id) => mongoose.isValidObjectId(id));

      if (!allStudentIds.length) continue;

      // Fetch active students for this academic year
      const activeStudents = await Student.find({
        _id: { $in: allStudentIds },
        isWithdrawn: false,
        isGraduated: false,
      })
        .select("_id")
        .lean();
      const activeStudentIds = activeStudents.map((s) => s._id.toString());

      for (const classLevel of classes) {
        for (const studentId of activeStudentIds) {
          let totalExpectedFees = 0;

          // Find the subclass containing this student
          const subclass = classLevel.subclasses?.find((sub) =>
            sub.students?.some((s) => s.id && s.id.toString() === studentId)
          );

          if (subclass && subclass.feesPerTerm?.length) {
            // Calculate total expected fees from feesPerTerm
            totalExpectedFees = subclass.feesPerTerm.reduce((sum, fee) => {
              if (
                !fee.student?.length ||
                (fee.student && fee.student.some((s) => s.toString() === studentId))
              ) {
                return sum + (fee.amount || 0);
              }
              return sum;
            }, 0);
          }

          // Get total paid for this student in this academic year
          const paymentKey = `${studentId}-${academicYearId}`;
          const totalPaid = paymentMap[paymentKey] || 0;

          // Calculate outstanding for this student
          const outstanding = totalExpectedFees - totalPaid;
          outstandingByYear[academicYearId].totalOutstanding += outstanding > 0 ? outstanding : 0;
        }
      }
    }

    // Convert outstandingByYear to array format
    const outstandingFeesData = Object.entries(outstandingByYear).map(([academicYearId, data]) => ({
      id: academicYearId,
      label: data.name,
      value: data.totalOutstanding,
    }));

    return outstandingFeesData;
  } catch (error) {
    console.error('Error in getOutstandingFeesService:', error);
    return responseStatus(res, 400, "failed", `Error fetching outstanding fees data: ${error.message}`);
  }
};

/**
 * Fetch admin statistics including total students, teachers, students in current academic year,
 * unread enquiries, top 5 teachers by rating, enrollments per academic year, and class levels
 * @param {Object} res - Response object for error handling
 * @returns {Object} Statistics object with counts and additional metrics
 */
exports.getAdminStatsService = async (res) => {
  try {
    const totalStudents = await Student.countDocuments({ isWithdrawn: false });
    const totalTeachers = await Teacher.countDocuments({ isWithdrawn: false, isSuspended: false });

    const currentAcademicYear = await AcademicYear.findOne({ isCurrent: true });
    if (!currentAcademicYear) {
      return;
    }

    const currentYearStudents = await Student.countDocuments({
      "currentClassLevel.academicYear.academicYearId": currentAcademicYear._id,
      isWithdrawn: false,
      isGraduated: false,
    });

    const unreadEnquiries = await Enquiry.countDocuments({ status: "unread" });

    const topTeachers = await Teacher.find({
      isWithdrawn: false,
      isSuspended: false,
      rating: { $gt: 0 },
    })
      .select("firstName lastName teacherId rating")
      .sort({ rating: -1 })
      .limit(5)
      .lean();

    const enrollmentData = await AcademicYear.aggregate([
      {
        $project: {
          name: 1,
          enrollmentCount: { $size: { $ifNull: ["$students", []] } },
        },
      },
      {
        $sort: { name: 1 },
      },
      {
        $project: {
          _id: 0,
          academicYear: "$name",
          enrollmentCount: 1,
        },
      },
    ]);

    const classLevels = await ClassLevel.find({
      academicYear: currentAcademicYear._id,
    })
      .select("name section academicYear students")
      .lean();

    const classLevelData = await Promise.all(
      classLevels.map(async (classLevel) => {
        const activeStudentCount = await Student.countDocuments({
          _id: { $in: classLevel.students || [] },
          isWithdrawn: false,
          isGraduated: false,
        });

        return {
          id: classLevel._id.toString(),
          name: classLevel.name,
          section: classLevel.section,
          academicYear: currentAcademicYear.name || "Unknown",
          studentCount: activeStudentCount,
        };
      })
    );

    return {
      totalStudents,
      totalTeachers,
      currentYearStudents,
      unreadEnquiries,
      topTeachers: topTeachers.map((teacher) => ({
        id: teacher.teacherId,
        name: `${teacher.firstName} ${teacher.lastName}`,
        rating: teacher.rating,
      })),
      enrollmentsPerAcademicYear: enrollmentData,
      classLevels: classLevelData,
    };
  } catch (error) {
    return responseStatus(res, 400, "failed", "Error fetching admin statistics: " + error.message);
  }
};