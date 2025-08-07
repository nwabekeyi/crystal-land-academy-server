const Exams = require("../../models/Academic/exams.model");
const Teacher = require("../../models/Staff/teachers.model");
const Subject = require("../../models/Academic/subject.model");
const ClassLevel = require("../../models/Academic/class.model");
const responseStatus = require("../../handlers/responseStatus.handler");

// Teacher: Create Exam
const teacherCreateExamService = async (data, teacherId) => {
  const {
    name,
    description,
    subject,
    classLevel,
    passMark,
    totalMark,
    academicTerm,
    academicYear,
    duration,
    examDate,
    examTime,
    examType,
    startDate,
    startTime,
  } = data;

  // Validate teacher
  const teacher = await Teacher.findById(teacherId);
  if (!teacher) {
    return responseStatus(null, 404, "failed", "Teacher not found");
  }

  // Prevent admins from using teacher service
  if (teacher.isAdmin) {
    return responseStatus(null, 403, "failed", "Admins must use admin endpoints");
  }

  // Validate subject and class level
  const subjectDoc = await Subject.findById(subject).populate("name");
  if (!subjectDoc) {
    return responseStatus(null, 404, "failed", "Subject not found");
  }
  const classLevelDoc = await ClassLevel.findById(classLevel);
  if (!classLevelDoc) {
    return responseStatus(null, 404, "failed", "Class level not found");
  }

  // Check if teacher is assigned to the subject in the class level
  const isAssigned = await checkTeacherAssignment(teacherId, subject, classLevel);
  if (!isAssigned) {
    return responseStatus(null, 403, "failed", "Teacher not assigned to this subject in the specified class level");
  }

  // Check if exam exists
  const examExist = await Exams.findOne({
    name,
    subject,
    classLevel,
    academicTerm,
    academicYear,
  });
  if (examExist) {
    return responseStatus(null, 400, "failed", "Exam already exists");
  }

  // Create exam
  const examCreate = await Exams.create({
    name,
    description,
    subject,
    classLevel,
    passMark,
    totalMark,
    academicTerm,
    academicYear,
    duration,
    examDate,
    examTime,
    examType,
    examStatus: "pending",
    startDate: startDate || null,
    startTime: startTime || null,
    createdBy: teacherId,
  });

  // Update teacher's examsCreated
  teacher.examsCreated = teacher.examsCreated || [];
  teacher.examsCreated.push(examCreate._id);
  await teacher.save();

  return responseStatus(null, 201, "success", examCreate);
};

// Teacher: Get All Exams
const teacherGetAllExamsService = async (teacherId, filters = {}) => {
  const teacher = await Teacher.findById(teacherId);
  if (!teacher) {
    return responseStatus(null, 404, "failed", "Teacher not found");
  }

  // Prevent admins from using teacher service
  if (teacher.isAdmin) {
    return responseStatus(null, 403, "failed", "Admins must use admin endpoints");
  }

  const query = { createdBy: teacherId };
  if (filters.classLevel) query.classLevel = filters.classLevel;
  if (filters.subject) query.subject = filters.subject;
  if (filters.examStatus) query.examStatus = filters.examStatus;
  if (filters.academicYear) query.academicYear = filters.academicYear;
  if (filters.academicTerm) query.academicTerm = filters.academicTerm;

  return await Exams.find(query)
    .populate("subject")
    .populate("classLevel")
    .populate("academicTerm")
    .populate("academicYear")
    .populate("createdBy", "firstName lastName teacherId");
};

// Teacher: Get Exam by ID
const teacherGetExamByIdService = async (examId, teacherId) => {
  const teacher = await Teacher.findById(teacherId);
  if (!teacher) {
    return responseStatus(null, 404, "failed", "Teacher not found");
  }

  // Prevent admins from using teacher service
  if (teacher.isAdmin) {
    return responseStatus(null, 403, "failed", "Admins must use admin endpoints");
  }

  const exam = await Exams.findById(examId)
    .populate("subject")
    .populate("classLevel")
    .populate("academicTerm")
    .populate("academicYear")
    .populate("createdBy", "firstName lastName teacherId");

  if (!exam) {
    return responseStatus(null, 404, "failed", "Exam not found");
  }

  // Ensure teacher created the exam
  if (exam.createdBy.toString() !== teacherId) {
    return responseStatus(null, 403, "failed", "Unauthorized to access this exam");
  }

  return responseStatus(null, 200, "success", exam);
};

