// password.js
const { hashPassword, isPassMatched } = require('../../handlers/passHash.handler');
const { signJwt, verifyJwt } = require('../../handlers/jwt.handler');
const { sendEmail } = require('../../config/emailConfig');
const Student = require('../../models/Students/students.model');
const Admin = require('../../models/Staff/admin.model');
const Teacher = require('../../models/Staff/teachers.model');
const { prodUrl } = require('../../config/env.Config');

// Map roles to models
const models = {
  student: Student,
  admin: Admin,
  teacher: Teacher,
};

// Helper to find user by email across models
const findUserByEmail = async (email) => {
  if (!email) {
    throw new Error('Email is required');
  };

  for (const [role, Model] of Object.entries(models)) {
    const user = await Model.findOne({ email });
    if (user) {
      return { user, role };
    }
  }

  throw new Error('User not found');
};

// Generate password reset token (1 hour)
const generatePasswordResetToken = (userId, role) =>
  signJwt({ userId, role }, '1h');

// Send password reset link
const sendPasswordResetLink = async (email) => {
  const { user, role } = await findUserByEmail(email);

  const token = generatePasswordResetToken(user._id, role);
  const resetLink = `${prodUrl}/reset-password?token=${encodeURIComponent(token)}&role=${encodeURIComponent(role)}`;

  await sendEmail({
    to: email,
    template: 'resetPassword.ejs', // Specify EJS file in views/emails
    dynamicTemplateData: {
      resetLink,
      senderName: 'Crystal-land Int\'l Academy', // Optional: match senderName from env.Config
      year: new Date().getFullYear(), // Optional: for footer
    },
    subject: 'Reset Your Crystal Land Academy Password',
  });

  return { message: 'Password reset link sent to your email' };
};
// Reset password
const resetPassword = async (token, newPassword) => {
  if (!token || !newPassword) {
    throw new Error('Token and new password are required');
  }

  const decoded = verifyJwt(token);
  const { userId, role } = decoded;

  if (!models[role]) {
    throw new Error('Invalid role');
  }

  const Model = models[role];
  const user = await Model.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const hashedPassword = await hashPassword(newPassword);
  user.password = hashedPassword;
  await user.save();

  return { message: 'Password reset successful' };
};

// Confirm password
const confirmPassword = async (userId, role, password) => {
  if (!userId || !role || !password) {
    throw new Error('User ID, role, and password are required');
  }

  if (!models[role]) {
    throw new Error('Invalid role');
  }

  const Model = models[role];
  const user = await Model.findById(userId).select('+password');
  if (!user) {
    throw new Error('User not found');
  }

  const isMatch = await isPassMatched(password, user.password);
  if (!isMatch) {
    throw new Error('Incorrect password');
  }

  return { message: 'Password confirmed successfully' };
};

// Change password
const changePassword = async (userId, role, currentPassword, newPassword) => {
  if (!userId || !role || !currentPassword || !newPassword) {
    throw new Error('User ID, role, current password, and new password are required');
  }

  if (!models[role]) {
    throw new Error('Invalid role');
  }

  const Model = models[role];
  const user = await Model.findById(userId).select('+password');
  if (!user) {
    throw new Error('User not found');
  }

  // Verify current password
  const isMatch = await isPassMatched(currentPassword, user.password);
  if (!isMatch) {
    throw new Error('Current password is incorrect');
  }

  // Hash and update new password
  const hashedPassword = await hashPassword(newPassword);
  user.password = hashedPassword;
  await user.save();

  return { message: 'Password changed successfully' };
};

module.exports = {
  sendPasswordResetLink,
  resetPassword,
  confirmPassword,
  changePassword,
};