// controllers/staff/teacher.controller.js
const {
  adminRegisterTeacherService,
  teacherLoginService,
  getAllTeachersService,
  getTeacherProfileService,
  updateTeacherProfileService,
  adminUpdateTeacherProfileService,
  getAssignedClassesService,
} = require("../../services/staff/teachers.service");
const responseStatus = require("../../handlers/responseStatus.handler");

/**
 * @desc Create Teacher
 * @route POST /api/v1/teachers/register
 * @access Private
 */
exports.adminRegisterTeacherController = async (req, res) => {
  try {
    const result = await adminRegisterTeacherService(req.body, req.file, req.userAuth.id);
    responseStatus(res, 201, "success", result);
  } catch (error) {
    responseStatus(res, error.statusCode || 500, "failed", error.message);
  }
};

/**
 * @desc Teacher Login
 * @route POST /api/v1/teachers/login
 * @access Public
 */
exports.teacherLoginController = async (req, res) => {
  try {
    const result = await teacherLoginService(req.body);
    responseStatus(res, 200, "success", result);
  } catch (error) {
    responseStatus(res, error.statusCode || 500, "failed", error.message);
  }
};

/**
 * @desc Get all Teachers
 * @route GET /api/v1/teachers
 * @access Private
 */
exports.getAllTeachersController = async (req, res) => {
  try {
    const teachers = await getAllTeachersService();
    responseStatus(res, 200, "success", teachers);
  } catch (error) {
    responseStatus(res, error.statusCode || 500, "failed", error.message);
  }
};

/**
 * @desc Get Teacher Profile
 * @route GET /api/v1/teachers/:id
 * @access Private
 */
exports.getTeacherProfileController = async (req, res) => {
  try {
    const teacher = await getTeacherProfileService(req.params.id);
    responseStatus(res, 200, "success", teacher);
  } catch (error) {
    responseStatus(res, error.statusCode || 500, "failed", error.message);
  }
};

/**
 * @desc Update Teacher Profile (by teacher)
 * @route PATCH /api/v1/teachers/profile
 * @access Private
 */
exports.updateTeacherProfileController = async (req, res) => {
  try {
    const result = await updateTeacherProfileService(req.body, req.file, req.userAuth.id);
    responseStatus(res, 200, "success", result);
  } catch (error) {
    responseStatus(res, error.statusCode || 500, "failed", error.message);
  }
};

/**
 * @desc Update Teacher Profile (by admin)
 * @route PATCH /api/v1/teachers/:id
 * @access Private
 */
exports.adminUpdateTeacherProfileController = async (req, res) => {
  try {
    const result = await adminUpdateTeacherProfileService(req.body, req.file, req.params.id);
    responseStatus(res, 200, "success", result);
  } catch (error) {
    responseStatus(res, error.statusCode || 500, "failed", error.message);
  }
};

/**
 * @desc Get Assigned Classes for a Teacher
 * @route GET /api/v1/class-levels/assigned
 * @access Private
 */
exports.getAssignedClassesController = async (req, res) => {
  try {
    const classes = await getAssignedClassesService(req.userAuth.id);
    responseStatus(res, 200, "success", classes);
  } catch (error) {
    responseStatus(res, error.statusCode || 500, "failed", error.message);
  }
};