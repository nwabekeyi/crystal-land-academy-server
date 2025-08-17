const Exams = require("../../models/Academic/exams.model");
const Question = require("../../models/Academic/questions.model");
const Teacher = require("../../models/Staff/teachers.model");
const Subject = require("../../models/Academic/subject.model");
const ClassLevel = require("../../models/Academic/class.model");
const responseStatus = require("../../handlers/responseStatus.handler");
const Admin = require("../../models/Staff/admin.model");
const Student = require("../../models/Students/students.model");
const AcademicYear = require('../../models/Academic/academicYear.model')

// Helper function to check for exam conflicts (same date or startDate for same subclass)
async function checkExamDateConflict(res, data, examId = null) {
  const { classLevel, subclassLetter, examDate, startDate } = data;
  const classLevelDoc = await ClassLevel.findById(classLevel);
  if (!classLevelDoc) {
    responseStatus(res, 404, "failed", "Class level not found");
    return true;
  }

  const isSSClass = ["SS 1", "SS 2", "SS 3"].includes(classLevelDoc.name);
  const subclassLetters = isSSClass && subclassLetter ? (Array.isArray(subclassLetter) ? subclassLetter : [subclassLetter]) : [];

  // For SS classes, check conflicts for any subclass letter in the array
  if (isSSClass && subclassLetters.length > 0) {
    const query = {
      classLevel,
      subclassLetter: { $in: subclassLetters },
      $or: [
        { examDate: new Date(examDate) },
        startDate ? { startDate: new Date(startDate) } : null,
      ].filter(Boolean),
    };

    if (examId) {
      query._id = { $ne: examId }; // Exclude the current exam when updating
    }

    const conflictingExam = await Exams.findOne(query);
    if (conflictingExam) {
      const conflictingSubclasses = conflictingExam.subclassLetter.filter((letter) => subclassLetters.includes(letter));
      responseStatus(res, 400, "failed", `Another exam/test is already scheduled on this date or start date for subclasses: ${conflictingSubclasses.join(", ")}`);
      return true;
    }
  } else {
    // For non-SS classes, check conflicts with empty subclassLetter array
    const query = {
      classLevel,
      subclassLetter: { $size: 0 },
      $or: [
        { examDate: new Date(examDate) },
        startDate ? { startDate: new Date(startDate) } : null,
      ].filter(Boolean),
    };

    if (examId) {
      query._id = { $ne: examId }; // Exclude the current exam when updating
    }

    const conflictingExam = await Exams.findOne(query);
    if (conflictingExam) {
      responseStatus(res, 400, "failed", "Another exam/test is already scheduled on this date or start date for this class");
      return true;
    }
  }
  return false;
}

// Helper function to check for single exam per subject per term (if examType is "exam")
async function checkSingleExamPerSubject(res, data, examId = null) {
  const { subject, classLevel, academicTerm, academicYear, examType, subclassLetter } = data;
  if (examType !== "exam") return false;

  const classLevelDoc = await ClassLevel.findById(classLevel);
  if (!classLevelDoc) {
    responseStatus(res, 404, "failed", "Class level not found");
    return true;
  }

  const isSSClass = ["SS 1", "SS 2", "SS 3"].includes(classLevelDoc.name);
  const subclassLetters = isSSClass && subclassLetter ? (Array.isArray(subclassLetter) ? subclassLetter : [subclassLetter]) : [];

  // For SS classes, check for existing exams with any overlapping subclass letters
  if (isSSClass && subclassLetters.length > 0) {
    const query = {
      subject,
      classLevel,
      academicTerm,
      academicYear,
      examType: "exam",
      subclassLetter: { $in: subclassLetters },
    };

    if (examId) {
      query._id = { $ne: examId }; // Exclude the current exam when updating
    }

    const existingExam = await Exams.findOne(query);
    if (existingExam) {
      const overlappingSubclasses = existingExam.subclassLetter.filter((letter) => subclassLetters.includes(letter));
      responseStatus(res, 400, "failed", `An exam of type 'exam' already exists for this subject in the same term for subclasses: ${overlappingSubclasses.join(", ")}`);
      return true;
    }
  } else {
    // For non-SS classes, check for existing exams with empty subclassLetter array
    const query = {
      subject,
      classLevel,
      academicTerm,
      academicYear,
      examType: "exam",
      subclassLetter: { $size: 0 },
    };

    if (examId) {
      query._id = { $ne: examId }; // Exclude the current exam when updating
    }

    const existingExam = await Exams.findOne(query);
    if (existingExam) {
      responseStatus(res, 400, "failed", "An exam of type 'exam' already exists for this subject in the same term for this class");
      return true;
    }
  }
  return false;
}

