const {
  hashPassword,
  isPassMatched,
} = require("../../handlers/passHash.handler");
const Teacher = require("../../models/Staff/teachers.model");
const Admin = require("../../models/Staff/admin.model");
const Subject = require("../../models/Academic/subject.model");
const AcademicYear = require("../../models/Academic/academicYear.model");
const ClassLevel = require("../../models/Academic/class.model");
const generateToken = require("../../utils/tokenGenerator");
const { deleteFromCloudinary } = require("../../middlewares/fileUpload");

// Custom error class for service errors
class ServiceError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

/**
 * Service to create a new teacher
 * @param {Object} data - Teacher data including all required fields
 * @param {Object} file - The uploaded profile picture file (from Multer)
 * @param {string} adminId - ID of the admin creating the teacher
 * @returns {Object} - Created teacher object
 * @throws {ServiceError} - If validation fails or an error occurs
 */
exports.adminRegisterTeacherService = async (data, file, adminId) => {
  const {
    firstName,
    lastName,
    middleName,
    email,
    password = "123456789",
    gender,
    NIN,
    address,
    qualification,
    phoneNumber,
    tribe,
    religion,
    bankAccountDetails,
    subject,
    classLevel,
    subclassLetter,
    linkedInProfile,
  } = data;

  // Check if teacher email exists
  const teacherExists = await Teacher.findOne({ email });
  if (teacherExists) {
    throw new ServiceError(409, "Teacher already registered");
  }

  // Validate subject if provided
  let subjectDoc;
  if (subject) {
    subjectDoc = await Subject.findById(subject);
    if (!subjectDoc) {
      throw new ServiceError(404, "Subject not found");
    }
  }

  // Validate classLevel and subclassLetter if provided
  if (classLevel || subclassLetter) {
    if (!classLevel || !subclassLetter) {
      throw new ServiceError(400, "Both classLevel and subclassLetter are required if one is provided");
    }
    const classLevelDoc = await ClassLevel.findById(classLevel);
    if (!classLevelDoc) {
      throw new ServiceError(404, "ClassLevel not found");
    }
    if (!classLevelDoc.subclasses.some((sub) => sub.letter === subclassLetter)) {
      throw new ServiceError(400, `Subclass ${subclassLetter} not found in ClassLevel`);
    }
    if (!subject) {
      throw new ServiceError(400, "Subject is required when assigning classLevel and subclassLetter");
    }
  }

  // Find current academic year
  const currentAcademicYear = await AcademicYear.findOne({ isCurrent: true });
  if (!currentAcademicYear) {
    throw new ServiceError(400, "No current academic year set");
  }

  // Validate bankAccountDetails
  if (
    !bankAccountDetails ||
    !bankAccountDetails.accountName ||
    !bankAccountDetails.accountNumber ||
    !bankAccountDetails.bank
  ) {
    throw new ServiceError(400, "Complete bank account details are required");
  }

  // Hash password
  const hashedPassword = await hashPassword(password);

  // Handle profile picture upload
  let profilePictureUrl = "";
  if (file) {
    profilePictureUrl = file.path;
  } else {
    throw new ServiceError(400, "Profile picture is required");
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
      profilePictureUrl,
      linkedInProfile,
    });

    // Add teacher to current academic year's teachers array
    currentAcademicYear.teachers.push(newTeacher._id);
    await currentAcademicYear.save();

    // Add teacher to ClassLevel.teachers if classLevel and subclassLetter provided
    if (classLevel && subclassLetter) {
      const classLevelDoc = await ClassLevel.findById(classLevel);
      if (classLevelDoc) {
        const teacherEntry = {
          teacherId: newTeacher._id,
          name: `${newTeacher.firstName} ${newTeacher.lastName}`,
        };
        if (!classLevelDoc.teachers.some((t) => t.teacherId.toString() === newTeacher._id.toString())) {
          classLevelDoc.teachers.push(teacherEntry);
          await classLevelDoc.save();
        }
      }
    }

    // Populate relevant fields
    const populatedTeacher = await Teacher.findById(newTeacher._id)
      .select("-password")
      .populate("subject");

    return populatedTeacher;
  } catch (error) {
    if (file) {
      try {
        await deleteFromCloudinary(file.path);
      } catch (err) {
        console.error("Failed to delete uploaded file:", err.message);
      }
    }
    throw new ServiceError(500, "Error creating teacher: " + error.message);
  }
};

