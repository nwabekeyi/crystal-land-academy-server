const responseStatus = require("../../handlers/responseStatus.handler");
const {
  adminRegisterStudentService,
  studentLoginService,
  getStudentsProfileService,
  getAllStudentsByAdminService,
  getStudentByAdminService,
  studentUpdateProfileService,
  adminUpdateStudentService,
  studentWriteExamService,
  adminWithdrawStudentService
} = require("../../services/students/students.service");

/**
 * @desc Admin Register Student
 * @route POST /api/students/admin/register
 * @access Private Admin only
 */
exports.adminRegisterStudentController = async (req, res) => {
  const file = req.file || (req.files && req.files[0]);
  await adminRegisterStudentService(req.body, file, res);
};

/**
 * @desc Login student
 * @route POST /api/v1/students/login
 * @access Public
 **/
exports.studentLoginController = async (req, res) => {
  try {
    await studentLoginService(req.body, res);
  } catch (error) {
    responseStatus(res, 400, "failed", error.message);
  }
};

/**
 * @desc Student Profile
 * @route GET /api/v1/students/profile
 * @access Private Student only
 **/
exports.getStudentProfileController = async (req, res) => {
  try {
    await getStudentsProfileService(req.userAuth.id, res);
  } catch (error) {
    responseStatus(res, 400, "failed", error.message);
  }
};

/**
 * @desc Get all Students
 * @route GET /api/v1/admin/students
 * @access Private admin only
 **/
exports.getAllStudentsByAdminController = async (req, res) => {
  try {
    const students = await getAllStudentsByAdminService(res); // Remove res from service call
  } catch (error) {
    return responseStatus(res, 400, "failed", error.message);
  }
};

/**
 * @desc Get Single Student
 * @route GET /api/v1/students/:studentID/admin
 * @access Private admin only
 **/
exports.getStudentByAdminController = async (req, res) => {
  try {
    const result = await getStudentByAdminService(req.userAuth.id);
    responseStatus(res, 200, "success", result);
  } catch (error) {
    responseStatus(res, 400, "failed", error.message);
  }
};

/**
 * @desc Student updating profile
 * @route UPDATE /api/v1/students/update
 * @access Private Student only
 **/
exports.studentUpdateProfileController = async (req, res) => {
  try {
    await studentUpdateProfileService(req.body, req.userAuth.id, res);
  } catch (error) {
    responseStatus(res, 400, "failed", error.message);
  }
};

/**
 * @desc Admin updating Students eg: Assigning classes....
 * @route UPDATE /api/v1/students/:studentID/update/admin
 * @access Private Admin only
 **/
exports.adminUpdateStudentController = async (req, res) => {
  try {
    await adminUpdateStudentService(req.body, req.params.studentId);
  } catch (error) {
    responseStatus(res, 400, "failed", error.message);
  }
};

/**
 * @desc Students taking exams
 * @route POST /api/v1/students/:examId/exam-write
 * @access Private Students only
 **/
exports.studentWriteExamController = async (req, res) => {
  try {
    await studentWriteExamService(
      req.body,
      req.userAuth.id,
      req.params.examId,
      res
    );
  } catch (error) {
    responseStatus(res, 400, "failed", error.message);
  }
};


/**
 * @desc Admin Withdraw Student
 * @route PATCH /api/v1/students/:studentId/withdraw/admin
 * @access Private Admin only
 */
exports.adminWithdrawStudentController = async (req, res) => {
  try {
    await adminWithdrawStudentService(req.params.studentId, res);
  } catch (error) {
    responseStatus(res, 400, "failed", error.message);
  }
};