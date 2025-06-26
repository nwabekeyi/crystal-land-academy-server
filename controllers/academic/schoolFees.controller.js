const responseStatus = require("../../handlers/responseStatus.handler");
const {
  createStudentPaymentService,
  getAllStudentPaymentsService,
  getStudentPaymentByIdService,
  deleteStudentPaymentService,
} = require("../../services/academic/schoolFees.service");

/**
 * @desc Create a new payment record
 * @route POST /api/v1/student-payments
 * @access Private
 */
exports.createStudentPaymentController = async (req, res) => {
  try {
    const { studentId, classLevelId, academicYear, program, termPayments } = req.body;

    // Basic field validation
    if (!studentId || !classLevelId || !academicYear || !program || !termPayments?.length) {
      return responseStatus(res, 400, "error", "Missing required fields");
    }

    // Deep validation of termPayments
    for (const term of termPayments) {
      if (!term.termName || !term.subclassLetter || !term.payments?.length) {
        return responseStatus(res, 400, "error", "Each term must have termName, subclassLetter, and at least one payment");
      }

      for (const payment of term.payments) {
        if (
          payment.amountPaid == null || // allow 0, disallow undefined/null
          !payment.method ||
          !payment.reference ||
          !payment.status
        ) {
          return responseStatus(res, 400, "error", "Each payment must include amountPaid, method, reference, and status");
        }
      }
    }

    // Create or update the payment record using service
    const studentPayment = await createStudentPaymentService(req.body);

    responseStatus(res, 201, "success", studentPayment);
  } catch (error) {
    console.error(error);
    responseStatus(res, 400, "error", error.message);
  }
};


/**
 * @desc Get all student payment records with pagination and filtering
 * @route GET /api/v1/student-payments
 * @access Private
 */
exports.getAllStudentPaymentsController = async (req, res) => {
  try {
    const { page = 1, limit = 10, sortBy = "datePaid", sortDirection = "asc", name, classLevelId, academicYear } = req.query;

    // Build filter object for filtering
    const filter = {};
    if (name) {
      filter["studentId.name"] = { $regex: name, $options: "i" }; // Case-insensitive search
    }
    if (classLevelId) {
      filter.classLevelId = classLevelId;
    }
    if (academicYear) {
      filter.academicYear = academicYear;
    }

    // Pagination logic
    const skip = (page - 1) * limit;

    // Fetch records with filtering, pagination, and sorting
    const paymentRecords = await getAllStudentPaymentsService(filter, skip, limit, sortBy, sortDirection);

    // Count total records for pagination metadata
    const totalRecords = await getAllStudentPaymentsService(filter, null, null, null, null, true); // Count only

    responseStatus(res, 200, "success", {
      data: paymentRecords,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalRecords / limit),
        totalRecords,
      },
    });
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