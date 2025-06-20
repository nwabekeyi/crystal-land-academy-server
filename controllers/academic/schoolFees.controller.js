const responseStatus = require("../../handlers/responseStatus.handler");
const {
  createStudentPaymentService,
  getAllStudentPaymentsService,
  getStudentPaymentByIdService,
  updateStudentPaymentService,
  deleteStudentPaymentService,
} = require("../../services/academic/schoolFees.service");

/**
 * @desc Create a new student payment record
 * @route POST /api/v1/student-payments
 * @access Private
 */
exports.createStudentPaymentController = async (req, res) => {
  try {
    const paymentRecord = await createStudentPaymentService(req.body);
    responseStatus(res, 201, "success", paymentRecord);
  } catch (error) {
    responseStatus(res, 400, "error", error.message);
  }
};

/**
 * @desc Get all student payment records
 * @route GET /api/v1/student-payments
 * @access Private
 */
exports.getAllStudentPaymentsController = async (req, res) => {
  try {
    const paymentRecords = await getAllStudentPaymentsService();
    responseStatus(res, 200, "success", paymentRecords);
  } catch (error) {
    responseStatus(res, 500, "error", error.message);
  }
};

/**
 * @desc Get a single student payment record by ID
 * @route GET /api/v1/student-payments/:id
 * @access Private
 */
exports.getStudentPaymentByIdController = async (req, res) => {
  try {
    const paymentRecord = await getStudentPaymentByIdService(req.params.id);
    responseStatus(res, 200, "success", paymentRecord);
  } catch (error) {
    responseStatus(res, 404, "error", error.message);
  }
};

/**
 * @desc Update a student payment record
 * @route PATCH /api/v1/student-payments/:id
 * @access Private
 */
exports.updateStudentPaymentController = async (req, res) => {
  try {
    const updatedPayment = await updateStudentPaymentService(req.params.id, req.body);
    responseStatus(res, 200, "success", updatedPayment);
  } catch (error) {
    responseStatus(res, 404, "error", error.message);
  }
};

/**
 * @desc Delete a student payment record
 * @route DELETE /api/v1/student-payments/:id
 * @access Private
 */
exports.deleteStudentPaymentController = async (req, res) => {
  try {
    const deletedPayment = await deleteStudentPaymentService(req.params.id);
    responseStatus(res, 200, "success", deletedPayment);
  } catch (error) {
    responseStatus(res, 404, "error", error.message);
  }
};