/**
 * Service for teacher login
 * @param {Object} data - Login credentials including email and password
 * @returns {Object} - Teacher details and token
 * @throws {ServiceError} - If login fails
 */
exports.teacherLoginService = async (data) => {
  const { email,
    password } = data;

  try {
    const teacherFound = await Teacher.findOne({ email })
      .select("+password")
      .populate("subject");
    if (!teacherFound) {
      throw new ServiceError(401, "Invalid login credentials");
    }

    const isMatched = await isPassMatched(password, teacherFound.password);
    if (!isMatched) {
      throw new ServiceError(401, "Invalid login credentials");
    }

    const teacherObj = teacherFound.toObject();
    delete teacherObj.password;

    return {
      teacher: teacherObj,
      token: generateToken(teacherFound._id),
    };
  } catch (error) {
    throw new ServiceError(500, "Error logging in: " + error.message);
  }
};

/**
 * Service to get all teachers
 * @returns {Array} - Array of all teacher objects
 * @throws {ServiceError} - If fetching fails
 */
exports.getAllTeachersService = async () => {
  try {
    const teachers = await Teacher.find()
      .select("-password")
      .populate("subject");
    return teachers;
  } catch (error) {
    throw new ServiceError(500, "Error fetching teachers: " + error.message);
  }
};

/**
 * Service to get teacher profile by ID
 * @param {string} teacherId - ID of the teacher
 * @returns {Object} - Teacher profile
 * @throws {ServiceError} - If teacher not found or error occurs
 */
exports.getTeacherProfileService = async (teacherId) => {
  try {
    const teacher = await Teacher.findById(teacherId)
      .select("-password -createdAt -updatedAt")
      .populate("subject");
    if (!teacher) {
      throw new ServiceError(404, "Teacher not found");
    }
    return teacher;
  } catch (error) {
    throw new ServiceError(500, "Error fetching teacher profile: " + error.message);
  }
};

/**
 * Service to update teacher profile (by teacher)
 * @param {Object} data - Updated data for the teacher
 * @param {Object} file - The uploaded profile picture file (from Multer)
 * @param {string} teacherId - ID of the teacher
 * @returns {Object} - Updated teacher details and token
 * @throws {ServiceError} - If update fails
 */
exports.updateTeacherProfileService = async (data, file, teacherId) => {
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

  const teacherExist = await Teacher.findById(teacherId);
  if (!teacherExist) {
    throw new ServiceError(404, "Teacher not found");
  }

  if (email && email !== teacherExist.email) {
    const emailExist = await Teacher.findOne({
      email,
      _id: { $ne: teacherId },
    });
    if (emailExist) {
      throw new ServiceError(409, "Email already in use");
    }
  }

  if (
    bankAccountDetails &&
    (!bankAccountDetails.accountName ||
      !bankAccountDetails.accountNumber ||
      !bankAccountDetails.bank)
  ) {
    throw new ServiceError(400, "Complete bank account details are required");
  }

  const hashedPassword = password ? await hashPassword(password) : undefined;

  let profilePictureUrl = teacherExist.profilePictureUrl;
  if (file) {
    if (profilePictureUrl) {
      try {
        await deleteFromCloudinary(profilePictureUrl);
      } catch (err) {
        console.error("Failed to delete old profile picture:", err.message);
      }
    }
    profilePictureUrl = file.path;
  }

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

  Object.keys(updateData).forEach(
    (key) => updateData[key] === undefined && delete updateData[key]
  );

  try {
    const updatedTeacher = await Teacher.findByIdAndUpdate(
      teacherId,
      updateData,
      { new: true, runValidators: true }
    )
      .select("-password")
      .populate("subject");

    return {
      teacher: updatedTeacher,
      token: generateToken(updatedTeacher._id),
    };
  } catch (error) {
    if (file) {
      try {
        await deleteFromCloudinary(file.path);
      } catch (err) {
        console.error("Failed to delete uploaded file:", err.message);
      }
    }
    throw new ServiceError(500, "Error updating teacher: " + error.message);
  }
};

