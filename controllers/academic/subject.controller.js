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
    res.status(201).json({
      status: "success",
      data: subject,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateSubjectController = async (req, res, next) => {
  try {
    const subject = await updateSubjectService(req.body, req.params.id);
    res.status(200).json({
      status: "success",
      data: subject,
    });
  } catch (error) {
    next(error);
  }
};

exports.getSubjectsController = async (req, res, next) => {
  try {
    const subjects = await getAllSubjectsService();
    res.status(200).json({
      status: "success",
      data: subjects,
    });
  } catch (error) {
    next(error);
  }
};

exports.getSubjectController = async (req, res, next) => {
  try {
    const subject = await getSubjectsService(req.params.id);
    res.status(200).json({
      status: "success",
      data: subject,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteSubjectController = async (req, res, next) => {
  try {
    const message = await deleteSubjectService(req.params.id);
    res.status(200).json({
      status: "success",
      message,
    });
  } catch (error) {
    next(error);
  }
};

exports.getSubjectsForSubclassController = async (req, res, next) => {
  try {
    const subjects = await getSubjectsForSubclassService(req.query);
    res.status(200).json({
      status: "success",
      data: subjects,
    });
  } catch (error) {
    next(error);
  }
};

exports.getSubjectsForTeacherController = async (req, res, next) => {
  try {
    const subjects = await getSubjectsForTeacherService(req.params.teacherId);
    res.status(200).json({
      status: "success",
      data: subjects,
    });
  } catch (error) {
    next(error);
  }
};

exports.getTeacherSubjectsByClassController = async (req, res, next) => {
  try {
    const { classId, teacherId } = req.params;
    const subjects = await getTeacherSubjectsByClassService(classId, teacherId);
    res.status(200).json({
      status: "success",
      data: subjects,
    });
  } catch (error) {
    next(error);
  }
};

exports.getStudentsBySubjectController = async (req, res, next) => {
  try {
    const { classId, subclassLetter } = req.params;
    const result = await getStudentsBySubjectService(classId, subclassLetter);
    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};