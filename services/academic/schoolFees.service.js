const StudentPayment = require("../../models/Academic/schoolFees.model");

/**
 * Create a new student payment record
 * @param {Object} data - Payment record data
 * @returns {Object} - Created payment record
 */
exports.createStudentPaymentService = async (data) => {
  const { studentId, classLevelId, academicYear, termName, subclassLetter, amountPaid, method, reference, status } = data;

  let studentPayment = await StudentPayment.findOne({ studentId, classLevelId, academicYear });
  if (!studentPayment) {
    studentPayment = new StudentPayment({ studentId, classLevelId, academicYear, termPayments: [] });
  }

  let termPayment = studentPayment.termPayments.find((term) => term.termName === termName && term.subclassLetter === subclassLetter);
  if (!termPayment) {
    termPayment = { termName, subclassLetter, payments: [] };
    studentPayment.termPayments.push(termPayment);
  }

  termPayment.payments.push({ amountPaid, method, reference, status });

  return await studentPayment.save();
};

/**
 * Get all student payment records
 * @returns {Array} - List of payment records
 */
exports.getAllStudentPaymentsService = async (filter = {}, skip = null, limit = null, sortBy = null, sortDirection = null, countOnly = false) => {
  try {
    if (countOnly) {
      return await StudentPayment.countDocuments(filter); // Count total records
    }

    const sortOptions = {};
    if (sortBy) {
      sortOptions[sortBy] = sortDirection === "asc" ? 1 : -1;
    }

    return await StudentPayment.find(filter)
      .populate("studentId classLevelId academicYear")
      .sort(sortOptions)
      .skip(skip)
      .limit(limit);
  } catch (error) {
    throw new Error("Failed to fetch student payment records");
  }
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