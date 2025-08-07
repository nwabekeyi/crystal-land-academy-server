const responseStatus = require("../../handlers/responseStatus.handler");
const {
  createClassLevelService,
  getAllClassesService,
  getClassLevelsService,
  deleteClassLevelService,
  updateClassLevelService,
  signUpClassDataService,
  getClassLevelsAndSubclassesForTeacherService,
  assignTeachersToClassService,
  addSubclassToClassLevelService,
  getStudentsInSubclassService
} = require("../../services/academic/class.service");

/**
 * @desc Create Class Level
 * @route POST /api/v1/class-levels
 * @access Private
 */
exports.createClassLevelController = async (req, res) => {
  try {
    await createClassLevelService(req.body, req.userAuth.id, res);
  } catch (error) {
    responseStatus(res, 400, "failed", error.message);
  }
};

/**
 * @desc Get all Class Levels
 * @route GET /api/v1/class-levels
 * @access Private
 */
exports.getClassLevelsController = async (req, res) => {
  try {
    await getAllClassesService(req.query, res);
  } catch (error) {
    responseStatus(res, 400, "failed", error.message);
  }
};

/**
 * @desc Get single Class Level
 * @route GET /api/v1/class-levels/:id
 * @access Private
 */
exports.getClassLevelController = async (req, res) => {
  try {
    await getClassLevelsService(req.params.id, res);
  } catch (error) {
    responseStatus(res, 400, "failed", error.message);
  }
};

/**
 * @desc Update Class Level
 * @route PATCH /api/v1/class-levels/:id
 * @access Private
 */
exports.updateClassLevelController = async (req, res) => {
  try {
    await updateClassLevelService(req.body, req.params.id, req.userAuth.id, res);
  } catch (error) {
    responseStatus(res, 400, "failed", error.message);
  }
};

/**
 * @desc Delete Class Level
 * @route DELETE /api/v1/class-levels/:id
 * @access Private
 */
exports.deleteClassLevelController = async (req, res) => {
  try {
    await deleteClassLevelService(req.params.id, res);
  } catch (error) {
    responseStatus(res, 400, "failed", error.message);
  }
};

/**
 * @desc Get signup class level data
 * @route GET /api/v1/class-levels/sign-up-data
 * @access Private
 */
exports.signUpClassDataController = async (req, res) => {
  try {
    await signUpClassDataService(res);
  } catch (error) {
    responseStatus(res, 400, "failed", error.message);
  }
};

/**
 * @desc Get Class Levels and Subclasses for a Teacher
 * @route GET /api/v1/class-levels/teacher/:teacherId
 * @access Private
 */
exports.getClassLevelsAndSubclassesForTeacherController = async (req, res) => {
  try {
    await getClassLevelsAndSubclassesForTeacherService(req.params.teacherId, res);
  } catch (error) {
    responseStatus(res, 400, "failed", error.message);
  }
};

/**
 * @desc Assign Teachers to a ClassLevel
 * @route PATCH /api/v1/class-levels/:id/assign-teachers
 * @access Private (Admin only)
 */
exports.assignTeachersToClassController = async (req, res) => {
  try {
    await assignTeachersToClassService(req.body, req.userAuth.id, res);
  } catch (error) {
    responseStatus(res, 400, "failed", error.message);
  }
};


/**
 * @desc Add a Subclass to a ClassLevel
 * @route POST /api/v1/class-levels/:id/subclasses
 * @access Private (Admin only)
 */
exports.addSubclassToClassLevelController = async (req, res) => {
  try {
    await addSubclassToClassLevelService(req.body, req.params.id, req.userAuth.id, res);
  } catch (error) {
    responseStatus(res, 400, "failed", error.message);
  }
};

exports.getStudentsInSubclassController = async (req, res) => {
  try {
    const { classLevelId, subclassLetter } = req.params;
    await getStudentsInSubclassService(classLevelId, subclassLetter, res);
  } catch (error) {
    responseStatus(res, 400, "failed", error.message);
  }
};