const Feedback = require("../../models/feedback/index");

/**
 * @desc Create Feedback
 * @param {Object} feedbackData - The feedback data to be created
 * @returns {Object} - The created feedback
 */
exports.createFeedbackService = async (feedbackData) => {
  try {
    const feedback = new Feedback(feedbackData);
    return await feedback.save();
  } catch (error) {
    throw new Error("Failed to create feedback");
  }
};

/**
 * @desc Get All Feedbacks with Search and Pagination
 * @param {Object} queryParams - The query parameters for search and pagination
 * @returns {Object} - The feedbacks with pagination details
 */
exports.getAllFeedbacksService = async ({ page, limit, search }) => {
  try {
    const query = {
      $or: [
        { name: { $regex: search, $options: "i" } }, // Search by name
        { role: { $regex: search, $options: "i" } }, // Search by role
        { comments: { $regex: search, $options: "i" } }, // Search by comments
      ],
    };

    const feedbacks = await Feedback.find(query)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .exec();

    const totalFeedbacks = await Feedback.countDocuments(query);

    return {
      feedbacks,
      totalFeedbacks,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalFeedbacks / limit),
    };
  } catch (error) {
    throw new Error("Failed to fetch feedbacks");
  }
};

/**
 * @desc Get Feedback By ID
 * @param {String} id - The ID of the feedback to retrieve
 * @returns {Object} - The feedback data
 */
exports.getFeedbackByIdService = async (id) => {
  try {
    const feedback = await Feedback.findById(id);
    if (!feedback) {
      throw new Error("Feedback not found");
    }
    return feedback;
  } catch (error) {
    throw new Error("Failed to fetch feedback");
  }
};

/**
 * @desc Delete Feedback
 * @param {String} id - The ID of the feedback to delete
 * @returns {Object} - The deleted feedback
 */
exports.deleteFeedbackService = async (id) => {
  try {
    const feedback = await Feedback.findByIdAndDelete(id);
    if (!feedback) {
      throw new Error("Feedback not found");
    }
    return feedback;
  } catch (error) {
    throw new Error("Failed to delete feedback");
  }
};