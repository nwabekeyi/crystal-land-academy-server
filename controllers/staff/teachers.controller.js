const {
  adminRegisterTeacherService,
  teacherLoginService,
  getAllTeachersService,
  getTeacherProfileService,
  updateTeacherProfileService,
  adminUpdateTeacherProfileService,
  getAssignedClassesService,
  adminDeleteTeacherService,
  adminSuspendTeacherService,
  adminUnsuspendTeacherService,
} = require("../../services/staff/teachers.service");
const responseStatus = require("../../handlers/responseStatus.handler");

/**
 * @desc Create Teacher
 * @route POST /api/v1/teachers/register
 * @access Private
 */
exports.adminRegisterTeacherController = async (req, res) => {
  try {
    await adminRegisterTeacherService(req.body, req.file, req.userAuth.id, res);
  } catch (error) {
    responseStatus(res, 400, "failed", error.message);
  }
};

/**
 * @desc Teacher Login
 * @route POST /api/v1/teachers/login
 * @access Public
 */
exports.teacherLoginController = async (req, res) => {
  try {
    await teacherLoginService(req.body, res);
  } catch (error) {
    responseStatus(res, 400, "failed", error.message);
  }
};



/**
 * @desc Get all Teachers by Admin (paginated and filtered)
 * @route GET /api/v1/teachers/admin
 * @access Private Admin only
 */
exports.getAllTeachersController = async (req, res) => {
  try {
    await getAllTeachersService(req.query, res);
  } catch (error) {
    responseStatus(res, 400, "failed", error.message);
  }
};

/**
 * @desc Get Teacher Profile
 * @route GET /api/v1/teachers/:id
 * @access Private
 */
exports.getTeacherProfileController = async (req, res) => {
  try {
    await getTeacherProfileService(req.params.id, res);
  } catch (error) {
    responseStatus(res, 400, "failed", error.message);
  }
};

/**
 * @desc Update Teacher Profile (by teacher)
 * @route PATCH /api/v1/teachers/profile
 * @access Private
 */
exports.updateTeacherProfileController = async (req, res) => {
  try {
    await updateTeacherProfileService(req.body, req.file, req.userAuth.id, res);
  } catch (error) {
    responseStatus(res, 400, "failed", error.message);
  }
};

/**
 * @desc Update Teacher Profile (by admin)
 * @route PATCH /api/v1/teachers/:id
 * @access Private
 */
exports.adminUpdateTeacherProfileController = async (req, res) => {
  try {
    await adminUpdateTeacherProfileService(req.body, req.file, req.params.id, res);
  } catch (error) {
    responseStatus(res, 400, "failed", error.message);
  }
};

/**
 * @desc Get Assigned Classes for a Teacher
 * @route GET /api/v1/class-levels/assigned
 * @access Private
 */
exports.getAssignedClassesController = async (req, res) => {
  try {
    await getAssignedClassesService(req.userAuth.id, res);
  } catch (error) {
    responseStatus(res, 400, "failed", error.message);
  }
};


/**
 * @desc Admin Delete Teacher
 * @route DELETE /api/v1/teachers/admin/delete/:teacherId
 * @access Private Admin only
 */
exports.adminDeleteTeacherController = async (req, res) => {
  try {
    await adminDeleteTeacherService(req.params.teacherId, res);
  } catch (error) {
    responseStatus(res, 400, "failed", error.message);
  }
};


/**
 * @desc Admin Suspend Teacher
 * @route PATCH /api/v1/teachers/suspend/:teacherId
 * @access Private Admin only
 */
exports.adminSuspendTeacherController = async (req, res) => {
  try {
    await adminSuspendTeacherService(req.params.teacherId, res);
  } catch (error) {
    responseStatus(res, 400, "failed", error.message);
  }
};

/**
 * @desc Admin Withdraw Teacher
 * @route PATCH /api/v1/teachers/withdraw/:teacherId
 * @access Private Admin only
 */
exports.adminWithdrawTeacherController = async (req, res) => {
  try {
    await adminWithdrawTeacherService(req.params.teacherId, res);
  } catch (error) {
    responseStatus(res, 400, "failed", error.message);
  }
};


/**
 * @desc Admin Unsuspend Teacher
 * @route PATCH /api/v1/teachers/unsuspend/:teacherId
 * @access Private Admin only
 */
exports.adminUnsuspendTeacherController = async (req, res) => {
  try {
    await adminUnsuspendTeacherService(req.params.teacherId, res);
  } catch (error) {
    responseStatus(res, 400, "failed", error.message);
  }
};
