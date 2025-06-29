const responseStatus = require("../../handlers/responseStatus.handler");
const {
  createEnquiryService,
  getAllEnquiriesService,
  getEnquiryByIdService,
  updateEnquiryStatusService,
  deleteEnquiryService,
} = require("../../services/enquiry/index");

/**
 * @desc Create Enquiry
 * @route POST /api/v1/enquiries
 * @access Public
 */
exports.submitEnquiry = async (req, res) => {
  try {
    const newEnquiry = await createEnquiryService(req.body);
    responseStatus(res, 201, "success", { message: "Enquiry submitted successfully", enquiry: newEnquiry });
  } catch (error) {
    responseStatus(res, 400, "error", error.message);
  }
};

/**
 * @desc Get All Enquiries
 * @route GET /api/v1/enquiries
 * @access Private
 */
exports.getAllEnquiries = async (req, res) => {
  try {
    const enquiries = await getAllEnquiriesService(req.query);
    responseStatus(res, 200, "success", enquiries);
  } catch (error) {
    responseStatus(res, 500, "error", error.message);
  }
};

/**
 * @desc Get Enquiry By ID
 * @route GET /api/v1/enquiries/:id
 * @access Private
 */
exports.getEnquiryById = async (req, res) => {
  try {
    const enquiry = await getEnquiryByIdService(req.params.id);
    responseStatus(res, 200, "success", enquiry);
  } catch (error) {
    responseStatus(res, 404, "error", error.message);
  }
};

/**
 * @desc Update Enquiry Status
 * @route PATCH /api/v1/enquiries/:id
 * @access Private
 */
exports.updateEnquiryStatus = async (req, res) => {
  try {
    const updatedEnquiry = await updateEnquiryStatusService(req.params.id, req.body.status);
    responseStatus(res, 200, "success", { message: "Enquiry status updated successfully", enquiry: updatedEnquiry });
  } catch (error) {
    responseStatus(res, 400, "error", error.message);
  }
};

/**
 * @desc Delete Enquiry
 * @route DELETE /api/v1/enquiries/:id
 * @access Private
 */
exports.deleteEnquiry = async (req, res) => {
  try {
    const deletedEnquiry = await deleteEnquiryService(req.params.id);
    responseStatus(res, 200, "success", "Enquiry deleted successfully");
  } catch (error) {
    responseStatus(res, 404, "error", error.message);
  }
};