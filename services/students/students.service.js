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
const AcademicYear = require("../../models/Academic/academicYear.model");

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
    religion,
    NIN,
    formalSchool,
    guardians,
    email,
    password,
    currentClassLevel, // Updated to single object
    boardingStatus,
    boardingDetails,
    prefectName,
  } = data;

  const admin = await Admin.findById(adminId);
  if (!admin) {
    return responseStatus(res, 405, "failed", "Unauthorized access!");
  }

  const studentExists = await Student.findOne({ email });
  if (studentExists) {
    return responseStatus(res, 402, "failed", "Student already enrolled");
  }

  const hashedPassword = await hashPassword(password);

  // Find current academic year
  const currentAcademicYear = await AcademicYear.findOne({ isCurrent: true });
  if (!currentAcademicYear) {
    return responseStatus(res, 400, "failed", "No current academic year set.");
  }

  // Validate currentClassLevel
  if (!currentClassLevel || !currentClassLevel.section || !currentClassLevel.className || !currentClassLevel.subclass) {
    return responseStatus(res, 400, "failed", "Invalid class level data");
  }

  // Validate boardingDetails for boarders
  if (boardingStatus === "Boarder" && (!boardingDetails || !boardingDetails.hall || !boardingDetails.roomNumber)) {
    return responseStatus(res, 400, "failed", "Boarding details required for boarders");
  }

  // Create new student
  const newStudent = await Student.create({
    firstName,
    lastName,
    middleName,
    tribe,
    gender,
    profilePictureUrl,
    religion,
    NIN,
    formalSchool,
    guardians,
    email,
    password: hashedPassword,
    currentClassLevel: {
      ...currentClassLevel,
      academicYear: currentAcademicYear._id, // Set academicYear inside currentClassLevel
    },
    boardingStatus,
    boardingDetails: boardingStatus === "Boarder" ? boardingDetails : undefined,
    prefectName,
  });

  // Add student to admin
  admin.students.push(newStudent._id);
  await admin.save();

  // Add student to current academic year's student array
  currentAcademicYear.students.push(newStudent._id);
  await currentAcademicYear.save();

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
exports.getAllStudentsByAdminService = async () => {
  const students = await Student.find({});
  return students;
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
    religion,
    NIN,
    formalSchool,
    guardians,
    email,
    currentClassLevel,
    boardingStatus,
    boardingDetails,
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

  // Validate currentClassLevel if provided
  if (currentClassLevel && (!currentClassLevel.section || !currentClassLevel.className || !currentClassLevel.subclass)) {
    return responseStatus(res, 400, "failed", "Invalid class level data");
  }

  // Validate boardingDetails for boarders
  if (boardingStatus === "Boarder" && (!boardingDetails || !boardingDetails.hall || !boardingDetails.roomNumber)) {
    return responseStatus(res, 400, "failed", "Boarding details required for boarders");
  }

  // Find current academic year if updating class level
  let academicYearId = studentFound.currentClassLevel?.academicYear;
  if (currentClassLevel) {
    const currentAcademicYear = await AcademicYear.findOne({ isCurrent: true });
    if (!currentAcademicYear) {
      return responseStatus(res, 400, "failed", "No current academic year set.");
    }
    academicYearId = currentAcademicYear._id;
  }

  // Update student
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
        religion,
        NIN,
        formalSchool,
        guardians,
        email,
        currentClassLevel: currentClassLevel
          ? { ...currentClassLevel, academicYear: academicYearId }
          : studentFound.currentClassLevel,
        boardingStatus,
        boardingDetails: boardingStatus === "Boarder" ? boardingDetails : undefined,
        prefectName,
        isGraduated,
        isWithdrawn,
        isSuspended,
        yearGraduated,
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
    classLevel: student.currentClassLevel, // Updated to use currentClassLevel
    academicTerm: findExam.academicTerm,
    academicYear: findExam.academicYear,
  });

  // Push exam result ref to student and save
  student.examResults.push(createResult._id);
  await student.save();

  return responseStatus(res, 200, "success", "Answer Submitted");
};