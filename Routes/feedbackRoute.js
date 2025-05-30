const express = require('express');
const { addFeedback, getFeedbacks } = require('../controller/feedbackController');

const router = express.Router();

// Route to add new feedback
router.post('/api/v1/feedbacks', addFeedback);

// Route to get all feedbacks
router.get('/api/v1/feedbacks', getFeedbacks);

module.exports = router;
