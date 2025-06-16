const {
  hashPassword,
  isPassMatched,
} = require("../../handlers/passHash.handler");
const Student = require("../../models/Students/students.model");
const Exam = require("../../models/Academic/exams.model");
const Results = require("../../models/Academic/results.model");
const generateToken = require("../../utils/tokenGenerator");
const responseStatus = require("../../handlers/responseStatus.handler");
const { resultCalculate } = require("../../functions/resultCalculate.function");
const AcademicYear = require("../../models/Academic/academicYear.model");
const { deleteFromCloudinary } = require("../../middlewares/fileUpload");
const generateStudentId = require("./generateStudentId"); // Adjust path as needed

/**
 * Admin registration service for creating a new student.
 * @param {Object} data - The data containing information about the new student.
 * @param {Object} file - The uploaded profile picture file (from Multer).
 * @param {string} adminId - The ID of the admin creating the student.
 * @param {Object} res - The Express response object.
 * @returns {Object} - The response object indicating success or failure.
 */
exports.adminRegisterStudentService = async (data, file, adminId, res) => {
  const {
    firstName,
    lastName,
    middleName,
    tribe,
    gender,
    religion,
    NIN,
    formalSchool,
    guardians,
    email,
    currentClassLevel,
    boardingStatus,
    boardingDetails,
    prefectName,
  } = data;

  // 1. Check if student already exists by email or NIN
  const studentExists = await Student.findOne({ $or: [{ email }, { NIN: NIN || null }] });
  if (studentExists) {
    return responseStatus(res, 409, "failed", "Student already enrolled");
  }

  // 2. Generate unique studentId
  let studentId;
  try {
    studentId = await generateStudentId(currentClassLevel?.section);
  } catch (error) {
    return responseStatus(res, 400, "failed", error.message);
  }

  // 3. Hash default password
  const hashedPassword = await hashPassword("123456789");

  // 4. Validate academic year
  const currentAcademicYear = await AcademicYear.findOne({ isCurrent: true });
  if (!currentAcademicYear) {
    return responseStatus(res, 400, "failed", "No current academic year set");
  }

  // 5. Validate guardians
  if (!guardians || !Array.isArray(guardians) || !guardians.length) {
    return responseStatus(res, 400, "failed", "At least one guardian is required");
  }
  for (const guardian of guardians) {
    if (!guardian.name || !guardian.relationship || !guardian.phone) {
      return responseStatus(res, 400, "failed", "Guardian must include name, relationship, and phone");
    }
  }

  // 6. Validate currentClassLevel
  if (
    !currentClassLevel?.section ||
    !currentClassLevel?.className ||
    !currentClassLevel?.subclass ||
    !/^[A-Z]$/.test(currentClassLevel.subclass)
  ) {
    return responseStatus(res, 400, "failed", "Invalid class level data: section, className, and valid subclass required");
  }

  // 7. Validate boarding details
  if (boardingStatus === "Boarder") {
    if (!boardingDetails?.hall || !boardingDetails?.roomNumber) {
      return responseStatus(res, 400, "failed", "Boarding details (hall and room number) required for boarders");
    }
  } else if (boardingStatus === "Day Student") {
    // Ensure boardingDetails is not provided for Day Students (schema pre-validate will clear it)
    if (boardingDetails) {
      return responseStatus(res, 400, "failed", "Boarding details should not be provided for Day Students");
    }
  }

  // 8. Handle profile picture
  let profilePictureUrl = "";
  if (file) {
    profilePictureUrl = file.path; // Cloudinary secure URL
  } else {
    return responseStatus(res, 400, "failed", "Profile picture is required");
  }

  // 9. Create student
  try {
    const newStudent = await Student.create({
      studentId,
      firstName,
      lastName,
      middleName,
      tribe,
      gender,
      religion,
      NIN,
      formalSchool,
      guardians,
      email,
      password: hashedPassword,
      profilePictureUrl,
      currentClassLevel: {
        section: currentClassLevel.section,
        className: currentClassLevel.className,
        subclass: currentClassLevel.subclass,
        academicYear: currentAcademicYear.name, // Store academic year name (e.g., "2024/2025")
      },
      boardingStatus,
      boardingDetails: boardingStatus === "Boarder" ? boardingDetails : undefined,
      prefectName,
      role: "student",
    });

    // 10. Add to academic year
    currentAcademicYear.students.push(newStudent._id);
    await currentAcademicYear.save();

    // 11. Populate examResults for response
    const populatedStudent = await Student.findById(newStudent._id)
      .select("-password")
      .populate("examResults");

    return responseStatus(res, 201, "success", populatedStudent);
  } catch (error) {
    if (file) {
      try {
        await deleteFromCloudinary(file.path);
      } catch (err) {
        console.error("Failed to delete uploaded file:", err.message);
      }
    }
    return responseStatus(res, 500, "failed", "Error creating student: " + error.message);
  }
};

