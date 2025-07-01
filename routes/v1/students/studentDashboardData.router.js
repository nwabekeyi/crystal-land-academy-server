// src/routes/staff/index.js
const express = require('express');
const router = express.Router();
const studentDashboardController = require('../../../controllers/students/studentDashboardData.comtroller');

router.get('/student-dashboard/:studentId', studentDashboardController);

module.exports = router;