// Teacher: Update Exam
const teacherUpdateExamService = async (data, examId, teacherId) => {
  const teacher = await Teacher.findById(teacherId);
  if (!teacher) {
    return responseStatus(null, 404, "failed", "Teacher not found");
  }

  // Prevent admins from using teacher service
  if (teacher.isAdmin) {
    return responseStatus(null, 403, "failed", "Admins must use admin endpoints");
  }

  const exam = await Exams.findById(examId);
  if (!exam) {
    return responseStatus(null, 404, "failed", "Exam not found");
  }

  // Ensure teacher created the exam
  if (exam.createdBy.toString() !== teacherId) {
    return responseStatus(null, 403, "failed", "Unauthorized to update this exam");
  }

  // If updating subject or classLevel, verify teacher assignment
  const subjectId = data.subject || exam.subject;
  const classLevelId = data.classLevel || exam.classLevel;
  const isAssigned = await checkTeacherAssignment(teacherId, subjectId, classLevelId);
  if (!isAssigned) {
    return responseStatus(null, 403, "failed", "Teacher not assigned to this subject in the specified class level");
  }

  // Validate subject and classLevel if provided
  if (data.subject) {
    const subjectDoc = await Subject.findById(data.subject).populate("name");
    if (!subjectDoc) {
      return responseStatus(null, 404, "failed", "Subject not found");
    }
  }
  if (data.classLevel) {
    const classLevelDoc = await ClassLevel.findById(data.classLevel);
    if (!classLevelDoc) {
      return responseStatus(null, 404, "failed", "Class level not found");
    }
  }

  // Check for duplicate exam
  const examDuplicate = await Exams.findOne({
    name: data.name || exam.name,
    subject: data.subject || exam.subject,
    classLevel: data.classLevel || exam.classLevel,
    academicTerm: data.academicTerm || exam.academicTerm,
    academicYear: data.academicYear || exam.academicYear,
    _id: { $ne: examId },
  });

  if (examDuplicate) {
    return responseStatus(null, 400, "failed", "Exam with these details already exists");
  }

  // Prevent updating startDate/startTime if exam is approved
  if (exam.examStatus === "approved" && (data.startDate || data.startTime)) {
    return responseStatus(null, 400, "failed", "Cannot modify start date/time of an approved exam");
  }

  const examUpdated = await Exams.findByIdAndUpdate(
    examId,
    { $set: { ...data, startDate: data.startDate || null, startTime: data.startTime || null } },
    { new: true, runValidators: true }
  );

  return responseStatus(null, 200, "success", examUpdated);
};

// Teacher: Delete Exam
const teacherDeleteExamService = async (examId, teacherId) => {
  const teacher = await Teacher.findById(teacherId);
  if (!teacher) {
    return responseStatus(null, 404, "failed", "Teacher not found");
  }

  // Prevent admins from using teacher service
  if (teacher.isAdmin) {
    return responseStatus(null, 403, "failed", "Admins must use admin endpoints");
  }

  const exam = await Exams.findById(examId);
  if (!exam) {
    return responseStatus(null, 404, "failed", "Exam not found");
  }

  // Ensure teacher created the exam
  if (exam.createdBy.toString() !== teacherId) {
    return responseStatus(null, 403, "failed", "Unauthorized to delete this exam");
  }

  // Verify teacher is assigned to the subject in the class
  const isAssigned = await checkTeacherAssignment(teacherId, exam.subject, exam.classLevel);
  if (!isAssigned) {
    return responseStatus(null, 403, "failed", "Teacher not assigned to this subject in the specified class level");
  }

  // Remove exam from teacher's examsCreated
  await Teacher.findByIdAndUpdate(teacherId, {
    $pull: { examsCreated: examId },
  });

  await Exams.findByIdAndDelete(examId);
  return responseStatus(null, 200, "success", "Exam deleted successfully");
};

