const Exams = require("../../models/Academic/exams.model");
const Question = require("../../models/Academic/questions.model");
const Student = require("../../models/Students/students.model");
const Results = require("../../models/Academic/results.model");
const responseStatus = require("../../handlers/responseStatus.handler");

// Student: Create Exam Result
const studentCreateExamResultService = async (res, data, studentId) => {
  const { examId, answeredQuestions } = data;

  // Validate student
  const student = await Student.findById(studentId);
  if (!student) {
    responseStatus(res, 404, "failed", "Student not found");
    return null;
  }

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

  // Create exam result
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
  adminPublishResultService,
  adminUnPublishResultService,
};