const express = require("express");
const teachersRouter = express.Router();

// Middleware
const isLoggedIn = require("../../../middlewares/isLoggedIn");
const isAdmin = require("../../../middlewares/isAdmin");
const isTeacher = require("../../../middlewares/isTeacher");
const { createMulter } = require("../../../middlewares/fileUpload");

const upload = createMulter(); // Initialize Multer

// Controllers
const {
  adminRegisterTeacherController,
  teacherLoginController,
  getAllTeachersController,
  getTeacherProfileController,
  updateTeacherProfileController,
  adminUpdateTeacherProfileController,
  getAssignedClassesController,
  adminDeleteTeacherController,
  adminSuspendTeacherController, // Added
  adminWithdrawTeacherController,
  adminUnsuspendTeacherController, // Added
} = require("../../../controllers/staff/teachers.controller");

// Create teacher
teachersRouter
  .route("/create-teacher")
  .post(
    isLoggedIn,
    isAdmin,
    upload.single('profilePicture'),
    adminRegisterTeacherController
  );

// Teacher login
teachersRouter.route("/login").post(teacherLoginController);

// Get all teachers
teachersRouter
  .route("/teachers")
  .get(isLoggedIn, isAdmin, getAllTeachersController);

// Get teacher profile
teachersRouter
  .route("/teachers/profile/:teacherId")
  .get(isLoggedIn, isTeacher, getTeacherProfileController);

// Teacher update own profile
teachersRouter
  .route("/teachers")
  .patch(
    isLoggedIn,
    isTeacher,
    upload.single('photo'),
    updateTeacherProfileController
  );

// Admin update teacher profile
teachersRouter
  .route("/teachers/update/:id")
  .patch(
    isLoggedIn,
    isAdmin,
    upload.single('photo'),
    adminUpdateTeacherProfileController
  );

// Get assigned classes for a teacher
teachersRouter
  .route("teachers/class-levels/assigned")
  .get(isLoggedIn, isTeacher, getAssignedClassesController);

// Delete teacher by admin
teachersRouter
  .route("/teachers/delete/:teacherId")
  .delete(isLoggedIn, isAdmin, adminDeleteTeacherController);

// Suspend teacher by admin
teachersRouter
  .route("/teachers/suspend/:teacherId")
  .patch(isLoggedIn, isAdmin, adminSuspendTeacherController);

  // Unsuspend teacher by admin
teachersRouter
.route("/teachers/unsuspend/:teacherId")
.patch(isLoggedIn, isAdmin, adminUnsuspendTeacherController);

// Withdraw teacher by admin
teachersRouter
  .route("/teachers/withdraw/:teacherId")
  .patch(isLoggedIn, isAdmin, adminWithdrawTeacherController);

module.exports = teachersRouter;