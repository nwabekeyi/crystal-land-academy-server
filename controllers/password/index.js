// passwordController.js
const responseStatus = require('../../handlers/responseStatus.handler');
const {
  sendPasswordResetLink,
  resetPassword,
  confirmPassword,
  changePassword,
} = require('../../services/password');

// Send password reset link
const sendPasswordResetLinkController = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return responseStatus(res, 400, 'error', 'Email is required');
    }

    const result = await sendPasswordResetLink(email);
    return responseStatus(res, 200, 'success', result);
  } catch (error) {
    return responseStatus(res, 400, 'error', error.message);
  }
};

// Reset password
const resetPasswordController = async (req, res) => {
  try {
    const { token } = req.query;
    const { newPassword } = req.body;
    if (!token || !newPassword) {
      return responseStatus(res, 400, 'error', 'Token and new password are required');
    }

    const result = await resetPassword(token, newPassword);
    return responseStatus(res, 200, 'success', result);
  } catch (error) {
    return responseStatus(res, 400, 'error', error.message);
  }
};

// Confirm password
const confirmPasswordController = async (req, res) => {
  try {
    const { userId, role } = req.body; // Changed from req.params
    const { password } = req.body;
    if (!userId || !role || !password) {
      return responseStatus(res, 400, 'error', 'User ID, role, and password are required');
    }

    const result = await confirmPassword(userId, role, password);
    return responseStatus(res, 200, 'success', result);
  } catch (error) {
    return responseStatus(res, 400, 'error', error.message);
  }
};

// Change password
const changePasswordController = async (req, res) => {
  try {
    const { userId, role, currentPassword, newPassword } = req.body; // Extract from body
    if (!userId || !role || !currentPassword || !newPassword) {
      return responseStatus(res, 400, 'error', 'User ID, role, current password, and new password are required');
    }

    const result = await changePassword(userId, role, currentPassword, newPassword);
    return responseStatus(res, 200, 'success', result);
  } catch (error) {
    return responseStatus(res, 400, 'error', error.message);
  }
};

module.exports = {
  sendPasswordResetLinkController,
  resetPasswordController,
  confirmPasswordController,
  changePasswordController,
};