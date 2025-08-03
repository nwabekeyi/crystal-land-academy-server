// routes/academic/curriculum.js
const express = require("express");
const curriculumRouter = express.Router();
const isLoggedIn = require("../../../middlewares/isLoggedIn");
const isAdmin = require("../../../middlewares/isAdmin");
const isTeacher = require("../../../middlewares/isTeacher");
const {
  createCurriculumController,
  getAllCurriculaController,
  getCurriculumByIdController,
  updateCurriculumController,
  deleteCurriculumController,
  addTopicToCurriculumController,
  updateTopicInCurriculumController,
  removeTopicFromCurriculumController,
  markTopicAsCompletedController,
  getCurriculaForTeacherController,
  getCurriculaForStudentController,
} = require("../../../controllers/academic/curriculum.controller");

curriculumRouter
  .route("/curriculum")
  .get(getAllCurriculaController)
  .post(isLoggedIn, isAdmin, createCurriculumController);

curriculumRouter
  .route("/curriculum/:id")
  .get(getCurriculumByIdController)
  .patch(isLoggedIn, isAdmin, updateCurriculumController)
  .delete(isLoggedIn, isAdmin, deleteCurriculumController);

curriculumRouter
  .route("/curriculum/:curriculumId/topics")
  .post(isLoggedIn, isAdmin, addTopicToCurriculumController);

curriculumRouter
  .route("/curriculum/:curriculumId/topics/:topicId")
  .patch(isLoggedIn, isAdmin, updateTopicInCurriculumController)
  .delete(isLoggedIn, isAdmin, removeTopicFromCurriculumController);

curriculumRouter
  .route("/curriculum/:curriculumId/topics/:topicId/complete")
  .patch(isLoggedIn, isTeacher, markTopicAsCompletedController);

curriculumRouter
  .route("/curriculum/teacher/:teacherId")
  .get(isLoggedIn, getCurriculaForTeacherController);

curriculumRouter
  .route("/curriculum/student/:classLevelId")
  .get(isLoggedIn, getCurriculaForStudentController);

module.exports = curriculumRouter;