// routes/teachers.js
const express = require("express");
const teachersRouter = express.Router();

// Middleware
const isLoggedIn = require("../../../middlewares/isLoggedIn");
const isAdmin = require("../../../middlewares/isAdmin");
const isTeacher = require("../../../middlewares/isTeacher");
const { createMulter } = require("../../../middlewares/fileUpload"); // Import Multer config

const upload = createMulter(); // Initialize Multer

// Controllers
const {
  adminRegisterTeacherController, // Changed from createTeacherController
  teacherLoginController,
  getAllTeachersController,
  getTeacherProfileController,
  updateTeacherProfileController,
  adminUpdateTeacherProfileController,
} = require("../../../controllers/staff/teachers.controller");

// Create teacher
teachersRouter
  .route("/create-teacher")
  .post(
    isLoggedIn,
    isAdmin,
    upload.single('profilePicture'), // Upload profile picture
    adminRegisterTeacherController // Changed from createTeacherController
  );

// Teacher login
teachersRouter.route("/login").post(teacherLoginController);

// Get all teachers
teachersRouter
  .route("/teachers")
  .get(isLoggedIn, isAdmin, getAllTeachersController);

// Get teacher profile
teachersRouter
  .route("/teacher/profile/:teacherId")
  .get(isLoggedIn, isTeacher, getTeacherProfileController);

// Teacher update own profile
teachersRouter
  .route("/teacher/update")
  .patch(
    isLoggedIn,
    isTeacher,
    upload.single('photo'), // Optional profile picture update
    updateTeacherProfileController
  );

// Admin update teacher profile
teachersRouter
  .route("/teacher/:id/update")
  .patch(
    isLoggedIn,
    isAdmin,
    upload.single('photo'), // Upload profile picture
    adminUpdateTeacherProfileController
  );

module.exports = teachersRouter;