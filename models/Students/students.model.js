const {
  hashPassword,
  isPassMatched,
} = require("../../handlers/passHash.handler");
const Admin = require("../../models/Staff/admin.model");
const Student = require("../../models/Students/students.model");
const Exam = require("../../models/Academic/exams.model");
const Results = require("../../models/Academic/results.model");
const generateToken = require("../../utils/tokenGenerator");
const responseStatus = require("../../handlers/responseStatus.handler");
const { resultCalculate } = require("../../functions/resultCalculate.function");

/**
 * Admin registration service for creating a new student.
 *
 * @param {Object} data - The data containing information about the new student.
 * @param {string} adminId - The ID of the admin creating the student.
 * @param {Object} res - The Express response object.
 * @returns {Object} - The response object indicating success or failure.
 */
exports.adminRegisterStudentService = async (data, adminId, res) => {
  const {
    firstName,
    lastName,
    middleName,
    tribe,
    gender,
    profilePictureUrl,
    section,
    religion,
    NIN,
    formalSchool,
    guardians,
    email,
    password,
    currentClassLevels,
    academicYear,
    program,
    prefectName,
  } = data;

  // Check admin existence
  const admin = await Admin.findById(adminId);
  if (!admin) {
    return responseStatus(res, 405, "failed", "Unauthorized access!");
  }

  // Check if student already exists
  const studentExists = await Student.findOne({ email });
  if (studentExists) {
    return responseStatus(res, 402, "failed", "Student already enrolled");
  }

  // Hash password
  const hashedPassword = await hashPassword(password);

  // Create new student document with all fields from schema
  const newStudent = await Student.create({
    firstName,
    lastName,
    middleName,
    tribe,
    gender,
    profilePictureUrl,
    section,
    religion,
    NIN,
    formalSchool,
    guardians,
    email,
    password: hashedPassword,
    currentClassLevels,
    academicYear,
    program,
    prefectName,
  });

  // Link student to admin
  admin.students.push(newStudent._id);
  await admin.save();

  return responseStatus(res, 200, "success", newStudent);
};

/**
 * Student login service.
 *
 * @param {Object} data - The data containing information about the login.
 * @param {Object} res - The Express response object.
 * @returns {Object} - The response object indicating success or failure.
 */
exports.studentLoginService = async (data, res) => {
  const { email, password } = data;

  // Find the student including password field explicitly
  const student = await Student.findOne({ email }).select("+password");
  if (!student)
    return responseStatus(res, 402, "failed", "Invalid login credentials");

  // Verify password
  const isMatched = await isPassMatched(password, student.password);
  if (!isMatched)
    return responseStatus(res, 401, "failed", "Invalid login credentials");

  // Remove password before sending back
  const studentObj = student.toObject();
  delete studentObj.password;

  const responseData = { student: studentObj, token: generateToken(student._id) };
  return responseStatus(res, 200, "success", responseData);
};

/**
 * Get student profile service.
 *
 * @param {string} id - The ID of the student.
 * @param {Object} res - The Express response object.
 * @returns {Object} - The response object indicating success or failure.
 */
exports.getStudentsProfileService = async (id, res) => {
  const student = await Student.findById(id).select(
    "-password -createdAt -updatedAt"
  );
  if (!student) return responseStatus(res, 402, "failed", "Student not found");
  return responseStatus(res, 200, "success", student);
};

/**
 * Get all students service (for admin use).
 *
 * @param {Object} res - The Express response object.
 * @returns {Object} - The response object indicating success or failure.
 */
exports.getAllStudentsByAdminService = async (res) => {
  const students = await Student.find({});
  return responseStatus(res, 200, "success", students);
};

/**
 * Get a single student by admin.
 *
 * @param {string} studentId - The ID of the student.
 * @param {Object} res - The Express response object.
 * @returns {Object} - The response object indicating success or failure.
 */
exports.getStudentByAdminService = async (studentId, res) => {
  const student = await Student.findById(studentId);
  if (!student) return responseStatus(res, 402, "failed", "Student not found");
  return responseStatus(res, 200, "success", student);
};

/**
 * Student update profile service.
 *
 * @param {Object} data - The data containing information about the updated profile.
 * @param {string} userId - The ID of the student.
 * @param {Object} res - The Express response object.
 * @returns {Object} - The response object indicating success or failure.
 */
