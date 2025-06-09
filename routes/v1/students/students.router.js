// routes/students.js
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
} = require("../../../controllers/students/students.controller");

// Create Student by Admin
studentsRouter
  .route("/students/admin/register")
  .post(
    isLoggedIn,
    isAdmin,
    upload.single('profilePicture'), // Apply Multer for profile picture upload
    adminRegisterStudentController
  );

// Student Login
studentsRouter.route("/students/login").post(studentLoginController);

// Get Student Profile
studentsRouter
  .route("/students/profile")
  .get(isLoggedIn, isStudent, getStudentProfileController);

// Get All Students by Admin
studentsRouter
  .route("/admin/students")
  .get(isLoggedIn, isAdmin, getAllStudentsByAdminController);

// Get Single Student by Admin
studentsRouter
  .route("/:studentId/admin")
  .get(isLoggedIn, isAdmin, getStudentByAdminController);

// Update Student Profile by Student
studentsRouter
  .route("/update")
  .patch(isLoggedIn, isStudent, studentUpdateProfileController);

// Admin Update Student Profile
studentsRouter
  .route("/:studentId/update/admin")
  .patch(
    isLoggedIn,
    isAdmin,
    upload.single('profilePicture'), // Apply Multer for profile picture update
    adminUpdateStudentController
  );

// Student Write Exam
studentsRouter
  .route("/students/:examId/exam-write")
  .post(isLoggedIn, isStudent, studentWriteExamController);

module.exports = studentsRouter;