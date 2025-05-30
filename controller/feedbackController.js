const Feedback = require('../models/schema/feedback');

// Add a new feedback
const addFeedback = async (req, res) => {
  const { name, role, date, comments } = req.body;

  try {
    const newFeedback = new Feedback({ name, role, date, comments });
    await newFeedback.save();
    res.status(201).json(newFeedback);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save feedback' });
  }
};

// Get all feedbacks
const getFeedbacks = async (req, res) => {
  try {
    const feedbacks = await Feedback.find();
    res.status(200).json(feedbacks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch feedbacks' });
  }
};

module.exports = {
  addFeedback,
  getFeedbacks,
};
