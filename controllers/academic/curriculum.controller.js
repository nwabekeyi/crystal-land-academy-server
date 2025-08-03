// controllers/academic/curriculum.controller.js
const {
  addTopicToCurriculumService,
  updateTopicInCurriculumService,
  removeTopicFromCurriculumService,
  markTopicAsCompletedService,
  getAllCurriculaService,
  getCurriculumByIdService,
  updateCurriculumService,
  deleteCurriculumService,
  getCurriculaForTeacherService,
  getCurriculaForStudentService,
  createCurriculumService
} = require("../../services/academic/curriculum.service");
const responseStatus = require("../../handlers/responseStatus.handler");

exports.createCurriculumController = async (req, res) => {
  try {
    const data = {
      subjectId: req.body.subjectId,
      classLevelId: req.body.classLevelId,
      topics: req.body.topics,
    };
    await createCurriculumService(data, res);
  } catch (error) {
    responseStatus(res, 500, "failed", error.message);
  }
};
exports.getAllCurriculaController = async (req, res) => {
  try {
    await getAllCurriculaService(req.query, res);
  } catch (error) {
    responseStatus(res, 500, "failed", error.message);
  }
};

exports.getCurriculumByIdController = async (req, res) => {
  try {
    const curriculum = await getCurriculumByIdService(req.params.id);
    if (!curriculum) {
      return responseStatus(res, 404, "failed", "Curriculum not found");
    }
    responseStatus(res, 200, "success", curriculum);
  } catch (error) {
    responseStatus(res, 500, "failed", error.message);
  }
};

exports.updateCurriculumController = async (req, res) => {
  try {
    const data = {
      subjectId: req.body.subjectId,
      classLevelId: req.body.classLevelId,
      topics: req.body.topics,
    };
    await updateCurriculumService(data, req.params.id, res);
  } catch (error) {
    responseStatus(res, 500, "failed", error.message);
  }
};

exports.deleteCurriculumController = async (req, res) => {
  try {
    await deleteCurriculumService(req.params.id, res);
  } catch (error) {
    responseStatus(res, 500, "failed", error.message);
  }
};

exports.addTopicToCurriculumController = async (req, res) => {
  try {
    const { curriculumId } = req.params;
    const topicData = {
      topic: req.body.topic,
      description: req.body.description,
      resources: req.body.resources,
      isCompleted: req.body.isCompleted || false,
    };
    await addTopicToCurriculumService(curriculumId, topicData, res);
  } catch (error) {
    responseStatus(res, 500, "failed", error.message);
  }
};

exports.updateTopicInCurriculumController = async (req, res) => {
  try {
    const { curriculumId, topicId } = req.params;
    const topicData = {
      topic: req.body.topic,
      description: req.body.description,
      resources: req.body.resources,
      isCompleted: req.body.isCompleted,
    };
    await updateTopicInCurriculumService(curriculumId, topicId, topicData, res);
  } catch (error) {
    responseStatus(res, 500, "failed", error.message);
  }
};

exports.removeTopicFromCurriculumController = async (req, res) => {
  try {
    const { curriculumId, topicId } = req.params;
    await removeTopicFromCurriculumService(curriculumId, topicId, res);
  } catch (error) {
    responseStatus(res, 500, "failed", error.message);
  }
};

exports.markTopicAsCompletedController = async (req, res) => {
  try {
    const { curriculumId, topicId } = req.params;
    await markTopicAsCompletedService(curriculumId, topicId, res);
  } catch (error) {
    responseStatus(res, 500, "failed", error.message);
  }
};

exports.getCurriculaForTeacherController = async (req, res) => {
  try {
    const { teacherId } = req.params;
    await getCurriculaForTeacherService(teacherId, res);
  } catch (error) {
    responseStatus(res, 500, "failed", error.message);
  }
};

exports.getCurriculaForStudentController = async (req, res) => {
  try {
    const { classLevelId } = req.params;
    await getCurriculaForStudentService(classLevelId, res);
  } catch (error) {
    responseStatus(res, 500, "failed", error.message);
  }
};