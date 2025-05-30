const express = require('express');
const { addInquiry, getInquiries } = require('../controller/inquiryController');

const router = express.Router();

// Route to add a new inquiry
router.post('/api/v1/inquiries', addInquiry);

// Route to get all inquiries
router.get('/api/v1/inquiries', getInquiries);

module.exports = router;
