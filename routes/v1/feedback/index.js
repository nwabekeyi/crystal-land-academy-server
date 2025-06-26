const express = require("express");
const feedbackRouter = express.Router();
const isAdmin = require("../../../middlewares/isAdmin");
const loggedIn = require("../../../middlewares/isLoggedIn");
// controllers
const {
  submitFeedback,
  getAllFeedbacks,
  getFeedbackById,
  deleteFeedback,
} = require("../../../controllers/feedback/index");

// GET: Fetch all feedback records with pagination and search
feedbackRouter
  .route("/feedbacks")
  .get(loggedIn,isAdmin, getAllFeedbacks);

// GET, DELETE: Manage a single feedback record by ID
feedbackRouter
  .route("/feedbacks/:id")
  .get(loggedIn,isAdmin, getFeedbackById)
  .delete(loggedIn,isAdmin, deleteFeedback);

// POST: Submit a new feedback record
feedbackRouter
  .route("/submit-feedback")
  .post(loggedIn, submitFeedback);

module.exports = feedbackRouter;