// Teacher: Create Exam
const teacherCreateExamService = async (res, data, teacherId) => {
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
    subclassLetter,
    startDate,
    startTime,
  } = data;

  // Validate teacher
  const teacher = await Teacher.findById(teacherId);
  if (!teacher) {
    responseStatus(res, 404, "failed", "Teacher not found");
    return null;
  }

  // Prevent admins from using teacher service
  if (teacher.isAdmin) {
    responseStatus(res, 403, "failed", "Admins must use admin endpoints");
    return null;
  }

  // Validate subject and class level
  const subjectDoc = await Subject.findById(subject).populate("name");
  if (!subjectDoc) {
    responseStatus(res, 404, "failed", "Subject not found");
    return null;
  }
  const classLevelDoc = await ClassLevel.findById(classLevel);
  if (!classLevelDoc) {
    responseStatus(res, 404, "failed", "Class level not found");
    return null;
  }

  // Validate subclassLetter for SS classes
  const isSSClass = ["SS 1", "SS 2", "SS 3"].includes(classLevelDoc.name);
  const subclassLetters = subclassLetter ? (Array.isArray(subclassLetter) ? subclassLetter : [subclassLetter]) : [];
  if (isSSClass && subclassLetters.length === 0) {
    responseStatus(res, 400, "failed", "At least one subclass letter is required for SS classes");
    return null;
  }
  if (isSSClass && subclassLetters.length > 0) {
    const invalidSubclasses = subclassLetters.filter(
      (letter) => !classLevelDoc.subclasses.some((sub) => sub.letter === letter)
    );
    if (invalidSubclasses.length > 0) {
      responseStatus(res, 400, "failed", `Invalid subclass letter(s) for this class: ${invalidSubclasses.join(", ")}`);
      return null;
    }
  }
  if (!isSSClass && subclassLetters.length > 0) {
    responseStatus(res, 400, "failed", "Subclass letters are not allowed for non-SS classes");
    return null;
  }

  // Check if teacher is assigned to the subject and class
  const isAssigned = await checkTeacherAssignment(teacherId, subject, classLevel);
  if (!isAssigned) {
    responseStatus(res, 403, "failed", "Teacher is not assigned to this subject and class");
    return null;
  }

  // Validate duration
  if (!Number.isInteger(duration) || duration <= 0) {
    responseStatus(res, 400, "failed", "Duration must be a positive integer (in minutes)");
    return null;
  }

  // Check for existing exam with same details
  const query = {
    name,
    subject,
    classLevel,
    academicTerm,
    academicYear,
  };
  if (isSSClass) {
    query.subclassLetter = { $in: subclassLetters };
  } else {
    query.subclassLetter = { $size: 0 };
  }
  const examExist = await Exams.findOne(query);
  if (examExist) {
    const overlappingSubclasses = isSSClass ? examExist.subclassLetter.filter((letter) => subclassLetters.includes(letter)) : [];
    responseStatus(
      res,
      400,
      "failed",
      isSSClass
        ? `Exam already exists with these details for subclasses: ${overlappingSubclasses.join(", ")}`
        : "Exam already exists with these details for this class"
    );
    return null;
  }

  // Check for single exam per subject per term (if examType is "exam")
  if (await checkSingleExamPerSubject(res, { ...data, subclassLetter: subclassLetters })) {
    return null;
  }

  // Check for date conflicts
  if (await checkExamDateConflict(res, { ...data, subclassLetter: subclassLetters })) {
    return null;
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
    createdBy: teacherId,
    subclassLetter: isSSClass ? subclassLetters : [],
    startDate: startDate || null,
    startTime: startTime || null,
  });

  // Update teacher's examsCreated
  teacher.examsCreated = teacher.examsCreated || [];
  teacher.examsCreated.push(examCreate._id);
  await teacher.save();

  return examCreate;
};

// Teacher: Get All Exams
const teacherGetAllExamsService = async (res, teacherId, filters = {}) => {
  // Validate teacher
  const teacher = await Teacher.findById(teacherId).lean();
  if (!teacher) {
    responseStatus(res, 404, "failed", "Teacher not found");
    return null;
  }

  // Prevent admins from using teacher service
  if (teacher.isAdmin) {
    responseStatus(res, 403, "failed", "Admins must use admin endpoints");
    return null;
  }

  // Find the current academic year
  const currentAcademicYear = await AcademicYear.findOne({ isCurrent: true }).lean();
  if (!currentAcademicYear) {
    responseStatus(res, 404, "failed", "No current academic year found");
    return null;
  }

  // Build query
  const query = {
    createdBy: teacherId,
    academicYear: currentAcademicYear._id,
  };
  if (filters.classLevel) query.classLevel = filters.classLevel;
  if (filters.subject) query.subject = filters.subject;
  if (filters.examStatus) query.examStatus = filters.examStatus;
  if (filters.academicTerm) query.academicTerm = filters.academicTerm;
  if (filters.subclassLetter) query.subclassLetter = { $in: Array.isArray(filters.subclassLetter) ? filters.subclassLetter : [filters.subclassLetter] };

  // Fetch exams
  const exams = await Exams.find(query)
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
    .populate({
      path: "createdBy",
      select: "firstName lastName teacherId",
    })
    .lean()
    .sort({ createdAt: -1 });

  if (!exams.length) {
    responseStatus(res, 404, "failed", "No exams found for the current academic year");
    return null;
  }

  return exams;
};

// Teacher: Get Exam by ID
const teacherGetExamByIdService = async (res, examId, teacherId) => {
  const teacher = await Teacher.findById(teacherId);
  if (!teacher) {
    responseStatus(res, 404, "failed", "Teacher not found");
    return null;
  }

  // Prevent admins from using teacher service
  if (teacher.isAdmin) {
    responseStatus(res, 403, "failed", "Admins must use admin endpoints");
    return null;
  }

  const exam = await Exams.findById(examId)
    .populate("subject")
    .populate("classLevel")
    .populate("academicTerm")
    .populate("academicYear")
    .populate("createdBy", "firstName lastName teacherId");

  if (!exam) {
    responseStatus(res, 404, "failed", "Exam not found");
    return null;
  }

  // Ensure teacher created the exam
  if (exam.createdBy.toString() !== teacherId) {
    responseStatus(res, 403, "failed", "Unauthorized to access this exam");
    return null;
  }

  return exam;
};

