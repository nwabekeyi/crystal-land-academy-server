const express = require("express");
const {
  submitEnquiry,
  getAllEnquiries,
  getEnquiryById,
  updateEnquiryStatus,
  deleteEnquiry,
} = require("../../../controllers/enquiry/index");

const enquiryRouter = express.Router();

// POST: Create a new enquiry
enquiryRouter.route("/enquiries").post(submitEnquiry);

// GET: Fetch all enquiries
enquiryRouter.route("/enquiries").get(getAllEnquiries);

// GET: Fetch a single enquiry by ID
enquiryRouter.route("/enquiries/:id").get(getEnquiryById);

// PUT: Update enquiry status
enquiryRouter.route("/enquiries/:id").patch(updateEnquiryStatus);

// DELETE: Delete an enquiry
enquiryRouter.route("/enquiries/:id").delete(deleteEnquiry);

module.exports = enquiryRouter;