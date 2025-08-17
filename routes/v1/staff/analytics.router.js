// routes/analyticsRouter.js
const express = require('express');
const analyticsRouter = express.Router();
const {
  getOverviewAnalyticsController,
  getClassPerformanceAnalyticsController,
  getTeacherPerformanceAnalyticsController,
  getAttendanceAnalyticsController,
  getOtherKPIsAnalyticsController,
} = require('../../../controllers/staff/analytics.controller');
const isLoggedIn = require('../../../middlewares/isLoggedIn');
const isAdmin = require('../../../middlewares/isAdmin');

// Analytics Routes (Admin Only)
analyticsRouter.route('/analytics/overview')
  .get(isLoggedIn, isAdmin, getOverviewAnalyticsController);
analyticsRouter.route('/analytics/class-performance')
  .get(isLoggedIn, isAdmin, getClassPerformanceAnalyticsController);
analyticsRouter.route('/analytics/teacher-performance')
  .get(isLoggedIn, isAdmin, getTeacherPerformanceAnalyticsController);
analyticsRouter.route('/analytics/attendance')
  .get(isLoggedIn, isAdmin, getAttendanceAnalyticsController);
analyticsRouter.route('/analytics/other-kpis')
  .get(isLoggedIn, isAdmin, getOtherKPIsAnalyticsController);

module.exports = analyticsRouter;