const {
  createAcademicTermService,
  getAcademicTermsByYearService,
  getAcademicTermService,
  updateAcademicTermService,
  deleteAcademicTermService,
  getCurrentAcademicTermService,
} = require("../../services/academic/academicTerm.service");

/**
 * @desc Create Academic Term
 * @route POST /api/v1/academic-term
 * @access Private
 */
exports.createAcademicTermController = async (req, res) => {
  return createAcademicTermService(req.body, req.userAuth.id, res);
};

/**
 * @desc Get all Academic Terms
 * @route GET /api/v1/academic-term
 * @access Private
 */
exports.getAcademicTermsController = async (req, res) => {
  return getAcademicTermService(req.userAuth.id, res);
};

/**
 * @desc Get Academic Terms by Academic Year
 * @route GET /api/v1/academic-term/year/:academicYearId
 * @access Private
 */
exports.getAcademicTermsByYearController = async (req, res) => {
  return getAcademicTermsByYearService(req.params.academicYearId, res);
};

/**
 * @desc Get Current Academic Term
 * @route GET /api/v1/academic-term/current
 * @access Private
 */
exports.getCurrentAcademicTermController = async (req, res) => {
  return getCurrentAcademicTermService(res);
};

/**
 * @desc Get single Academic Term
 * @route GET /api/v1/academic-term/:id
 * @access Private
 */
exports.getAcademicTermController = async (req, res) => {
  return getAcademicTermService(req.params.id, res);
};

/**
 * @desc Update Academic Term
 * @route PATCH /api/v1/academic-term/:id
 * @access Private
 */
exports.updateAcademicTermController = async (req, res) => {
  return updateAcademicTermService(req.body, req.params.id, req.userAuth.id, res);
};

/**
 * @desc Delete Academic Term
 * @route DELETE /api/v1/academic-term/:id
 * @access Private
 */
exports.deleteAcademicTermController = async (req, res) => {
  return deleteAcademicTermService(req.params.id, res);
};