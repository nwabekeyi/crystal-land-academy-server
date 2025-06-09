// services/teachers.service.js
const {
  hashPassword,
  isPassMatched,
} = require("../../handlers/passHash.handler");
const Teacher = require("../../models/Staff/teachers.model");
const Admin = require("../../models/Staff/admin.model");
const generateToken = require("../../utils/tokenGenerator");
const responseStatus = require("../../handlers/responseStatus.handler");
const AcademicYear = require("../../models/Academic/academicYear.model");
const { deleteFromCloudinary } = require("../../middlewares/fileUpload"); // Import Multer config

/**
 * Service to create a new teacher
 * @param {Object} data - Teacher data including all required fields
 * @param {Object} file - The uploaded profile picture file (from Multer)
 * @param {string} adminId - ID of the admin creating the teacher
 * @param {Object} res - Express response object
 * @returns {Object} - Response object indicating success or failure
 */
exports.adminRegisterTeacherService = async (data, file, adminId, res) => {
  const {
    firstName,
    lastName,
    middleName,
    email,
    password,
    gender,
    NIN,
    address,
    qualification,
    phoneNumber,
    tribe,
    religion,
    bankAccountDetails,
    subject,
    teachingAssignments,
    linkedInProfile,
  } = data;

  // Validate admin
  const admin = await Admin.findById(adminId);
  if (!admin) {
    return responseStatus(res, 401, "failed", "Unauthorized access!");
  }

  // Check if teacher email exists
  const teacherExists = await Teacher.findOne({ email });
  if (teacherExists) {
    return responseStatus(res, 409, "failed", "Teacher already registered");
  }

  // Hash password
  const hashedPassword = await hashPassword(password);

  // Find current academic year
  const currentAcademicYear = await AcademicYear.findOne({ isCurrent: true });
  if (!currentAcademicYear) {
    return responseStatus(res, 400, "failed", "No current academic year set.");
  }

  // Validate teachingAssignments
  if (
    teachingAssignments &&
    teachingAssignments.some(
      (assignment) =>
        !assignment.section ||
        !assignment.className ||
        !assignment.subclasses?.length ||
        !assignment.academicYear
    )
  ) {
    return responseStatus(res, 400, "failed", "Invalid teaching assignments data");
  }

  // Handle profile picture upload
  let profilePictureUrl = "";
  if (file) {
    profilePictureUrl = file.path; // Cloudinary secure URL
  } else {
    return responseStatus(res, 400, "failed", "Profile picture is required");
  }

  // Create new teacher
  const newTeacher = await Teacher.create({
    firstName,
    lastName,
    middleName,
    email,
    password: hashedPassword,
    gender,
    NIN,
    address,
    qualification,
    phoneNumber,
    tribe,
    religion,
    bankAccountDetails,
    subject,
    teachingAssignments: teachingAssignments || [],
    profilePictureUrl,
    linkedInProfile,
    createdBy: adminId,
  });

  // Add teacher to admin
  admin.teachers.push(newTeacher._id);
  await admin.save();

  // Add teacher to current academic year's teachers array
  currentAcademicYear.teachers.push(newTeacher._id);
  await currentAcademicYear.save();

  return responseStatus(res, 201, "success", newTeacher);
};

/**
 * Service for teacher login
 * @param {Object} data - Login credentials including email and password
 * @param {Object} res - Express response object
 * @returns {Object} - Response object with teacher details and token
 */
exports.teacherLoginService = async (data, res) => {
  const { email, password } = data;

  // Find teacher with password
  const teacherFound = await Teacher.findOne({ email }).select("+password");
  if (!teacherFound) {
    return responseStatus(res, 401, "failed", "Invalid login credentials");
  }

  // Compare password
  const isMatched = await isPassMatched(password, teacherFound.password);
  if (!isMatched) {
    return responseStatus(res, 401, "failed", "Invalid login credentials");
  }

  // Remove password from response
  const teacherObj = teacherFound.toObject();
  delete teacherObj.password;

  const response = {
    teacher: teacherObj,
    token: generateToken(teacherFound._id),
  };

  return responseStatus(res, 200, "success", response);
};

/**
 * Service to get all teachers
 * @returns {Array} - Array of all teacher objects
 */
exports.getAllTeachersService = async () => {
  return await Teacher.find().select("-password");
};

/**
 * Service to get teacher profile by ID
 * @param {string} teacherId - ID of the teacher
 * @returns {Object} - Teacher profile object with selected fields
 */
exports.getTeacherProfileService = async (teacherId) => {
  return await Teacher.findById(teacherId).select("-password -createdAt -updatedAt");
};

/**
 * Service to update teacher profile
 * @param {Object} data - Updated data for the teacher
 * @param {string} teacherId - ID of the teacher
 * @param {Object} res - Express response object
 * @returns {Object} - Response object with updated teacher details and token
 */
