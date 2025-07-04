// src/controllers/studentDashboardController.js
const responseStatus = require('../../handlers/responseStatus.handler');
const { getStudentDashboardData } = require('../../services/students/studentDashboardData.service');

const getStudentDashboard = async (req, res) => {
  try {
    const { studentId } = req.params;
    if (!studentId) {
      return responseStatus(res, 400, 'error', 'Student ID is required');
    }

    const data = await getStudentDashboardData(studentId);
    if (data.error) {
      return responseStatus(res, 400, 'error', data.error);
    }

    return responseStatus(res, 200, 'success', data);
  } catch (error) {
    console.error('Error in studentDashboardController:', error);
    return responseStatus(res, 500, 'error', 'Internal server error');
  }
};

module.exports =  getStudentDashboard ;