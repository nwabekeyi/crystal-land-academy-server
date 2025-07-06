// routes/timetable.route.js
const express = require('express');
const {
  createTimetable,
  updateTimetable,
  getTeacherTimetables,
  getStudentTimetables,
  markAttendance,
} = require('../../../controllers/academic/timeTable.controller');
const isLoggedIn = require("../../../middlewares/isLoggedIn");
const isAdmin = require("../../../middlewares/isAdmin");
const isStudent = require("../../../middlewares/isStudent");
const isTeacher = require("../../../middlewares/isTeacher");


const router = express.Router();

// Admin routes
router
  .route('/time-table')
  .post(isLoggedIn, isAdmin, createTimetable);

router
  .route('/time-table/:timetableId')
  .put(isLoggedIn, isAdmin, updateTimetable);

// Teacher routes
router
  .route('/time-table/teacher')
  .get(isLoggedIn, isTeacher, getTeacherTimetables);

router
  .route('/time-table/:timetableId/attendance')
  .put(isLoggedIn, isTeacher, markAttendance);

// Student routes
router
  .route('/time-table/student')
  .get(isLoggedIn, isStudent, getStudentTimetables);

module.exports = router;