const express = require("express");
const subjectRouter = express.Router();
// Middlewares
const isAdmin = require("../../../middlewares/isAdmin");
const isLoggedIn = require("../../../middlewares/isLoggedIn");
// Controllers
const {
  getSubjectsController,
  getSubjectController,
  updateSubjectController,
  deleteSubjectController,
  createSubjectController,
  getSubjectsForSubclassController,
  getSubjectsForTeacherController,

} = require("../../../controllers/academic/subject.controller");

subjectRouter.route("/subjects").get(isLoggedIn, isAdmin, getSubjectsController);
subjectRouter.route("/subjects").post(isLoggedIn, isAdmin, createSubjectController);
subjectRouter
  .route("/subjects/subclass/filter")
  .get(isLoggedIn, isAdmin, getSubjectsForSubclassController);
subjectRouter
  .route("/subjects/:id")
  .get(isLoggedIn, isAdmin, getSubjectController)
  .patch(isLoggedIn, isAdmin, updateSubjectController)
  .delete(isLoggedIn, isAdmin, deleteSubjectController);
subjectRouter
  .route("/subjects/teacher/:teacherId")
  .get(isLoggedIn, isAdmin, getSubjectsForTeacherController);

module.exports = subjectRouter;