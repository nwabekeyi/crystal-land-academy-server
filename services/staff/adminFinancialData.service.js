// services/academic/adminFinancialData.service.js
const StudentPayment = require("../../models/Academic/schoolFees.model");
const AcademicYear = require("../../models/Academic/academicYear.model");
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
        // Lookup AcademicYear to get year names
        {
          $lookup: {
            from: "academicyears",
            localField: "academicYear",
            foreignField: "_id",
            as: "academicYearInfo",
          },
        },
        // Unwind academicYearInfo to access year name
        { $unwind: "$academicYearInfo" },
        // Unwind termPayments and payments
        { $unwind: "$termPayments" },
        { $unwind: "$termPayments.payments" },
        // Group by section and academic year name
        {
          $group: {
            _id: {
              section: "$section",
              academicYearName: "$academicYearInfo.name",
            },
            totalPaid: { $sum: "$termPayments.payments.amountPaid" },
          },
        },
        // Project to format output
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
   * Fetch outstanding fees per class for the current academic year
   * @param {Object} res - Response object for error handling
   * @returns {Array} Outstanding fees data for each class
   */
  exports.getOutstandingFeesService = async (res) => {
    try {
      const currentAcademicYear = await AcademicYear.findOne({ isCurrent: true });
      if (!currentAcademicYear) {
        return responseStatus(res, 404, "failed", "No current academic year found");
      }
  
      const classLevels = await ClassLevel.find({
        academicYear: currentAcademicYear._id,
      }).lean();
  
      if (!classLevels.length) {
        return responseStatus(res, 404, "failed", "No class levels found for the current academic year");
      }
  
      const paymentMatch = {
        $match: {
          academicYear: currentAcademicYear._id,
        },
      };
  
      const unwindTermPayments = {
        $unwind: "$termPayments",
      };
  
      const unwindPayments = {
        $unwind: "$termPayments.payments",
      };
  
      const groupPayments = {
        $group: {
          _id: {
            classLevelId: "$classLevelId",
            studentId: "$studentId",
          },
          totalPaid: { $sum: "$termPayments.payments.amountPaid" },
        },
      };
  
      const payments = await StudentPayment.aggregate([
        paymentMatch,
        unwindTermPayments,
        unwindPayments,
        groupPayments,
      ]);
  
      const outstandingFeesData = classLevels.map((classLevel) => {
        const expectedFeesPerStudent = classLevel.subclasses.reduce((total, subclass) => {
          const subclassFees = subclass.feesPerTerm.reduce((sum, fee) => sum + (fee.amount || 0), 0);
          return total + subclassFees;
        }, 0);
  
        const studentIds = classLevel.students || [];
        const totalStudents = studentIds.length;
        const totalExpectedFees = totalStudents * expectedFeesPerStudent;
        const totalPaid = payments
          .filter((p) => p._id.classLevelId.toString() === classLevel._id.toString())
          .reduce((sum, p) => sum + p.totalPaid, 0);
        const outstanding = totalExpectedFees - totalPaid;
  
        return {
          id: classLevel.name,
          label: classLevel.name,
          value: outstanding > 0 ? outstanding : 0,
        };
      });
  
      return outstandingFeesData;
    } catch (error) {
      return responseStatus(res, 400, "failed", "Error fetching outstanding fees data: " + error.message);
    }
  };