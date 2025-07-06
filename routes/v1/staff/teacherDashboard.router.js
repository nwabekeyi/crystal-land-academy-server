// src/routes/teacherDashboardRoutes.js
const express = require('express');
const router = express.Router();
const { getDashboardData } = require('../../../controllers/teacherDashboard');
const isTeacher= require('../../../middlewares/isTeacher')
// Get teacher dashboard data
router.get('/teacher-dashboard/:teacherId', getDashboardData);

module.exports = router;