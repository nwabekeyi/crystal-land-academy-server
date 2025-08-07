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
  adminCreateExamController,
  adminGetAllExamsController,
  adminGetExamByIdController,
  adminUpdateExamController,
  adminDeleteExamController,
  adminApproveExamController,
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

module.exports = examRouter;