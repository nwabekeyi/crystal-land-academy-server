const express = require("express");
const academicTermRouter = express.Router();
const isAdmin = require("../../../middlewares/isAdmin");
const isLoggedIn = require("../../../middlewares/isLoggedIn");
const {
  getAcademicTermsController,
  getAcademicTermsByYearController,
  createAcademicTermController,
  getAcademicTermController,
  updateAcademicTermController,
  deleteAcademicTermController,
  getCurrentAcademicTermController,
} = require("../../../controllers/academic/academicTerm.controller");

academicTermRouter
  .route("/academic-term/current")
  .get(isLoggedIn, getCurrentAcademicTermController);

academicTermRouter
  .route("/academic-term")
  .get(isLoggedIn, getAcademicTermsController)
  .post(isLoggedIn, isAdmin, createAcademicTermController);

academicTermRouter
  .route("/academic-term/year/:academicYearId")
  .get(isLoggedIn, getAcademicTermsByYearController);

academicTermRouter
  .route("/academic-term/:id")
  .get(isLoggedIn, getAcademicTermController)
  .patch(isLoggedIn, isAdmin, updateAcademicTermController)
  .delete(isLoggedIn, isAdmin, deleteAcademicTermController);

module.exports = academicTermRouter;