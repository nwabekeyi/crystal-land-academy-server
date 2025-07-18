// routes/adminFinancialData.route.js
const express = require("express");
const adminFinancialDataRouter = express.Router();
const isAdmin = require("../../../middlewares/isAdmin");
const isLoggedIn = require("../../../middlewares/isLoggedIn");
const {
  getSchoolFeesDataController,
  getOutstandingFeesController,
  getAdminStatsController, // New controller
} = require("../../../controllers/staff/adminData.controller");

adminFinancialDataRouter
  .route("/admin-stats/school-fees")
  .get(isLoggedIn, isAdmin, getSchoolFeesDataController);

adminFinancialDataRouter
  .route("/admin-stats/outstanding-fees")
  .get(isLoggedIn, isAdmin, getOutstandingFeesController);

adminFinancialDataRouter
  .route("/admin-stats")
  .get(isLoggedIn, isAdmin, getAdminStatsController);

module.exports = adminFinancialDataRouter;