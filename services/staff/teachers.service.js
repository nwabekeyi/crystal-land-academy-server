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
const responseStatus = require("../../handlers/responseStatus.handler");
const Results = require('../../models/Academic/results.model');
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
 * @param {Object} res - The Express response object
 * @returns {void} - Sends HTTP response via responseStatus
 */
exports.adminRegisterTeacherService = async (data, file, adminId, res) => {
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

  try {
    // Check if teacher email exists
    const teacherExists = await Teacher.findOne({ email });
    if (teacherExists) {
      return responseStatus(res, 409, "failed", "Teacher already registered");
    }

    // Validate subject if provided
    let subjectDoc;
    if (subject) {
      subjectDoc = await Subject.findById(subject);
      if (!subjectDoc) {
        return responseStatus(res, 404, "failed", "Subject not found");
      }
    }

    // Validate classLevel and subclassLetter if provided
    if (classLevel || subclassLetter) {
      if (!classLevel || !subclassLetter) {
        return responseStatus(res, 400, "failed", "Both classLevel and subclassLetter are required if one is provided");
      }
      const classLevelDoc = await ClassLevel.findById(classLevel);
      if (!classLevelDoc) {
        return responseStatus(res, 404, "failed", "ClassLevel not found");
      }
      if (!classLevelDoc.subclasses.some((sub) => sub.letter === subclassLetter)) {
        return responseStatus(res, 400, "failed", `Subclass ${subclassLetter} not found in ClassLevel`);
      }
      if (!subject) {
        return responseStatus(res, 400, "failed", "Subject is required when assigning classLevel and subclassLetter");
      }
    }

    // Find current academic year
    const currentAcademicYear = await AcademicYear.findOne({ isCurrent: true });
    if (!currentAcademicYear) {
      return responseStatus(res, 400, "failed", "No current academic year set");
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
      profilePictureUrl = file.path;
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
      profilePictureUrl,
      linkedInProfile,
      teachingAssignments: classLevel && subclassLetter ? [{
        section: (await ClassLevel.findById(classLevel)).section,
        className: (await ClassLevel.findById(classLevel)).name,
        subclasses: [subclassLetter],
      }] : [],
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
          firstName: newTeacher.firstName,
          lastName: newTeacher.lastName,
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
 * @param {Object} res - The Express response object
 * @returns {void} - Sends HTTP response via responseStatus
 */
exports.teacherLoginService = async (data, res) => {
  const { email, password } = data;

  try {
    const teacherFound = await Teacher.findOne({ email })
      .select("+password")
      .populate("subject");
    if (!teacherFound) {
      return responseStatus(res, 401, "failed", "Invalid login credentials");
    }

    const isMatched = await isPassMatched(password, teacherFound.password);
    if (!isMatched) {
      return responseStatus(res, 401, "failed", "Invalid login credentials");
    }

    const teacherObj = teacherFound.toObject();
    delete teacherObj.password;

    return responseStatus(res, 200, "success", {
      teacher: teacherObj,
      token: generateToken(teacherFound._id),
    });
  } catch (error) {
    return responseStatus(res, 500, "failed", "Error logging in: " + error.message);
  }
};

/**
 * Service to get all teachers with pagination and filtering
 * @param {Object} query - The query parameters from req.query
 * @param {Object} res - The Express response object
 * @returns {void} - Sends HTTP response via responseStatus
 */
exports.getAllTeachersService = async (query, res) => {
  try {
    // Log raw query parameters for debugging
    console.log('Raw Query Parameters:', query);

    const {
      page = 1, // Frontend sends 1-based indexing
      limit = 20,
      section,
      className,
      isWithdrawn,
      isSuspended,
    } = query;

    // Fetch class levels for filtering options
    const classLevelQuery = {};
    if (section && ['Primary', 'Secondary'].includes(section)) {
      classLevelQuery.section = section;
    }

    const classLevels = await ClassLevel.find(classLevelQuery)
      .distinct('name')
      .lean()
      .then(names => names.sort());
    console.log('Class Levels:', classLevels);

    // Build MongoDB query object for teachers
    const teacherQuery = {};

    // Handle isWithdrawn and isSuspended based on frontend status filter
    if (isWithdrawn !== undefined) {
      teacherQuery.isWithdrawn = isWithdrawn === 'true';
    }
    if (isSuspended !== undefined) {
      teacherQuery.isSuspended = isSuspended === 'true';
    }

    // Handle section and className filters
    if (section && ['Primary', 'Secondary'].includes(section)) {
      teacherQuery['teachingAssignments.section'] = section;
    }
    if (className) {
      const normalizedClassName = className.trim();
      const normalizedClassLevels = classLevels.map(name => name.trim());
      if (normalizedClassLevels.includes(normalizedClassName)) {
        teacherQuery['teachingAssignments.className'] = normalizedClassName;
      } else {
        console.warn(`Invalid className: ${className}. Available: ${normalizedClassLevels}`);
      }
    }

    // Log the constructed query for debugging
    console.log('Teacher Query:', teacherQuery);

    // Fetch teachers with pagination
    const teachers = await Teacher.find(teacherQuery)
      .select('-password')
      .populate({
        path: 'subject',
        select: 'name _id',
        options: { strictPopulate: false }
      })
      .skip((parseInt(page) - 1) * parseInt(limit)) // Adjust for 1-based indexing
      .limit(parseInt(limit))
      .lean();

    // Get total count for pagination
    const total = await Teacher.countDocuments(teacherQuery);

    // Fetch current academic year for response
    const currentAcademicYear = await AcademicYear.findOne({ isCurrent: true }).select('name _id').lean();

    // Prepare response
    const response = {
      status: 'success',
      classLevels,
      data: teachers.map((teacher, index) => {
        const teachingAssignment = teacher.teachingAssignments && teacher.teachingAssignments.length > 0
          ? teacher.teachingAssignments[0]
          : null;

        return {
          _id: teacher._id.toString(),
          teacherId: teacher.teacherId || 'N/A',
          firstName: teacher.firstName || '',
          lastName: teacher.lastName || '',
          middleName: teacher.middleName || '',
          gender: teacher.gender || '',
          role: 'teacher',
          profilePictureUrl: teacher.profilePictureUrl || '',
          religion: teacher.religion || '',
          tribe: teacher.tribe || '',
          NIN: teacher.NIN || '',
          formalSchool: '', // Not applicable for teachers
          email: teacher.email || '',
          guardians: [], // Not applicable for teachers
          classLevelId: teachingAssignment ? teachingAssignment.classLevelId || '' : '',
          currentClassLevel: teachingAssignment ? {
            section: teachingAssignment.section || '',
            className: teachingAssignment.className || '',
            subclass: teachingAssignment.subclasses && teachingAssignment.subclasses.length > 0
              ? teachingAssignment.subclasses[0]
              : '',
            academicYear: currentAcademicYear ? {
              name: currentAcademicYear.name || '',
              academicYearId: {
                _id: currentAcademicYear._id ? currentAcademicYear._id.toString() : '',
                name: currentAcademicYear.name || ''
              }
            } : {}
          } : {},
          boardingStatus: null, // Not applicable for teachers
          isGraduated: false, // Not applicable for teachers
          isSuspended: teacher.isSuspended || false,
          isWithdrawn: teacher.isWithdrawn || false,
          createdAt: teacher.createdAt ? teacher.createdAt.toISOString() : '',
          updatedAt: teacher.updatedAt ? teacher.updatedAt.toISOString() : '',
          __v: teacher.__v || 0,
          sn: index + 1 + (parseInt(page) - 1) * parseInt(limit),
          subject: teacher.subject || null,
          qualification: teacher.qualification || '',
          phoneNumber: teacher.phoneNumber || '',
          bankAccountDetails: teacher.bankAccountDetails || {},
          linkedInProfile: teacher.linkedInProfile || '',
          applicationStatus: teacher.applicationStatus || 'pending',
        };
      }),
      total,
      page: parseInt(page),
      limit: parseInt(limit),
    };

    return responseStatus(res, 200, "success", response);
  } catch (error) {
    console.error('Error in getAllTeachersService:', error);
    return responseStatus(res, 500, "failed", "Error fetching teachers: " + error.message);
  }
};

/**
 * Service to get teacher profile by ID
 * @param {string} teacherId - ID of the teacher
 * @param {Object} res - The Express response object
 * @returns {void} - Sends HTTP response via responseStatus
 */
exports.getTeacherProfileService = async (teacherId, res) => {
  try {
    const teacher = await Teacher.findById(teacherId)
      .select("-password")
      .populate("subject")
      .lean();
    if (!teacher) {
      return responseStatus(res, 404, "failed", "Teacher not found");
    }

    // Fetch current academic year for response
    const currentAcademicYear = await AcademicYear.findOne({ isCurrent: true }).select('name _id').lean();

    // Get the first teaching assignment (if any) to mimic currentClassLevel
    const teachingAssignment = teacher.teachingAssignments && teacher.teachingAssignments.length > 0
      ? teacher.teachingAssignments[0]
      : null;

    const formattedTeacher = {
      _id: teacher._id.toString(),
      teacherId: teacher.teacherId || 'N/A',
      firstName: teacher.firstName || '',
      lastName: teacher.lastName || '',
      middleName: teacher.middleName || '',
      gender: teacher.gender || '',
      role: 'teacher',
      profilePictureUrl: teacher.profilePictureUrl || '',
      religion: teacher.religion || '',
      tribe: teacher.tribe || '',
      NIN: teacher.NIN || '',
      formalSchool: '', // Not applicable for teachers
      email: teacher.email || '',
      guardians: [], // Not applicable for teachers
      classLevelId: teachingAssignment ? teachingAssignment.classLevelId || '' : '',
      currentClassLevel: teachingAssignment ? {
        section: teachingAssignment.section || '',
        className: teachingAssignment.className || '',
        subclass: teachingAssignment.subclasses && teachingAssignment.subclasses.length > 0
          ? teachingAssignment.subclasses[0]
          : '',
        academicYear: currentAcademicYear ? {
          name: currentAcademicYear.name || '',
          academicYearId: {
            _id: currentAcademicYear._id ? currentAcademicYear._id.toString() : '',
            name: currentAcademicYear.name || ''
          }
        } : {}
      } : {},
      boardingStatus: null, // Not applicable for teachers
      isGraduated: false, // Not applicable for teachers
      isSuspended: teacher.isSuspended || false,
      isWithdrawn: teacher.isWithdrawn || false,
      createdAt: teacher.createdAt ? teacher.createdAt.toISOString() : '',
      updatedAt: teacher.updatedAt ? teacher.updatedAt.toISOString() : '',
      __v: teacher.__v || 0,
      subject: teacher.subject || [],
      qualification: teacher.qualification || '',
      phoneNumber: teacher.phoneNumber || '',
      bankAccountDetails: teacher.bankAccountDetails || {},
      linkedInProfile: teacher.linkedInProfile || '',
      applicationStatus: teacher.applicationStatus || 'pending',
    };

    return responseStatus(res, 200, "success", formattedTeacher);
  } catch (error) {
    return responseStatus(res, 500, "failed", "Error fetching teacher profile: " + error.message);
  }
};

/**
 * Service to update teacher profile (by teacher)
 * @param {Object} data - Updated data for the teacher
 * @param {Object} file - The uploaded profile picture file (from Multer)
 * @param {string} teacherId - ID of the teacher
 * @param {Object} res - The Express response object
 * @returns {void} - Sends HTTP response via responseStatus
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

  try {
    const teacherExist = await Teacher.findById(teacherId);
    if (!teacherExist) {
      return responseStatus(res, 404, "failed", "Teacher not found");
    }

    if (email && email !== teacherExist.email) {
      const emailExist = await Teacher.findOne({
        email,
        _id: { $ne: teacherId },
      });
      if (emailExist) {
        return responseStatus(res, 409, "failed", "Email already in use");
      }
    }

    if (
      bankAccountDetails &&
      (!bankAccountDetails.accountName ||
        !bankAccountDetails.accountNumber ||
        !bankAccountDetails.bank)
    ) {
      return responseStatus(res, 400, "failed", "Complete bank account details are required");
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

    const updatedTeacher = await Teacher.findByIdAndUpdate(
      teacherId,
      updateData,
      { new: true, runValidators: true }
    )
      .select("-password")
      .populate("subject");

    // Fetch current academic year for response
    const currentAcademicYear = await AcademicYear.findOne({ isCurrent: true }).select('name _id').lean();

    // Get the first teaching assignment (if any) to mimic currentClassLevel
    const teachingAssignment = updatedTeacher.teachingAssignments && updatedTeacher.teachingAssignments.length > 0
      ? updatedTeacher.teachingAssignments[0]
      : null;

    const formattedTeacher = {
      _id: updatedTeacher._id.toString(),
      teacherId: updatedTeacher.teacherId || 'N/A',
      firstName: updatedTeacher.firstName || '',
      lastName: updatedTeacher.lastName || '',
      middleName: updatedTeacher.middleName || '',
      gender: updatedTeacher.gender || '',
      role: 'teacher',
      profilePictureUrl: updatedTeacher.profilePictureUrl || '',
      religion: updatedTeacher.religion || '',
      tribe: updatedTeacher.tribe || '',
      NIN: updatedTeacher.NIN || '',
      formalSchool: '', // Not applicable for teachers
      email: updatedTeacher.email || '',
      guardians: [], // Not applicable for teachers
      classLevelId: teachingAssignment ? teachingAssignment.classLevelId || '' : '',
      currentClassLevel: teachingAssignment ? {
        section: teachingAssignment.section || '',
        className: teachingAssignment.className || '',
        subclass: teachingAssignment.subclasses && teachingAssignment.subclasses.length > 0
          ? teachingAssignment.subclasses[0]
          : '',
        academicYear: currentAcademicYear ? {
          name: currentAcademicYear.name || '',
          academicYearId: {
            _id: currentAcademicYear._id ? currentAcademicYear._id.toString() : '',
            name: currentAcademicYear.name || ''
          }
        } : {}
      } : {},
      boardingStatus: null, // Not applicable for teachers
      isGraduated: false, // Not applicable for teachers
      isSuspended: updatedTeacher.isSuspended || false,
      isWithdrawn: updatedTeacher.isWithdrawn || false,
      createdAt: updatedTeacher.createdAt ? updatedTeacher.createdAt.toISOString() : '',
      updatedAt: updatedTeacher.updatedAt ? updatedTeacher.updatedAt.toISOString() : '',
      __v: updatedTeacher.__v || 0,
      subject: updatedTeacher.subject || [],
      qualification: updatedTeacher.qualification || '',
      phoneNumber: updatedTeacher.phoneNumber || '',
      bankAccountDetails: updatedTeacher.bankAccountDetails || {},
      linkedInProfile: updatedTeacher.linkedInProfile || '',
      applicationStatus: updatedTeacher.applicationStatus || 'pending',
    };

    return responseStatus(res, 200, "success", {
      teacher: formattedTeacher,
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
 * @param {Object} res - The Express response object
 * @returns {void} - Sends HTTP response via responseStatus
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
    classLevel,
    subclassLetter,
    isWithdrawn,
    isSuspended,
    applicationStatus,
    linkedInProfile,
  } = data;

  try {
    const teacherExist = await Teacher.findById(teacherId);
    if (!teacherExist) {
      return responseStatus(res, 404, "failed", "Teacher not found");
    }

    if (email && email !== teacherExist.email) {
      const emailExist = await Teacher.findOne({
        email,
        _id: { $ne: teacherId },
      });
      if (emailExist) {
        return responseStatus(res, 409, "failed", "Email already in use");
      }
    }

    let subjectDoc;
    if (subject) {
      subjectDoc = await Subject.findById(subject);
      if (!subjectDoc) {
        return responseStatus(res, 404, "failed", "Subject not found");
      }
    }

    if (classLevel || subclassLetter) {
      if (!classLevel || !subclassLetter || !subject) {
        return responseStatus(res, 400, "failed", "Subject, classLevel, and subclassLetter are required if one is provided");
      }
      const classLevelDoc = await ClassLevel.findById(classLevel);
      if (!classLevelDoc) {
        return responseStatus(res, 404, "failed", "ClassLevel not found");
      }
      if (!classLevelDoc.subclasses.some((sub) => sub.letter === subclassLetter)) {
        return responseStatus(res, 400, "failed", `Subclass ${subclassLetter} not found in ClassLevel`);
      }
    }

    if (
      bankAccountDetails &&
      (!bankAccountDetails.accountName ||
        !bankAccountDetails.accountNumber ||
        !bankAccountDetails.bank)
    ) {
      return responseStatus(res, 400, "failed", "Complete bank account details are required");
    }

    if (teacherExist.isWithdrawn && isWithdrawn !== false) {
      return responseStatus(res, 403, "failed", "Action denied, teacher is withdrawn");
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
      ...(classLevel && subclassLetter ? {
        teachingAssignments: [{
          section: (await ClassLevel.findById(classLevel)).section,
          className: (await ClassLevel.findById(classLevel)).name,
          subclasses: [subclassLetter],
        }],
      } : {}),
    };

    Object.keys(updateData).forEach(
      (key) => updateData[key] === undefined && delete updateData[key]
    );

    const updatedTeacher = await Teacher.findByIdAndUpdate(
      teacherId,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .select("-password")
      .populate("subject");

    // Fetch current academic year for response
    const currentAcademicYear = await AcademicYear.findOne({ isCurrent: true }).select('name _id').lean();

    // Get the first teaching assignment (if any) to mimic currentClassLevel
    const teachingAssignment = updatedTeacher.teachingAssignments && updatedTeacher.teachingAssignments.length > 0
      ? updatedTeacher.teachingAssignments[0]
      : null;

    const formattedTeacher = {
      _id: updatedTeacher._id.toString(),
      teacherId: updatedTeacher.teacherId || 'N/A',
      firstName: updatedTeacher.firstName || '',
      lastName: updatedTeacher.lastName || '',
      middleName: updatedTeacher.middleName || '',
      gender: updatedTeacher.gender || '',
      role: 'teacher',
      profilePictureUrl: updatedTeacher.profilePictureUrl || '',
      religion: updatedTeacher.religion || '',
      tribe: updatedTeacher.tribe || '',
      NIN: updatedTeacher.NIN || '',
      formalSchool: '', // Not applicable for teachers
      email: updatedTeacher.email || '',
      guardians: [], // Not applicable for teachers
      classLevelId: teachingAssignment ? teachingAssignment.classLevelId || '' : '',
      currentClassLevel: teachingAssignment ? {
        section: teachingAssignment.section || '',
        className: teachingAssignment.className || '',
        subclass: teachingAssignment.subclasses && teachingAssignment.subclasses.length > 0
          ? teachingAssignment.subclasses[0]
          : '',
        academicYear: currentAcademicYear ? {
          name: currentAcademicYear.name || '',
          academicYearId: {
            _id: currentAcademicYear._id ? currentAcademicYear._id.toString() : '',
            name: currentAcademicYear.name || ''
          }
        } : {}
      } : {},
      boardingStatus: null, // Not applicable for teachers
      isGraduated: false, // Not applicable for teachers
      isSuspended: updatedTeacher.isSuspended || false,
      isWithdrawn: updatedTeacher.isWithdrawn || false,
      createdAt: updatedTeacher.createdAt ? updatedTeacher.createdAt.toISOString() : '',
      updatedAt: updatedTeacher.updatedAt ? updatedTeacher.updatedAt.toISOString() : '',
      __v: updatedTeacher.__v || 0,
      subject: updatedTeacher.subject || [],
      qualification: updatedTeacher.qualification || '',
      phoneNumber: updatedTeacher.phoneNumber || '',
      bankAccountDetails: updatedTeacher.bankAccountDetails || {},
      linkedInProfile: updatedTeacher.linkedInProfile || '',
      applicationStatus: updatedTeacher.applicationStatus || 'pending',
    };

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

    return responseStatus(res, 200, "success", formattedTeacher);
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
 * Service to get assigned classes for a teacher
 * @param {string} teacherId - ID of the teacher
 * @param {Object} res - The Express response object
 * @returns {void} - Sends HTTP response via responseStatus
 */
exports.getAssignedClassesService = async (teacherId, res) => {
  try {
    const teacher = await Teacher.findById(teacherId).select('teachingAssignments');
    if (!teacher) {
      return responseStatus(res, 404, "failed", "Teacher not found");
    }

    // Map teachingAssignments to match ClassLevel format
    const assignedClasses = await Promise.all(
      teacher.teachingAssignments.map(async (assignment) => {
        const classLevel = await ClassLevel.findOne({
          section: assignment.section,
          name: assignment.className,
        }).select('_id section name subclasses');

        if (!classLevel) {
          return null; // Skip if no matching ClassLevel
        }

        return {
          _id: classLevel._id,
          section: classLevel.section,
          name: classLevel.name,
          subclasses: assignment.subclasses.map(letter => ({ letter })),
        };
      })
    );

    // Filter out null values and return
    return responseStatus(res, 200, "success", assignedClasses.filter(cls => cls !== null));
  } catch (error) {
    return responseStatus(res, 500, "failed", "Error fetching assigned classes: " + error.message);
  }
};


/**
 * Admin delete teacher service.
 * @param {string} teacherId - The ID of the teacher to delete.
 * @param {Object} res - The Express response object.
 * @returns {void} - Sends HTTP response via responseStatus.
 */
exports.adminDeleteTeacherService = async (teacherId, res) => {
  let originalClassLevels = [];
  let originalAcademicYear = null;

  try {
    // 1. Find the teacher
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return responseStatus(res, 404, "failed", "Teacher not found");
    }

    const profilePictureUrl = teacher.profilePictureUrl;

    // 2. Backup current classLevel assignments
    const classLevels = await ClassLevel.find({ 'teachers.teacherId': teacherId });
    originalClassLevels = classLevels.map((cl) => ({
      _id: cl._id,
      teachers: [...cl.teachers],
    }));

    // Remove teacher from all classLevels
    for (const classLevel of classLevels) {
      classLevel.teachers = classLevel.teachers.filter(
        (t) => !t.teacherId.equals(teacherId)
      );
      await classLevel.save();
    }

    // 3. Backup and update current academic year
    const academicYear = await AcademicYear.findOne({ isCurrent: true });
    if (academicYear) {
      originalAcademicYear = {
        _id: academicYear._id,
        teachers: [...academicYear.teachers],
      };

      academicYear.teachers = academicYear.teachers.filter(
        (id) => !id.equals(teacherId)
      );
      await academicYear.save();
    }

    // 4. Delete results associated with this teacher
    await Results.deleteMany({ teacher: teacherId });

    // 5. Delete profile picture if it exists
    if (profilePictureUrl) {
      try {
        await deleteFromCloudinary(profilePictureUrl);
      } catch (err) {
        console.warn("Failed to delete profile picture from Cloudinary:", err.message);
        // Non-blocking, continue deletion
      }
    }

    // 6. Delete the teacher
    await Teacher.findByIdAndDelete(teacherId);

    return responseStatus(res, 200, "success", {
      message: "Teacher deleted successfully",
      teacherId,
    });

  } catch (error) {
    console.error("Deletion failed:", error.message);

    // ✅ Rollback changes
    try {
      // Restore ClassLevels
      for (const backup of originalClassLevels) {
        await ClassLevel.findByIdAndUpdate(backup._id, {
          $set: { teachers: backup.teachers },
        });
      }

      // Restore AcademicYear
      if (originalAcademicYear) {
        await AcademicYear.findByIdAndUpdate(originalAcademicYear._id, {
          $set: { teachers: originalAcademicYear.teachers },
        });
      }

    } catch (rollbackError) {
      console.error("Rollback failed:", rollbackError.message);
    }

    return responseStatus(
      res,
      500,
      "failed",
      "Error deleting teacher: " + error.message
    );
  }
};
/**
 * Admin suspend teacher service.
 * @param {string} teacherId - The ID of the teacher to suspend.
 * @param {Object} res - The Express response object.
 * @returns {void} - Sends HTTP response via responseStatus.
 */
exports.adminSuspendTeacherService = async (teacherId, res) => {
  try {
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return responseStatus(res, 404, "failed", "Teacher not found");
    }

    if (teacher.isSuspended) {
      return responseStatus(res, 400, "failed", "Teacher is already suspended");
    }

    if (teacher.isWithdrawn) {
      return responseStatus(res, 400, "failed", "Cannot suspend a withdrawn teacher");
    }

    teacher.isSuspended = true;
    await teacher.save();

    const formattedTeacher = await Teacher.findById(teacherId)
      .select("-password")
      .lean();

    return responseStatus(res, 200, "success", {
      message: "Teacher suspended successfully",
      teacher: formattedTeacher,
    });
  } catch (error) {
    return responseStatus(res, 500, "failed", "Error suspending teacher: " + error.message);
  }
};


/**
 * Admin unsuspend teacher service.
 * @param {string} teacherId - The ID of the teacher to unsuspend.
 * @param {Object} res - The Express response object.
 * @returns {void} - Sends HTTP response via responseStatus.
 */
exports.adminUnsuspendTeacherService = async (teacherId, res) => {
  try {
    // Find the teacher
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return responseStatus(res, 404, "failed", "Teacher not found");
    }

    // Check if teacher is withdrawn
    if (teacher.isWithdrawn) {
      return responseStatus(res, 400, "failed", "Cannot unsuspend a withdrawn teacher");
    }

    // Check if teacher is already unsuspended
    if (!teacher.isSuspended) {
      return responseStatus(res, 400, "failed", "Teacher is not suspended");
    }

    // Unsuspend the teacher
    teacher.isSuspended = false;
    await teacher.save();

    // Fetch updated teacher data without password
    const formattedTeacher = await Teacher.findById(teacherId)
      .select("-password")
      .lean();

    return responseStatus(res, 200, "success", {
      message: "Teacher unsuspended successfully",
      teacher: formattedTeacher,
    });
  } catch (error) {
    return responseStatus(res, 500, "failed", "Error unsuspending teacher: " + error.message);
  }
};
