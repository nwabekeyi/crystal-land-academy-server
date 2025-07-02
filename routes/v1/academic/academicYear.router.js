const express = require('express');
const academicYearRouter = express.Router();

// middleware
const isAdmin = require('../../../middlewares/isAdmin');
const isLoggedIn = require('../../../middlewares/isLoggedIn');

// controllers
const {
  getAcademicYearsController,
  createAcademicYearController,
  getAcademicYearController,
  updateAcademicYearController,
  deleteAcademicYearController,
  getCurrentAcademicYearController,
  changeCurrentAcademicYearController,
} = require('../../../controllers/academic/academicYear.controller');



// Get current academic year
academicYearRouter.route('/academic-years/current')
  .get(isLoggedIn, getCurrentAcademicYearController);

// Routes
academicYearRouter.route('/academic-years')
  .get(isLoggedIn, isAdmin, getAcademicYearsController)
  .post(isLoggedIn, isAdmin, createAcademicYearController);

academicYearRouter.route('/academic-years/:id')
  .get(isLoggedIn, isAdmin, getAcademicYearController)
  .patch(isLoggedIn, isAdmin, updateAcademicYearController)
  .delete(isLoggedIn, isAdmin, deleteAcademicYearController);


// Change current academic year
academicYearRouter.route('/academic-years/change-current/:id')
  .patch(isLoggedIn, isAdmin, changeCurrentAcademicYearController);

module.exports = academicYearRouter;
