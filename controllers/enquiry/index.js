const Enquiry = require('../../models/Enquiry/index'); // Import the Enquiry model
const responseStatus = require('../../handlers/responseStatus.handler'); // Import the responseStatus handler

// Handle form submission (Create Enquiry)
const submitEnquiry = async (req, res) => {
  try {
    const { name, phone, email, message } = req.body; // Include email in destructuring

    // Validate input
    if (!name || !phone || !email || !message) {
      return responseStatus(res, 400, "error", "All fields are required");
    }

    // Save enquiry to the database
    const newEnquiry = new Enquiry({ name, phone, email, message }); // Include email in the new enquiry
    await newEnquiry.save();

    responseStatus(res, 201, "success", { message: "Enquiry submitted successfully", enquiry: newEnquiry });
  } catch (error) {
    console.error('Error submitting enquiry:', error);
    responseStatus(res, 500, "error", "Internal server error");
  }
};

// Fetch all enquiries
const getAllEnquiries = async (req, res) => {
  try {
    const { status } = req.query;

    // Build query object
    const query = {};
    if (status) {
      query.status = status; // Filter by status if provided
    }

    const enquiries = await Enquiry.find(query).sort({ createdAt: -1 }); // Sort by newest first
    responseStatus(res, 200, "success", enquiries); // Include email in the response automatically
  } catch (error) {
    console.error('Error fetching enquiries:', error);
    responseStatus(res, 500, "error", "Internal server error");
  }
};

// Fetch a single enquiry by ID
const getEnquiryById = async (req, res) => {
  try {
    const { id } = req.params;

    const enquiry = await Enquiry.findById(id);
    if (!enquiry) {
      return responseStatus(res, 404, "error", "Enquiry not found");
    }

    responseStatus(res, 200, "success", enquiry); // Include email in the response automatically
  } catch (error) {
    console.error('Error fetching enquiry:', error);
    responseStatus(res, 500, "error", "Internal server error");
  }
};

// Update enquiry status (e.g., mark as read/unread)
const updateEnquiryStatus = async (req, res) => {
  try {
    const { id } = req.params; // Extract enquiry ID from URL parameters
    const { status } = req.body; // Extract status from request body

    // Validate the status field
    if (!status || !['read', 'unread'].includes(status)) {
      return responseStatus(res, 400, "error", "Invalid or missing status value");
    }

    // Find and update the enquiry
    const updatedEnquiry = await Enquiry.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true } // Return the updated document and run validation
    );

    // Check if the enquiry exists
    if (!updatedEnquiry) {
      return responseStatus(res, 404, "error", "Enquiry not found");
    }

    // Respond with the updated enquiry
    responseStatus(res, 200, "success", {
      message: "Enquiry status updated successfully",
      enquiry: updatedEnquiry,
    });
  } catch (error) {
    console.error('Error updating enquiry status:', error);
    responseStatus(res, 500, "error", "Internal server error");
  }
};
// Delete an enquiry
const deleteEnquiry = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedEnquiry = await Enquiry.findByIdAndDelete(id);
    if (!deletedEnquiry) {
      return responseStatus(res, 404, "error", "Enquiry not found");
    }

    responseStatus(res, 200, "success", "Enquiry deleted successfully");
  } catch (error) {
    console.error('Error deleting enquiry:', error);
    responseStatus(res, 500, "error", "Internal server error");
  }
};

module.exports = {
  submitEnquiry,
  getAllEnquiries,
  getEnquiryById,
  updateEnquiryStatus,
  deleteEnquiry
};