const {
  hashPassword,
  isPassMatched,
} = require("../../handlers/passHash.handler");
const Teacher = require("../../models/Staff/teachers.model");
const Admin = require("../../models/Staff/admin.model");
const Subject = require("../../models/Academic/subject.model");
const AcademicYear = require("../../models/Academic/academicYear.model");
const generateToken = require("../../utils/tokenGenerator");
const responseStatus = require("../../handlers/responseStatus.handler");
const { deleteFromCloudinary } = require("../../middlewares/fileUpload");

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

  // Validate subject
  const subjectExists = await Subject.findById(subject);
  if (!subjectExists) {
    return responseStatus(res, 404, "failed", "Subject not found");
  }

  // Find current academic year
  const currentAcademicYear = await AcademicYear.findOne({ isCurrent: true });
  if (!currentAcademicYear) {
    return responseStatus(res, 400, "failed", "No current academic year set");
  }

  // Validate teachingAssignments (mandatory)
  if (!teachingAssignments) {
    return responseStatus(res, 400, "failed", "Teaching assignments are required at registration");
  }

  let parsedAssignments;
  try {
    parsedAssignments = Array.isArray(teachingAssignments)
      ? teachingAssignments
      : JSON.parse(teachingAssignments);
  } catch (error) {
    return responseStatus(res, 400, "failed", "Invalid teaching assignments format");
  }

  if (!parsedAssignments.length) {
    return responseStatus(res, 400, "failed", "At least one teaching assignment is required");
  }

  const validSections = ["Primary", "Secondary"];
  const validClasses = [
    "Kindergarten", "Reception", "Nursery 1", "Nursery 2",
    "Primary 1", "Primary 2", "Primary 3", "Primary 4", "Primary 5", "Primary 6",
    "JSS 1", "JSS 2", "JSS 3", "SS 1", "SS 2", "SS 3",
  ];

  for (const assignment of parsedAssignments) {
    if (
      !assignment.section ||
      !validSections.includes(assignment.section) ||
      !assignment.className ||
      !validClasses.includes(assignment.className) ||
      !Array.isArray(assignment.subclasses) ||
      !assignment.subclasses.every((sub) => /^[A-Z]$/.test(sub))
    ) {
      return responseStatus(
        res,
        400,
        "failed",
        "Invalid teaching assignments data: Ensure valid section, className, and subclasses (single uppercase letters)"
      );
    }
  }

  // Validate bankAccountDetails
  if (
    !bankAccountDetails ||
    !bankAccountDetails.accountName ||
    !bankAccountDetails.accountNumber ||
    !bankAccountDetails.bank
  ) {
    return responseStatus(res, 400, "failed", "Complete bank account details are required");
  }

  // Hash password
  const hashedPassword = await hashPassword(password);

  // Handle profile picture upload
  let profilePictureUrl = "";
  if (file) {
    profilePictureUrl = file.path; // Cloudinary secure URL
  } else {
    return responseStatus(res, 400, "failed", "Profile picture is required");
  }

  // Create new teacher
  try {
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
      teachingAssignments: parsedAssignments,
      profilePictureUrl,
      linkedInProfile,
    });

    // Add teacher to admin
    admin.teachers.push(newTeacher._id);
    await admin.save();

    // Add teacher to current academic year's teachers array
    currentAcademicYear.teachers.push(newTeacher._id);
    await currentAcademicYear.save();

    // Populate relevant fields for response
    const populatedTeacher = await Teacher.findById(newTeacher._id)
      .select("-password")
      .populate("subject");

    return responseStatus(res, 201, "success", populatedTeacher);
  } catch (error) {
    if (file) {
      try {
        await deleteFromCloudinary(file.path);
      } catch (err) {
        console.error("Failed to delete uploaded file:", err.message);
      }
    }
    return responseStatus(res, 500, "failed", "Error creating teacher: " + error.message);
  }
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
  try {
    const teacherFound = await Teacher.findOne({ email })
      .select("+password")
      .populate("subject");
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
  } catch (error) {
    return responseStatus(res, 500, "failed", "Error logging in: " + error.message);
  }
};

/**
 * Service to get all teachers
 * @param {Object} res - Express response object
 * @returns {Object} - Response object with array of all teacher objects
 */
exports.getAllTeachersService = async (res) => {
  try {
    const teachers = await Teacher.find()
      .select("-password")
      .populate("subject");
    return responseStatus(res, 200, "success", teachers);
  } catch (error) {
    return responseStatus(res, 500, "failed", "Error fetching teachers: " + error.message);
  }
};