/**
 * Student login service.
 * @param {Object} data - The data containing login credentials.
 * @param {Object} res - The Express response object.
 * @returns {Object} - The response object indicating success or failure.
 */
exports.studentLoginService = async (data, res) => {
  const { email, password } = data;

  try {
    // Find student with password
    const student = await Student.findOne({ email })
      .select("+password")
      .populate("examResults");
    if (!student) {
      return responseStatus(res, 401, "failed", "Invalid login credentials");
    }

    // Verify password
    const isMatched = await isPassMatched(password, student.password);
    if (!isMatched) {
      return responseStatus(res, 401, "failed", "Invalid login credentials");
    }

    // Remove password from response
    const studentObj = student.toObject();
    delete studentObj.password;

    const responseData = { student: studentObj, token: generateToken(student._id) };
    return responseStatus(res, 200, "success", responseData);
  } catch (error) {
    return responseStatus(res, 500, "failed", "Error logging in: " + error.message);
  }
};

/**
 * Get student profile service.
 * @param {string} id - The ID of the student.
 * @param {Object} res - The Express response object.
 * @returns {Object} - The response object indicating success or failure.
 */
exports.getStudentsProfileService = async (id, res) => {
  try {
    const student = await Student.findById(id)
      .select("-password -createdAt -updatedAt")
      .populate("examResults");
    if (!student) {
      return responseStatus(res, 404, "failed", "Student not found");
    }
    return responseStatus(res, 200, "success", student);
  } catch (error) {
    return responseStatus(res, 500, "failed", "Error fetching profile: " + error.message);
  }
};

/**
 * Get all students service (for admin use).
 * @param {Object} res - The Express response object.
 * @returns {Object} - The response object indicating success or failure.
 */
exports.getAllStudentsByAdminService = async (res) => {
  try {
    const students = await Student.find()
      .select("-password")
      .populate("examResults");
    return responseStatus(res, 200, "success", students);
  } catch (error) {
    return responseStatus(res, 500, "failed", "Error fetching students: " + error.message);
  }
};

/**
 * Get a single student by admin.
 * @param {string} studentId - The ID of the student.
 * @param {Object} res - The Express response object.
 * @returns {Object} - The response object indicating success or failure.
 */
exports.getStudentByAdminService = async (studentId, res) => {
  try {
    const student = await Student.findById(studentId)
      .select("-password")
      .populate("examResults");
    if (!student) {
      return responseStatus(res, 404, "failed", "Student not found");
    }
    return responseStatus(res, 200, "success", student);
  } catch (error) {
    return responseStatus(res, 500, "failed", "Error fetching student: " + error.message);
  }
};

/**
 * Student update profile service.
 * @param {Object} data - The data containing updated profile information.
 * @param {string} userId - The ID of the student.
 * @param {Object} res - The Express response object.
 * @returns {Object} - The response object indicating success or failure.
 */
