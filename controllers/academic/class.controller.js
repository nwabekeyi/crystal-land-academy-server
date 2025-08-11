// controllers/academic/class.controller.js
const {
  getAllClassesService,
  createClassLevelService,
  getClassLevelsService,
  updateClassLevelService,
  deleteClassLevelService,
  signUpClassDataService,
  getClassLevelsAndSubclassesForTeacherService,
  assignTeachersToClassService,
  addSubclassToClassLevelService,
  getStudentsInSubclassService,
  getClassLevelsWithoutSensitiveDataService, // New service
} = require("../../services/academic/class.service");

exports.getClassLevelsController = async (req, res) => {
  const query = req.query;
  const result = await getAllClassesService(query, res);
  return result;
};

exports.createClassLevelController = async (req, res) => {
  const data = req.body;
  const userId = req.user._id;
  const result = await createClassLevelService(data, userId, res);
  return result;
};

exports.getClassLevelController = async (req, res) => {
  const id = req.params.id;
  const result = await getClassLevelsService(id, res);
  return result;
};

exports.updateClassLevelController = async (req, res) => {
  const data = req.body;
  const id = req.params.id;
  const userId = req.user._id;
  const result = await updateClassLevelService(data, id, userId, res);
  return result;
};

exports.deleteClassLevelController = async (req, res) => {
  const id = req.params.id;
  const result = await deleteClassLevelService(id, res);
  return result;
};

exports.signUpClassDataController = async (req, res) => {
  const result = await signUpClassDataService(res);
  return result;
};

exports.getClassLevelsAndSubclassesForTeacherController = async (req, res) => {
  const teacherId = req.params.teacherId;
  const result = await getClassLevelsAndSubclassesForTeacherService(teacherId, res);
  return result;
};

exports.assignTeachersToClassController = async (req, res) => {
  const data = req.body;
  const userId = req.user._id;
  const result = await assignTeachersToClassService(data, userId, res);
  return result;
};

exports.addSubclassToClassLevelController = async (req, res) => {
  const data = req.body;
  const classId = req.params.id;
  const userId = req.user._id;
  const result = await addSubclassToClassLevelService(data, classId, userId, res);
  return result;
};

exports.getStudentsInSubclassController = async (req, res) => {
  const { classLevelId, subclassLetter } = req.params;
  const result = await getStudentsInSubclassService(classLevelId, subclassLetter, res);
  return result;
};

exports.getClassLevelsWithoutSensitiveDataController = async (req, res) => {
  const query = req.query;
  const result = await getClassLevelsWithoutSensitiveDataService(res);
  return result;
};