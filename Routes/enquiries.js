const express = require('express');
const {
  getEnquiries,
  postEnquiry,
  patchEnquiryReadStatus,
  deleteEnquiry,
} = require('../controller/enquiriesCon');

const router = express.Router();

// GET /enquiries - Fetch all enquiries
router.get('/api/v1/enquiries', getEnquiries);

// POST /enquiries - Create a new enquiry
router.post('/api/v1/enquiries', postEnquiry);

// PATCH /enquiries/:id - Toggle read status of an enquiry
router.patch('/api/v1/enquiries/:id', patchEnquiryReadStatus);

// DELETE /enquiries/:id - Delete an enquiry
router.delete('/api/v1/enquiries/:id', deleteEnquiry);

module.exports = router;
