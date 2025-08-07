const {
  teacherCreateExamService,
  teacherGetAllExamsService,
  teacherGetExamByIdService,
  teacherUpdateExamService,
  teacherDeleteExamService,
  adminCreateExamService,
  adminGetAllExamsService,
  adminGetExamByIdService,
  adminUpdateExamService,
  adminDeleteExamService,
  adminApproveExamService,
} = require("../../services/academic/exams.service");
const responseStatus = require("../../handlers/responseStatus.handler");

/**
 * @desc Create new exam (Teacher)
 * @route POST /api/v1/teacher/exams
 * @access Private (Teacher Only)
 */
exports.teacherCreateExamController = async (req, res) => {
  try {
    const result = await teacherCreateExamService(req.body, req.userAuth.id);
    responseStatus(res, result.statusCode, result.status, result.data);
  } catch (error) {
    responseStatus(res, 500, "failed", error.message);
  }
};

/**
 * @desc Get all exams (Teacher)
 * @route GET /api/v1/teacher/exams
 * @access Private (Teacher Only)
 */
exports.teacherGetAllExamsController = async (req, res) => {
  try {
    const filters = {
      classLevel: req.query.classLevel,
      subject: req.query.subject,
      examStatus: req.query.examStatus,
      academicYear: req.query.academicYear,
      academicTerm: req.query.academicTerm,
    };
    const result = await teacherGetAllExamsService(req.userAuth.id, filters);
    responseStatus(res, 200, "success", result);
  } catch (error) {
    responseStatus(res, 500, "failed", error.message);
  }
};

/**
 * @desc Get exam by ID (Teacher)
 * @route GET /api/v1/teacher/exams/:examId
 * @access Private (Teacher Only)
 */
exports.teacherGetExamByIdController = async (req, res) => {
  try {
    const result = await teacherGetExamByIdService(req.params.examId, req.userAuth.id);
    responseStatus(res, result.statusCode, result.status, result.data);
  } catch (error) {
    responseStatus(res, 500, "failed", error.message);
  }
};

/**
 * @desc Update exam (Teacher)
 * @route PATCH /api/v1/teacher/exams/:examId
 * @access Private (Teacher Only)
 */
exports.teacherUpdateExamController = async (req, res) => {
  try {
    const result = await teacherUpdateExamService(req.body, req.params.examId, req.userAuth.id);
    responseStatus(res, result.statusCode, result.status, result.data);
  } catch (error) {
    responseStatus(res, 500, "failed", error.message);
  }
};

/**
 * @desc Delete exam (Teacher)
 * @route DELETE /api/v1/teacher/exams/:examId
 * @access Private (Teacher Only)
 */
exports.teacherDeleteExamController = async (req, res) => {
  try {
    const result = await teacherDeleteExamService(req.params.examId, req.userAuth.id);
    responseStatus(res, result.statusCode, result.status, result.data);
  } catch (error) {
    responseStatus(res, 500, "failed", error.message);
  }
};

/**
 * @desc Create new exam (Admin)
 * @route POST /api/v1/admin/exams
 * @access Private (Admin Only)
 */
exports.adminCreateExamController = async (req, res) => {
  try {
    const result = await adminCreateExamService(req.body, req.userAuth.id);
    responseStatus(res, result.statusCode, result.status, result.data);
  } catch (error) {
    responseStatus(res, 500, "failed", error.message);
  }
};

/**
 * @desc Get all exams (Admin)
 * @route GET /api/v1/admin/exams
 * @access Private (Admin Only)
 */
exports.adminGetAllExamsController = async (req, res) => {
  try {
    const filters = {
      classLevel: req.query.classLevel,
      subject: req.query.subject,
      examStatus: req.query.examStatus,
      academicYear: req.query.academicYear,
      academicTerm: req.query.academicTerm,
      createdBy: req.query.createdBy,
    };
    const result = await adminGetAllExamsService(req.userAuth.id, filters);
    responseStatus(res, 200, "success", result);
  } catch (error) {
    responseStatus(res, 500, "failed", error.message);
  }
};

/**
 * @desc Get exam by ID (Admin)
 * @route GET /api/v1/admin/exams/:examId
 * @access Private (Admin Only)
 */
exports.adminGetExamByIdController = async (req, res) => {
  try {
    const result = await adminGetExamByIdService(req.params.examId, req.userAuth.id);
    responseStatus(res, result.statusCode, result.status, result.data);
  } catch (error) {
    responseStatus(res, 500, "failed", error.message);
  }
};

/**
 * @desc Update exam (Admin)
 * @route PATCH /api/v1/admin/exams/:examId
 * @access Private (Admin Only)
 */
exports.adminUpdateExamController = async (req, res) => {
  try {
    const result = await adminUpdateExamService(req.body, req.params.examId, req.userAuth.id);
    responseStatus(res, result.statusCode, result.status, result.data);
  } catch (error) {
    responseStatus(res, 500, "failed", error.message);
  }
};

/**
 * @desc Delete exam (Admin)
 * @route DELETE /api/v1/admin/exams/:examId
 * @access Private (Admin Only)
 */
exports.adminDeleteExamController = async (req, res) => {
  try {
    const result = await adminDeleteExamService(req.params.examId, req.userAuth.id);
    responseStatus(res, result.statusCode, result.status, result.data);
  } catch (error) {
    responseStatus(res, 500, "failed", error.message);
  }
};

/**
 * @desc Approve exam (Admin)
 * @route PATCH /api/v1/admin/exams/:examId/approve
 * @access Private (Admin Only)
 */
exports.adminApproveExamController = async (req, res) => {
  try {
    const { startDate, startTime } = req.body;
    const result = await adminApproveExamService(req.params.examId, req.userAuth.id, startDate, startTime);
    responseStatus(res, result.statusCode, result.status, result.data);
  } catch (error) {
    responseStatus(res, 500, "failed", error.message);
  }
};