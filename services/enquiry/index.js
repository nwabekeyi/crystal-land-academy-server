const Enquiry = require("../../models/Enquiry/index");

/**
 * Create Enquiry Service
 */
exports.createEnquiryService = async (data) => {
  const { name, phone, email, message } = data;

  if (!name || !phone || !email || !message) {
    throw new Error("All fields are required");
  }

  const newEnquiry = await Enquiry.create({ name, phone, email, message });
  return newEnquiry;
};

/**
 * Get All Enquiries Service
 */
exports.getAllEnquiriesService = async (query) => {
  const filter = {};
  if (query.status) {
    filter.status = query.status;
  }

  const enquiries = await Enquiry.find(filter).sort({ createdAt: -1 });
  return enquiries;
};

/**
 * Get Enquiry By ID Service
 */
exports.getEnquiryByIdService = async (id) => {
  const enquiry = await Enquiry.findById(id);
  if (!enquiry) {
    throw new Error("Enquiry not found");
  }
  return enquiry;
};

/**
 * Update Enquiry Status Service
 */
exports.updateEnquiryStatusService = async (id, status) => {
  if (!["read", "unread"].includes(status)) {
    throw new Error("Invalid or missing status value");
  }

  const updatedEnquiry = await Enquiry.findByIdAndUpdate(
    id,
    { status },
    { new: true, runValidators: true }
  );

  if (!updatedEnquiry) {
    throw new Error("Enquiry not found");
  }

  return updatedEnquiry;
};

/**
 * Delete Enquiry Service
 */
exports.deleteEnquiryService = async (id) => {
  const deletedEnquiry = await Enquiry.findByIdAndDelete(id);
  if (!deletedEnquiry) {
    throw new Error("Enquiry not found");
  }
  return deletedEnquiry;
};