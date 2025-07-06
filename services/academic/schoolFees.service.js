const StudentPayment = require("../../models/Academic/schoolFees.model");

exports.createStudentPaymentService = async (data) => {
  const { studentId, classLevelId, academicYear, section, termPayments } = data;

  if (!studentId || !classLevelId || !academicYear || !section || !termPayments?.length) {
    throw new Error("Missing required fields");
  }

  // Validate termPayments structure
  if (!Array.isArray(termPayments)) {
    throw new Error("termPayments must be an array");
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

exports.getAllStudentPaymentsService = async (query = {}) => {
  const { page = 1, limit = 10, sortBy = "createdAt", sortDirection = "desc", studentId, section } = query;

  // Convert page and limit to numbers
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  // Build filter object
  const filter = {};
  if (studentId) filter.studentId = studentId;
  if (section) filter.section = section; // Add section filter for Primary/Secondary

  // Build sort options
  const sortOptions = {};
  if (sortBy) {
    sortOptions[sortBy] = sortDirection === "asc" ? 1 : -1;
  }

  // Fetch paginated data
  const payments = await StudentPayment.find(filter)
    .populate("studentId classLevelId academicYear")
    .sort(sortOptions)
    .skip(skip)
    .limit(limitNum);

  // Get total count for pagination metadata
  const totalRecords = await StudentPayment.countDocuments(filter);

  return {
    payments,
    pagination: {
      totalRecords,
      totalPages: Math.ceil(totalRecords / limitNum),
      currentPage: pageNum,
      pageSize: limitNum,
    },
  };
};

exports.getStudentPaymentByIdService = async (id) => {
  const studentPayment = await StudentPayment.findById(id).populate("studentId classLevelId academicYear");
  if (!studentPayment) {
    throw new Error("Student payment record not found");
  }
  return studentPayment;
};

exports.deleteStudentPaymentService = async (id) => {
  const deletedPayment = await StudentPayment.findByIdAndDelete(id);
  if (!deletedPayment) {
    throw new Error("Student payment record not found");
  }
  return deletedPayment;
};