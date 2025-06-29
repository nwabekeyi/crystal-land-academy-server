const StudentPayment = require("../../models/Academic/schoolFees.model");

/**
 * Create a new student payment record
 */
exports.createStudentPaymentService = async (data) => {
  const { studentId, classLevelId, academicYear, section, termPayments } = data;

  if (!studentId || !classLevelId || !academicYear || !section || !termPayments?.length) {
    throw new Error("Missing required fields");
  }

  let studentPayment = await StudentPayment.findOne({ studentId, classLevelId, academicYear });
  if (!studentPayment) {
    studentPayment = new StudentPayment({ studentId, classLevelId, academicYear, section, termPayments: [] });
  }

  termPayments.forEach((term) => {
    const existingTerm = studentPayment.termPayments.find((t) => t.termName === term.termName && t.subclassLetter === term.subclassLetter);

    if (!existingTerm) {
      studentPayment.termPayments.push(term);
    } else {
      term.payments.forEach((payment) => {
        existingTerm.payments.push(payment);
      });
    }
  });

  return await studentPayment.save();
};

/**
 * Get all student payment records
 */
exports.getAllStudentPaymentsService = async (filter = {}, skip = null, limit = null, sortBy = null, sortDirection = null) => {
  const sortOptions = {};
  if (sortBy) {
    sortOptions[sortBy] = sortDirection === "asc" ? 1 : -1;
  }

  return await StudentPayment.find(filter)
    .populate("studentId classLevelId academicYear")
    .sort(sortOptions)
    .skip(skip)
    .limit(limit);
};

/**
 * Get a single student payment record by ID
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
 */
exports.deleteStudentPaymentService = async (id) => {
  const deletedPayment = await StudentPayment.findByIdAndDelete(id);
  if (!deletedPayment) {
    throw new Error("Student payment record not found");
  }
  return deletedPayment;
};