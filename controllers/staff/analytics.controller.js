// controllers/students/analytics.controller.js
const {
    getOverviewAnalyticsService,
    getClassPerformanceAnalyticsService,
    getTeacherPerformanceAnalyticsService,
    getAttendanceAnalyticsService,
    getOtherKPIsAnalyticsService,
  } = require('../../services/staff/analytics.service');
  
  const responseStatus = require('../../handlers/responseStatus.handler');
  
  // 1. Get Overview Analytics
  exports.getOverviewAnalyticsController = async (req, res) => {
    try {
      const { academicYearId, academicTermId } = req.query;
      await getOverviewAnalyticsService(academicYearId, academicTermId, res);
    } catch (error) {
      responseStatus(res, 400, 'failed', 'Error fetching overview analytics: ' + error.message);
    }
  };
  
  // 2. Get Class Performance Analytics
  exports.getClassPerformanceAnalyticsController = async (req, res) => {
    try {
      const { academicYearId, academicTermId } = req.query;
      await getClassPerformanceAnalyticsService(academicYearId, academicTermId, res);
    } catch (error) {
      responseStatus(res, 400, 'failed', 'Error fetching class performance analytics: ' + error.message);
    }
  };
  
  // 3. Get Teacher Performance Analytics
  exports.getTeacherPerformanceAnalyticsController = async (req, res) => {
    try {
      const { academicYearId, academicTermId } = req.query;
      await getTeacherPerformanceAnalyticsService(academicYearId, academicTermId, res);
    } catch (error) {
      responseStatus(res, 400, 'failed', 'Error fetching teacher performance analytics: ' + error.message);
    }
  };
  
  // 4. Get Attendance Analytics
  exports.getAttendanceAnalyticsController = async (req, res) => {
    try {
      const { academicYearId, academicTermId } = req.query;
      await getAttendanceAnalyticsService(academicYearId, academicTermId, res);
    } catch (error) {
      responseStatus(res, 400, 'failed', 'Error fetching attendance analytics: ' + error.message);
    }
  };
  
  // 5. Get Other KPIs Analytics
  exports.getOtherKPIsAnalyticsController = async (req, res) => {
    try {
      const { academicYearId, academicTermId } = req.query;
      await getOtherKPIsAnalyticsService(academicYearId, academicTermId, res);
    } catch (error) {
      responseStatus(res, 400, 'failed', 'Error fetching other KPIs analytics: ' + error.message);
    }
  };