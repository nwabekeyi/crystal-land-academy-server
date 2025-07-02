const express = require("express");
const academicYearsRouter = express.Router();

// Middleware
const isLoggedIn = require("../../../middlewares/isLoggedIn");
// Controllers
const { getAllAcademicYears } = require("../../../controllers/students/studentAcademiYear.controller");

// Get All Academic Years
academicYearsRouter
  .route("/academicYears")
  .get(getAllAcademicYears);

module.exports = academicYearsRouter;