/**
 * Service for admin to update teacher profile
 * @param {Object} data - Updated data for the teacher
 * @param {Object} file - The uploaded profile picture file (from Multer)
 * @param {string} teacherId - ID of the teacher
 * @returns {Object} - Updated teacher details
 * @throws {ServiceError} - If update fails
 */
exports.adminUpdateTeacherProfileService = async (data, file, teacherId) => {
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
    classLevel,
    subclassLetter,
    isWithdrawn,
    isSuspended,
    applicationStatus,
    linkedInProfile,
  } = data;

  const teacherExist = await Teacher.findById(teacherId);
  if (!teacherExist) {
    throw new ServiceError(404, "Teacher not found");
  }

  if (email && email !== teacherExist.email) {
    const emailExist = await Teacher.findOne({
      email,
      _id: { $ne: teacherId },
    });
    if (emailExist) {
      throw new ServiceError(409, "Email already in use");
    }
  }

  let subjectDoc;
  if (subject) {
    subjectDoc = await Subject.findById(subject);
    if (!subjectDoc) {
      throw new ServiceError(404, "Subject not found");
    }
  }

  if (classLevel || subclassLetter) {
    if (!classLevel || !subclassLetter || !subject) {
      throw new ServiceError(400, "Subject, classLevel, and subclassLetter are required if one is provided");
    }
    const classLevelDoc = await ClassLevel.findById(classLevel);
    if (!classLevelDoc) {
      throw new ServiceError(404, "ClassLevel not found");
    }
    if (!classLevelDoc.subclasses.some((sub) => sub.letter === subclassLetter)) {
      throw new ServiceError(400, `Subclass ${subclassLetter} not found in ClassLevel`);
    }
  }

  if (
    bankAccountDetails &&
    (!bankAccountDetails.accountName ||
      !bankAccountDetails.accountNumber ||
      !bankAccountDetails.bank)
  ) {
    throw new ServiceError(400, "Complete bank account details are required");
  }

  if (teacherExist.isWithdrawn && isWithdrawn !== false) {
    throw new ServiceError(403, "Action denied, teacher is withdrawn");
  }

  let profilePictureUrl = teacherExist.profilePictureUrl;
  if (file) {
    if (profilePictureUrl) {
      try {
        await deleteFromCloudinary(profilePictureUrl);
      } catch (err) {
        console.error("Failed to delete old profile picture:", err.message);
      }
    }
    profilePictureUrl = file.path;
  }

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
    isWithdrawn,
    isSuspended,
    applicationStatus,
    profilePictureUrl,
    linkedInProfile,
  };

  Object.keys(updateData).forEach(
    (key) => updateData[key] === undefined && delete updateData[key]
  );

  try {
    const updatedTeacher = await Teacher.findByIdAndUpdate(
      teacherId,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .select("-password")
      .populate("subject");

    if (classLevel && subclassLetter) {
      const classLevelDoc = await ClassLevel.findById(classLevel);
      if (classLevelDoc) {
        const teacherEntry = {
          teacherId: updatedTeacher._id,
          name: `${updatedTeacher.firstName} ${updatedTeacher.lastName}`,
        };
        if (!classLevelDoc.teachers.some((t) => t.teacherId.toString() === updatedTeacher._id.toString())) {
          classLevelDoc.teachers.push(teacherEntry);
          await classLevelDoc.save();
        }
      }
    }

    return updatedTeacher;
  } catch (error) {
    if (file) {
      try {
        await deleteFromCloudinary(file.path);
      } catch (err) {
        console.error("Failed to delete uploaded file:", err.message);
      }
    }
    throw new ServiceError(500, "Error updating teacher: " + error.message);
  }
};