// Teacher: Update Exam
const teacherUpdateExamService = async (res, data, examId, teacherId) => {
  const teacher = await Teacher.findById(teacherId);
  if (!teacher) {
    responseStatus(res, 404, "failed", "Teacher not found");
    return null;
  }

  // Prevent admins from using teacher service
  if (teacher.isAdmin) {
    responseStatus(res, 403, "failed", "Admins must use admin endpoints");
    return null;
  }

  const exam = await Exams.findById(examId);
  if (!exam) {
    responseStatus(res, 404, "failed", "Exam not found");
    return null;
  }

  // Ensure teacher created the exam
  if (exam.createdBy.toString() !== teacherId) {
    responseStatus(res, 403, "failed", "Unauthorized to update this exam");
    return null;
  }

  // Prevent updates if exam is approved
  if (exam.examStatus === "approved") {
    responseStatus(res, 400, "failed", "Cannot update an approved exam");
    return null;
  }

  // Validate subject and classLevel if provided
  if (data.subject) {
    const subjectDoc = await Subject.findById(data.subject).populate("name");
    if (!subjectDoc) {
      responseStatus(res, 404, "failed", "Subject not found");
      return null;
    }
    // Check teacher assignment for new subject
    const isAssigned = await checkTeacherAssignment(teacherId, data.subject, data.classLevel || exam.classLevel);
    if (!isAssigned) {
      responseStatus(res, 403, "failed", "Teacher is not assigned to the new subject and class");
      return null;
    }
  }
  if (data.classLevel || data.subclassLetter !== undefined) {
    const classLevelDoc = await ClassLevel.findById(data.classLevel || exam.classLevel);
    if (!classLevelDoc) {
      responseStatus(res, 404, "failed", "Class level not found");
      return null;
    }
    // Validate subclassLetter for SS classes
    const isSSClass = ["SS 1", "SS 2", "SS 3"].includes(classLevelDoc.name);
    const subclassLetters = data.subclassLetter ? (Array.isArray(data.subclassLetter) ? data.subclassLetter : [data.subclassLetter]) : exam.subclassLetter;
    if (isSSClass && (!subclassLetters || subclassLetters.length === 0)) {
      responseStatus(res, 400, "failed", "At least one subclass letter is required for SS classes");
      return null;
    }
    if (isSSClass && subclassLetters.length > 0) {
      const invalidSubclasses = subclassLetters.filter(
        (letter) => !classLevelDoc.subclasses.some((sub) => sub.letter === letter)
      );
      if (invalidSubclasses.length > 0) {
        responseStatus(res, 400, "failed", `Invalid subclass letter(s) for this class: ${invalidSubclasses.join(", ")}`);
        return null;
      }
    }
    if (!isSSClass && subclassLetters.length > 0) {
      responseStatus(res, 400, "failed", "Subclass letters are not allowed for non-SS classes");
      return null;
    }
  }

  // Validate duration if provided
  if (data.duration && (!Number.isInteger(data.duration) || data.duration <= 0)) {
    responseStatus(res, 400, "failed", "Duration must be a positive integer (in minutes)");
    return null;
  }

  // Check for duplicate exam
  const subclassLettersToCheck = data.subclassLetter ? (Array.isArray(data.subclassLetter) ? data.subclassLetter : [data.subclassLetter]) : exam.subclassLetter;
  const query = {
    name: data.name || exam.name,
    subject: data.subject || exam.subject,
    classLevel: data.classLevel || exam.classLevel,
    academicTerm: data.academicTerm || exam.academicTerm,
    academicYear: data.academicYear || exam.academicYear,
    _id: { $ne: examId },
  };
  if (["SS 1", "SS 2", "SS 3"].includes((await ClassLevel.findById(data.classLevel || exam.classLevel)).name)) {
    query.subclassLetter = { $in: subclassLettersToCheck };
  } else {
    query.subclassLetter = { $size: 0 };
  }
  const examDuplicate = await Exams.findOne(query);
  if (examDuplicate) {
    const overlappingSubclasses = query.subclassLetter.$in ? examDuplicate.subclassLetter.filter((letter) => subclassLettersToCheck.includes(letter)) : [];
    responseStatus(
      res,
      400,
      "failed",
      query.subclassLetter.$in
        ? `Exam with these details already exists for subclasses: ${overlappingSubclasses.join(", ")}`
        : "Exam with these details already exists for this class"
    );
    return null;
  }

  // Check for single exam per subject per term (if examType is "exam")
  if (await checkSingleExamPerSubject(res, { ...exam.toObject(), ...data }, examId)) {
    return null;
  }

  // Check for date conflicts
  if (await checkExamDateConflict(res, { ...exam.toObject(), ...data }, examId)) {
    return null;
  }

  // Prevent updating startDate/startTime if exam is approved
  if (exam.examStatus === "approved" && (data.startDate || data.startTime)) {
    responseStatus(res, 400, "failed", "Cannot modify start date/time of an approved exam");
    return null;
  }

  // Update exam
  const examUpdated = await Exams.findByIdAndUpdate(
    examId,
    { $set: { ...data, subclassLetter: data.subclassLetter !== undefined ? subclassLettersToCheck : exam.subclassLetter, startDate: data.startDate || null, startTime: data.startTime || null } },
    { new: true, runValidators: true }
  );

  return examUpdated;
};

// Teacher: Delete Exam
const teacherDeleteExamService = async (res, examId, teacherId) => {
  const teacher = await Teacher.findById(teacherId);
  if (!teacher) {
    responseStatus(res, 404, "failed", "Teacher not found");
    return null;
  }

  // Prevent admins from using teacher service
  if (teacher.isAdmin) {
    responseStatus(res, 403, "failed", "Admins must use admin endpoints");
    return null;
  }

  const exam = await Exams.findById(examId);
  if (!exam) {
    responseStatus(res, 404, "failed", "Exam not found");
    return null;
  }

  // Ensure teacher created the exam
  if (exam.createdBy.toString() !== teacherId) {
    responseStatus(res, 403, "failed", "Unauthorized to delete this exam");
    return null;
  }

  // Prevent deletion if exam is approved
  if (exam.examStatus === "approved") {
    responseStatus(res, 400, "failed", "Cannot delete an approved exam");
    return null;
  }

  // Remove exam from teacher's examsCreated
  await Teacher.findByIdAndUpdate(teacherId, {
    $pull: { examsCreated: examId },
  });

  await Exams.findByIdAndDelete(examId);
  return { message: "Exam deleted successfully" };
};