// Admin: Create Exam
const adminCreateExamService = async (data, adminId) => {
  const {
    name,
    description,
    subject,
    classLevel,
    passMark,
    totalMark,
    academicTerm,
    academicYear,
    duration,
    examDate,
    examTime,
    examType,
    startDate,
    startTime,
  } = data;

  // Validate admin
  const admin = await Teacher.findById(adminId);
  if (!admin || !admin.isAdmin) {
    return responseStatus(null, 403, "failed", "Only admins can create exams");
  }

  // Validate subject and class level
  const subjectDoc = await Subject.findById(subject).populate("name");
  if (!subjectDoc) {
    return responseStatus(null, 404, "failed", "Subject not found");
  }
  const classLevelDoc = await ClassLevel.findById(classLevel);
  if (!classLevelDoc) {
    return responseStatus(null, 404, "failed", "Class level not found");
  }

  // Check if exam exists
  const examExist = await Exams.findOne({
    name,
    subject,
    classLevel,
    academicTerm,
    academicYear,
  });
  if (examExist) {
    return responseStatus(null, 400, "failed", "Exam already exists");
  }

  // Create exam
  const examCreate = await Exams.create({
    name,
    description,
    subject,
    classLevel,
    passMark,
    totalMark,
    academicTerm,
    academicYear,
    duration,
    examDate,
    examTime,
    examType,
    examStatus: "pending",
    startDate: startDate || null,
    startTime: startTime || null,
    createdBy: adminId,
  });

  // Update admin's examsCreated
  admin.examsCreated = admin.examsCreated || [];
  admin.examsCreated.push(examCreate._id);
  await admin.save();

  return responseStatus(null, 201, "success", examCreate);
};

// Admin: Get All Exams
const adminGetAllExamsService = async (adminId, filters = {}) => {
  const admin = await Teacher.findById(adminId);
  if (!admin || !admin.isAdmin) {
    return responseStatus(null, 403, "failed", "Only admins can access all exams");
  }

  const query = {};
  if (filters.classLevel) query.classLevel = filters.classLevel;
  if (filters.subject) query.subject = filters.subject;
  if (filters.examStatus) query.examStatus = filters.examStatus;
  if (filters.academicYear) query.academicYear = filters.academicYear;
  if (filters.academicTerm) query.academicTerm = filters.academicTerm;
  if (filters.createdBy) query.createdBy = filters.createdBy;

  return await Exams.find(query)
    .populate("subject")
    .populate("classLevel")
    .populate("academicTerm")
    .populate("academicYear")
    .populate("createdBy", "firstName lastName teacherId");
};

// Admin: Get Exam by ID
const adminGetExamByIdService = async (examId, adminId) => {
  const admin = await Teacher.findById(adminId);
  if (!admin || !admin.isAdmin) {
    return responseStatus(null, 403, "failed", "Only admins can access this exam");
  }

  const exam = await Exams.findById(examId)
    .populate("subject")
    .populate("classLevel")
    .populate("academicTerm")
    .populate("academicYear")
    .populate("createdBy", "firstName lastName teacherId");

  if (!exam) {
    return responseStatus(null, 404, "failed", "Exam not found");
  }

  return responseStatus(null, 200, "success", exam);
};

// Admin: Update Exam
const adminUpdateExamService = async (data, examId, adminId) => {
  const admin = await Teacher.findById(adminId);
  if (!admin || !admin.isAdmin) {
    return responseStatus(null, 403, "failed", "Only admins can update exams");
  }

  const exam = await Exams.findById(examId);
  if (!exam) {
    return responseStatus(null, 404, "failed", "Exam not found");
  }

  // Validate subject and classLevel if provided
  if (data.subject) {
    const subjectDoc = await Subject.findById(data.subject).populate("name");
    if (!subjectDoc) {
      return responseStatus(null, 404, "failed", "Subject not found");
    }
  }
  if (data.classLevel) {
    const classLevelDoc = await ClassLevel.findById(data.classLevel);
    if (!classLevelDoc) {
      return responseStatus(null, 404, "failed", "Class level not found");
    }
  }

  // Check for duplicate exam
  const examDuplicate = await Exams.findOne({
    name: data.name || exam.name,
    subject: data.subject || exam.subject,
    classLevel: data.classLevel || exam.classLevel,
    academicTerm: data.academicTerm || exam.academicTerm,
    academicYear: data.academicYear || exam.academicYear,
    _id: { $ne: examId },
  });

  if (examDuplicate) {
    return responseStatus(null, 400, "failed", "Exam with these details already exists");
  }

  // Prevent updating startDate/startTime if exam is approved
  if (exam.examStatus === "approved" && (data.startDate || data.startTime)) {
    return responseStatus(null, 400, "failed", "Cannot modify start date/time of an approved exam");
  }

  const examUpdated = await Exams.findByIdAndUpdate(
    examId,
    { $set: { ...data, startDate: data.startDate || null, startTime: data.startTime || null } },
    { new: true, runValidators: true }
  );

  return responseStatus(null, 200, "success", examUpdated);
};

