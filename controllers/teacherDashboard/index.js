const { getTeacherDashboardData } = require('../../services/staff/teacherDashboard.service');
const responseStatus = require('../../handlers/responseStatus.handler'); // Import the responseStatus helper

const getDashboardData = async (req, res) => {
  try {
    const { teacherId } = req.params;
    if (!teacherId) {
      return responseStatus(res, 400, 'error', 'Teacher ID is required');
    }

    const data = await getTeacherDashboardData(teacherId);
    if (data.error) {
      return responseStatus(res, 400, 'error', data.error);
    }

    return responseStatus(res, 200, 'success', data);
  } catch (error) {
    return responseStatus(res, 500, 'error', 'Internal server error');
  }
};

module.exports = { getDashboardData };