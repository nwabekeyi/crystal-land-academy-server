const Inquiry = require('../models/schema/inquiry');

// Add a new inquiry
const addInquiry = async (req, res) => {
  const { name, email, date, message } = req.body;

  try {
    const newInquiry = new Inquiry({ name, email, date, message });
    await newInquiry.save();
    res.status(201).json(newInquiry);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save inquiry' });
  }
};

// Get all inquiries
const getInquiries = async (req, res) => {
  try {
    const inquiries = await Inquiry.find();
    res.status(200).json(inquiries);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch inquiries' });
  }
};

module.exports = {
  addInquiry,
  getInquiries,
};
