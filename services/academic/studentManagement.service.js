// services/academic/studentManagement.service.js
const ClassLevel = require("../../models/Academic/class.model");
const Student = require("../../models/Students/students.model");
const Comment = require("../../models/Students/studentComment.model");
const AcademicYear = require("../../models/Academic/academicYear.model");
const AcademicTerm = require("../../models/Academic/academicTerm.model");
const responseStatus = require("../../handlers/responseStatus.handler");

exports.getStudentsByTeacherAndClassService = async (teacherId, section, className, subclass, academicYearId, academicTermId, res) => {
  if (!res || !res.status || typeof res.status !== "function") {
    return { status: "error", message: "Invalid response object" };
  }

  try {
    // Validate query parameters
    if (!academicYearId) {
      return responseStatus(res, 400, "error", "academicYearId is required");
    }
    if (!academicTermId) {
      return responseStatus(res, 400, "error", "academicTermId is required");
    }
    if (!section || !className || !subclass) {
      return responseStatus(res, 400, "error", "section, className, and subclass are required");
    }

    // Verify academic year and term exist
    const academicYear = await AcademicYear.findById(academicYearId).lean();
    if (!academicYear) {
      return responseStatus(res, 404, "error", `Academic year ${academicYearId} not found`);
    }
    const academicTerm = await AcademicTerm.findById(academicTermId).lean();
    if (!academicTerm) {
      return responseStatus(res, 404, "error", `Academic term ${academicTermId} not found`);
    }

    // Handle section and className (e.g., "Primary 6" -> section: "Primary", name: "6")
    const sectionParts = section.split(" ");
    const sectionName = sectionParts[0]; // e.g., "Primary"
    const classNameAdjusted = sectionParts[1] || className; // e.g., "6"

    const classLevel = await ClassLevel.findOne({
      section: sectionName,
      name: classNameAdjusted,
      academicYear: academicYearId,
    }).lean();

    if (!classLevel) {
      return responseStatus(
        res,
        404,
        "error",
        `Class ${section} ${className} not found for academic year ${academicYear.name}`
      );
    }

    const isTeacherAssigned = classLevel.teachers.some(
      (t) => t.teacherId.toString() === teacherId
    );
    const isTeacherInSubclass = classLevel.subclasses.some(
      (sub) =>
        sub.letter === subclass &&
        sub.subjects.some((subj) =>
          subj.teachers.some((tId) => tId.toString() === teacherId)
        )
    );

    if (!isTeacherAssigned && !isTeacherInSubclass) {
      return responseStatus(
        res,
        403,
        "error",
        "Teacher is not assigned to this class or subclass"
      );
    }

    const targetSubclass = classLevel.subclasses.find((sub) => sub.letter === subclass);
    if (!targetSubclass) {
      return responseStatus(
        res,
        404,
        "error",
        `Subclass ${subclass} not found in ${section} ${className}`
      );
    }

    const studentIds = targetSubclass.students.map((s) => s.id);

    // Simplified Student query
    const students = await Student.find({
      _id: { $in: studentIds },
    }).select("studentId firstName lastName email phoneNumber profilePictureUrl activityRate");

    return responseStatus(res, 200, "success", {
      academicYear: academicYear.name,
      term: academicTerm.terms?.find((t) => t.isCurrent)?.name || "Unknown Term",
      section: sectionName,
      className: classNameAdjusted,
      subclass,
      classLevelId: classLevel._id,
      students: students.map((s) => ({
        studentId: s.studentId,
        firstName: s.firstName,
        lastName: s.lastName,
        email: s.email,
        phoneNumber: s.phoneNumber,
        profilePicture: s.profilePictureUrl,
        activityRate: s.activityRate || "0%",
        classId: classLevel._id,
      })),
    });
  } catch (error) {
    console.error("Error retrieving students:", error.stack);
    return responseStatus(res, 500, "error", `Error retrieving students: ${error.message}`);
  }
};

exports.postStudentCommentService = async (teacherId, studentId, classLevelId, commentText, academicYearId, academicTermId, res) => {
  if (!res || !res.status || typeof res.status !== "function") {
    return { status: "error", message: "Invalid response object" };
  }

  try {
    if (!academicYearId) {
      return responseStatus(res, 400, "error", "academicYearId is required");
    }
    if (!academicTermId) {
      return responseStatus(res, 400, "error", "academicTermId is required");
    }

    const academicYear = await AcademicYear.findById(academicYearId).lean();
    if (!academicYear) {
      return responseStatus(res, 404, "error", `Academic year ${academicYearId} not found`);
    }
    const academicTerm = await AcademicTerm.findById(academicTermId).lean();
    if (!academicTerm) {
      return responseStatus(res, 404, "error", `Academic term ${academicTermId} not found`);
    }

    const classLevel = await ClassLevel.findOne({
      _id: classLevelId,
      academicYear: academicYearId,
    }).lean();
    if (!classLevel) {
      return responseStatus(
        res,
        404,
        "error",
        "Class not found for the current academic year"
      );
    }

    const isTeacherAssigned = classLevel.teachers.some(
      (t) => t.teacherId.toString() === teacherId
    );
    const isTeacherInSubclass = classLevel.subclasses.some((sub) =>
      sub.subjects.some((subj) =>
        subj.teachers.some((tId) => tId.toString() === teacherId)
      )
    );
    if (!isTeacherAssigned && !isTeacherInSubclass) {
      return responseStatus(res, 403, "error", "Teacher is not assigned to this class");
    }

    const isStudentInClass = classLevel.subclasses.some((sub) =>
      sub.students.some((s) => s.id.toString() === studentId)
    );
    if (!isStudentInClass) {
      return responseStatus(res, 404, "error", "Student is not in this class");
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return responseStatus(res, 404, "error", "Student not found");
    }

    if (!commentText || commentText.trim().length === 0) {
      return responseStatus(res, 400, "error", "Comment text is required");
    }

    const comment = await Comment.create({
      studentId,
      teacherId,
      classLevelId,
      academicTermId,
      comment: commentText,
    });

    return responseStatus(res, 201, "success", {
      commentId: comment._id,
      studentId: comment.studentId,
      teacherId: comment.teacherId,
      classLevelId: comment.classLevelId,
      academicTermId: comment.academicTermId,
      comment: comment.comment,
      createdAt: comment.createdAt,
    });
  } catch (error) {
    console.error("Error posting comment:", error.stack);
    return responseStatus(res, 500, "error", `Error posting comment: ${error.message}`);
  }
};