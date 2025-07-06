// controllers/academic/adminFinancialData.controller.js
const responseStatus = require("../../handlers/responseStatus.handler");
const {
  getSchoolFeesDataService,
  getOutstandingFeesService, // New service
} = require("../../services/staff/adminFinancialData.service");

/**
 * @desc Get school fees payment data for primary and secondary sections per academic year
 * @route GET /api/v1/financial-data/school-fees
 * @access Private (Admin only)
 */
exports.getSchoolFeesDataController = async (req, res) => {
    try {
      const { academicYearId } = req.query;
      const result = await getSchoolFeesDataService(academicYearId);
      responseStatus(res, 200, "success", result);
    } catch (error) {
      responseStatus(res, 400, "failed", error.message);
    }
  };
  
  /**
   * @desc Get outstanding fees per class for the current academic year
   * @route GET /api/v1/financial-data/outstanding-fees
   * @access Private (Admin only)
   */
  exports.getOutstandingFeesController = async (req, res) => {
    try {
      const result = await getOutstandingFeesService(res);
      responseStatus(res, 200, "success", result);
    } catch (error) {
      responseStatus(res, 400, "failed", error.message);
    }
  };