// Teacher: Add Question to Exam
const teacherAddQuestionToExamService = async (res, examId, data, teacherId) => {
  const { question, optionA, optionB, optionC, optionD, correctAnswer, score } = data;
  // Validate teacher
  const teacher = await Teacher.findById(teacherId);
  if (!teacher) {
    responseStatus(res, 404, "failed", "Teacher not found");
    return null;
  }

  // Prevent admins from using teacher service
  if (teacher.isAdmin) {
    responseStatus(res, 403, "failed", "Admins must use admin endpoints");
    return null;
  }

  // Validate exam
  const exam = await Exams.findById(examId);
  if (!exam) {
    responseStatus(res, 404, "failed", "Exam not found");
    return null;
  }

  // Ensure teacher created the exam
  if (exam.createdBy.toString() !== teacherId) {
    responseStatus(res, 403, "failed", "Unauthorized to add questions to this exam");
    return null;
  }

  // Prevent adding questions if exam is approved
  if (exam.examStatus === "approved") {
    responseStatus(res, 400, "failed", "Cannot add questions to an approved exam");
    return null;
  }

  // Validate correctAnswer
  if (![optionA, optionB, optionC, optionD].includes(correctAnswer)) {
    responseStatus(res, 400, "failed", "Correct answer must match one of the provided options");
    return null;
  }

  // Validate score
  if (!score || score <= 0) {
    responseStatus(res, 400, "failed", "Score must be greater than zero");
    return null;
  }

  // Check if adding the question exceeds the totalMark of the exam or 100
  const currentTotalScore = (await Question.find({ _id: { $in: exam.questions } })).reduce(
    (sum, q) => sum + (q.score || 0),
    0
  );
  if (currentTotalScore + score > exam.totalMark || currentTotalScore + score > 100) {
    responseStatus(res, 400, "failed", `Total score for questions (${currentTotalScore + score}) cannot exceed exam's total mark (${exam.totalMark}) or 100`);
    return null;
  }

  // Create question
  const newQuestion = await Question.create({
    question,
    optionA,
    optionB,
    optionC,
    optionD,
    correctAnswer,
    score,
    isCorrect: true,
    createdBy: teacherId,
  });

  // Add question to exam's questions array
  exam.questions.push(newQuestion._id);
  await exam.save();

  return newQuestion;
};

// Teacher: Get All Questions for an Exam
const teacherGetQuestionsByExamService = async (res, examId, teacherId) => {
  // Validate teacher
  const teacher = await Teacher.findById(teacherId);
  if (!teacher) {
    responseStatus(res, 404, "failed", "Teacher not found");
    return null;
  }

  // Prevent admins from using teacher service
  if (teacher.isAdmin) {
    responseStatus(res, 403, "failed", "Admins must use admin endpoints");
    return null;
  }

  // Validate exam
  const exam = await Exams.findById(examId);
  if (!exam) {
    responseStatus(res, 404, "failed", "Exam not found");
    return null;
  }

  // Ensure teacher created the exam
  if (exam.createdBy.toString() !== teacherId) {
    responseStatus(res, 403, "failed", "Unauthorized to access questions for this exam");
    return null;
  }

  // Fetch questions
  const questions = await Question.find({ _id: { $in: exam.questions } })
    .populate("createdBy", "firstName lastName teacherId");

  return questions;
};

// Teacher: Update Question
const teacherUpdateQuestionService = async (res, examId, questionId, data, teacherId) => {
  // Validate teacher
  const teacher = await Teacher.findById(teacherId);
  if (!teacher) {
    responseStatus(res, 404, "failed", "Teacher not found");
    return null;
  }

  // Prevent admins from using teacher service
  if (teacher.isAdmin) {
    responseStatus(res, 403, "failed", "Admins must use admin endpoints");
    return null;
  }

  // Validate exam
  const exam = await Exams.findById(examId);
  if (!exam) {
    responseStatus(res, 404, "failed", "Exam not found");
    return null;
  }

  // Ensure teacher created the exam
  if (exam.createdBy.toString() !== teacherId) {
    responseStatus(res, 403, "failed", "Unauthorized to update questions for this exam");
    return null;
  }

  // Prevent updates if exam is approved
  if (exam.examStatus === "approved") {
    responseStatus(res, 400, "failed", "Cannot update questions for an approved exam");
    return null;
  }

  // Validate question
  const question = await Question.findById(questionId);
  if (!question || !exam.questions.includes(questionId)) {
    responseStatus(res, 404, "failed", "Question not found or not associated with this exam");
    return null;
  }

  // Validate correctAnswer if provided
  if (data.correctAnswer) {
    const { optionA, optionB, optionC, optionD } = data;
    const options = [optionA || question.optionA, optionB || question.optionB, optionC || question.optionC, optionD || question.optionD];
    if (!options.includes(data.correctAnswer)) {
      responseStatus(res, 400, "failed", "Correct answer must match one of the provided options");
      return null;
    }
  }

  // Validate score if provided
  if (data.score) {
    if (data.score <= 0) {
      responseStatus(res, 400, "failed", "Score must be greater than zero");
      return null;
    }

    // Check if updated score exceeds exam's totalMark or 100
    const currentTotalScore = (await Question.find({ _id: { $in: exam.questions, $ne: questionId } }))
      .reduce((sum, q) => sum + (q.score || 0), 0);
    if (currentTotalScore + data.score > exam.totalMark || currentTotalScore + data.score > 100) {
      responseStatus(res, 400, "failed", `Total score for questions (${currentTotalScore + data.score}) cannot exceed exam's total mark (${exam.totalMark}) or 100`);
      return null;
    }
  }

  // Update question
  const updatedQuestion = await Question.findByIdAndUpdate(
    questionId,
    { $set: { ...data, isCorrect: true } },
    { new: true, runValidators: true }
  );

  return updatedQuestion;
};

