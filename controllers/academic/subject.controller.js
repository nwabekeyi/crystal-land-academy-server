// controllers/academic/subject.controller.js
const {
  createSubjectService,
  getAllSubjectsService,
  getSubjectsService,
  updateSubjectService,
  deleteSubjectService,
} = require("../../services/academic/subject.service");
const responseStatus = require("../../handlers/responseStatus.handler");

/**
 * @desc Create Subject
 * @route POST /api/v1/subjects/create
 * @access Private
 */
exports.createSubjectController = async (req, res) => {
  try {
    const result = await createSubjectService(req.body, req.userAuth.id);
    responseStatus(res, 201, "success", result);
  } catch (error) {
    responseStatus(res, error.statusCode || 500, "failed", error.message);
  }
};

/**
 * @desc Get all Subjects
 * @route GET /api/v1/subjects
 * @access Private
 */
exports.getSubjectsController = async (req, res) => {
  try {
    const subjects = await getAllSubjectsService();
    responseStatus(res, 200, "success", subjects);
  } catch (error) {
    responseStatus(res, error.statusCode || 500, "failed", error.message);
  }
};

/**
 * @desc Get single Subject
 * @route GET /api/v1/subjects/:id
 * @access Private
 */
exports.getSubjectController = async (req, res) => {
  try {
    const subject = await getSubjectsService(req.params.id);
    responseStatus(res, 200, "success", subject);
  } catch (error) {
    responseStatus(res, error.statusCode || 500, "failed", error.message);
  }
};

/**
 * @desc Update Subject
 * @route PATCH /api/v1/subjects/:id
 * @access Private
 */
exports.updateSubjectController = async (req, res) => {
  try {
    const result = await updateSubjectService(req.body, req.params.id, req.userAuth.id);
    responseStatus(res, 200, "success", result);
  } catch (error) {
    responseStatus(res, error.statusCode || 500, "failed", error.message);
  }
};

/**
 * @desc Delete Subject
 * @route DELETE /api/v1/subjects/:id
 * @access Private
 */
exports.deleteSubjectController = async (req, res) => {
  try {
    const result = await deleteSubjectService(req.params.id);
    responseStatus(res, 200, "success", result);
  } catch (error) {
    responseStatus(res, error.statusCode || 500, "failed", error.message);
  }
};