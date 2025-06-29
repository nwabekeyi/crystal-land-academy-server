// passwordRoutes.js
const express = require('express');
const router = express.Router();
const {
  sendPasswordResetLinkController,
  resetPasswordController,
  confirmPasswordController,
  changePasswordController,
} = require('../../../controllers/password');

// Send password reset link
router.post('/send-reset-link', sendPasswordResetLinkController);

// Reset password
router.post('/reset-password', resetPasswordController);

// Confirm password
router.post('/confirm-password', confirmPasswordController); // Removed :userId/:role

// Change password
router.patch('/change-password', changePasswordController); // Removed :userId/:role

module.exports = router;