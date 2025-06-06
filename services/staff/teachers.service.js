const {
  hashPassword,
  isPassMatched,
} = require("../../handlers/passHash.handler");
const Teacher = require("../../models/Staff/teachers.model");
const Admin = require("../../models/Staff/admin.model");
const generateToken = require("../../utils/tokenGenerator");
const responseStatus = require("../../handlers/responseStatus.handler");

/**
 * Service to create a new teacher
 * @param {Object} data - Teacher data including all required fields
 * @param {string} adminId - ID of the admin creating the teacher
 * @param {Object} res - Express response object
 * @returns {Object} - Response object indicating success or failure
 */
exports.createTeacherServices = async (data, adminId, res) => {
  const {
    firstName,
    lastName,
    middleName,
    email,
    password,
    section,
    gender,
    NIN,
    address,
    qualification,
    phoneNumber,
    tribe,
    religion,
    bankAccountDetails,
    program,
    classLevel,
    academicYear,
    academicTerm,
    subject,
  } = data;

  // Check if the teacher already exists
  const existTeacher = await Teacher.findOne({ email });
  if (existTeacher)
    return responseStatus(res, 402, "failed", "Teacher already exists");

  // Hashing password
  const hashedPassword = await hashPassword(password);

  // Finding admin
  const admin = await Admin.findById(adminId);
  if (!admin) return responseStatus(res, 401, "fail", "Unauthorized access");

  // Create teacher with all required fields
  const createTeacher = await Teacher.create({
    firstName,
    lastName,
    middleName,
    email,
    password: hashedPassword,
    createdBy: admin._id,
    section,
    gender,
    NIN,
    address,
    qualification,
    phoneNumber,
    tribe,
    religion,
    bankAccountDetails,
    program,
    classLevel,
    academicYear,
    academicTerm,
    subject,
  });

  admin.teachers.push(createTeacher._id);
  await admin.save();

  return responseStatus(res, 200, "success", createTeacher);
};

/**
 * Service for teacher login
 * @param {Object} data - Login credentials including email and password
 * @param {Object} res - Express response object
 * @returns {Object} - Response object with teacher details and token
 */
exports.teacherLoginService = async (data, res) => {
  const { email, password } = data;

  // Checking if the teacher exists
  const teacherFound = await Teacher.findOne({ email });

  if (!teacherFound)
    return responseStatus(res, 402, "failed", "Invalid login credentials");

  // Comparing password with the hashed one
  const isMatched = await isPassMatched(password, teacherFound?.password);

  if (!isMatched)
    return responseStatus(res, 401, "failed", "Invalid login credentials");

  const response = {
    teacher: teacherFound,
    token: generateToken(teacherFound._id),
  };

  return responseStatus(res, 200, "success", response);
};

/**
 * Service to get all teachers
 * @returns {Array} - Array of all teacher objects
 */
exports.getAllTeachersService = async () => {
  return await Teacher.find();
};

/**
 * Service to get teacher profile by ID
 * @param {string} teacherId - ID of the teacher
 * @returns {Object} - Teacher profile object with selected fields
 */
exports.getTeacherProfileService = async (teacherId) => {
  return await Teacher.findById(teacherId).select(
    "-createdAt -updatedAt -password"
  );
};

/**
 * Service to update teacher profile
 * @param {Object} data - Updated data for the teacher
 * @param {string} teacherId - ID of the teacher
 * @param {Object} res - Express response object
 * @returns {Object} - Response object with updated teacher details and token
 */
exports.updateTeacherProfileService = async (data, teacherId, res) => {
  const {
    firstName,
    lastName,
    middleName,
    email,
    password,
    section,
    gender,
    NIN,
    address,
    qualification,
    phoneNumber,
    tribe,
    religion,
    bankAccountDetails,
    program,
    classLevel,
    academicYear,
    academicTerm,
    subject,
  } = data;

  // Checking if the email already exists for another teacher
  if (email) {
    const emailExist = await Teacher.findOne({
      email,
      _id: { $ne: teacherId },
    });
    if (emailExist)
      return responseStatus(res, 402, "failed", "Email already in use");
  }

  // Hashing password if provided
  const hashedPassword = password ? await hashPassword(password) : null;

  // Build update object with optional middleName and password
  const updateData = {
    firstName,
    lastName,
    middleName,
    email,
    section,
    gender,
    NIN,
    address,
    qualification,
    phoneNumber,
    tribe,
    religion,
    bankAccountDetails,
    program,
    classLevel,
    academicYear,
    academicTerm,
    subject,
    ...(hashedPassword && { password: hashedPassword }),
  };

  // Remove undefined keys to avoid overwriting with undefined
  Object.keys(updateData).forEach(
    (key) => updateData[key] === undefined && delete updateData[key]
  );

  // Find and update teacher
  const updatedTeacher = await Teacher.findByIdAndUpdate(
    teacherId,
    updateData,
    { new: true }
  );

  return {
    teacher: updatedTeacher,
    token: generateToken(updatedTeacher._id),
  };
};

/**
 * Service for admin to update teacher profile
 * @param {Object} data - Updated data for the teacher
 * @param {string} teacherId - ID of the teacher
 * @returns {Object|string} - Updated teacher object or error message
 */
exports.adminUpdateTeacherProfileService = async (data, teacherId) => {
  const {
    program,
    classLevel,
    academicYear,
    academicTerm,
    subject,
    isWithdrawn,
    isSuspended,
  } = data;

  // Checking if the teacher exists
  const teacherExist = await Teacher.findById(teacherId);
  if (!teacherExist) return "No such teacher found";

  // Check if teacher is withdrawn
  if (teacherExist.isWithdrawn) return "Action denied, teacher is withdrawn";

  // Update fields if provided
  if (program !== undefined) teacherExist.program = program;
  if (classLevel !== undefined) teacherExist.classLevel = classLevel;
  if (academicYear !== undefined) teacherExist.academicYear = academicYear;
  if (academicTerm !== undefined) teacherExist.academicTerm = academicTerm;
  if (subject !== undefined) teacherExist.subject = subject;
  if (isWithdrawn !== undefined) teacherExist.isWithdrawn = isWithdrawn;
  if (isSuspended !== undefined) teacherExist.isSuspended = isSuspended;

  await teacherExist.save();

  return teacherExist;
};