// Admin: Delete Exam
const adminDeleteExamService = async (examId, adminId) => {
  const admin = await Teacher.findById(adminId);
  if (!admin || !admin.isAdmin) {
    return responseStatus(null, 403, "failed", "Only admins can delete exams");
  }

  const exam = await Exams.findById(examId);
  if (!exam) {
    return responseStatus(null, 404, "failed", "Exam not found");
  }

  // Remove exam from creator's examsCreated
  await Teacher.findByIdAndUpdate(exam.createdBy, {
    $pull: { examsCreated: examId },
  });

  await Exams.findByIdAndDelete(examId);
  return responseStatus(null, 200, "success", "Exam deleted successfully");
};

// Admin: Approve Exam
const adminApproveExamService = async (examId, adminId, startDate, startTime) => {
  const admin = await Teacher.findById(adminId);
  if (!admin || !admin.isAdmin) {
    return responseStatus(null, 403, "failed", "Only admins can approve exams");
  }

  const exam = await Exams.findById(examId);
  if (!exam) {
    return responseStatus(null, 404, "failed", "Exam not found");
  }

  if (exam.examStatus === "approved") {
    return responseStatus(null, 400, "failed", "Exam is already approved");
  }

  if (!startDate || !startTime) {
    return responseStatus(null, 400, "failed", "Start date and time are required for approval");
  }

  const parsedStartDate = new Date(startDate);
  if (isNaN(parsedStartDate)) {
    return responseStatus(null, 400, "failed", "Invalid start date format");
  }

  exam.examStatus = "approved";
  exam.startDate = parsedStartDate;
  exam.startTime = startTime;
  await exam.save();

  return responseStatus(null, 200, "success", {
    message: "Exam approved successfully",
    exam,
  });
};

// Helper function to check if teacher is assigned to a subject in a class level
async function checkTeacherAssignment(teacherId, subjectId, classLevelId) {
  const subject = await Subject.findById(subjectId);
  if (!subject) {
    return false;
  }

  const classLevel = await ClassLevel.findById(classLevelId);
  if (!classLevel) {
    return false;
  }

  // Check if the subject is assigned to the class level in classLevelSubclasses
  const assignment = subject.classLevelSubclasses.find(cls => 
    cls.classLevel.toString() === classLevelId.toString()
  );

  if (!assignment) {
    return false;
  }

  // For SS classes, ensure subclassLetter exists and teacher is assigned
  if (["SS 1", "SS 2", "SS 3"].includes(classLevel.name)) {
    if (!assignment.subclassLetter) {
      return false;
    }
    const subclassExists = classLevel.subclasses.some(sub => sub.letter === assignment.subclassLetter);
    if (!subclassExists) {
      return false;
    }
    return assignment.teachers.some(t => t.toString() === teacherId);
  }

  // For non-SS classes, no subclassLetter is required, just check teachers
  return assignment.teachers.some(t => t.toString() === teacherId);
}

module.exports = {
  teacherCreateExamService,
  teacherGetAllExamsService,
  teacherGetExamByIdService,
  teacherUpdateExamService,
  teacherDeleteExamService,
  adminCreateExamService,
  adminGetAllExamsService,
  adminGetExamByIdService,
  adminUpdateExamService,
  adminDeleteExamService,
  adminApproveExamService,
};