exports.studentUpdateProfileService = async (data, file, userId, res) => {
  const { firstName, lastName, middleName, email, password, profilePictureUrl } = data;

  // Check if student exists
  const student = await Student.findById(userId);
  if (!student) {
    return responseStatus(res, 404, "failed", "Student not found");
  }

  // Check if email is taken by another student
  if (email && email !== student.email) {
    const emailExists = await Student.findOne({ email, _id: { $ne: userId } });
    if (emailExists) {
      return responseStatus(res, 409, "failed", "This email is taken");
    }
  }

  // Hash password if provided
  const hashedPassword = password ? await hashPassword(password) : undefined;

  // Handle profile picture upload
  let newProfilePictureUrl = student.profilePictureUrl;
  if (file) {
    if (newProfilePictureUrl) {
      try {
        await deleteFromCloudinary(newProfilePictureUrl);
      } catch (err) {
        console.error("Failed to delete old profile picture:", err.message);
      }
    }
    newProfilePictureUrl = file.path; // New Cloudinary secure URL
  }

  // Build update object
  const updateData = {
    firstName,
    lastName,
    middleName,
    email,
    profilePictureUrl: newProfilePictureUrl,
    ...(hashedPassword && { password: hashedPassword }),
  };

  // Remove undefined keys
  Object.keys(updateData).forEach(
    (key) => updateData[key] === undefined && delete updateData[key]
  );

  // Update student
  try {
    const updatedStudent = await Student.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    )
      .select("-password")
      .populate("examResults");

    return responseStatus(res, 200, "success", {
      student: updatedStudent,
      token: generateToken(updatedStudent._id),
    });
  } catch (error) {
    if (file) {
      try {
        await deleteFromCloudinary(file.path);
      } catch (err) {
        console.error("Failed to delete uploaded file:", err.message);
      }
    }
    return responseStatus(res, 500, "failed", "Error updating profile: " + error.message);
  }
};

/**
 * Admin update student service.
 * @param {Object} data - The data containing updated student information.
 * @param {Object} file - The uploaded profile picture file (from Multer).
 * @param {string} studentId - The ID of the student.
 * @param {Object} res - The Express response object.
 * @returns {Object} - The response object indicating success or failure.
 */
