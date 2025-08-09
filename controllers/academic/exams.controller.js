// controllers/academic/exams.controller.js
const {
  teacherCreateExamService,
  teacherGetAllExamsService,
  teacherGetExamByIdService,
  teacherUpdateExamService,
  teacherDeleteExamService,
  teacherAddQuestionToExamService, // New
  teacherGetQuestionsByExamService, // New
  teacherUpdateQuestionService, // New
  teacherDeleteQuestionService, // New
  adminCreateExamService,
  adminGetAllExamsService,
  adminGetExamByIdService,
  adminUpdateExamService,
  adminDeleteExamService,
  adminApproveExamService,
  adminAddQuestionToExamService,
  adminGetQuestionsByExamService,
  adminUpdateQuestionService,
  adminDeleteQuestionService,
} = require("../../services/academic/exams.service");
const responseStatus = require("../../handlers/responseStatus.handler");

/**
 * @desc Create new exam (Teacher)
 * @route POST /api/v1/teacher/exams
 * @access Private (Teacher Only)
 */
exports.teacherCreateExamController = async (req, res) => {
  try {
    const result = await teacherCreateExamService(res, req.body, req.userAuth.id);
    if (result === null) return; // Error handled in service
    responseStatus(res, 201, "success", result);
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
    const result = await teacherGetAllExamsService(res, req.userAuth.id, filters);
    if (result === null) return; // Error handled in service
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
    const result = await teacherGetExamByIdService(res, req.params.examId, req.userAuth.id);
    if (result === null) return; // Error handled in service
    responseStatus(res, 200, "success", result);
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
    const result = await teacherUpdateExamService(res, req.body, req.params.examId, req.userAuth.id);
    if (result === null) return; // Error handled in service
    responseStatus(res, 200, "success", result);
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
    const result = await teacherDeleteExamService(res, req.params.examId, req.userAuth.id);
    if (result === null) return; // Error handled in service
    responseStatus(res, 200, "success", result);
  } catch (error) {
    responseStatus(res, 500, "failed", error.message);
  }
};

/**
 * @desc Add question to an exam (Teacher)
 * @route POST /api/v1/teacher/exams/:examId/questions
 * @access Private (Teacher Only)
 */
exports.teacherAddQuestionToExamController = async (req, res) => {
  try {
    const result = await teacherAddQuestionToExamService(res, req.params.examId, req.body, req.userAuth.id);
    if (result === null) return; // Error handled in service
    responseStatus(res, 201, "success", result);
  } catch (error) {
    responseStatus(res, 500, "failed", error.message);
  }
};

/**
 * @desc Get all questions for an exam (Teacher)
 * @route GET /api/v1/teacher/exams/:examId/questions
 * @access Private (Teacher Only)
 */
exports.teacherGetQuestionsByExamController = async (req, res) => {
  try {
    const result = await teacherGetQuestionsByExamService(res, req.params.examId, req.userAuth.id);
    if (result === null) return; // Error handled in service
    responseStatus(res, 200, "success", result);
  } catch (error) {
    responseStatus(res, 500, "failed", error.message);
  }
};

/**
 * @desc Update a question in an exam (Teacher)
 * @route PATCH /api/v1/teacher/exams/:examId/questions/:questionId
 * @access Private (Teacher Only)
 */
exports.teacherUpdateQuestionController = async (req, res) => {
  try {
    const result = await teacherUpdateQuestionService(
      res,
      req.params.examId,
      req.params.questionId,
      req.body,
      req.userAuth.id
    );
    if (result === null) return; // Error handled in service
    responseStatus(res, 200, "success", result);
  } catch (error) {
    responseStatus(res, 500, "failed", error.message);
  }
};

/**
 * @desc Delete a question from an exam (Teacher)
 * @route DELETE /api/v1/teacher/exams/:examId/questions/:questionId
 * @access Private (Teacher Only)
 */
exports.teacherDeleteQuestionController = async (req, res) => {
  try {
    const result = await teacherDeleteQuestionService(res, req.params.examId, req.params.questionId, req.userAuth.id);
    if (result === null) return; // Error handled in service
    responseStatus(res, 200, "success", result);
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
    const result = await adminCreateExamService(res, req.body, req.userAuth.id);
    if (result === null) return; // Error handled in service
    responseStatus(res, 201, "success", result);
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
    const result = await adminGetAllExamsService(res, req.userAuth.id, filters);
    if (result === null) return; // Error handled in service
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
    const result = await adminGetExamByIdService(res, req.params.examId, req.userAuth.id);
    if (result === null) return; // Error handled in service
    responseStatus(res, 200, "success", result);
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
    const result = await adminUpdateExamService(res, req.body, req.params.examId, req.userAuth.id);
    if (result === null) return; // Error handled in service
    responseStatus(res, 200, "success", result);
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
    const result = await adminDeleteExamService(res, req.params.examId, req.userAuth.id);
    if (result === null) return; // Error handled in service
    responseStatus(res, 200, "success", result);
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
    const result = await adminApproveExamService(res, req.params.examId, req.userAuth.id, startDate, startTime);
    if (result === null) return; // Error handled in service
    responseStatus(res, 200, "success", result);
  } catch (error) {
    responseStatus(res, 500, "failed", error.message);
  }
};

/**
 * @desc Add question to an exam (Admin)
 * @route POST /api/v1/admin/exams/:examId/questions
 * @access Private (Admin Only)
 */
exports.adminAddQuestionToExamController = async (req, res) => {
  try {
    const result = await adminAddQuestionToExamService(res, req.params.examId, req.body, req.userAuth.id);
    if (result === null) return; // Error handled in service
    responseStatus(res, 201, "success", result);
  } catch (error) {
    responseStatus(res, 500, "failed", error.message);
  }
};

/**
 * @desc Get all questions for an exam (Admin)
 * @route GET /api/v1/admin/exams/:examId/questions
 * @access Private (Admin Only)
 */
exports.adminGetQuestionsByExamController = async (req, res) => {
  try {
    const result = await adminGetQuestionsByExamService(res, req.params.examId, req.userAuth.id);
    if (result === null) return; // Error handled in service
    responseStatus(res, 200, "success", result);
  } catch (error) {
    responseStatus(res, 500, "failed", error.message);
  }
};

/**
 * @desc Update a question in an exam (Admin)
 * @route PATCH /api/v1/admin/exams/:examId/questions/:questionId
 * @access Private (Admin Only)
 */
exports.adminUpdateQuestionController = async (req, res) => {
  try {
    const result = await adminUpdateQuestionService(
      res,
      req.params.examId,
      req.params.questionId,
      req.body,
      req.userAuth.id
    );
    if (result === null) return; // Error handled in service
    responseStatus(res, 200, "success", result);
  } catch (error) {
    responseStatus(res, 500, "failed", error.message);
  }
};

/**
 * @desc Delete a question from an exam (Admin)
 * @route DELETE /api/v1/admin/exams/:examId/questions/:questionId
 * @access Private (Admin Only)
 */
exports.adminDeleteQuestionController = async (req, res) => {
  try {
    const result = await adminDeleteQuestionService(res, req.params.examId, req.params.questionId, req.userAuth.id);
    if (result === null) return; // Error handled in service
    responseStatus(res, 200, "success", result);
  } catch (error) {
    responseStatus(res, 500, "failed", error.message);
  }
};