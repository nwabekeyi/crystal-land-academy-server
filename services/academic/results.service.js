const Exams = require("../../models/Academic/exams.model");
const Question = require("../../models/Academic/questions.model");
const Student = require("../../models/Students/students.model");
const Results = require("../../models/Academic/results.model");
const responseStatus = require("../../handlers/responseStatus.handler");
const AcademicYear = require('../../models/Academic/academicYear.model')

// Student: Create Exam Result
const studentCreateExamResultService = async (res, data, studentId) => {
  const { examId, answeredQuestions, completedTime } = data;

  // Validate student and fetch subclass
  const student = await Student.findById(studentId);
  if (!student) {
    responseStatus(res, 404, "failed", "Student not found");
    return null;
  }

  // Get subclass from student's currentClassLevel
  const subclass = student.currentClassLevel?.subclass || null;

  // Validate exam
  const exam = await Exams.findById(examId)
    .populate("subject")
    .populate("classLevel")
    .populate("academicTerm")
    .populate("academicYear")
    .populate("questions")
    .populate("createdBy");
  if (!exam) {
    responseStatus(res, 404, "failed", "Exam not found");
    return null;
  }

  // Ensure exam is approved
  if (exam.examStatus !== "approved") {
    responseStatus(res, 400, "failed", "Cannot submit results for an unapproved exam");
    return null;
  }

  // Check if student has already submitted the exam
  if (exam.completedBy && exam.completedBy.some((entry) => entry.student && entry.student.toString() === studentId)) {
    responseStatus(res, 400, "failed", "Student has already submitted this exam");
    return null;
  }

  // Check if result already exists for this student and exam
  const existingResult = await Results.findOne({ exam: examId, student: studentId });
  if (existingResult) {
    responseStatus(res, 400, "failed", "Result already exists for this student and exam");
    return null;
  }

  // Validate answeredQuestions
  if (!Array.isArray(answeredQuestions) || answeredQuestions.length === 0) {
    responseStatus(res, 400, "failed", "Answered questions must be provided");
    return null;
  }

  // Validate completedTime format (e.g., HH:mm) if provided
  if (completedTime && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(completedTime)) {
    responseStatus(res, 400, "failed", "Invalid completedTime format. Use HH:mm (e.g., 14:30)");
    return null;
  }

  // Calculate score using Question model
  let totalScore = 0;
  for (const answer of answeredQuestions) {
    const { questionId, selectedOption } = answer;

    // Validate questionId
    const question = await Question.findById(questionId);
    if (!question || !exam.questions.some((q) => q._id.toString() === questionId)) {
      responseStatus(res, 400, "failed", `Invalid question ID: ${questionId}`);
      return null;
    }

    // Validate selectedOption
    if (!["optionA", "optionB", "optionC", "optionD"].includes(selectedOption)) {
      responseStatus(res, 400, "failed", `Invalid selected option for question ${questionId}`);
      return null;
    }

    // Check if the selected option matches the correct answer
    if (question[selectedOption] === question.correctAnswer) {
      totalScore += question.score;
    }
  }

  // Ensure total score does not exceed exam's totalMark
  if (totalScore > exam.totalMark) {
    responseStatus(res, 400, "failed", `Total score (${totalScore}) cannot exceed exam's total mark (${exam.totalMark})`);
    return null;
  }

  // Determine status based on passMark
  const status = totalScore >= exam.passMark ? "passed" : "failed";

  // Assign remarks based on percentage of totalMark
  const percentage = (totalScore / exam.totalMark) * 100;
  let remarks;
  if (percentage >= 80) {
    remarks = "Excellent";
  } else if (percentage >= 60) {
    remarks = "Good";
  } else {
    remarks = "Poor";
  }

  // Calculate position based on other students' scores for the same exam
  const allResults = await Results.find({ exam: examId }).select("score");
  const scores = [...allResults.map((r) => r.score), totalScore].sort((a, b) => b - a);
  const position = scores.indexOf(totalScore) + 1;

  // Default completedTime to current time if not provided
  const defaultCompletedTime = completedTime || new Date().toTimeString().slice(0, 5); // e.g., "15:51"

  // Update Exam with completion details
  const completedDate = new Date();
  await Exams.findByIdAndUpdate(
    examId,
    {
      $push: {
        completedBy: {
          student: studentId,
          completedDate,
          completedTime: defaultCompletedTime,
        },
      },
    },
    { new: true }
  );

  // Create exam result with subclass
  const result = await Results.create({
    student: studentId,
    exam: examId,
    score: totalScore,
    passMark: exam.passMark,
    answeredQuestions,
    status,
    remarks,
    position,
    teacher: exam.createdBy,
    subject: exam.subject,
    classLevel: exam.classLevel,
    academicTerm: exam.academicTerm,
    academicYear: exam.academicYear,
    subclass, // Add subclass from student
    isPublished: false,
  });

  return result;
};

