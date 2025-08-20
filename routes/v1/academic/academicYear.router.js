// routes/academic/academicYear.router.js
const express = require('express');
const academicYearRouter = express.Router();
const isAdmin = require('../../../middlewares/isAdmin');
const isLoggedIn = require('../../../middlewares/isLoggedIn');
const {
  getAcademicYearsController,
  createAcademicYearController,
  getAcademicYearController,
  updateAcademicYearController,
  deleteAcademicYearController,
  getCurrentAcademicYearController,
  changeCurrentAcademicYearController,
  getAcademicYearsMinimalController, // Add new controller
} = require('../../../controllers/academic/academicYear.controller');


academicYearRouter.route('/academic-years/current')
  .get(isLoggedIn, getCurrentAcademicYearController);

// Get all academic years without students, teachers, and academic terms
academicYearRouter.route('/academic-years/minimal')
  .get(isLoggedIn, isAdmin, getAcademicYearsMinimalController);

// Existing routes
academicYearRouter.route('/academic-years')
  .get(isLoggedIn, isAdmin, getAcademicYearsController)
  .post(isLoggedIn, isAdmin, createAcademicYearController);

academicYearRouter.route('/academic-years/:id')
  .get(isLoggedIn, isAdmin, getAcademicYearController)
  .patch(isLoggedIn, isAdmin, updateAcademicYearController)
  .delete(isLoggedIn, isAdmin, deleteAcademicYearController);

academicYearRouter.route('/academic-years/change-current/:id')
  .patch(isLoggedIn, isAdmin, changeCurrentAcademicYearController);

module.exports = academicYearRouter;