// routes/adminFinancialData.route.js
const express = require("express");
const adminFinancialDataRouter = express.Router();
const isAdmin = require("../../../middlewares/isAdmin");
const isLoggedIn = require("../../../middlewares/isLoggedIn");
const {
  getSchoolFeesDataController,
  getOutstandingFeesController, // New controller
} = require("../../../controllers/staff/adminFinancialData.controller");

adminFinancialDataRouter
  .route("/financial-data/school-fees")
  .get(isLoggedIn, isAdmin, getSchoolFeesDataController);

adminFinancialDataRouter
  .route("/financial-data/outstanding-fees")
  .get(isLoggedIn, isAdmin, getOutstandingFeesController);

module.exports = adminFinancialDataRouter;