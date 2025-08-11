const express = require("express");
const resultsRouter = express.Router();
// Middleware
const isLoggedIn = require("../../../middlewares/isLoggedIn");
const isStudent = require("../../../middlewares/isStudent");
const isTeacher = require("../../../middlewares/isTeacher");
const isAdmin = require("../../../middlewares/isAdmin");
// Controllers
const {
  studentCreateExamResultController,
  studentCheckExamResultController,
  getAllExamResultsController,
  adminPublishResultsController,
  adminUnPublishResultsController,
} = require("../../../controllers/academic/results.controller");

// Student: Create exam result
resultsRouter
  .route("/exam-results")
  .post(isLoggedIn, isStudent, studentCreateExamResultController);

// Student: Check exam result
resultsRouter
  .route("/exam-results/:examId/check")
  .post(isLoggedIn, isStudent, studentCheckExamResultController);

// Teacher: Get all exam results for a class
resultsRouter
  .route("/exam-results/:classLevelId")
  .get(isLoggedIn, isTeacher, getAllExamResultsController);

// Admin: Publish exam results
resultsRouter
  .route("/exam-results/admin/publish/result/:examId")
  .patch(isLoggedIn, isAdmin, adminPublishResultsController);

// Admin: Unpublish exam results
resultsRouter
  .route("/exam-results/admin/unpublish/result/:examId")
  .patch(isLoggedIn, isAdmin, adminUnPublishResultsController);

module.exports = resultsRouter;