const responseStatus = require("../../handlers/responseStatus.handler");
const { createStudentPaymentService, getAllStudentPaymentsService, getStudentPaymentByIdService, deleteStudentPaymentService } = require("../../services/academic/schoolFees.service");

/**
 * Create a new student payment record
 */
exports.createStudentPaymentController = async (req, res) => {
  try {
    console.log("Incoming request body:", req.body);

    // Validate required fields
    const requiredFields = [
      'studentId', 
      'classLevelId',
      'academicYear',
      'section',
      'termPayments'
    ];
    
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        status: "error",
        message: `Missing required fields: ${missingFields.join(', ')}`,
        missingFields
      });
    }

    // Validate termPayments structure
    if (!Array.isArray(req.body.termPayments)) {
      return res.status(400).json({
        status: "error",
        message: "termPayments must be an array"
      });
    }

    const studentPayment = await createStudentPaymentService(req.body);

    return res.status(201).json({
      status: "success",
      message: "Student payment record created successfully",
      data: studentPayment,
    });
  } catch (error) {
    console.error("Error in createStudentPaymentController:", error);
    return res.status(400).json({
      status: "error",
      message: error.message || "Failed to create student payment record",
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * Get all student payment records
 */
exports.getAllStudentPaymentsController = async (req, res) => {
  try {
    const { page = 1, limit = 10, sortBy = "createdAt", sortDirection = "desc", studentId, section } = req.query;

    const skip = (page - 1) * limit;
    const filter = {};
    if (studentId) filter.studentId = studentId;
    if (section) filter.section = section; // Add section to filter if provided

    const payments = await getAllStudentPaymentsService(filter, skip, parseInt(limit), sortBy, sortDirection);

    return res.status(200).json({
      status: "success",
      message: "Student payment records fetched successfully",
      data: payments,
    });
  } catch (error) {
    console.error("Error in getAllStudentPaymentsController:", error);
    return res.status(400).json({
      status: "error",
      message: error.message || "Failed to fetch student payment records",
    });
  }
};

/**
 * Get a single student payment record by ID
 */
exports.getStudentPaymentByIdController = async (req, res) => {
  try {
    const { id } = req.params;

    const payment = await getStudentPaymentByIdService(id);

    return res.status(200).json({
      status: "success",
      message: "Student payment record fetched successfully",
      data: payment,
    });
  } catch (error) {
    console.error("Error in getStudentPaymentByIdController:", error);
    return res.status(404).json({
      status: "error",
      message: error.message || "Student payment record not found",
    });
  }
};

/**
 * Delete a student payment record
 */
exports.deleteStudentPaymentController = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedPayment = await deleteStudentPaymentService(id);

    return res.status(200).json({
      status: "success",
      message: "Student payment record deleted successfully",
      data: deletedPayment,
    });
  } catch (error) {
    console.error("Error in deleteStudentPaymentController:", error);
    return res.status(404).json({
      status: "error",
      message: error.message || "Failed to delete student payment record",
    });
  }
};