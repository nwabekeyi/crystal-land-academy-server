const responseStatus = require("../../handlers/responseStatus.handler");
const {
  adminRegisterTeacherService,
  teacherLoginService,
  getAllTeachersService,
  getTeacherProfileService,
  updateTeacherProfileService,
  adminUpdateTeacherProfileService,
} = require("../../services/staff/teachers.service");

/**
 * @desc Admin create teacher
 * @route POST /api/v1/create-teacher
 * @access Private (admin)
 **/
exports.createTeacherController = async (req, res) => {
  try {
    // Pass req.body, req.file (for profile picture), and admin ID from authenticated user
    await adminRegisterTeacherService(req.body, req.file, res);
  } catch (error) {
    responseStatus(res, 400, "failed", error.message);
  }
};

/**
 * @desc Teacher login
 * @route POST /api/v1/teacher/login
 * @access Public
 **/
exports.teacherLoginController = async (req, res) => {
  try {
    await teacherLoginService(req.body, res);
  } catch (error) {
    responseStatus(res, 400, "failed", error.message);
  }
};

/**
 * @desc Get all teachers
 * @route GET /api/v1/teachers
 * @access Private (admin)
 **/
exports.getAllTeachersController = async (req, res) => {
  try {
    await getAllTeachersService(res);
  } catch (error) {
    responseStatus(res, 400, "failed", error.message);
  }
};

/**
 * @desc Get teacher profile
 * @route GET /api/v1/teacher/profile/:teacherId
 * @access Private (teacher)
 **/
exports.getTeacherProfileController = async (req, res) => {
  try {
    await getTeacherProfileService(req.params.teacherId, res);
  } catch (error) {
    responseStatus(res, 400, "failed", error.message);
  }
};

/**
 * @desc Update teacher profile
 * @route PATCH /api/v1/teacher/update-profile
 * @access Private (Teacher)
 **/
exports.updateTeacherProfileController = async (req, res) => {
  try {
    // Pass req.body, req.file (for profile picture), and teacher ID from authenticated user
    await updateTeacherProfileService(req.body, req.file, req.userAuth.id, res);
  } catch (error) {
    responseStatus(res, 400, "failed", error.message);
  }
};

/**
 * @desc Admin update teacher profile
 * @route PATCH /api/v1/teacher/:teacherId/update-profile
 * @access Private (Admin)
 **/
exports.adminUpdateTeacherProfileController = async (req, res) => {
  try {
    // Pass req.body, req.file (for profile picture), and teacher ID from route params
    await adminUpdateTeacherProfileService(req.body, req.file, req.params.teacherId, res);
  } catch (error) {
    responseStatus(res, 400, "failed", error.message);
  }
};