exports.studentUpdateProfileService = async (data, userId, res) => {
  const { email, password } = data;

  // Check if email is taken by another student (exclude self)
  const emailExists = await Student.findOne({ email, _id: { $ne: userId } });
  if (emailExists)
    return responseStatus(res, 402, "failed", "This email is taken/exist");

  const updateFields = { email };
  if (password) {
    updateFields.password = await hashPassword(password);
  }

  const updatedStudent = await Student.findByIdAndUpdate(userId, updateFields, {
    new: true,
    runValidators: true,
  });

  return responseStatus(res, 200, "success", updatedStudent);
};

/**
 * Admin update Student service.
 *
 * @param {Object} data - The data containing information about the updated student.
 * @param {string} studentId - The ID of the student.
 * @param {Object} res - The Express response object.
 * @returns {Object} - The response object indicating success or failure.
 */
exports.adminUpdateStudentService = async (data, studentId, res) => {
  const {
    firstName,
    lastName,
    middleName,
    tribe,
    gender,
    profilePictureUrl,
    section,
    religion,
    NIN,
    formalSchool,
    guardians,
    email,
    currentClassLevels,
    academicYear,
    program,
    prefectName,
    isGraduated,
    isWithdrawn,
    isSuspended,
    yearGraduated,
  } = data;

  // Find student
  const studentFound = await Student.findById(studentId);
  if (!studentFound)
    return responseStatus(res, 402, "failed", "Student not found");

  // Update with all fields, add to currentClassLevels with $addToSet
  const updatedStudent = await Student.findByIdAndUpdate(
    studentId,
    {
      $set: {
        firstName,
        lastName,
        middleName,
        tribe,
        gender,
        profilePictureUrl,
        section,
        religion,
        NIN,
        formalSchool,
        guardians,
        email,
        academicYear,
        program,
        prefectName,
        isGraduated,
        isWithdrawn,
        isSuspended,
        yearGraduated,
      },
      $addToSet: {
        currentClassLevels,
      },
    },
    {
      new: true,
      runValidators: true,
    }
  );

  return responseStatus(res, 200, "success", updatedStudent);
};

/**
 * Student write exam service.
 *
 * @param {Object} data - The data containing answers to the exam.
 * @param {string} studentId - The ID of the student.
 * @param {string} examId - The ID of the exam.
 * @param {Object} res - The Express response object.
 * @returns {Object} - The response object indicating success or failure.
 */
exports.studentWriteExamService = async (data, studentId, examId, res) => {
  const { answers } = data;

  // Find the student
  const student = await Student.findById(studentId);
  if (!student) return responseStatus(res, 404, "failed", "Student not found");

  // Find the exam
  const findExam = await Exam.findById(examId);
  if (!findExam) return responseStatus(res, 404, "failed", "Exam not found");

  // Check if the student already took the exam
  const alreadyExamTaken = await Results.findOne({
    studentId: student._id,
    exam: examId,
  });
  if (alreadyExamTaken)
    return responseStatus(res, 400, "failed", "Already written the exam!");

  // Check if suspended or withdrawn
  if (student.isSuspended || student.isWithdrawn)
    return responseStatus(
      res,
      401,
      "failed",
      "You are not eligible to attend this exam"
    );

  // Verify all questions are answered
  const questions = findExam.questions || [];
  if (questions.length !== answers.length)
    return responseStatus(
      res,
      406,
      "failed",
      "You have not answered all the questions"
    );

  // Calculate result
  const result = await resultCalculate(questions, answers, findExam);

  // Create result record
  const createResult = await Results.create({
    studentId: student._id,
    teacher: findExam.createdBy,
    exam: findExam._id,
    score: result.score,
    grade: result.grade,
    passMark: findExam.passMark,
    status: result.status,
    remarks: result.remarks,
    answeredQuestions: result.answeredQuestions,
    classLevel: findExam.classLevel,
    academicTerm: findExam.academicTerm,
    academicYear: findExam.academicYear,
  });

  // Push exam result ref to student and save
  student.examResults.push(createResult._id);
  await student.save();

  return responseStatus(res, 200, "success", "Answer Submitted");
};
