// src/routes/teacherDashboardRoutes.js
const express = require('express');
const router = express.Router();
const { getDashboardData } = require('../../../controllers/teacherDashboard');
const isTeacher= require('../../../middlewares/isTeacher')
const isLoggedIn = require('../../../middlewares/isLoggedIn')
// Get teacher dashboard data
router.get('/teacher-dashboard/:teacherId',isLoggedIn, isTeacher, getDashboardData);

module.exports = router;