// routes/academic/exam.route.js
const express = require("express");
const examRouter = express.Router();
const isLoggedIn = require("../../../middlewares/isLoggedIn");
const isTeacher = require("../../../middlewares/isTeacher");
const isAdmin = require("../../../middlewares/isAdmin");
const {
  teacherCreateExamController,
  teacherGetAllExamsController,
  teacherGetExamByIdController,
  teacherUpdateExamController,
  teacherDeleteExamController,
  teacherAddQuestionToExamController, // New
  teacherGetQuestionsByExamController, // New
  teacherUpdateQuestionController, // New
  teacherDeleteQuestionController, // New
  adminCreateExamController,
  adminGetAllExamsController,
  adminGetExamByIdController,
  adminUpdateExamController,
  adminDeleteExamController,
  adminApproveExamController,
  adminAddQuestionToExamController,
  adminGetQuestionsByExamController,
  adminUpdateQuestionController,
  adminDeleteQuestionController,
} = require("../../../controllers/academic/exams.controller");

// Teacher Routes
examRouter
  .route("/teacher/exams")
  .get(isLoggedIn, isTeacher, teacherGetAllExamsController) // Get all exams (teacher only)
  .post(isLoggedIn, isTeacher, teacherCreateExamController); // Create exam (teacher only)

examRouter
  .route("/teacher/exams/:examId")
  .get(isLoggedIn, isTeacher, teacherGetExamByIdController) // Get exam by ID (teacher only)
  .patch(isLoggedIn, isTeacher, teacherUpdateExamController) // Update exam (teacher only)
  .delete(isLoggedIn, isTeacher, teacherDeleteExamController); // Delete exam (teacher only)

examRouter
  .route("/teacher/exams/:examId/questions")
  .post(isLoggedIn, isTeacher, teacherAddQuestionToExamController) // Add question to exam (teacher only)
  .get(isLoggedIn, isTeacher, teacherGetQuestionsByExamController); // Get all questions for an exam (teacher only)

examRouter
  .route("/teacher/exams/:examId/questions/:questionId")
  .patch(isLoggedIn, isTeacher, teacherUpdateQuestionController) // Update a specific question (teacher only)
  .delete(isLoggedIn, isTeacher, teacherDeleteQuestionController); // Delete a specific question (teacher only)

// Admin Routes
examRouter
  .route("/admin/exams")
  .get(isLoggedIn, isAdmin, adminGetAllExamsController) // Get all exams (admin only)
  .post(isLoggedIn, isAdmin, adminCreateExamController); // Create exam (admin only)

examRouter
  .route("/admin/exams/:examId")
  .get(isLoggedIn, isAdmin, adminGetExamByIdController) // Get exam by ID (admin only)
  .patch(isLoggedIn, isAdmin, adminUpdateExamController) // Update exam (admin only)
  .delete(isLoggedIn, isAdmin, adminDeleteExamController); // Delete exam (admin only)

examRouter
  .route("/admin/exams/:examId/approve")
  .patch(isLoggedIn, isAdmin, adminApproveExamController); // Approve exam (admin only)

examRouter
  .route("/admin/exams/:examId/questions")
  .post(isLoggedIn, isAdmin, adminAddQuestionToExamController) // Add question to exam (admin only)
  .get(isLoggedIn, isAdmin, adminGetQuestionsByExamController); // Get all questions for an exam (admin only)

examRouter
  .route("/admin/exams/:examId/questions/:questionId")
  .patch(isLoggedIn, isAdmin, adminUpdateQuestionController) // Update a specific question (admin only)
  .delete(isLoggedIn, isAdmin, adminDeleteQuestionController); // Delete a specific question (admin only)

module.exports = examRouter;