// Teacher: Delete Question
const teacherDeleteQuestionService = async (res, examId, questionId, teacherId) => {
  // Validate teacher
  const teacher = await Teacher.findById(teacherId);
  if (!teacher) {
    responseStatus(res, 404, "failed", "Teacher not found");
    return null;
  }

  // Prevent admins from using teacher service
  if (teacher.isAdmin) {
    responseStatus(res, 403, "failed", "Admins must use admin endpoints");
    return null;
  }

  // Validate exam
  const exam = await Exams.findById(examId);
  if (!exam) {
    responseStatus(res, 404, "failed", "Exam not found");
    return null;
  }

  // Ensure teacher created the exam
  if (exam.createdBy.toString() !== teacherId) {
    responseStatus(res, 403, "failed", "Unauthorized to delete questions for this exam");
    return null;
  }

  // Validate question
  const question = await Question.findById(questionId);
  if (!question || !exam.questions.includes(questionId)) {
    responseStatus(res, 404, "failed", "Question not found or not associated with this exam");
    return null;
  }

  // Remove question from exam's questions array
  exam.questions = exam.questions.filter((q) => q.toString() !== questionId);
  await exam.save();

  // Delete question
  await Question.findByIdAndDelete(questionId);

  return { message: "Question deleted successfully" };
};

// Admin: Create Exam
const adminCreateExamService = async (res, data, adminId) => {
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
    subclassLetter,
    startDate,
    startTime,
  } = data;

  // Validate admin
  const admin = await Admin.findById(adminId);
  if (!admin) {
    responseStatus(res, 403, "failed", "Only admins can create exams");
    return null;
  }

  // Validate subject and class level
  const subjectDoc = await Subject.findById(subject).populate("name");
  if (!subjectDoc) {
    responseStatus(res, 404, "failed", "Subject not found");
    return null;
  }
  const classLevelDoc = await ClassLevel.findById(classLevel);
  if (!classLevelDoc) {
    responseStatus(res, 404, "failed", "Class level not found");
    return null;
  }

  // Validate subclassLetter for SS classes
  const isSSClass = ["SS 1", "SS 2", "SS 3"].includes(classLevelDoc.name);
  const subclassLetters = subclassLetter ? (Array.isArray(subclassLetter) ? subclassLetter : [subclassLetter]) : [];
  if (isSSClass && subclassLetters.length === 0) {
    responseStatus(res, 400, "failed", "At least one subclass letter is required for SS classes");
    return null;
  }
  if (isSSClass && subclassLetters.length > 0) {
    const invalidSubclasses = subclassLetters.filter(
      (letter) => !classLevelDoc.subclasses.some((sub) => sub.letter === letter)
    );
    if (invalidSubclasses.length > 0) {
      responseStatus(res, 400, "failed", `Invalid subclass letter(s) for this class: ${invalidSubclasses.join(", ")}`);
      return null;
    }
  }
  if (!isSSClass && subclassLetters.length > 0) {
    responseStatus(res, 400, "failed", "Subclass letters are not allowed for non-SS classes");
    return null;
  }

  // Validate duration
  if (!Number.isInteger(duration) || duration <= 0) {
    responseStatus(res, 400, "failed", "Duration must be a positive integer (in minutes)");
    return null;
  }

  // Check for existing exam with same details
  const query = {
    name,
    subject,
    classLevel,
    academicTerm,
    academicYear,
  };
  if (isSSClass) {
    query.subclassLetter = { $in: subclassLetters };
  } else {
    query.subclassLetter = { $size: 0 };
  }
  const examExist = await Exams.findOne(query);
  if (examExist) {
    const overlappingSubclasses = isSSClass ? examExist.subclassLetter.filter((letter) => subclassLetters.includes(letter)) : [];
    responseStatus(
      res,
      400,
      "failed",
      isSSClass
        ? `Exam already exists with these details for subclasses: ${overlappingSubclasses.join(", ")}`
        : "Exam already exists with these details for this class"
    );
    return null;
  }

  // Check for single exam per subject per term (if examType is "exam")
  if (await checkSingleExamPerSubject(res, { ...data, subclassLetter: subclassLetters })) {
    return null;
  }

  // Check for date conflicts
  if (await checkExamDateConflict(res, { ...data, subclassLetter: subclassLetters })) {
    return null;
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
    createdBy: adminId,
    subclassLetter: isSSClass ? subclassLetters : [],
    startDate: startDate || null,
    startTime: startTime || null,
  });

  // Update admin's examsCreated
  admin.examsCreated = admin.examsCreated || [];
  admin.examsCreated.push(examCreate._id);
  await admin.save();

  return examCreate;
};

// Admin: Get All Exams
const adminGetAllExamsService = async (res, adminId, filters = {}) => {
  const admin = await Admin.findById(adminId);
  if (!admin) {
    responseStatus(res, 403, "failed", "Only admins can access all exams");
    return null;
  }

  const query = {};
  if (filters.classLevel) query.classLevel = filters.classLevel;
  if (filters.subject) query.subject = filters.subject;
  if (filters.examStatus) query.examStatus = filters.examStatus;
  if (filters.academicYear) query.academicYear = filters.academicYear;
  if (filters.academicTerm) query.academicTerm = filters.academicTerm;
  if (filters.createdBy) query.createdBy = filters.createdBy;
  if (filters.subclassLetter) query.subclassLetter = { $in: Array.isArray(filters.subclassLetter) ? filters.subclassLetter : [filters.subclassLetter] };

  const exams = await Exams.find(query)
    .populate("subject")
    .populate("classLevel")
    .populate("academicTerm")
    .populate("academicYear")
    .populate("createdBy", "firstName lastName teacherId");

  return exams;
};

// Admin: Get Exam by ID
const adminGetExamByIdService = async (res, examId, adminId) => {
  const admin = await Admin.findById(adminId);
  if (!admin) {
    responseStatus(res, 403, "failed", "Only admins can access this exam");
    return null;
  }

  const exam = await Exams.findById(examId)
    .populate("subject")
    .populate("classLevel")
    .populate("academicTerm")
    .populate("academicYear")
    .populate("createdBy", "firstName lastName teacherId");

  if (!exam) {
    responseStatus(res, 404, "failed", "Exam not found");
    return null;
  }

  return exam;
};

