const Admin = require('../models/Staff/admin.model');
const responseStatus = require('../handlers/responseStatus.handler');

const isAdmin = async (req, res, next) => {
  try {
    // Check if req.userAuth exists
    if (!req.userAuth || !req.userAuth.id) {
      return responseStatus(res, 401, 'failed', 'Unauthorized: No user authentication data found');
    }

    const userId = req.userAuth.id;
    const admin = await Admin.findById(userId);

    if (!admin) {
      return responseStatus(res, 404, 'failed', 'Admin not found');
    }

    if (admin.role === 'admin') {
      next();
    } else {
      return responseStatus(res, 403, 'failed', 'Access Denied: Admin role required');
    }
  } catch (error) {
    return responseStatus(res, 500, 'failed', `Server Error: ${error.message}`);
  }
};

module.exports = isAdmin;