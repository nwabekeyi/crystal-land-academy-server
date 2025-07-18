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
const ClassLevel = require("../../models/Academic/class.model");
const { deleteFromCloudinary } = require("../../middlewares/fileUpload");
const generateStudentId = require("./generateStudentId"); // Adjust path as needed

/**
 * Admin registration service for creating a new student.
 * @param {Object} data - The data containing information about the new student.
 * @param {Object} file - The uploaded profile picture file (from Multer).
 * @param {Object} res - The Express response object.
 * @returns {void} - Sends HTTP response via responseStatus.
 */
exports.adminRegisterStudentService = async (data, file, res) => {
  try {
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

    // 1. Validate required fields
    if (!firstName || !lastName || !email || !gender || !boardingStatus || !currentClassLevel || !guardians) {
      return responseStatus(res, 400, "failed", "Missing required fields: firstName, lastName, email, gender, boardingStatus, currentClassLevel, or guardians");
    }

    // 2. Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return responseStatus(res, 400, "failed", "Invalid email format");
    }

    // 3. Check if student exists
    const studentExists = await Student.findOne({ $or: [{ email }, { NIN: NIN || null }] });
    if (studentExists) {
      return responseStatus(res, 409, "failed", "Student already enrolled");
    }

    // 4. Generate unique studentId
    let studentId;
    try {
      studentId = await generateStudentId(currentClassLevel?.section);
    } catch (error) {
      return responseStatus(res, 400, "failed", "Failed to generate student ID: " + error.message);
    }

    // 5. Hash default password
    const hashedPassword = await hashPassword("123456789");

    // 6. Validate academic year
    const currentAcademicYear = await AcademicYear.findOne({ isCurrent: true });
    if (!currentAcademicYear) {
      return responseStatus(res, 400, "failed", "No current academic year set");
    }

    // 7. Validate guardians
    let parsedGuardians;
    try {
      parsedGuardians = Array.isArray(guardians) ? guardians : JSON.parse(guardians);
      if (!parsedGuardians.length) {
        return responseStatus(res, 400, "failed", "At least one guardian is required");
      }
      for (const guardian of parsedGuardians) {
        if (!guardian.name || !guardian.relationship || !guardian.phone) {
          return responseStatus(res, 400, "failed", "Guardian must include name, relationship, and phone");
        }
      }
    } catch (error) {
      return responseStatus(res, 400, "failed", "Invalid guardians format: " + error.message);
    }

    // 8. Validate currentClassLevel
    // if (
    //   !currentClassLevel?.section ||
    //   !currentClassLevel?.classLevel ||
    //   !currentClassLevel?.subclass ||
    //   !/^[A-Z]$/.test(currentClassLevel.subclass)
    // ) {
    //   return responseStatus(res, 400, "failed", "Invalid class level data: section, classLevel (ObjectId), and valid subclass (A-Z) required");
    // }

    // 9. Validate classLevel ObjectId
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(currentClassLevel.classLevel);
    if (!isValidObjectId) {
      return responseStatus(res, 400, "failed", "Invalid classLevel ObjectId format");
    }

    // 10. Find or update ClassLevel
    let classLevel = await ClassLevel.findOne({
      _id: currentClassLevel.classLevel,
      section: currentClassLevel.section,
      academicYear: currentAcademicYear._id,
    });
    if (!classLevel) {
      return responseStatus(res, 404, "failed", "ClassLevel not found for the specified section, classLevel ObjectId, and academic year");
    }

    // 11. Ensure subclass exists, create if not
    let subclass = classLevel.subclasses.find((sub) => sub.letter === currentClassLevel.subclass);
    if (!subclass) {
      subclass = { letter: currentClassLevel.subclass, students: [], subjects: [], feesPerTerm: [] };
      classLevel.subclasses.push(subclass);
    }

    // 12. Validate boardingStatus and boardingDetails
    if (!["Boarder", "Day Student"].includes(boardingStatus)) {
      return responseStatus(res, 400, "failed", "Boarding status must be 'Boarder' or 'Day Student'");
    }
    if (boardingStatus === "Boarder") {
      if (!boardingDetails?.hall || !boardingDetails?.roomNumber) {
        return responseStatus(res, 400, "failed", "Boarding details (hall and room number) required for boarders");
      }
    } else if (boardingStatus === "Day Student" && boardingDetails) {
      return responseStatus(res, 400, "failed", "Boarding details should not be provided for Day Students");
    }

    // 13. Validate profile picture
    if (!file) {
      return responseStatus(res, 400, "failed", "Profile picture is required");
    }
    const profilePictureUrl = file.path; // Cloudinary secure URL

    // 14. Create student
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
      guardians: parsedGuardians,
      email,
      password: hashedPassword,
      profilePictureUrl,
      classLevelId: classLevel._id,
      currentClassLevel: {
        section: classLevel.section,
        className: classLevel.name,
        subclass: currentClassLevel.subclass,
        academicYear: {
          name: currentAcademicYear.name,
          academicYearId: currentAcademicYear._id,
        },
      },
      boardingStatus,
      boardingDetails: boardingStatus === "Boarder" ? boardingDetails : undefined,
      prefectName,
      role: "student",
    });

    // 15. Update ClassLevel
    if (!classLevel.students.some((id) => id.equals(newStudent._id))) {
      classLevel.students.push(newStudent._id);
    }
    if (!subclass.students.some((s) => s.id.equals(newStudent._id))) {
      subclass.students.push({ id: newStudent._id, amountPaid: 0 });
    }
    await classLevel.save();

    // 16. Update AcademicYear
    if (!currentAcademicYear.students.some((id) => id.equals(newStudent._id))) {
      currentAcademicYear.students.push(newStudent._id);
      await currentAcademicYear.save();
    }

    // 17. Return student without password
    const populatedStudent = await Student.findById(newStudent._id)
      .select("-password")
      .populate("classLevelId")
      .populate({
        path: "currentClassLevel.academicYear.academicYearId",
        select: "name _id",
      });
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
  let parsedGuardians;
  if (guardians) {
    try {
      parsedGuardians = Array.isArray(guardians) ? guardians : JSON.parse(guardians);
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
  let classLevelId;
  let currentClassLevelData;
  if (currentClassLevel) {
    try {
      const parsedClassLevel = typeof currentClassLevel === "string" ? JSON.parse(currentClassLevel) : currentClassLevel;
      // if (
      //   !parsedClassLevel.section ||
      //   !parsedClassLevel.className ||
      //   !parsedClassLevel.subclass ||
      //   !/^[A-Z]$/.test(parsedClassLevel.subclass)
      // ) {
      //   return responseStatus(res, 400, "failed", "Invalid class level data: section, className, and valid subclass (A-Z) required");
      // }

      // Find current academic year
      const currentAcademicYear = await AcademicYear.findOne({ isCurrent: true });
      if (!currentAcademicYear) {
        return responseStatus(res, 400, "failed", "No current academic year set");
      }

      // Find new ClassLevel
      const newClassLevel = await ClassLevel.findOne({
        section: parsedClassLevel.section,
        name: parsedClassLevel.className,
        academicYear: currentAcademicYear._id,
        "subclasses.letter": parsedClassLevel.subclass,
      });
      if (!newClassLevel) {
        return responseStatus(res, 404, "failed", "ClassLevel not found for the specified section, className, subclass, and academic year");
      }
      classLevelId = newClassLevel._id;
      currentClassLevelData = {
        section: newClassLevel.section,
        className: newClassLevel.name,
        subclass: parsedClassLevel.subclass,
        academicYear: {
          name: currentAcademicYear.name,
          academicYearId: currentAcademicYear._id,
        },
      };

      // Remove student from old ClassLevel if class level is changing
      if (
        studentFound.currentClassLevel.section !== parsedClassLevel.section ||
        studentFound.currentClassLevel.className !== parsedClassLevel.className ||
        studentFound.currentClassLevel.subclass !== parsedClassLevel.subclass ||
        studentFound.currentClassLevel.academicYear.academicYearId.toString() !== currentAcademicYear._id.toString()
      ) {
        const oldClassLevel = await ClassLevel.findById(studentFound.classLevelId);
        if (oldClassLevel) {
          oldClassLevel.students = oldClassLevel.students.filter((id) => !id.equals(studentId));
          await oldClassLevel.save();
        }

        // Add student to new ClassLevel
        if (!newClassLevel.students.includes(studentId)) {
          newClassLevel.students.push(studentId);
          await newClassLevel.save();
        }
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
    guardians: parsedGuardians,
    email,
    classLevelId: classLevelId || studentFound.classLevelId,
    currentClassLevel: currentClassLevelData || studentFound.currentClassLevel,
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
      .populate("classLevelId")
      .populate({
        path: "currentClassLevel.academicYear.academicYearId",
        select: "name _id",
      });

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
 * Student login service.
 * @param {Object} data - The data containing login credentials.
 * @param {Object} res - The Express response object.
 * @returns {Object} - The response object indicating success or failure.
 */
exports.studentLoginService = async (data, res) => {
  const { email, password } = data;

  try {
    // Find student with password
    const student = await Student.findOne({ email }).select("+password");
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

    // Set token to null if student is withdrawn, otherwise generate token
    const responseData = {
      student: studentObj,
      token: student.isWithdrawn ? null : generateToken(student._id),
    };

    if (student.isWithdrawn) {
      console.warn(`Student ${student.email} is withdrawn; returning null token`);
    }

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
      .populate("classLevelId")
      .populate({
        path: "currentClassLevel.academicYear.academicYearId",
        select: "name _id",
      });
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
/**
 * Get all students service (for admin use).
 * @param {Object} query - The query parameters for filtering students.
 * @param {Object} res - The Express response object.
 * @returns {Object} - The response object indicating success or failure.
 */
exports.getAllStudentsByAdminService = async (query, res) => {
  try {
    console.log('Raw Query Parameters:', query);
    const { page = 1, limit = 20, section, className, boardingStatus, isWithdrawn, isSuspended } = query;

    // Fetch class levels
    const classLevelQuery = {};
    if (section && ['Primary', 'Secondary'].includes(section)) {
      classLevelQuery.section = section;
    }
    const classLevels = await ClassLevel.find(classLevelQuery)
      .distinct('name')
      .lean()
      .then(names => names.sort());
    console.log('Class Levels:', classLevels);

    // Build student query
    const studentQuery = {
      isGraduated: false,
    };
    if (isWithdrawn !== undefined) {
      studentQuery.isWithdrawn = isWithdrawn === 'true';
    } else {
      studentQuery.isWithdrawn = false;
    }
    if (isSuspended !== undefined) {
      studentQuery.isSuspended = isSuspended === 'true';
    }
    if (section && ['Primary', 'Secondary'].includes(section)) {
      studentQuery['currentClassLevel.section'] = section;
    }
    if (className) {
      const normalizedClassName = className.trim();
      if (classLevels.includes(normalizedClassName)) {
        studentQuery['currentClassLevel.className'] = normalizedClassName;
      }
    }
    if (boardingStatus && ['Boarder', 'Day Student'].includes(boardingStatus)) {
      studentQuery.boardingStatus = boardingStatus;
    }

    console.log('Student Query:', studentQuery);

    // Fetch students with error handling for populate
    const students = await Student.find(studentQuery)
      .select('-password')
      .populate({
        path: 'classLevelId',
        select: 'name section',
        options: { strictPopulate: false } // Allow missing references
      })
      .populate({
        path: 'currentClassLevel.academicYear.academicYearId',
        select: 'name _id',
        options: { strictPopulate: false }
      })
      .skip((parseInt(page) - 1) * parseInt(limit)) // Adjust for 1-based page
      .limit(parseInt(limit))
      .lean();

    const total = await Student.countDocuments(studentQuery);

    // Map students with serial number
    const response = {
      status: 'success',
      classLevels,
      data: students.map((student, index) => ({
        ...student,
        sn: index + 1 + (parseInt(page) - 1) * parseInt(limit),
        _id: student._id.toString(),
      })),
      total,
      page: parseInt(page),
      limit: parseInt(limit),
    };

    return response;
  } catch (error) {
    console.error('Error in getAllStudentsByAdminService:', error);
    return responseStatus(res, 500, 'failed', 'Error fetching data: ' + error.message);
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
  let parsedGuardians;
  if (guardians) {
    try {
      parsedGuardians = Array.isArray(guardians) ? guardians : JSON.parse(guardians);
      if (!parsedGuardians.length) {
        return responseStatus(res, 400, "failed", "At least one guardian is required");
      }
      for (const guardian of parsedGuardians) {
        if (!guardian.name || !guardian.relationship || !guardian.phone) {
          return responseStatus(res, 400, "failed", "Guardian must include name, relationship, and phone");
        }
      }
    } catch (error) {
      return responseStatus(res, 400, "failed", "Invalid guardians format: " + error.message);
    }
  }

  // Validate currentClassLevel if provided
  let classLevelId;
  let currentClassLevelData;
  if (currentClassLevel) {
    try {
      const parsedClassLevel = typeof currentClassLevel === "string" ? JSON.parse(currentClassLevel) : currentClassLevel;
      if (
        !parsedClassLevel.section ||
        !parsedClassLevel.classLevel ||
        !parsedClassLevel.subclass ||
        !/^[A-Z]$/.test(parsedClassLevel.subclass)
      ) {
        return responseStatus(res, 400, "failed", "Invalid class level data: section, classLevel, and valid subclass (A-Z) required");
      }

      // Find current academic year
      const currentAcademicYear = await AcademicYear.findOne({ isCurrent: true });
      if (!currentAcademicYear) {
        return responseStatus(res, 400, "failed", "No current academic year set");
      }

      // Find new ClassLevel
      const newClassLevel = await ClassLevel.findOne({
        section: parsedClassLevel.section,
        name: parsedClassLevel.classLevel,
        academicYear: currentAcademicYear._id,
        "subclasses.letter": parsedClassLevel.subclass,
      });
      if (!newClassLevel) {
        return responseStatus(res, 404, "failed", "ClassLevel not found for the specified section, classLevel, subclass, and academic year");
      }
      classLevelId = newClassLevel._id;
      currentClassLevelData = {
        section: newClassLevel.section,
        className: newClassLevel.name,
        subclass: parsedClassLevel.subclass,
        academicYear: {
          name: currentAcademicYear.name,
          academicYearId: currentAcademicYear._id,
        },
      };

      // Update ClassLevel and subclass if class level or subclass is changing
      if (
        studentFound.currentClassLevel.section !== parsedClassLevel.section ||
        studentFound.currentClassLevel.className !== parsedClassLevel.classLevel ||
        studentFound.currentClassLevel.subclass !== parsedClassLevel.subclass ||
        studentFound.currentClassLevel.academicYear.academicYearId.toString() !== currentAcademicYear._id.toString()
      ) {
        // Remove from old ClassLevel and subclass
        const oldClassLevel = await ClassLevel.findById(studentFound.classLevelId);
        if (oldClassLevel) {
          oldClassLevel.students = oldClassLevel.students.filter((id) => !id.equals(studentId));
          const oldSubclass = oldClassLevel.subclasses.find(
            (sub) => sub.letter === studentFound.currentClassLevel.subclass
          );
          if (oldSubclass) {
            oldSubclass.students = oldSubclass.students.filter((id) => !id.equals(studentId));
          }
          await oldClassLevel.save();
        }

        // Add to new ClassLevel and subclass
        if (!newClassLevel.students.includes(studentId)) {
          newClassLevel.students.push(studentId);
        }
        const newSubclass = newClassLevel.subclasses.find((sub) => sub.letter === parsedClassLevel.subclass);
        if (newSubclass) {
          newSubclass.students = newSubclass.students || [];
          if (!newSubclass.students.includes(studentId)) {
            newSubclass.students.push(studentId);
          }
        } else {
          return responseStatus(res, 500, "failed", "Subclass not found in new ClassLevel");
        }
        await newClassLevel.save();
      }
    } catch (error) {
      return responseStatus(res, 400, "failed", "Invalid class level format: " + error.message);
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
    guardians: parsedGuardians,
    email,
    classLevelId: classLevelId || studentFound.classLevelId,
    currentClassLevel: currentClassLevelData || studentFound.currentClassLevel,
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
      .populate("classLevelId")
      .populate({
        path: "currentClassLevel.academicYear.academicYearId",
        select: "name _id",
      });

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
    const student = await Student.findById(studentId);
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
    await Results.create({
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

    return responseStatus(res, 200, "success", "Answer submitted successfully");
  } catch (error) {
    return responseStatus(res, 500, "failed", "Error submitting exam: " + error.message);
  }
};


/**
 * Admin withdraw student service.
 * @param {string} studentId - The ID of the student to withdraw.
 * @param {Object} res - The Express response object.
 * @returns {Object} - The response object indicating success or failure.
 */
exports.adminDeleteStudentService = async (studentId, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    // Find the student
    const student = await Student.findById(studentId).session(session);
    if (!student) {
      await session.abortTransaction();
      session.endSession();
      return responseStatus(res, 404, "failed", "Student not found");
    }

    // Store profile picture URL for deletion
    const profilePictureUrl = student.profilePictureUrl;

    // Remove student from ClassLevel
    let classLevel = null;
    if (student.classLevelId) {
      classLevel = await ClassLevel.findById(student.classLevelId).session(session);
      if (classLevel) {
        classLevel.students = classLevel.students.filter(
          (id) => !id.equals(studentId)
        );
        const subclass = classLevel.subclasses.find(
          (sub) => sub.letter === student.currentClassLevel.subclass
        );
        if (subclass) {
          subclass.students = subclass.students.filter(
            (s) => !s.id.equals(studentId)
          );
        }
        await classLevel.save({ session });
      }
    }

    // Remove student from AcademicYear
    let currentAcademicYear = null;
    const academicYear = await AcademicYear.findOne({ isCurrent: true }).session(session);
    if (academicYear) {
      currentAcademicYear = academicYear;
      currentAcademicYear.students = currentAcademicYear.students.filter(
        (id) => !id.equals(studentId)
      );
      await currentAcademicYear.save({ session });
    }

    // Delete associated exam results
    await Results.deleteMany({ studentId }).session(session);

    // Delete profile picture from Cloudinary if it exists
    if (profilePictureUrl) {
      try {
        await deleteFromCloudinary(profilePictureUrl);
      } catch (err) {
        console.error("Failed to delete profile picture from Cloudinary:", err.message);
        // Continue to avoid blocking deletion
      }
    }

    // Delete the student
    await Student.findByIdAndDelete(studentId).session(session);

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    return responseStatus(res, 200, "success", {
      message: "Student deleted successfully",
      studentId,
    });
  } catch (error) {
    // Rollback transaction
    await session.abortTransaction();
    session.endSession();

    return responseStatus(res, 500, "failed", "Error deleting student: " + error.message);
  }
};


/**
 * Admin delete student service.
 * @param {string} studentId - The ID of the student to delete.
 * @param {Object} res - The Express response object.
 * @returns {Object} - The response object indicating success or failure.
 */
exports.adminDeleteStudentService = async (studentId, res) => {
  let originalClassLevel = null;
  let originalAcademicYear = null;

  try {
    // 1. Find the student
    const student = await Student.findById(studentId);
    if (!student) {
      return responseStatus(res, 404, "failed", "Student not found");
    }

    const profilePictureUrl = student.profilePictureUrl;

    // 2. Backup and update ClassLevel
    const classLevel = await ClassLevel.findById(student.classLevelId);
    if (classLevel) {
      originalClassLevel = {
        _id: classLevel._id,
        students: [...classLevel.students],
        subclasses: classLevel.subclasses.map((s) => ({
          letter: s.letter,
          students: [...s.students],
        })),
      };

      classLevel.students = classLevel.students.filter(
        (id) => !id.equals(studentId)
      );

      const subclass = classLevel.subclasses.find(
        (sub) => sub.letter === student.currentClassLevel.subclass
      );
      if (subclass) {
        subclass.students = subclass.students.filter(
          (id) => !id.equals(studentId)
        );
      }

      await classLevel.save();
    }

    // 3. Backup and update AcademicYear
    const academicYear = await AcademicYear.findOne({ isCurrent: true });
    if (academicYear) {
      originalAcademicYear = {
        _id: academicYear._id,
        students: [...academicYear.students],
      };

      academicYear.students = academicYear.students.filter(
        (id) => !id.equals(studentId)
      );

      await academicYear.save();
    }

    // 4. Delete exam results
    await Results.deleteMany({ studentId });

    // 5. Delete Cloudinary picture (non-blocking)
    if (profilePictureUrl) {
      try {
        await deleteFromCloudinary(profilePictureUrl);
      } catch (err) {
        console.warn("Failed to delete profile picture from Cloudinary:", err.message);
      }
    }

    // 6. Delete student
    await Student.findByIdAndDelete(studentId);

    return responseStatus(res, 200, "success", {
      message: "Student deleted successfully",
      studentId,
    });

  } catch (error) {
    console.error("Deletion failed:", error.message);

    // ✅ Rollback Logic
    try {
      // Restore ClassLevel
      if (originalClassLevel) {
        const classLevel = await ClassLevel.findById(originalClassLevel._id);
        if (classLevel) {
          classLevel.students = originalClassLevel.students;

          for (let sub of classLevel.subclasses) {
            const originalSub = originalClassLevel.subclasses.find(
              (s) => s.letter === sub.letter
            );
            if (originalSub) {
              sub.students = originalSub.students;
            }
          }

          await classLevel.save();
        }
      }

      // Restore AcademicYear
      if (originalAcademicYear) {
        await AcademicYear.findByIdAndUpdate(originalAcademicYear._id, {
          $set: { students: originalAcademicYear.students },
        });
      }

    } catch (rollbackError) {
      console.error("Rollback failed:", rollbackError.message);
    }

    return responseStatus(res, 500, "failed", "Error deleting student: " + error.message);
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
      .populate("subject")
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
 * Admin withdraw teacher service.
 * @param {string} teacherId - The ID of the teacher to withdraw.
 * @param {Object} res - The Express response object.
 * @returns {void} - Sends HTTP response via responseStatus.
 */
exports.adminWithdrawStudentService = async (teacherId, res) => {
  try {
    const student = await Student.findById(teacherId);
    if (!student) {
      return responseStatus(res, 404, "failed", "Teacher not found");
    }

    if (student.isWithdrawn) {
      return responseStatus(res, 400, "failed", "Teacher is already withdrawn");
    }

    if (student.isSuspended) {
      return responseStatus(res, 400, "failed", "Cannot withdraw a suspended teacher");
    }

    student.isWithdrawn = true;
    await student.save();

    const formattedStudent = await Student.findById(teacherId)
      .select("-password")
      .lean();

    return responseStatus(res, 200, "success", {
      message: "Teacher withdrawn successfully",
      student: formattedStudent,
    });
  } catch (error) {
    return responseStatus(res, 500, "failed", "Error withdrawing teacher: " + error.message);
  }
};


/**
 * Admin suspend student service.
 * @param {string} studentId - The ID of the student to suspend.
 * @param {Object} res - The Express response object.
 * @returns {void} - Sends HTTP response via responseStatus.
 */
exports.adminSuspendStudentService = async (studentId, res) => {
  try {
    const student = await Student.findById(studentId);
    if (!student) {
      return responseStatus(res, 404, "failed", "Student not found");
    }

    if (student.isSuspended) {
      return responseStatus(res, 400, "failed", "Student is already suspended");
    }

    if (student.isWithdrawn) {
      return responseStatus(res, 400, "failed", "Cannot suspend a withdrawn student");
    }

    student.isSuspended = true;
    await student.save();

    const formattedStudent = await Student.findById(studentId)
      .select("-password")
      .lean();

    return responseStatus(res, 200, "success", {
      message: "Student suspended successfully",
      student: formattedStudent,
    });
  } catch (error) {
    return responseStatus(res, 500, "failed", "Error suspending student: " + error.message);
  }
};


/**
 * Admin unsuspend student service.
 * @param {string} studentId - The ID of the student to unsuspend.
 * @param {Object} res - The Express response object.
 * @returns {void} - Sends HTTP response via responseStatus.
 */
exports.adminUnsuspendStudentService = async (studentId, res) => {
  try {
    // Find the student
    const student = await Student.findById(studentId);
    if (!student) {
      return responseStatus(res, 404, "failed", "Student not found");
    }

    // Check if student is withdrawn
    if (student.isWithdrawn) {
      return responseStatus(res, 400, "failed", "Cannot unsuspend a withdrawn student");
    }

    // Check if student is already unsuspended
    if (!student.isSuspended) {
      return responseStatus(res, 400, "failed", "Student is not suspended");
    }

    // Unsuspend the student
    student.isSuspended = false;
    await student.save();

    // Fetch updated student data without password
    const formattedStudent = await Student.findById(studentId)
      .select("-password")
      .populate("classLevelId")
      .populate({
        path: "currentClassLevel.academicYear.academicYearId",
        select: "name _id",
      })
      .lean();

    return responseStatus(res, 200, "success", {
      message: "Student unsuspended successfully",
      student: formattedStudent,
    });
  } catch (error) {
    return responseStatus(res, 500, "failed", "Error unsuspending student: " + error.message);
  }
};