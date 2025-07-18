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
  adminWithdrawStudentService,
  adminDeleteStudentService,
  adminSuspendStudentService,
  adminUnsuspendStudentService
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
    const result = await getAllStudentsByAdminService(req.query, res);
    if (result.status === "failed") return; // responseStatus already sent
    res.status(200).json(result);
  } catch (error) {
    responseStatus(res, 400, "failed", error.message);
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
 * @route PATCH /api/v1/students/:studentId/update/admin
 * @access Private Admin only
 */
exports.adminUpdateStudentController = async (req, res) => {
  try {
    await adminUpdateStudentService(req.body, req.file, req.params.studentId, res);
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


/**
 * @desc Admin Delete Student
 * @route DELETE /api/v1/students/:studentId/delete/admin
 * @access Private Admin only
 */
exports.adminDeleteStudentController = async (req, res) => {
  try {
    await adminDeleteStudentService(req.params.studentId, res);
  } catch (error) {
    responseStatus(res, 400, "failed", error.message);
  }
};


/**
 * @desc Admin Suspend Student
 * @route PATCH /api/v1/students/admin/students/suspend/:studentId
 * @access Private Admin only
 */
exports.adminSuspendStudentController = async (req, res) => {
  try {
    await adminSuspendStudentService(req.params.studentId, res);
  } catch (error) {
    responseStatus(res, 400, "failed", error.message);
  }
};

/**
 * @desc Admin Unsuspend Student
 * @route PATCH /api/v1/students/admin/students/unsuspend/:studentId
 * @access Private Admin only
 */
exports.adminUnsuspendStudentController = async (req, res) => {
  try {
    await adminUnsuspendStudentService(req.params.studentId, res);
  } catch (error) {
    responseStatus(res, 400, "failed", error.message);
  }
};