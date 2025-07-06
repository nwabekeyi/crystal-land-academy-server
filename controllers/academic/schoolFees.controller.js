const responseStatus = require("../../handlers/responseStatus.handler");
const { createStudentPaymentService, getAllStudentPaymentsService, getStudentPaymentByIdService, deleteStudentPaymentService } = require("../../services/academic/schoolFees.service");

/**
 * Create a new student payment record
 */
exports.createStudentPaymentController = async (req, res) => {
  try {
    const studentPayment = await createStudentPaymentService(req.body);
    return responseStatus(res, 201, "success", {
      message: "Student payment record created successfully",
      data: studentPayment,
    });
  } catch (error) {
    console.error("Error in createStudentPaymentController:", error);
    return responseStatus(res, 400, "error", error.message || "Failed to create student payment record");
  }
};

/**
 * Get all student payment records
 */
exports.getAllStudentPaymentsController = async (req, res) => {
  try {
    const result = await getAllStudentPaymentsService(req.query);
    return responseStatus(res, 200, "success", {
      message: "Student payment records fetched successfully",
      data: result.payments,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("Error in getAllStudentPaymentsController:", error);
    return responseStatus(res, 400, "error", error.message || "Failed to fetch student payment records");
  }
};

/**
 * Get a single student payment record by ID
 */
exports.getStudentPaymentByIdController = async (req, res) => {
  try {
    const payment = await getStudentPaymentByIdService(req.params.id);
    return responseStatus(res, 200, "success", {
      message: "Student payment record fetched successfully",
      data: payment,
    });
  } catch (error) {
    console.error("Error in getStudentPaymentByIdController:", error);
    return responseStatus(res, 404, "error", error.message || "Student payment record not found");
  }
};

/**
 * Delete a student payment record
 */
exports.deleteStudentPaymentController = async (req, res) => {
  try {
    const deletedPayment = await deleteStudentPaymentService(req.params.id);
    return responseStatus(res, 200, "success", {
      message: "Student payment record deleted successfully",
      data: deletedPayment,
    });
  } catch (error) {
    console.error("Error in deleteStudentPaymentController:", error);
    return responseStatus(res, 404, "error", error.message || "Failed to delete student payment record");
  }
};