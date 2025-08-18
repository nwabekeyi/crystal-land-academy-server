const responseStatus = require("../../handlers/responseStatus.handler");
const {
  studentCreateExamResultService,
  studentCheckExamResultService,
  getAllExamResultsService,
  teacherGetSingleExamResultsService,
  adminGetAllExamResultsService,
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
    const { examId, answeredQuestions, completedTime } = req.body;
    const studentId = req.userAuth.id; // Assuming userAuth is set by auth middleware

    if (!examId || !answeredQuestions) {
      return responseStatus(res, 400, "failed", "Exam ID and answered questions are required");
    }

    const result = await studentCreateExamResultService(res, { examId, answeredQuestions, completedTime }, studentId);
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
 * @desc Teacher get results for a single exam
 * @route GET /api/v1/exam-results/exam/:examId
 * @access Private (teachers only)
 */
exports.teacherGetSingleExamResultsController = async (req, res) => {
  try {
    const examId = req.params.examId;
    const teacherId = req.userAuth.id; // Assuming userAuth is set by auth middleware

    if (!examId) {
      return responseStatus(res, 400, "failed", "Exam ID is required");
    }

    const results = await teacherGetSingleExamResultsService(examId, teacherId, res);
    if (results) {
      responseStatus(res, 200, "success", results);
    }
    // No else needed; service handles error responses
  } catch (error) {
    console.error("Error in teacherGetSingleExamResultsController:", error.message);
    responseStatus(res, 500, "failed", "Internal server error");
  }
};

/**
 * @desc Admin get all exam results with filters and pagination
 * @route GET /api/v1/admin/exam-results
 * @access Private (admin only)
 */
exports.adminGetAllExamResultsController = async (req, res) => {
  try {
    const {
      academicYear,
      academicTerm,
      classLevel,
      subclass,
      subject,
      page = 1,
      limit = 10,
    } = req.query;
    const adminId = req.userAuth.id; // Assuming userAuth is set by auth middleware

    // Build filters object, only including defined values
    const filters = {};
    if (academicYear) filters.academicYear = academicYear;
    if (academicTerm) filters.academicTerm = academicTerm;
    if (classLevel) filters.classLevel = classLevel;
    if (subclass) filters.subclass = subclass;
    if (subject) filters.subject = subject;

    // Validate pagination parameters
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    if (isNaN(pageNum) || pageNum < 1 || isNaN(limitNum) || limitNum < 1) {
      return responseStatus(res, 400, "failed", "Invalid page or limit parameters");
    }

    const result = await adminGetAllExamResultsService(res, adminId, filters, pageNum, limitNum);
    if (result) {
      responseStatus(res, 200, "success", result);
    }
  } catch (error) {
    console.error("Error in adminGetAllExamResultsController:", error.message);
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