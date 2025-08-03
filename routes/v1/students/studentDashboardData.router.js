const express = require('express');
const router = express.Router();
const  getStudentDashboard = require('../../../controllers/students/studentDashboardData.comtroller');
const isStudent = require('../../../middlewares/isStudent'); // Assuming middleware path
const isLoggedIn = require('../../../middlewares/isLoggedIn')
router.get('/student-dashboard', isLoggedIn, isStudent, getStudentDashboard); // Removed :studentId

module.exports = router;