/**
 * Service to get teacher profile by ID
 * @param {string} teacherId - ID of the teacher
 * @param {Object} res - Express response object
 * @returns {Object} - Response object with teacher profile
 */
exports.getTeacherProfileService = async (teacherId, res) => {
  try {
    const teacher = await Teacher.findById(teacherId)
      .select("-password -createdAt -updatedAt")
      .populate("subject");
    if (!teacher) {
      return responseStatus(res, 404, "failed", "Teacher not found");
    }
    return responseStatus(res, 200, "success", teacher);
  } catch (error) {
    return responseStatus(res, 500, "failed", "Error fetching teacher profile: " + error.message);
  }
};

/**
 * Service to update teacher profile (by teacher)
 * @param {Object} data - Updated data for the teacher
 * @param {Object} file - The uploaded profile picture file (from Multer)
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

  // Check if teacher exists
  const teacherExist = await Teacher.findById(teacherId);
  if (!teacherExist) {
    return responseStatus(res, 404, "failed", "Teacher not found");
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

  // Validate bankAccountDetails if provided
  if (
    bankAccountDetails &&
    (!bankAccountDetails.accountName ||
      !bankAccountDetails.accountNumber ||
      !bankAccountDetails.bank)
  ) {
    return responseStatus(res, 400, "failed", "Complete bank account details are required");
  }

  // Hash password if provided
  const hashedPassword = password ? await hashPassword(password) : undefined;

  // Handle profile picture upload
  let profilePictureUrl = teacherExist.profilePictureUrl;
  if (file) {
    if (profilePictureUrl) {
      try {
        await deleteFromCloudinary(profilePictureUrl);
      } catch (err) {
        console.error("Failed to delete old profile picture:", err.message);
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
  try {
    const updatedTeacher = await Teacher.findByIdAndUpdate(
      teacherId,
      updateData,
      { new: true, runValidators: true }
    )
      .select("-password")
      .populate("subject");

    return responseStatus(res, 200, "success", {
      teacher: updatedTeacher,
      token: generateToken(updatedTeacher._id),
    });
  } catch (error) {
    if (file) {
      try {
        await deleteFromCloudinary(file.path);
      } catch (err) {
        console.error("Failed to delete uploaded file:", err.message);
      }
    }
    return responseStatus(res, 500, "failed", "Error updating teacher: " + error.message);
  }
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
    return responseStatus(res, 404, "failed", "Teacher not found");
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

  // Validate subject if provided
  if (subject) {
    const subjectExists = await Subject.findById(subject);
    if (!subjectExists) {
      return responseStatus(res, 404, "failed", "Subject not found");
    }
  }

  // Validate teachingAssignments if provided
  let parsedAssignments;
  if (teachingAssignments) {
    try {
      parsedAssignments = Array.isArray(teachingAssignments)
        ? teachingAssignments
        : JSON.parse(teachingAssignments);
      if (!parsedAssignments.length) {
        return responseStatus(res, 400, "failed", "At least one teaching assignment is required");
      }
      for (const assignment of parsedAssignments) {
        if (
          !assignment.section ||
          !validSections.includes(assignment.section) ||
          !assignment.className ||
          !validClasses.includes(assignment.className) ||
          !Array.isArray(assignment.subclasses) ||
          !assignment.subclasses.every((sub) => /^[A-Z]$/.test(sub))
        ) {
          return responseStatus(
            res,
            400,
            "failed",
            "Invalid teaching assignments data: Ensure valid section, className, and subclasses"
          );
        }
      }
    } catch (error) {
      return responseStatus(res, 400, "failed", "Invalid teaching assignments format");
    }
  }

  // Validate bankAccountDetails if provided
  if (
    bankAccountDetails &&
    (!bankAccountDetails.accountName ||
      !bankAccountDetails.accountNumber ||
      !bankAccountDetails.bank)
  ) {
    return responseStatus(res, 400, "failed", "Complete bank account details are required");
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
        console.error("Failed to delete old profile picture:", err.message);
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
    teachingAssignments: parsedAssignments,
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
  try {
    const updatedTeacher = await Teacher.findByIdAndUpdate(
      teacherId,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .select("-password")
      .populate("subject");

    return responseStatus(res, 200, "success", updatedTeacher);
  } catch (error) {
    if (file) {
      try {
        await deleteFromCloudinary(file.path);
      } catch (err) {
        console.error("Failed to delete uploaded file:", err.message);
      }
    }
    return responseStatus(res, 500, "failed", "Error updating teacher: " + error.message);
  }
};