exports.adminUpdateStudentService = async (data, file, studentId, res) => {
  const {
    firstName,
    lastName,
    middleName,
    tribe,
    gender,
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
  if (!studentFound) {
    return responseStatus(res, 404, "failed", "Student not found");
  }

  // Check if email or NIN is taken by another student
  if (email && email !== studentFound.email) {
    const emailExists = await Student.findOne({ email, _id: { $ne: studentId } });
    if (emailExists) {
      return responseStatus(res, 409, "failed", "This email is taken");
    }
  }
  if (NIN && NIN !== studentFound.NIN) {
    const ninExists = await Student.findOne({ NIN, _id: { $ne: studentId } });
    if (ninExists) {
      return responseStatus(res, 409, "failed", "This NIN is taken");
    }
  }

  // Validate guardians if provided
  if (guardians) {
    try {
      const parsedGuardians = Array.isArray(guardians) ? guardians : JSON.parse(guardians);
      if (!parsedGuardians.length) {
        return responseStatus(res, 400, "failed", "At least one guardian is required");
      }
      for (const guardian of parsedGuardians) {
        if (!guardian.name || !guardian.relationship || !guardian.phone) {
          return responseStatus(res, 400, "failed", "Guardian must include name, relationship, and phone");
        }
      }
    } catch (error) {
      return responseStatus(res, 400, "failed", "Invalid guardians format");
    }
  }

  // Validate currentClassLevel if provided
  if (currentClassLevel) {
    try {
      const parsedClassLevel = typeof currentClassLevel === "string" ? JSON.parse(currentClassLevel) : currentClassLevel;
      if (
        !parsedClassLevel.section ||
        !parsedClassLevel.className ||
        !parsedClassLevel.subclass ||
        !/^[A-Z]$/.test(parsedClassLevel.subclass)
      ) {
        return responseStatus(res, 400, "failed", "Invalid class level data");
      }
    } catch (error) {
      return responseStatus(res, 400, "failed", "Invalid class level format");
    }
  }

  // Validate boardingDetails if provided
  if (boardingStatus === "Boarder") {
    if (!boardingDetails || !boardingDetails.hall || !boardingDetails.roomNumber) {
      return responseStatus(res, 400, "failed", "Boarding details (hall and room number) required for boarders");
    }
  } else if (boardingStatus === "Day Student" && boardingDetails) {
    return responseStatus(res, 400, "failed", "Boarding details should not be provided for Day Students");
  }

  // Find current academic year if updating class level
  let academicYearName = studentFound.currentClassLevel?.academicYear;
  if (currentClassLevel) {
    const currentAcademicYear = await AcademicYear.findOne({ isCurrent: true });
    if (!currentAcademicYear) {
      return responseStatus(res, 400, "failed", "No current academic year set");
    }
    academicYearName = currentAcademicYear.name;
  }

  // Handle profile picture upload
  let profilePictureUrl = studentFound.profilePictureUrl;
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
    tribe,
    gender,
    religion,
    NIN,
    formalSchool,
    guardians: guardians ? (Array.isArray(guardians) ? guardians : JSON.parse(guardians)) : undefined,
    email,
    currentClassLevel: currentClassLevel
      ? {
          section: currentClassLevel.section,
          className: currentClassLevel.className,
          subclass: currentClassLevel.subclass,
          academicYear: academicYearName,
        }
      : undefined,
    boardingStatus,
    boardingDetails: boardingStatus === "Boarder" ? boardingDetails : undefined,
    prefectName,
    isGraduated,
    isWithdrawn,
    isSuspended,
    yearGraduated,
    profilePictureUrl,
  };

  // Remove undefined keys
  Object.keys(updateData).forEach(
    (key) => updateData[key] === undefined && delete updateData[key]
  );

  // Update student
  try {
    const updatedStudent = await Student.findByIdAndUpdate(
      studentId,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .select("-password")
      .populate("examResults");

    return responseStatus(res, 200, "success", updatedStudent);
  } catch (error) {
    if (file) {
      try {
        await deleteFromCloudinary(file.path);
      } catch (err) {
        console.error("Failed to delete uploaded file:", err.message);
      }
    }
    return responseStatus(res, 500, "failed", "Error updating student: " + error.message);
  }
};

/**
 * Student write exam service.
 * @param {Object} data - The data containing answers to the exam.
 * @param {string} studentId - The ID of the student.
 * @param {string} examId - The ID of the exam.
 * @param {Object} res - The Express response object.
 * @returns {Object} - The response object indicating success or failure.
 */
exports.studentWriteExamService = async (data, studentId, examId, res) => {
  const { answers } = data;

  try {
    // Find the student
    const student = await Student.findById(studentId).populate("examResults");
    if (!student) {
      return responseStatus(res, 404, "failed", "Student not found");
    }

    // Find the exam
    const exam = await Exam.findById(examId);
    if (!exam) {
      return responseStatus(res, 404, "failed", "Exam not found");
    }

    // Check if student already took the exam
    const alreadyExamTaken = await Results.findOne({
      studentId: student._id,
      exam: examId,
    });
    if (alreadyExamTaken) {
      return responseStatus(res, 400, "failed", "Already written the exam");
    }

    // Check if suspended or withdrawn
    if (student.isSuspended || student.isWithdrawn) {
      return responseStatus(res, 403, "failed", "You are not eligible to attend this exam");
    }

    // Verify all questions are answered
    const questions = exam.questions || [];
    if (questions.length !== answers.length) {
      return responseStatus(res, 400, "failed", "You have not answered all the questions");
    }

    // Calculate result
    const result = await resultCalculate(questions, answers, exam);

    // Create result record
    const createResult = await Results.create({
      studentId: student._id,
      teacher: exam.createdBy,
      exam: exam._id,
      score: result.score,
      grade: result.grade,
      passMark: exam.passMark,
      status: result.status,
      remarks: result.remarks,
      answeredQuestions: result.answeredQuestions,
      classLevel: student.currentClassLevel,
      academicTerm: exam.academicTerm,
      academicYear: exam.academicYear,
    });

    // Push exam result ref to student
    student.examResults.push(createResult._id);
    await student.save();

    return responseStatus(res, 200, "success", "Answer submitted successfully");
  } catch (error) {
    return responseStatus(res, 500, "failed", "Error submitting exam: " + error.message);
  }
};