// Admin: Update Exam
const adminUpdateExamService = async (res, data, examId, adminId) => {
  const admin = await Admin.findById(adminId);
  if (!admin) {
    responseStatus(res, 403, "failed", "Only admins can update exams");
    return null;
  }

  const exam = await Exams.findById(examId);
  if (!exam) {
    responseStatus(res, 404, "failed", "Exam not found");
    return null;
  }

  // Validate subject and classLevel if provided
  if (data.subject) {
    const subjectDoc = await Subject.findById(data.subject).populate("name");
    if (!subjectDoc) {
      responseStatus(res, 404, "failed", "Subject not found");
      return null;
    }
  }
  if (data.classLevel || data.subclassLetter !== undefined) {
    const classLevelDoc = await ClassLevel.findById(data.classLevel || exam.classLevel);
    if (!classLevelDoc) {
      responseStatus(res, 404, "failed", "Class level not found");
      return null;
    }
    // Validate subclassLetter for SS classes
    const isSSClass = ["SS 1", "SS 2", "SS 3"].includes(classLevelDoc.name);
    const subclassLetters = data.subclassLetter ? (Array.isArray(data.subclassLetter) ? data.subclassLetter : [data.subclassLetter]) : exam.subclassLetter;
    if (isSSClass && (!subclassLetters || subclassLetters.length === 0)) {
      responseStatus(res, 400, "failed", "At least one subclass letter is required for SS classes");
      return null;
    }
    if (isSSClass && subclassLetters.length > 0) {
      const invalidSubclasses = subclassLetters.filter(
        (letter) => !classLevelDoc.subclasses.some((sub) => sub.letter === letter)
      );
      if (invalidSubclasses.length > 0) {
        responseStatus(res, 400, "failed", `Invalid subclass letter(s) for this class: ${invalidSubclasses.join(", ")}`);
        return null;
      }
    }
    if (!isSSClass && subclassLetters.length > 0) {
      responseStatus(res, 400, "failed", "Subclass letters are not allowed for non-SS classes");
      return null;
    }
  }

  // Validate duration if provided
  if (data.duration && (!Number.isInteger(data.duration) || data.duration <= 0)) {
    responseStatus(res, 400, "failed", "Duration must be a positive integer (in minutes)");
    return null;
  }

  // Check for duplicate exam
  const subclassLettersToCheck = data.subclassLetter ? (Array.isArray(data.subclassLetter) ? data.subclassLetter : [data.subclassLetter]) : exam.subclassLetter;
  const query = {
    name: data.name || exam.name,
    subject: data.subject || exam.subject,
    classLevel: data.classLevel || exam.classLevel,
    academicTerm: data.academicTerm || exam.academicTerm,
    academicYear: data.academicYear || exam.academicYear,
    _id: { $ne: examId },
  };
  if (["SS 1", "SS 2", "SS 3"].includes((await ClassLevel.findById(data.classLevel || exam.classLevel)).name)) {
    query.subclassLetter = { $in: subclassLettersToCheck };
  } else {
    query.subclassLetter = { $size: 0 };
  }
  const examDuplicate = await Exams.findOne(query);
  if (examDuplicate) {
    const overlappingSubclasses = query.subclassLetter.$in ? examDuplicate.subclassLetter.filter((letter) => subclassLettersToCheck.includes(letter)) : [];
    responseStatus(
      res,
      400,
      "failed",
      query.subclassLetter.$in
        ? `Exam with these details already exists for subclasses: ${overlappingSubclasses.join(", ")}`
        : "Exam with these details already exists for this class"
    );
    return null;
  }

  // Check for single exam per subject per term (if examType is "exam")
  if (await checkSingleExamPerSubject(res, { ...exam.toObject(), ...data }, examId)) {
    return null;
  }

  // Check for date conflicts
  if (await checkExamDateConflict(res, { ...exam.toObject(), ...data }, examId)) {
    return null;
  }

  // Prevent updating startDate/startTime if exam is approved
  if (exam.examStatus === "approved" && (data.startDate || data.startTime)) {
    responseStatus(res, 400, "failed", "Cannot modify start date/time of an approved exam");
    return null;
  }

  // Update exam
  const examUpdated = await Exams.findByIdAndUpdate(
    examId,
    { $set: { ...data, subclassLetter: data.subclassLetter !== undefined ? subclassLettersToCheck : exam.subclassLetter, startDate: data.startDate || null, startTime: data.startTime || null } },
    { new: true, runValidators: true }
  );

  return examUpdated;
};

// Admin: Delete Exam
const adminDeleteExamService = async (res, examId, adminId) => {
  const admin = await Admin.findById(adminId);
  if (!admin) {
    responseStatus(res, 403, "failed", "Only admins can delete exams");
    return null;
  }

  const exam = await Exams.findById(examId);
  if (!exam) {
    responseStatus(res, 404, "failed", "Exam not found");
    return null;
  }

  // Prevent deletion if exam is approved
  if (exam.examStatus === "approved") {
    responseStatus(res, 400, "failed", "Cannot delete an approved exam");
    return null;
  }

  // Remove exam from creator's examsCreated
  await Teacher.findByIdAndUpdate(exam.createdBy, {
    $pull: { examsCreated: examId },
  });

  await Exams.findByIdAndDelete(examId);
  return { message: "Exam deleted successfully" };
};