exports.updateTeacherProfileService = async (data, file, teacherId, res) => {
  const {
    firstName,
    lastName,
    middleName,
    email,
    password,
    gender,
    NIN,
    address,
    qualification,
    phoneNumber,
    tribe,
    religion,
    bankAccountDetails,
    linkedInProfile,
  } = data;

  // Check if email is taken by another teacher
  if (email) {
    const emailExist = await Teacher.findOne({
      email,
      _id: { $ne: teacherId },
    });
    if (emailExist) {
      return responseStatus(res, 409, "failed", "Email already in use");
    }
  }

  // Hash password if provided
  const hashedPassword = password ? await hashPassword(password) : undefined;

  // Handle profile picture upload
  let profilePictureUrl = (await Teacher.findById(teacherId)).profilePictureUrl;
  if (file) {
    if (profilePictureUrl) {
      try {
        await deleteFromCloudinary(profilePictureUrl);
      } catch (err) {
        console.error('Failed to delete old profile picture:', err.message);
      }
    }
    profilePictureUrl = file.path; // New Cloudinary secure URL
  }

  // Build update object
  const updateData = {
    firstName,
    lastName,
    middleName,
    email,
    gender,
    NIN,
    address,
    qualification,
    phoneNumber,
    tribe,
    religion,
    bankAccountDetails,
    profilePictureUrl,
    linkedInProfile,
    ...(hashedPassword && { password: hashedPassword }),
  };

  // Remove undefined keys
  Object.keys(updateData).forEach(
    (key) => updateData[key] === undefined && delete updateData[key]
  );

  // Update teacher
  const updatedTeacher = await Teacher.findByIdAndUpdate(
    teacherId,
    updateData,
    { new: true, runValidators: true }
  ).select("-password");

  if (!updatedTeacher) {
    return responseStatus(res, 404, "failed", "Teacher not found");
  }

  return {
    teacher: updatedTeacher,
    token: generateToken(updatedTeacher._id),
  };
};

/**
 * Service for admin to update teacher profile
 * @param {Object} data - Updated data for the teacher
 * @param {Object} file - The uploaded profile picture file (from Multer)
 * @param {string} teacherId - ID of the teacher
 * @param {Object} res - Express response object
 * @returns {Object} - Response object with updated teacher details
 */
exports.adminUpdateTeacherProfileService = async (data, file, teacherId, res) => {
  const {
    firstName,
    lastName,
    middleName,
    email,
    gender,
    NIN,
    address,
    qualification,
    phoneNumber,
    tribe,
    religion,
    bankAccountDetails,
    subject,
    teachingAssignments,
    isWithdrawn,
    isSuspended,
    applicationStatus,
    linkedInProfile,
  } = data;

  // Check if teacher exists
  const teacherExist = await Teacher.findById(teacherId);
  if (!teacherExist) {
    return responseStatus(res, 404, "failed", "No such teacher found");
  }

  // Check if email is taken by another teacher
  if (email && email !== teacherExist.email) {
    const emailExist = await Teacher.findOne({
      email,
      _id: { $ne: teacherId },
    });
    if (emailExist) {
      return responseStatus(res, 409, "failed", "Email already in use");
    }
  }

  // Validate teachingAssignments if provided
  if (
    teachingAssignments &&
    teachingAssignments.some(
      (assignment) =>
        !assignment.section ||
        !assignment.className ||
        !assignment.subclasses?.length ||
        !assignment.academicYear
    )
  ) {
    return responseStatus(res, 400, "failed", "Invalid teaching assignments data");
  }

  // Check if teacher is withdrawn
  if (teacherExist.isWithdrawn && isWithdrawn !== false) {
    return responseStatus(res, 403, "failed", "Action denied, teacher is withdrawn");
  }

  // Handle profile picture upload
  let profilePictureUrl = teacherExist.profilePictureUrl;
  if (file) {
    if (profilePictureUrl) {
      try {
        await deleteFromCloudinary(profilePictureUrl);
      } catch (err) {
        console.error('Failed to delete old profile picture:', err.message);
      }
    }
    profilePictureUrl = file.path; // New Cloudinary secure URL
  }

  // Build update object
  const updateData = {
    firstName,
    lastName,
    middleName,
    email,
    gender,
    NIN,
    address,
    qualification,
    phoneNumber,
    tribe,
    religion,
    bankAccountDetails,
    subject,
    teachingAssignments,
    isWithdrawn,
    isSuspended,
    applicationStatus,
    profilePictureUrl,
    linkedInProfile,
  };

  // Remove undefined keys
  Object.keys(updateData).forEach(
    (key) => updateData[key] === undefined && delete updateData[key]
  );

  // Update teacher
  const updatedTeacher = await Teacher.findByIdAndUpdate(
    teacherId,
    { $set: updateData },
    { new: true, runValidators: true }
  ).select("-password");

  return responseStatus(res, 200, "success", updatedTeacher);
};