// Student: Check Exam Result
const studentCheckExamResultService = async (examId, studentId, res) => {
  // Validate student
  const student = await Student.findById(studentId);
  if (!student) {
    return responseStatus(res, 404, "failed", "Student not found");
  }

  // Find the result for the given exam and student
  const result = await Results.findOne({
    exam: examId,
    student: studentId,
  })
    .populate({
      path: "exam",
      populate: {
        path: "questions",
        select: "question optionA optionB optionC optionD score", // Exclude correctAnswer
      },
    })
    .populate("classLevel")
    .populate("subject")
    .populate("academicTerm")
    .populate("academicYear");

  if (!result) {
    return responseStatus(res, 404, "failed", "Result not found for this exam and student");
  }

  // Check if the result is published
  if (!result.isPublished) {
    return responseStatus(
      res,
      400,
      "failed",
      "Result is not published yet! Please wait for further notice"
    );
  }

  return result;
};

// Teacher: Get All Exam Results for a Class
const getAllExamResultsService = async (classId, teacherId, res) => {
  // Validate teacher
  const teacher = await require("../../models/Staff/teachers.model").findById(teacherId);
  if (!teacher) {
    return responseStatus(res, 404, "failed", "Teacher not found");
  }

  // Find all exams for the class created by the teacher
  const exams = await Exams.find({ classLevel: classId, createdBy: teacherId }).select("_id");
  if (!exams.length) {
    return responseStatus(res, 404, "failed", "No exams found for this class created by the teacher");
  }

  // Find all results for the exams
  const result = await Results.find({ exam: { $in: exams.map((e) => e._id) } })
    .populate("student", "firstName lastName studentId")
    .populate("exam")
    .populate("subject")
    .populate("classLevel")
    .populate("academicTerm")
    .populate("academicYear");

  return result;
};

// Teacher: Get Results for a Single Exam
// Teacher: Get Results for a Single Exam
const teacherGetSingleExamResultsService = async (examId, teacherId, res) => {
  const mongoose = require("mongoose");

  // Validate examId
  if (!mongoose.isValidObjectId(examId)) {
    responseStatus(res, 400, "failed", "Invalid exam ID");
    return null;
  }

  // Validate teacher
  const teacher = await require("../../models/Staff/teachers.model").findById(teacherId).lean();
  if (!teacher) {
    responseStatus(res, 404, "failed", "Teacher not found");
    return null;
  }

  // Find the current academic year
  const currentAcademicYear = await AcademicYear.findOne({ isCurrent: true }).lean();
  if (!currentAcademicYear) {
    responseStatus(res, 404, "failed", "No current academic year found");
    return null;
  }

  // Validate exam and ensure teacher is the creator and exam is in current academic year
  const exam = await Exams.findOne({
    _id: examId,
    createdBy: teacherId,
    academicYear: currentAcademicYear._id,
  }).lean();
  if (!exam) {
    responseStatus(res, 404, "failed", "Exam not found, not created by you, or not in the current academic year");
    return null;
  }

  // Find all results for the exam
  const results = await Results.find({ exam: examId })
    .populate({
      path: "student",
      select: "firstName lastName studentId",
    })
    .populate({
      path: "exam",
      select: "name examType examDate examTime",
    })
    .populate({
      path: "subject",
      select: "name",
    })
    .populate({
      path: "classLevel",
      select: "name",
    })
    .populate({
      path: "academicTerm",
      select: "name",
    })
    .populate({
      path: "academicYear",
      select: "name fromYear toYear",
    })
    .lean()
    .sort({ score: -1, createdAt: -1 });

  if (!results.length) {
    responseStatus(res, 404, "failed", "No results found for this exam");
    return null;
  }

  return results;
};

