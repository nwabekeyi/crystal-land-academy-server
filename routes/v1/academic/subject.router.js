const express = require("express");
const subjectRouter = express.Router();
const isAdmin = require("../../../middlewares/isAdmin");
const isLoggedIn = require("../../../middlewares/isLoggedIn");
const isTeacher = require("../../../middlewares/isTeacher");
const isStudent = require("../../../middlewares/isStudent");

const {
  getSubjectsController,
  getSubjectController,
  updateSubjectController,
  deleteSubjectController,
  createSubjectController,
  getSubjectsForSubclassController,
  getSubjectsByClassLevelController,
  getSubjectsForTeacherController,
  getTeacherSubjectsByClassController,
  getStudentsBySubjectController,
} = require("../../../controllers/academic/subject.controller");

subjectRouter
  .route("/subjects")
  .get(isLoggedIn, isAdmin, getSubjectsController)
  .post(isLoggedIn, isAdmin, createSubjectController);

subjectRouter
  .route("/subjects/subclass/filter")
  .get(isLoggedIn, isAdmin, getSubjectsForSubclassController);

subjectRouter
  .route("/subjects/class/:classLevelId")
  .get(isLoggedIn, isAdmin, getSubjectsByClassLevelController);

subjectRouter
  .route("/subjects/:id")
  .get(isLoggedIn, isAdmin, getSubjectController)
  .patch(isLoggedIn, isAdmin, updateSubjectController)
  .delete(isLoggedIn, isAdmin, deleteSubjectController);

subjectRouter
  .route("/subjects/teacher/:teacherId")
  .get(isLoggedIn, isTeacher, getSubjectsForTeacherController);

subjectRouter
  .route("/subjects/class/:classLevelId/teacher/:teacherId")
  .get(isLoggedIn, isTeacher, getTeacherSubjectsByClassController);

subjectRouter
  .route("/subjects/class/:classLevelId/subclassLetter/:subclassLetter/students")
  .get(isLoggedIn, isTeacher, getStudentsBySubjectController);

module.exports = subjectRouter;