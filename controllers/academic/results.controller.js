const responseStatus = require("../../handlers/responseStatus.handler");
const {
  studentCreateExamResultService,
  studentCheckExamResultService,
  getAllExamResultsService,
  adminPublishResultService,
  adminUnPublishResultService,
} = require("../../services/academic/results.service");

/**
 * @desc Create exam result
 * @route POST /api/v1/exam-results
 * @access Private (students only)
 */
exports.studentCreateExamResultController = async (req, res) => {
  try {
    const { examId, answeredQuestions } = req.body;
    const studentId = req.userAuth.id; // Assuming userAuth is set by auth middleware

    if (!examId || !answeredQuestions) {
      return responseStatus(res, 400, "failed", "Exam ID and answered questions are required");
    }

    const result = await studentCreateExamResultService(res, { examId, answeredQuestions }, studentId);
    if (result) {
      responseStatus(res, 201, "success", result);
    }
  } catch (error) {
    console.error("Error in studentCreateExamResultController:", error.message);
    responseStatus(res, 400, "failed", error.message);
  }
};

/**
 * @desc Check exam result
 * @route POST /api/v1/exam-result/:examId/check
 * @access Private (students only)
 */
exports.studentCheckExamResultController = async (req, res) => {
  try {
    const result = await studentCheckExamResultService(req.params.examId, req.userAuth.id, res);
    if (result) {
      responseStatus(res, 200, "success", result);
    }
  } catch (error) {
    console.error("Error in studentCheckExamResultController:", error.message);
    responseStatus(res, 400, "failed", error.message);
  }
};

/**
 * @desc Get all exam results for a class
 * @route GET /api/v1/exam-results/:classLevelId
 * @access Private (teachers only)
 */
exports.getAllExamResultsController = async (req, res) => {
  try {
    const results = await getAllExamResultsService(req.params.classLevelId, req.userAuth.id, res);
    if (results) {
      responseStatus(res, 200, "success", results);
    }
  } catch (error) {
    console.error("Error in getAllExamResultsController:", error.message);
    responseStatus(res, 400, "failed", error.message);
  }
};

/**
 * @desc Admin publishes exam result
 * @route PATCH /api/v1/admin/publish/result/:examId
 * @access Private (admin only)
 */
exports.adminPublishResultsController = async (req, res) => {
  try {
    const result = await adminPublishResultService(req.params.examId, res);
    if (result) {
      responseStatus(res, 200, "success", result);
    }
  } catch (error) {
    console.error("Error in adminPublishResultsController:", error.message);
    responseStatus(res, 400, "failed", error.message);
  }
};

/**
 * @desc Admin unpublishes exam result
 * @route PATCH /api/v1/admin/unpublish/result/:examId
 * @access Private (admin only)
 */
exports.adminUnPublishResultsController = async (req, res) => {
  try {
    const result = await adminUnPublishResultService(req.params.examId, res);
    if (result) {
      responseStatus(res, 200, "success", result);
    }
  } catch (error) {
    console.error("Error in adminUnPublishResultsController:", error.message);
    responseStatus(res, 400, "failed", error.message);
  }
};
