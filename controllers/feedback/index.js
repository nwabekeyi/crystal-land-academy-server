const responseStatus = require("../../handlers/responseStatus.handler");
const {
  createFeedbackService,
  getAllFeedbacksService,
  getFeedbackByIdService,
  deleteFeedbackService,
} = require("../../services/feedback/index");

/**
 * @desc Create Feedback
 * @route POST /api/v1/feedbacks
 * @access Public
 */
exports.submitFeedback = async (req, res) => {
  try {
    const newFeedback = await createFeedbackService(req.body);
    responseStatus(res, 201, "success", { message: "Feedback submitted successfully", feedback: newFeedback });
  } catch (error) {
    responseStatus(res, 400, "error", error.message);
  }
};

/**
 * @desc Get All Feedbacks with Search and Pagination
 * @route GET /api/v1/feedbacks
 * @access Private
 */
exports.getAllFeedbacks = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;

    // Pass search and pagination parameters to the service
    const feedbacks = await getAllFeedbacksService({ page, limit, search });
    responseStatus(res, 200, "success", feedbacks);
  } catch (error) {
    responseStatus(res, 500, "error", error.message);
  }
};

/**
 * @desc Get Feedback By ID
 * @route GET /api/v1/feedbacks/:id
 * @access Private
 */
exports.getFeedbackById = async (req, res) => {
  try {
    const feedback = await getFeedbackByIdService(req.params.id);
    responseStatus(res, 200, "success", feedback);
  } catch (error) {
    responseStatus(res, 404, "error", error.message);
  }
};

/**
 * @desc Delete Feedback
 * @route DELETE /api/v1/feedbacks/:id
 * @access Private
 */
exports.deleteFeedback = async (req, res) => {
  try {
    const deletedFeedback = await deleteFeedbackService(req.params.id);
    responseStatus(res, 200, "success", "Feedback deleted successfully");
  } catch (error) {
    responseStatus(res, 404, "error", error.message);
  }
};