// Admin: Approve Exam
const adminApproveExamService = async (res, examId, adminId, startDate, startTime) => {
  const admin = await Admin.findById(adminId);
  if (!admin) {
    responseStatus(res, 403, "failed", "Only admins can approve exams");
    return null;
  }

  const exam = await Exams.findById(examId).populate("questions");
  if (!exam) {
    responseStatus(res, 404, "failed", "Exam not found");
    return null;
  }

  if (exam.examStatus === "approved") {
    responseStatus(res, 400, "failed", "Exam is already approved");
    return null;
  }

  if (!startDate || !startTime) {
    responseStatus(res, 400, "failed", "Start date and time are required for approval");
    return null;
  }

  const parsedStartDate = new Date(startDate);
  if (isNaN(parsedStartDate)) {
    responseStatus(res, 400, "failed", "Invalid start date format");
    return null;
  }

  // Validate that total score of questions equals exam's totalMark
  const totalQuestionScore = exam.questions.reduce((sum, q) => sum + (q.score || 0), 0);
  if (totalQuestionScore !== exam.totalMark) {
    responseStatus(
      res,
      400,
      "failed",
      `Total score of questions (${totalQuestionScore}) must equal exam's total mark (${exam.totalMark})`
    );
    return null;
  }

  exam.examStatus = "approved";
  exam.startDate = parsedStartDate;
  exam.startTime = startTime;
  await exam.save();

  return { message: "Exam approved successfully", exam };
};

// Admin: Add Question to Exam
const adminAddQuestionToExamService = async (res, examId, data, adminId) => {
  const { question, optionA, optionB, optionC, optionD, correctAnswer, score } = data;

  // Validate admin
  const admin = await Admin.findById(adminId);
  if (!admin) {
    responseStatus(res, 403, "failed", "Only admins can add questions");
    return null;
  }

  // Validate exam
  const exam = await Exams.findById(examId);
  if (!exam) {
    responseStatus(res, 404, "failed", "Exam not found");
    return null;
  }

  // Prevent adding questions if exam is approved
  if (exam.examStatus === "approved") {
    responseStatus(res, 400, "failed", "Cannot add questions to an approved exam");
    return null;
  }

  // Validate correctAnswer
  if (![optionA, optionB, optionC, optionD].includes(correctAnswer)) {
    responseStatus(res, 400, "failed", "Correct answer must match one of the provided options");
    return null;
  }

  // Validate score
  if (!score || score <= 0) {
    responseStatus(res, 400, "failed", "Score must be greater than zero");
    return null;
  }

  // Check if adding the question exceeds the totalMark of the exam or 100
  const currentTotalScore = (await Question.find({ _id: { $in: exam.questions } })).reduce(
    (sum, q) => sum + (q.score || 0),
    0
  );
  if (currentTotalScore + score > exam.totalMark || currentTotalScore + score > 100) {
    responseStatus(res, 400, "failed", `Total score for questions (${currentTotalScore + score}) cannot exceed exam's total mark (${exam.totalMark}) or 100`);
    return null;
  }

  // Create question
  const newQuestion = await Question.create({
    question,
    optionA,
    optionB,
    optionC,
    optionD,
    correctAnswer,
    score,
    isCorrect: true,
    createdBy: adminId,
  });

  // Add question to exam's questions array
  exam.questions.push(newQuestion._id);
  await exam.save();

  return newQuestion;
};

// Admin: Get All Questions for an Exam
const adminGetQuestionsByExamService = async (res, examId, adminId) => {
  // Validate admin
  const admin = await Admin.findById(adminId);
  if (!admin) {
    responseStatus(res, 403, "failed", "Only admins can access questions");
    return null;
  }

  // Validate exam
  const exam = await Exams.findById(examId);
  if (!exam) {
    responseStatus(res, 404, "failed", "Exam not found");
    return null;
  }

  // Fetch questions
  const questions = await Question.find({ _id: { $in: exam.questions } })
    .populate("createdBy", "firstName lastName teacherId");

  return questions;
};

// Admin: Update Question
const adminUpdateQuestionService = async (res, examId, questionId, data, adminId) => {
  // Validate admin
  const admin = await Admin.findById(adminId);
  if (!admin) {
    responseStatus(res, 403, "failed", "Only admins can update questions");
    return null;
  }

  // Validate exam
  const exam = await Exams.findById(examId);
  if (!exam) {
    responseStatus(res, 404, "failed", "Exam not found");
    return null;
  }

  // Prevent updates if exam is approved
  if (exam.examStatus === "approved") {
    responseStatus(res, 400, "failed", "Cannot update questions for an approved exam");
    return null;
  }

  // Validate question
  const question = await Question.findById(questionId);
  if (!question || !exam.questions.includes(questionId)) {
    responseStatus(res, 404, "failed", "Question not found or not associated with this exam");
    return null;
  }

  // Validate correctAnswer if provided
  if (data.correctAnswer) {
    const { optionA, optionB, optionC, optionD } = data;
    const options = [optionA || question.optionA, optionB || question.optionB, optionC || question.optionC, optionD || question.optionD];
    if (!options.includes(data.correctAnswer)) {
      responseStatus(res, 400, "failed", "Correct answer must match one of the provided options");
      return null;
    }
  }

  // Validate score if provided
  if (data.score) {
    if (data.score <= 0) {
      responseStatus(res, 400, "failed", "Score must be greater than zero");
      return null;
    }

    // Check if updated score exceeds exam's totalMark or 100
    const currentTotalScore = (await Question.find({ _id: { $in: exam.questions, $ne: questionId } }))
      .reduce((sum, q) => sum + (q.score || 0), 0);
    if (currentTotalScore + data.score > exam.totalMark || currentTotalScore + data.score > 100) {
      responseStatus(res, 400, "failed", `Total score for questions (${currentTotalScore + data.score}) cannot exceed exam's total mark (${exam.totalMark}) or 100`);
      return null;
    }
  }

  // Update question
  const updatedQuestion = await Question.findByIdAndUpdate(
    questionId,
    { $set: { ...data, isCorrect: true } },
    { new: true, runValidators: true }
  );

  return updatedQuestion;
};

