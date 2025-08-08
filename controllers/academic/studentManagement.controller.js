// controllers/academic/studentManagement.controller.js
const {
  getStudentsByTeacherAndClassService,
  postStudentCommentService,
} = require("../../services/academic/studentManagement.service");

exports.getStudentsByTeacherAndClassController = async (req, res) => {
  const { section, className, subclass } = req.params;
  const { academicYearId, academicTermId, teacherId } = req.query;

  if (!teacherId) {
    console.error("getStudentsByTeacherAndClassController: teacherId is missing in query");
    return res.status(400).json({ status: "error", message: "teacherId is required in query parameters" });
  }

  return getStudentsByTeacherAndClassService(
    teacherId,
    section,
    className,
    subclass,
    academicYearId,
    academicTermId,
    res
  );
};

exports.postStudentCommentController = async (req, res) => {
  const { studentId, classLevelId, comment } = req.body;
  const { academicYearId, academicTermId, teacherId } = req.query;

  if (!teacherId) {
    console.error("postStudentCommentController: teacherId is missing in query");
    return res.status(400).json({ status: "error", message: "teacherId is required in query parameters" });
  }

  return postStudentCommentService(
    teacherId,
    studentId,
    classLevelId,
    comment,
    academicYearId,
    academicTermId,
    res
  );
};

