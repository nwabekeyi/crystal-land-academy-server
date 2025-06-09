const responseStatus = require("../../handlers/responseStatus.handler");
const {
  createAcademicYearService,
  getAcademicYearsService,
  getAcademicYearService,
  updateAcademicYearService,
  deleteAcademicYearService,
  getCurrentAcademicYearService,
  changeCurrentAcademicYearService,
} = require("../../services/academic/academicYear.service");

/**
 * @desc Create Academic Year
 * @route POST /api/v1/academic-years
 * @access Private
 **/
exports.createAcademicYearController = async (req, res) => {
  try {
    await createAcademicYearService(req.body, req.userAuth.id, res);
  } catch (error) {
    responseStatus(res, 400, "failed", error.message);
  }
};

/**
 * @desc Get all Academic Years
 * @route GET /api/v1/academic-years
 * @access Private
 **/
exports.getAcademicYearsController = async (req, res) => {
  try {
    const result = await getAcademicYearsService();
    responseStatus(res, 201, "success", result);
  } catch (error) {
    responseStatus(res, 400, "failed", error.message);
  }
};

/**
 * @desc Get single Academic Year
 * @route GET /api/v1/academic-years/:id
 * @access Private
 **/
exports.getAcademicYearController = async (req, res) => {
  try {
    const result = await getAcademicYearService(req.params.id);
    responseStatus(res, 201, "success", result);
  } catch (error) {
    responseStatus(res, 400, "failed", error.message);
  }
};

/**
 * @desc Update Academic Year
 * @route Patch /api/v1/academic-years/:id
 * @access Private
 **/
exports.updateAcademicYearController = async (req, res) => {
  try {
    await updateAcademicYearService(req.body, req.params.id, req.userAuth.id);
  } catch (error) {
    responseStatus(res, 400, "failed", error.message);
  }
};

/**
 * @desc Delete Academic Year
 * @route Delete /api/v1/academic-years/:id
 * @access Private
 **/
exports.deleteAcademicYearController = async (req, res) => {
  try {
    const result = await deleteAcademicYearService(req.params.id);
    responseStatus(res, 201, "success", result);
  } catch (error) {
    responseStatus(res, 400, "failed", error.message);
  }
};


/**
 * @desc Get current Academic Year
 * @route GET /api/v1/academic-years/current
 * @access Private
 **/
exports.getCurrentAcademicYearController = async (req, res) => {
  try {
    const result = await getCurrentAcademicYearService();
    responseStatus(res, 200, "success", result);
  } catch (error) {
    responseStatus(res, 400, "failed", error.message);
  }
};

/**
 * @desc Change current Academic Year
 * @route PATCH /api/v1/academic-years/change-current/:id
 * @access Private
 **/
exports.changeCurrentAcademicYearController = async (req, res) => {
  try {
    const result = await changeCurrentAcademicYearService(req.params.id, res);
    // Note: responseStatus is already handled inside the service, so this line is optional.
    // If you want to move response handling here, update the service to return plain data instead.
  } catch (error) {
    responseStatus(res, 400, "failed", error.message);
  }
};