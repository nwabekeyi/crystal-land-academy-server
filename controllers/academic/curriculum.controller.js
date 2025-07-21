// controllers/academic/curriculum.controller.js
const responseStatus = require("../../handlers/responseStatus.handler");
const {
  createCurriculumService,
  getAllCurriculaService,
  getCurriculumByIdService,
  updateCurriculumService,
  deleteCurriculumService,
} = require("../../services/academic/curriculum.service");

/**
 * @desc Create Curriculum
 * @route POST /api/v1/curriculum
 * @access Public
 */
exports.createCurriculumController = async (req, res) => {
  try {
    await createCurriculumService(req.body, res);
  } catch (error) {
    console.error('Controller error creating curriculum:', error.stack);
    responseStatus(res, 400, "failed", error.message);
  }
};

/**
 * @desc Get all Curricula
 * @route GET /api/v1/curriculum
 * @access Public
 */
exports.getAllCurriculaController = async (req, res) => {
  try {
    const result = await getAllCurriculaService(req.query);
    responseStatus(res, 200, "success", result);
  } catch (error) {
    console.error('Controller error fetching curricula:', error.stack);
    responseStatus(res, 400, "failed", error.message);
  }
};

/**
 * @desc Get single Curriculum
 * @route GET /api/v1/curriculum/:id
 * @access Public
 */
exports.getCurriculumByIdController = async (req, res) => {
  try {
    const result = await getCurriculumByIdService(req.params.id);
    if (!result) {
      return responseStatus(res, 404, "failed", "Curriculum not found");
    }
    responseStatus(res, 200, "success", result);
  } catch (error) {
    console.error('Controller error fetching curriculum:', error.stack);
    responseStatus(res, 400, "failed", error.message);
  }
};

/**
 * @desc Update Curriculum
 * @route PATCH /api/v1/curriculum/:id
 * @access Public
 */
exports.updateCurriculumController = async (req, res) => {
  try {
    await updateCurriculumService(req.body, req.params.id, res);
  } catch (error) {
    console.error('Controller error updating curriculum:', error.stack);
    responseStatus(res, 400, "failed", error.message);
  }
};

/**
 * @desc Delete Curriculum
 * @route DELETE /api/v1/curriculum/:id
 * @access Public
 */
exports.deleteCurriculumController = async (req, res) => {
  try {
    await deleteCurriculumService(req.params.id, res);
  } catch (error) {
    console.error('Controller error deleting curriculum:', error.stack);
    responseStatus(res, 400, "failed", error.message);
  }
};