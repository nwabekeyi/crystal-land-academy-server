// controllers/academic/academicYear.controller.js
const responseStatus = require("../../handlers/responseStatus.handler");
const {
  createAcademicYearService,
  getAcademicYearsService,
  getAcademicYearService,
  updateAcademicYearService,
  deleteAcademicYearService,
  getCurrentAcademicYearService,
  changeCurrentAcademicYearService,
  getAcademicYearsMinimalService
} = require("../../services/academic/academicYear.service");

/**
 * @desc Create Academic Year
 * @route POST /api/v1/academic-years
 * @access Private
 **/
exports.createAcademicYearController = async (req, res) => {
  try {
    await createAcademicYearService(res, req.body);
    // Response is handled by the service
  } catch (error) {
    // Handle unexpected errors (though unlikely since service handles responses)
    responseStatus(res, 500, "error", error.message || "Internal server error");
  }
};

/**
 * @desc Get all Academic Years
 * @route GET /api/v1/academic-years
 * @access Private
 **/
exports.getAcademicYearsController = async (req, res) => {
  try {
    await getAcademicYearsService(res);
    // Response is handled by the service
  } catch (error) {
    responseStatus(res, 500, "error", error.message || "Internal server error");
  }
};

/**
 * @desc Get single Academic Year
 * @route GET /api/v1/academic-years/:id
 * @access Private
 **/
exports.getAcademicYearController = async (req, res) => {
  try {
    await getAcademicYearService(res, req.params.id);
    // Response is handled by the service
  } catch (error) {
    responseStatus(res, 500, "error", error.message || "Internal server error");
  }
};

/**
 * @desc Update Academic Year
 * @route PATCH /api/v1/academic-years/:id
 * @access Private
 **/
exports.updateAcademicYearController = async (req, res) => {
  try {
    await updateAcademicYearService(res, req.body, req.params.id, req.userAuth.id);
    // Response is handled by the service
  } catch (error) {
    responseStatus(res, 500, "error", error.message || "Internal server error");
  }
};

/**
 * @desc Delete Academic Year
 * @route DELETE /api/v1/academic-years/:id
 * @access Private
 **/
exports.deleteAcademicYearController = async (req, res) => {
  try {
    await deleteAcademicYearService(res, req.params.id);
    // Response is handled by the service
  } catch (error) {
    responseStatus(res, 500, "error", error.message || "Internal server error");
  }
};

/**
 * @desc Get current Academic Year
 * @route GET /api/v1/academic-years/current
 * @access Private
 **/
// controllers/academic/academicYear.controller.js
exports.getCurrentAcademicYearController = async (req, res) => {
  console.log('called'); // Keep for debugging
  await getCurrentAcademicYearService(res);
  // No catch needed; service handles all errors
};

/**
 * @desc Change current Academic Year
 * @route PATCH /api/v1/academic-years/change-current/:id
 * @access Private
 **/
exports.changeCurrentAcademicYearController = async (req, res) => {
  try {
    await changeCurrentAcademicYearService(res, req.params.id);
    // Response is handled by the service
  } catch (error) {
    responseStatus(res, 500, "error", error.message || "Internal server error");
  }
};


/**
 * @desc Get all Academic Years without students, teachers, and academic terms
 * @route GET /api/v1/academic-years/minimal
 * @access Private
 */
exports.getAcademicYearsMinimalController = async (req, res) => {
  try {
    await getAcademicYearsMinimalService(res);
  } catch (error) {
    responseStatus(res, 500, "error", error.message || "Internal server error");
  }
};