const StudentPayment = require("../../models/Academic/schoolFees.model");

/**
 * Create a new student payment record
 * @param {Object} data - Payment record data
 * @returns {Object} - Created payment record
 */
exports.createStudentPaymentService = async (data) => {
  const studentPayment = new StudentPayment(data);
  return await studentPayment.save();
};

/**
 * Get all student payment records
 * @returns {Array} - List of payment records
 */
exports.getAllStudentPaymentsService = async () => {
  return await StudentPayment.find().populate("studentId classLevelId academicYear");
};

/**
 * Get a single student payment record by ID
 * @param {String} id - Payment record ID
 * @returns {Object} - Payment record
 */
exports.getStudentPaymentByIdService = async (id) => {
  const studentPayment = await StudentPayment.findById(id).populate("studentId classLevelId academicYear");
  if (!studentPayment) {
    throw new Error("Student payment record not found");
  }
  return studentPayment;
};

/**
 * Update a student payment record
 * @param {String} id - Payment record ID
 * @param {Object} data - Updated data
 * @returns {Object} - Updated payment record
 */
exports.updateStudentPaymentService = async (id, data) => {
  const updatedPayment = await StudentPayment.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!updatedPayment) {
    throw new Error("Student payment record not found");
  }
  return updatedPayment;
};

/**
 * Delete a student payment record
 * @param {String} id - Payment record ID
 * @returns {Object} - Deleted payment record
 */
exports.deleteStudentPaymentService = async (id) => {
  const deletedPayment = await StudentPayment.findByIdAndDelete(id);
  if (!deletedPayment) {
    throw new Error("Student payment record not found");
  }
  return deletedPayment;
};