// Admin: Delete Question
const adminDeleteQuestionService = async (res, examId, questionId, adminId) => {
  // Validate admin
  const admin = await Admin.findById(adminId);
  if (!admin) {
    responseStatus(res, 403, "failed", "Only admins can delete questions");
    return null;
  }

  // Validate exam
  const exam = await Exams.findById(examId);
  if (!exam) {
    responseStatus(res, 404, "failed", "Exam not found");
    return null;
  }

  // Validate question
  const question = await Question.findById(questionId);
  if (!question || !exam.questions.includes(questionId)) {
    responseStatus(res, 404, "failed", "Question not found or not associated with this exam");
    return null;
  }

  // Remove question from exam's questions array
  exam.questions = exam.questions.filter((q) => q.toString() !== questionId);
  await exam.save();

  // Delete question
  await Question.findByIdAndDelete(questionId);

  return { message: "Question deleted successfully" };
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
  const assignment = subject.classLevelSubclasses.find((cls) =>
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
    const subclassExists = classLevel.subclasses.some((sub) => sub.letter === assignment.subclassLetter);
    if (!subclassExists) {
      return false;
    }
    return assignment.teachers.some((t) => t.toString() === teacherId);
  }

  // For non-SS classes, no subclassLetter is required, just check teachers
  return assignment.teachers.some((t) => t.toString() === teacherId);
}

// Student: Get Questions by Class
const studentGetQuestionsByClassService = async (res, classLevelId, subclassLetter, studentId) => {
  // Validate student
  const student = await Student.findById(studentId);
  if (!student) {
    responseStatus(res, 404, "failed", "Student not found");
    return null;
  }

  // Validate class level
  const classLevel = await ClassLevel.findById(classLevelId);
  if (!classLevel) {
    responseStatus(res, 404, "failed", "Class level not found");
    return null;
  }

  // Normalize subclassLetter to an array
  const subclassLetters = subclassLetter ? (Array.isArray(subclassLetter) ? subclassLetter : [subclassLetter]) : [];

  // For SS classes, validate subclassLetter(s)
  const isSSClass = ["SS 1", "SS 2", "SS 3"].includes(classLevel.name);
  if (isSSClass && subclassLetters.length === 0) {
    responseStatus(res, 400, "failed", "At least one subclass letter is required for SS classes");
    return null;
  }
  if (isSSClass && subclassLetters.length > 0) {
    const invalidSubclasses = subclassLetters.filter(
      (letter) => !classLevel.subclasses.some((sub) => sub.letter === letter)
    );
    if (invalidSubclasses.length > 0) {
      responseStatus(res, 400, "failed", `Invalid subclass letter(s) for this class: ${invalidSubclasses.join(", ")}`);
      return null;
    }
  }

  // Build query for approved exams
  const query = {
    classLevel: classLevelId,
    examStatus: "approved",
  };

  // For SS classes, match any of the provided subclassLetters
  if (isSSClass) {
    query.subclassLetter = { $in: subclassLetters };
  } else {
    // For non-SS classes, include exams with empty subclassLetter array
    query.subclassLetter = { $size: 0 };
  }

  console.log("Query:", query);

  const exams = await Exams.find(query)
    .populate({
      path: "subject",
      populate: { path: "name", select: "name" },
    })
    .select("_id name examType examDate examTime duration questions completedBy subclassLetter");

  if (!exams || exams.length === 0) {
    responseStatus(res, 404, "failed", "No approved exams found for this class/subclass");
    return null;
  }

  // Filter out exams the student has already completed
  const availableExams = exams.filter(
    (exam) => !exam.completedBy || !exam.completedBy.some((entry) => entry.student && entry.student.toString() === studentId)
  );

  if (!availableExams || availableExams.length === 0) {
    responseStatus(res, 404, "failed", "No available approved exams found for this student");
    return null;
  }

  // Fetch questions for available exams
  const questionIds = availableExams.flatMap((exam) => exam.questions);
  const questions = await Question.find({ _id: { $in: questionIds } }).select(
    "question optionA optionB optionC optionD score"
  );

  if (!questions || questions.length === 0) {
    responseStatus(res, 404, "failed", "No questions found for available approved exams");
    return null;
  }

  // Group exams and questions by subject
  const groupedBySubject = availableExams.reduce((acc, exam) => {
    const subjectId = exam.subject._id.toString();
    const subjectName = exam.subject.name.name;

    // Find or create subject entry
    let subjectEntry = acc.find((entry) => entry.subjectId === subjectId);
    if (!subjectEntry) {
      subjectEntry = {
        subjectId,
        subjectName,
        exams: [],
      };
      acc.push(subjectEntry);
    }

    // Format questions for the exam
    const examQuestions = questions
      .filter((q) => exam.questions.includes(q._id))
      .map((q, index) => ({
        sn: index + 1,
        _id: q._id,
        question: q.question,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        score: q.score,
      }));

    // Add exam to subject entry
    subjectEntry.exams.push({
      examId: exam._id,
      examName: exam.name,
      examType: exam.examType,
      examDate: exam.examDate,
      examTime: exam.examTime,
      duration: exam.duration,
      questions: examQuestions,
      subclassLetter: exam.subclassLetter, // Include subclassLetter in response
    });

    return acc;
  }, []);

  // Format final response
  return {
    classLevel: classLevel.name,
    subclassLetter: subclassLetter || null, // Return original subclassLetter input
    subjects: groupedBySubject,
  };
};

module.exports = {
  teacherCreateExamService,
  teacherGetAllExamsService,
  teacherGetExamByIdService,
  teacherUpdateExamService,
  teacherDeleteExamService,
  teacherAddQuestionToExamService,
  teacherGetQuestionsByExamService,
  teacherUpdateQuestionService,
  teacherDeleteQuestionService,
  adminCreateExamService,
  adminGetAllExamsService,
  adminGetExamByIdService,
  adminUpdateExamService,
  adminDeleteExamService,
  adminApproveExamService,
  adminAddQuestionToExamService,
  adminGetQuestionsByExamService,
  adminUpdateQuestionService,
  adminDeleteQuestionService,
  studentGetQuestionsByClassService,
};