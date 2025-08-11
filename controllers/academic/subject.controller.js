const mongoose = require("mongoose");
const responseStatus = require("../../handlers/responseStatus.handler"); // Import responseStatus
const {
  createSubjectService,
  updateSubjectService,
  getAllSubjectsService,
  getSubjectsService,
  deleteSubjectService,
  getSubjectsForSubclassService,
  getSubjectsForTeacherService,
  getTeacherSubjectsByClassService,
  getStudentsBySubjectService,
} = require("../../services/academic/subject.service");

exports.createSubjectController = async (req, res, next) => {
  try {
    const subject = await createSubjectService(req.body);
    return responseStatus(res, 201, "success", subject);
  } catch (error) {
    next(error);
  }
};

exports.updateSubjectController = async (req, res, next) => {
  try {
    const subject = await updateSubjectService(req.body, req.params.id);
    return responseStatus(res, 200, "success", subject);
  } catch (error) {
    next(error);
  }
};

exports.getSubjectsController = async (req, res, next) => {
  try {
    const subjects = await getAllSubjectsService();
    return responseStatus(res, 200, "success", subjects);
  } catch (error) {
    next(error);
  }
};

exports.getSubjectController = async (req, res, next) => {
  try {
    const subject = await getSubjectsService(req.params.id);
    return responseStatus(res, 200, "success", subject);
  } catch (error) {
    next(error);
  }
};

exports.deleteSubjectController = async (req, res, next) => {
  try {
    const message = await deleteSubjectService(req.params.id);
    return responseStatus(res, 200, "success", message);
  } catch (error) {
    next(error);
  }
};

exports.getSubjectsForSubclassController = async (req, res, next) => {
  try {
    const { classLevelId, subclassLetter } = req.query;

    if (classLevelId && !mongoose.Types.ObjectId.isValid(classLevelId)) {
      const error = new Error("Invalid ClassLevel ID");
      error.statusCode = 400;
      throw error;
    }
    if (subclassLetter && !/^[A-Z]$/.test(subclassLetter)) {
      const error = new Error("Subclass letter must be a single capital letter (A-Z)");
      error.statusCode = 400;
      throw error;
    }

    const subjects = await getSubjectsForSubclassService({ classLevelId, subclassLetter });
    return responseStatus(res, 200, "success", subjects);
  } catch (error) {
    next(error);
  }
};

exports.getSubjectsByClassLevelController = async (req, res, next) => {
  try {
    const { classLevelId } = req.params;
    const { subclassLetter } = req.query;

    if (!mongoose.Types.ObjectId.isValid(classLevelId)) {
      const error = new Error("Invalid ClassLevel ID");
      error.statusCode = 400;
      throw error;
    }

    if (subclassLetter && !/^[A-Z]$/.test(subclassLetter)) {
      const error = new Error("Subclass letter must be a single capital letter (A-Z)");
      error.statusCode = 400;
      throw error;
    }

    const subjects = await getSubjectsForSubclassService({ classLevelId, subclassLetter });
    return responseStatus(res, 200, "success", subjects);
  } catch (error) {
    next(error);
  }
};

exports.getSubjectsForTeacherController = async (req, res, next) => {
  try {
    const { teacherId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(teacherId)) {
      const error = new Error("Invalid Teacher ID");
      error.statusCode = 400;
      throw error;
    }

    const subjects = await getSubjectsForTeacherService(teacherId);
    return responseStatus(res, 200, "success", subjects);
  } catch (error) {
    next(error);
  }
};

exports.getTeacherSubjectsByClassController = async (req, res, next) => {
  try {
    const { classLevelId, teacherId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(classLevelId)) {
      const error = new Error("Invalid ClassLevel ID");
      error.statusCode = 400;
      throw error;
    }
    if (!mongoose.Types.ObjectId.isValid(teacherId)) {
      const error = new Error("Invalid Teacher ID");
      error.statusCode = 400;
      throw error;
    }

    const subjects = await getTeacherSubjectsByClassService(classLevelId, teacherId);
    return responseStatus(res, 200, "success", subjects);
  } catch (error) {
    next(error);
  }
};

exports.getStudentsBySubjectController = async (req, res, next) => {
  try {
    const { classLevelId, subclassLetter } = req.params;

    if (!mongoose.Types.ObjectId.isValid(classLevelId)) {
      const error = new Error("Invalid ClassLevel ID");
      error.statusCode = 400;
      throw error;
    }

    if (!subclassLetter || !/^[A-Z]$/.test(subclassLetter)) {
      const error = new Error("Subclass letter must be a single capital letter (A-Z)");
      error.statusCode = 400;
      throw error;
    }

    const subjectsWithStudents = await getStudentsBySubjectService(classLevelId, subclassLetter);
    return responseStatus(res, 200, "success", subjectsWithStudents);
  } catch (error) {
    next(error);
  }
};