// Admin: Get All Exam Results with Filters and Pagination
const adminGetAllExamResultsService = async (res, adminId, filters = {}, page = 1, limit = 10) => {
  // Validate admin
  const Admin = require("../../models/Staff/admin.model");
  const admin = await Admin.findById(adminId);
  if (!admin) {
    return responseStatus(res, 403, "failed", "Only admins can access exam results");
  }

  // Build query based on filters
  const query = {};
  if (filters.academicYear) query.academicYear = filters.academicYear;
  if (filters.academicTerm) query.academicTerm = filters.academicTerm;
  if (filters.classLevel) query.classLevel = filters.classLevel;
  if (filters.subclass) query.subclass = filters.subclass;
  if (filters.subject) query.subject = filters.subject;

  // Calculate pagination parameters
  const skip = (page - 1) * limit;

  // Fetch results with pagination
  const results = await Results.find(query)
    .populate("student", "firstName lastName studentId")
    .populate("exam", "name examType examDate examTime")
    .populate("subject", "name")
    .populate("classLevel", "name")
    .populate("academicTerm", "name")
    .populate("academicYear", "name")
    .skip(skip)
    .limit(limit)
    .sort({ score: -1, createdAt: -1 }); // Sort by score (desc) and creation date (desc)

  // Get total count for pagination metadata
  const totalResults = await Results.countDocuments(query);
  const totalPages = Math.ceil(totalResults / limit);

  if (!results.length) {
    return responseStatus(res, 404, "failed", "No exam results found for the provided filters");
  }

  return {
    results,
    pagination: {
      totalResults,
      totalPages,
      currentPage: page,
      limit,
    },
  };
};

// Admin: Publish Exam Results
const adminPublishResultService = async (examId, res) => {
  // Validate exam
  const exam = await Exams.findById(examId);
  if (!exam) {
    return responseStatus(res, 404, "failed", "Exam not found");
  }

  // Ensure exam is approved
  if (exam.examStatus !== "approved") {
    return responseStatus(res, 400, "failed", "Cannot publish results for an unapproved exam");
  }

  // Find all results for the exam
  const results = await Results.find({ exam: examId });
  if (!results.length) {
    return responseStatus(res, 404, "failed", "No results found for this exam");
  }

  // Update all results to published
  await Results.updateMany({ exam: examId }, { $set: { isPublished: true } });

  return { message: "Exam results published successfully" };
};

// Admin: Unpublish Exam Results
const adminUnPublishResultService = async (examId, res) => {
  // Validate exam
  const exam = await Exams.findById(examId);
  if (!exam) {
    return responseStatus(res, 404, "failed", "Exam not found");
  }

  // Find all results for the exam
  const results = await Results.find({ exam: examId });
  if (!results.length) {
    return responseStatus(res, 404, "failed", "No results found for this exam");
  }

  // Update all results to unpublished
  await Results.updateMany({ exam: examId }, { $set: { isPublished: false } });

  return { message: "Exam results unpublished successfully" };
};

module.exports = {
  studentCreateExamResultService,
  studentCheckExamResultService,
  getAllExamResultsService,
  teacherGetSingleExamResultsService,
  adminGetAllExamResultsService,
  adminPublishResultService,
  adminUnPublishResultService,
};