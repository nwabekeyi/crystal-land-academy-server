const express = require("express");
const studentsRouter = express.Router();

// Middleware
const isLoggedIn = require("../../../middlewares/isLoggedIn");
const isAdmin = require("../../../middlewares/isAdmin");
const isStudent = require("../../../middlewares/isStudent");
const { createMulter } = require("../../../middlewares/fileUpload");

const upload = createMulter(); // Initialize Multer

// Controllers
const {
  adminRegisterStudentController,
  studentLoginController,
  getStudentProfileController,
  getAllStudentsByAdminController,
  getStudentByAdminController,
  studentUpdateProfileController,
  adminUpdateStudentController,
  studentWriteExamController,
  adminWithdrawStudentController,
  adminDeleteStudentController,
  adminSuspendStudentController, // Added
  adminUnsuspendStudentController
} = require("../../../controllers/students/students.controller");

// Create Student by Admin
studentsRouter
  .route("/students/admin/register")
  .post(
    isLoggedIn,
    isAdmin,
    upload.single('profilePicture'),
    adminRegisterStudentController
  );

// Student Login
studentsRouter.route("/students/login").post(studentLoginController);

// Get Student Profile
studentsRouter
  .route("admin/students/profile")
  .get(isLoggedIn, isStudent, getStudentProfileController);

// Get All Students by Admin
studentsRouter
  .route("/admin/students")
  .get(isLoggedIn, isAdmin, getAllStudentsByAdminController);

// Get Single Student by Admin
studentsRouter
  .route("/admin/students/:studentId")
  .get(isLoggedIn, isAdmin, getStudentByAdminController);

// Update Student Profile by Student
studentsRouter
  .route("/students/update")
  .patch(isLoggedIn, isStudent, upload.single('profilePicture'),
  studentUpdateProfileController);

// Admin Update Student Profile
studentsRouter
  .route("/admin/students/:studentId")
  .patch(
    isLoggedIn,
    isAdmin,
    upload.single('profilePicture'),
    adminUpdateStudentController
  );

// Student Write Exam
studentsRouter
  .route("admin/students/:examId/exam-write")
  .post(isLoggedIn, isStudent, studentWriteExamController);

// Admin Withdraw Student
studentsRouter
  .route("/admin/students/withdraw/:studentId")
  .patch(isLoggedIn, isAdmin, adminWithdrawStudentController);

// Delete Student by Admin
studentsRouter
  .route("/admin/students/delete/:studentId")
  .delete(isLoggedIn, isAdmin, adminDeleteStudentController);

// Suspend Student by Admin
studentsRouter
  .route("/admin/students/suspend/:studentId")
  .patch(isLoggedIn, isAdmin, adminSuspendStudentController);

  studentsRouter
  .route("/admin/students/unsuspend/:studentId")
  .patch(isLoggedIn, isAdmin, adminUnsuspendStudentController);

module.exports = studentsRouter;