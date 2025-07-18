const express = require('express');
const {
  getTimetablesController,
  getStudentTimetableController,
  getTeacherTimetableController,
  createTimetableController,
  updateTimetableController,
  deleteTimetableController,
  markAttendanceController,
} = require('../../../controllers/academic/timeTable.controller');
const isLoggedIn = require('../../../middlewares/isLoggedIn');
const isAdmin = require('../../../middlewares/isAdmin');
const isTeacher = require('../../../middlewares/isTeacher');
const isStudent = require('../../../middlewares/isStudent');

const router = express.Router();

// Admin routes
router
  .route('/time-table')
  .get(isLoggedIn, isAdmin, getTimetablesController) // Admin: Filter by classLevel/subclassLetter
  .post(isLoggedIn, isAdmin, createTimetableController);

// Student route
router
  .route('/time-table/student/:studentId')
  .get(isLoggedIn, isStudent, getStudentTimetableController);

// Teacher route
router
  .route('/time-table/teacher/:teacherId')
  .get(isLoggedIn, isTeacher, getTeacherTimetableController);

// Admin/Teacher routes
router
  .route('/time-table/:timetableId')
  .put(isLoggedIn, isAdmin, updateTimetableController)
  .delete(isLoggedIn, isAdmin, deleteTimetableController);

router
  .route('/time-table/:timetableId/attendance')
  .put(isLoggedIn, isTeacher, markAttendanceController);

module.exports = router;