const mongoose = require("mongoose");
const ClassLevel = require("../../models/Academic/class.model");
const Teacher = require("../../models/Staff/teachers.model");
const Subject = require("../../models/Academic/subject.model");
const responseStatus = require("../../handlers/responseStatus.handler");

/**
 * Create a new ClassLevel.
 * @param {Object} data - Class data including section, name, description, academicYear, subclasses, etc.
 * @param {string} userId - The ID of the admin creating the class.
 * @param {Object} res - The response object.
 * @returns {Object} - Response status.
 */
exports.createClassLevelService = async (data, userId, res) => {
  const { section, name, description, academicYear, subclasses = [], teachers = [] } = data;
  try {
    // Validate userId
    if (!mongoose.isValidObjectId(userId)) {
      return responseStatus(res, 400, "failed", `Invalid user ID: ${userId}`);
    }

    // Validate academicYear
    if (!mongoose.isValidObjectId(academicYear)) {
      return responseStatus(res, 400, "failed", `Invalid academic year ID: ${academicYear}`);
    }
    const academicYearExists = await mongoose.model("AcademicYear").findById(academicYear);
    if (!academicYearExists) {
      return responseStatus(res, 400, "failed", "Academic year does not exist");
    }

    // Check for duplicate class
    const existing = await ClassLevel.findOne({ section, name, academicYear });
    if (existing) {
      return responseStatus(res, 400, "failed", "Class already exists for this academic year");
    }

    // Sanitize and validate teachers array
    let sanitizedTeachers = [];
    if (teachers.length > 0) {
      const teacherIds = teachers.map((t) => {
        if (!t.teacherId || !mongoose.isValidObjectId(t.teacherId)) {
          throw new Error(`Invalid teacher ID: ${t.teacherId || "undefined"}`);
        }
        return t.teacherId.toString();
      });
      const validTeachers = await Teacher.find({ _id: { $in: teacherIds } });
      if (validTeachers.length !== teacherIds.length) {
        return responseStatus(res, 400, "failed", "One or more teacher IDs are invalid");
      }
      sanitizedTeachers = teachers.map((t) => {
        const teacherDoc = validTeachers.find((td) => td._id.toString() === t.teacherId.toString());
        if (!teacherDoc || t.firstName !== teacherDoc.firstName || t.lastName !== teacherDoc.lastName) {
          throw new Error(`Teacher data mismatch for ID ${t.teacherId}`);
        }
        return {
          teacherId: t.teacherId,
          firstName: t.firstName,
          lastName: t.lastName,
        };
      });
    }

    // Validate subclasses
    if (subclasses.length > 0) {
      const letters = subclasses.map((sub) => sub.letter);
      if (new Set(letters).size !== letters.length) {
        return responseStatus(res, 400, "failed", "Subclass letters must be unique");
      }

      const isSeniorSecondary = ["SS 1", "SS 2", "SS 3"].includes(name);
      for (const sub of subclasses) {
        if (!isSeniorSecondary && sub.subjects && sub.subjects.length > 0) {
          return responseStatus(res, 400, "failed", `Subjects not allowed for non-SS class: ${name}`);
        }
        if (sub.subjects && sub.subjects.length > 0) {
          for (const subject of sub.subjects) {
            if (!mongoose.isValidObjectId(subject.subject)) {
              return responseStatus(res, 400, "failed", `Invalid subject ID ${subject.subject} in subclass ${sub.letter}`);
            }
            if (subject.teachers && subject.teachers.length > 0) {
              for (const teacherId of subject.teachers) {
                if (!mongoose.isValidObjectId(teacherId)) {
                  return responseStatus(res, 400, "failed", `Invalid teacher ID ${teacherId} in subclass ${sub.letter} for subject ${subject.subject}`);
                }
              }
            }
          }
        }
        if (sub.students && sub.students.length > 0) {
          for (const student of sub.students) {
            if (!mongoose.isValidObjectId(student.id)) {
              return responseStatus(res, 400, "failed", `Invalid student ID ${student.id} in subclass ${sub.letter}`);
            }
          }
        }
        if (sub.feesPerTerm && sub.feesPerTerm.length > 0) {
          const terms = sub.feesPerTerm.map((fee) => fee.termName);
          if (new Set(terms).size !== terms.length) {
            return responseStatus(res, 400, "failed", `Duplicate fee terms in subclass ${sub.letter}`);
          }
          for (const fee of sub.feesPerTerm) {
            if (!["1st Term", "2nd Term", "3rd Term"].includes(fee.termName)) {
              return responseStatus(res, 400, "failed", `Invalid term name: ${fee.termName} in subclass ${sub.letter}`);
            }
            if (fee.amount < 0) {
              return responseStatus(res, 400, "failed", `Fee amount must be non-negative in subclass ${sub.letter}`);
            }
            if (fee.student && fee.student.length > 0) {
              for (const studentId of fee.student) {
                if (!mongoose.isValidObjectId(studentId)) {
                  return responseStatus(res, 400, "failed", `Invalid student ID ${studentId} in feesPerTerm for subclass ${sub.letter}`);
                }
              }
            }
          }
        }
      }
    }

    const classLevel = await ClassLevel.create({
      section,
      name,
      description,
      academicYear,
      createdBy: userId,
      subclasses,
      teachers: sanitizedTeachers,
    });

    // Update teachers' teachingAssignments
    if (sanitizedTeachers.length > 0) {
      const subclassLetters = subclasses.map((sub) => sub.letter);
      await Teacher.updateMany(
        { _id: { $in: sanitizedTeachers.map((t) => t.teacherId) } },
        {
          $addToSet: {
            teachingAssignments: {
              section,
              className: name,
              subclasses: subclassLetters,
            },
          },
        }
      );
    }

    const populatedClass = await ClassLevel.findById(classLevel._id).populate(
      "createdBy academicYear teachers students subclasses.subjects"
    );

    return responseStatus(res, 201, "success", populatedClass);
  } catch (error) {
    console.error("Create ClassLevel Error:", error.message, error.stack);
    return responseStatus(res, 500, "error", `An error occurred while creating the class: ${error.message}`);
  }
};

/**
 * Get all ClassLevels.
 * @param {Object} query - Query parameters for filtering and pagination.
 * @param {Object} res - The response object.
 */
exports.getAllClassesService = async (query, res) => {
  try {
    const { page = 1, limit = 10, section, classLevels } = query;
    const pageNum = parseInt(page, 10) > 0 ? parseInt(page, 10) : 1;
    const limitNum = parseInt(limit, 10) > 0 ? parseInt(limit, 10) : 10;
    const skip = (pageNum - 1) * limitNum;

    const filter = {};
    if (section) filter.section = section;
    if (classLevels) {
      const levels = Array.isArray(classLevels)
        ? classLevels
        : classLevels.split(",").map((level) => level.trim());
      if (levels.length > 0) filter.name = { $in: levels };
    }

    const classes = await ClassLevel.find(filter)
      .skip(skip)
      .limit(limitNum);

    const total = await ClassLevel.countDocuments(filter);

    const result = {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
      data: classes,
    };

    return responseStatus(res, 200, "success", result);
  } catch (error) {
    console.error("Fetch All Classes Error:", error.message, error.stack);
    return responseStatus(res, 500, "error", `An error occurred while fetching classes: ${error.message}`);
  }
};

/**
 * Get a single ClassLevel by ID.
 * @param {string} id - ClassLevel ID.
 * @param {Object} res - The response object.
 */
exports.getClassLevelsService = async (id, res) => {
  try {
    if (!mongoose.isValidObjectId(id)) {
      return responseStatus(res, 400, "failed", `Invalid class ID: ${id}`);
    }
    const classLevel = await ClassLevel.findById(id).populate(
      "createdBy academicYear teachers students subclasses.subjects"
    );
    if (!classLevel) {
      return responseStatus(res, 404, "failed", "Class not found");
    }
    return responseStatus(res, 200, "success", classLevel);
  } catch (error) {
    console.error("Get ClassLevel Error:", error.message, error.stack);
    return responseStatus(res, 500, "error", `An error occurred while fetching the class: ${error.message}`);
  }
};

/**
 * Update a ClassLevel.
 * @param {Object} data - Class data to update.
 * @param {string} id - ClassLevel ID.
 * @param {string} userId - Admin ID performing the update.
 * @param {Object} res - The response object.
 */
exports.updateClassLevelService = async (data, id, userId, res) => {
  const { section, name, description, academicYear, subclasses = [], teachers = [] } = data;

  try {
    if (!mongoose.isValidObjectId(id)) {
      return responseStatus(res, 400, "failed", `Invalid class ID: ${id}`);
    }
    if (!mongoose.isValidObjectId(userId)) {
      return responseStatus(res, 400, "failed", `Invalid user ID: ${userId}`);
    }
    if (!mongoose.isValidObjectId(academicYear)) {
      return responseStatus(res, 400, "failed", `Invalid academic year ID: ${academicYear}`);
    }
    const academicYearExists = await mongoose.model("AcademicYear").findById(academicYear);
    if (!academicYearExists) {
      return responseStatus(res, 400, "failed", "Academic year does not exist");
    }

    const classFound = await ClassLevel.findOne({
      _id: { $ne: id },
      section,
      name,
      academicYear,
    });
    if (classFound) {
      return responseStatus(res, 400, "failed", "Another class with same name already exists");
    }

    // Sanitize and validate teachers array
    let sanitizedTeachers = [];
    if (teachers.length > 0) {
      const teacherIds = teachers.map((t) => {
        if (!t.teacherId || !mongoose.isValidObjectId(t.teacherId)) {
          throw new Error(`Invalid teacher ID: ${t.teacherId || "undefined"}`);
        }
        return t.teacherId.toString();
      });
      const validTeachers = await Teacher.find({ _id: { $in: teacherIds } });
      if (validTeachers.length !== teacherIds.length) {
        return responseStatus(res, 400, "failed", "One or more teacher IDs are invalid");
      }
      sanitizedTeachers = teachers.map((t) => {
        const teacherDoc = validTeachers.find((td) => td._id.toString() === t.teacherId.toString());
        if (!teacherDoc || t.firstName !== teacherDoc.firstName || t.lastName !== teacherDoc.lastName) {
          throw new Error(`Teacher data mismatch for ID ${t.teacherId}`);
        }
        return {
          teacherId: t.teacherId,
          firstName: t.firstName,
          lastName: t.lastName,
        };
      });
    }

    // Validate subclasses
    if (subclasses.length > 0) {
      const letters = subclasses.map((sub) => sub.letter);
      if (new Set(letters).size !== letters.length) {
        return responseStatus(res, 400, "failed", "Subclass letters must be unique");
      }

      const isSeniorSecondary = ["SS 1", "SS 2", "SS 3"].includes(name);
      for (const sub of subclasses) {
        if (!isSeniorSecondary && sub.subjects && sub.subjects.length > 0) {
          return responseStatus(res, 400, "failed", `Subjects not allowed for non-SS class: ${name}`);
        }
        if (sub.subjects && sub.subjects.length > 0) {
          for (const subject of sub.subjects) {
            if (!mongoose.isValidObjectId(subject.subject)) {
              return responseStatus(res, 400, "failed", `Invalid subject ID ${subject.subject} in subclass ${sub.letter}`);
            }
            if (subject.teachers && subject.teachers.length > 0) {
              for (const teacherId of subject.teachers) {
                if (!mongoose.isValidObjectId(teacherId)) {
                  return responseStatus(res, 400, "failed", `Invalid teacher ID ${teacherId} in subclass ${sub.letter} for subject ${subject.subject}`);
                }
              }
            }
          }
        }
        if (sub.students && sub.students.length > 0) {
          for (const student of sub.students) {
            if (!mongoose.isValidObjectId(student.id)) {
              return responseStatus(res, 400, "failed", `Invalid student ID ${student.id} in subclass ${sub.letter}`);
            }
          }
        }
        if (sub.feesPerTerm && sub.feesPerTerm.length > 0) {
          const terms = sub.feesPerTerm.map((fee) => fee.termName);
          if (new Set(terms).size !== terms.length) {
            return responseStatus(res, 400, "failed", `Duplicate fee terms in subclass ${sub.letter}`);
          }
          for (const fee of sub.feesPerTerm) {
            if (!["1st Term", "2nd Term", "3rd Term"].includes(fee.termName)) {
              return responseStatus(res, 400, "failed", `Invalid term name: ${fee.termName} in subclass ${sub.letter}`);
            }
            if (fee.amount < 0) {
              return responseStatus(res, 400, "failed", `Fee amount must be non-negative in subclass ${sub.letter}`);
            }
            if (fee.student && fee.student.length > 0) {
              for (const studentId of fee.student) {
                if (!mongoose.isValidObjectId(studentId)) {
                  return responseStatus(res, 400, "failed", `Invalid student ID ${studentId} in feesPerTerm for subclass ${sub.letter}`);
                }
              }
            }
          }
        }
      }
    }

    const existingClass = await ClassLevel.findById(id);
    if (!existingClass) {
      return responseStatus(res, 404, "failed", "Class not found");
    }

    const updated = await ClassLevel.findByIdAndUpdate(
      id,
      {
        section,
        name,
        description,
        academicYear,
        subclasses,
        teachers: sanitizedTeachers,
        createdBy: userId,
      },
      { new: true, runValidators: true }
    ).populate("createdBy academicYear teachers students subclasses.subjects");

    if (!updated) {
      return responseStatus(res, 404, "failed", "Class not found");
    }

    const subclassLetters = subclasses.map((sub) => sub.letter);
    const newAssignment = { section, className: name, subclasses: subclassLetters };

    const removedTeachers = existingClass.teachers
      .map((t) => t.teacherId.toString())
      .filter((teacherId) => !sanitizedTeachers.some((t) => t.teacherId.toString() === teacherId));
    if (removedTeachers.length > 0) {
      await Teacher.updateMany(
        { _id: { $in: removedTeachers } },
        {
          $pull: {
            teachingAssignments: {
              section: existingClass.section,
              className: existingClass.name,
            },
          },
        }
      );
    }

    if (sanitizedTeachers.length > 0) {
      await Teacher.updateMany(
        { _id: { $in: sanitizedTeachers.map((t) => t.teacherId) } },
        {
          $pull: {
            teachingAssignments: {
              section: existingClass.section,
              className: existingClass.name,
            },
          },
        }
      );
      await Teacher.updateMany(
        { _id: { $in: sanitizedTeachers.map((t) => t.teacherId) } },
        {
          $addToSet: {
            teachingAssignments: newAssignment,
          },
        }
      );
    }

    return responseStatus(res, 200, "success", updated);
  } catch (error) {
    console.error("Update ClassLevel Error:", error.message, error.stack);
    return responseStatus(res, 500, "error", `An error occurred while updating the class: ${error.message}`);
  }
};

/**
 * Delete a ClassLevel.
 * @param {string} id - ClassLevel ID.
 * @param {Object} res - The response object.
 */
exports.deleteClassLevelService = async (id, res) => {
  try {
    if (!mongoose.isValidObjectId(id)) {
      return responseStatus(res, 400, "failed", `Invalid class ID: ${id}`);
    }
    const classLevel = await ClassLevel.findById(id);
    if (!classLevel) {
      return responseStatus(res, 404, "failed", "Class not found");
    }

    if (classLevel.teachers.length > 0) {
      await Teacher.updateMany(
        { _id: { $in: classLevel.teachers.map((t) => t.teacherId) } },
        {
          $pull: {
            teachingAssignments: {
              section: classLevel.section,
              className: classLevel.name,
            },
          },
        }
      );
    }

    const deleted = await ClassLevel.findByIdAndDelete(id);
    if (!deleted) {
      return responseStatus(res, 404, "failed", "Class not found");
    }

    return responseStatus(res, 200, "success", "Class deleted successfully");
  } catch (error) {
    console.error("Delete ClassLevel Error:", error.message, error.stack);
    return responseStatus(res, 500, "error", `An error occurred while deleting the class: ${error.message}`);
  }
};

/**
 * Get class data for sign-up purposes, including sections, class names, and subclass letters.
 * @param {Object} res - The response object.
 * @returns {Object} - Response with sections, class names, and subclass letters.
 */
exports.signUpClassDataService = async (res) => {
  try {
    const classLevels = await ClassLevel.find()
      .select("section name subclasses.letter subclasses.subjects _id")
      .populate({
        path: "subclasses.subjects.subject",
        select: "_id name",
      });

    if (!classLevels || classLevels.length === 0) {
      return responseStatus(res, 404, "failed", "No class levels found");
    }

    const sections = [...new Set(classLevels.map((cl) => cl.section))];
    const classData = sections.map((section) => {
      const classNames = classLevels
        .filter((cl) => cl.section === section)
        .map((cl) => ({
          classLevel: cl._id.toString(),
          name: cl.name,
          subclasses: cl.subclasses.map((sub) => ({
            letter: sub.letter,
            subjects: sub.subjects.map((subject) => ({
              _id: subject.subject._id,
              name: subject.subject.name,
            })),
          })),
        }));
      return {
        section,
        classNames,
      };
    });

    return responseStatus(res, 200, "success", classData);
  } catch (error) {
    console.error("Fetch SignUp Class Data Error:", error.message, error.stack);
    return responseStatus(res, 500, "error", `An error occurred while fetching class data for sign-up: ${error.message}`);
  }
};

/**
 * Get Class Levels and Subclasses for a Teacher
 * @param {string} teacherId - Teacher ID.
 * @param {Object} res - The response object.
 */
exports.getClassLevelsAndSubclassesForTeacherService = async (teacherId, res) => {
  try {
    if (!mongoose.isValidObjectId(teacherId)) {
      return responseStatus(res, 400, "failed", `Invalid teacher ID: ${teacherId}`);
    }
    const teacher = await Teacher.findById(teacherId).select("teachingAssignments");
    if (!teacher) {
      return responseStatus(res, 404, "failed", "Teacher not found");
    }

    const classLevels = await ClassLevel.find({
      "teachers.teacherId": teacherId,
    }).select("section name subclasses.letter _id");

    return responseStatus(res, 200, "success", {
      teacherId,
      teachingAssignments: teacher.teachingAssignments,
      assignedClasses: classLevels,
    });
  } catch (error) {
    console.error("Get Class Levels for Teacher Error:", error.message, error.stack);
    return responseStatus(res, 500, "error", `An error occurred while fetching class levels for teacher: ${error.message}`);
  }
};


/**
 * Assign teachers to a ClassLevel and its subclasses.
 * @param {Object} data - Data including classId, teacherIds, and optional subclasses.
 * @param {string} userId - Admin ID performing the assignment.
 * @param {Object} res - The response object.
 * @returns {Object} - Response status.
 */
exports.assignTeachersToClassService = async (data, userId, res) => {
  const { classId, teacherIds = [], subclasses = [] } = data;

  try {
    if (!mongoose.isValidObjectId(classId)) {
      return responseStatus(res, 400, "failed", `Invalid class ID: ${classId}`);
    }
    if (!mongoose.isValidObjectId(userId)) {
      return responseStatus(res, 400, "failed", `Invalid user ID: ${userId}`);
    }

    // Validate classId
    const classLevel = await ClassLevel.findById(classId);
    if (!classLevel) {
      return responseStatus(res, 404, "failed", "Class not found");
    }

    // Validate teacherIds
    let sanitizedTeachers = [];
    if (teacherIds.length > 0) {
      const teacherObjectIds = teacherIds.map((t) => {
        if (!t.teacherId || !mongoose.isValidObjectId(t.teacherId)) {
          throw new Error(`Invalid teacher ID: ${t.teacherId || "undefined"}`);
        }
        return t.teacherId.toString();
      });
      const validTeachers = await Teacher.find({ _id: { $in: teacherObjectIds } });
      if (validTeachers.length !== teacherObjectIds.length) {
        return responseStatus(res, 400, "failed", "One or more teacher IDs are invalid");
      }
      sanitizedTeachers = teacherIds.map((t) => {
        const teacherDoc = validTeachers.find((td) => td._id.toString() === t.teacherId.toString());
        if (!teacherDoc || t.firstName !== teacherDoc.firstName || t.lastName !== teacherDoc.lastName) {
          throw new Error(`Teacher data mismatch for ID ${t.teacherId}`);
        }
        return {
          teacherId: t.teacherId,
          firstName: t.firstName,
          lastName: t.lastName,
        };
      });
    }

    // Validate subclasses and subject assignments
    const validSubclasses = classLevel.subclasses.map((sub) => sub.letter);
    const isSeniorOrJunior = ["JSS 1", "JSS 2", "JSS 3", "SS 1", "SS 2", "SS 3"].includes(classLevel.name);

    if (subclasses.length > 0) {
      for (const sub of subclasses) {
        if (!validSubclasses.includes(sub.letter)) {
          return responseStatus(res, 400, "failed", `Invalid subclass: ${sub.letter}`);
        }
        if (isSeniorOrJunior && (!sub.subjects || sub.subjects.length === 0)) {
          return responseStatus(res, 400, "failed", `Subjects required for subclass ${sub.letter} in ${classLevel.name}`);
        }
        if (sub.subjects) {
          for (const subject of sub.subjects) {
            if (!mongoose.isValidObjectId(subject.subject)) {
              return responseStatus(res, 400, "failed", `Invalid subject ID: ${subject.subject} in subclass ${sub.letter}`);
            }
            // Validate subject exists in classLevel.subjects
            if (!classLevel.subjects.includes(subject.subject)) {
              return responseStatus(res, 400, "failed", `Subject ID ${subject.subject} is not assigned to class ${classLevel.name}`);
            }
            const subjectExists = await Subject.findById(subject.subject);
            if (!subjectExists) {
              return responseStatus(res, 400, "failed", `Subject ID ${subject.subject} does not exist`);
            }
            if (subject.teacherIds && subject.teacherIds.length > 0) {
              for (const teacherId of subject.teacherIds) {
                if (!mongoose.isValidObjectId(teacherId)) {
                  return responseStatus(res, 400, "failed", `Invalid teacher ID ${teacherId} for subject ${subject.subject} in subclass ${sub.letter}`);
                }
              }
              const validSubjectTeachers = await Teacher.find({ _id: { $in: subject.teacherIds } });
              if (validSubjectTeachers.length !== subject.teacherIds.length) {
                return responseStatus(res, 400, "failed", `Invalid teacher IDs for subject ${subject.subject} in subclass ${sub.letter}`);
              }
            }
          }
        }
      }
    }

    // Use all subclasses if none provided, ensuring subjects for JSS/SS
    const subclassesToAssign = subclasses.length > 0
      ? subclasses
      : classLevel.subclasses.map((sub) => ({
          letter: sub.letter,
          subjects: isSeniorOrJunior
            ? sub.subjects.map((s) => ({
                subject: s.subject,
                teacherIds: s.teachers || [],
              }))
            : [],
        }));

    // Update ClassLevel.teachers
    const existingTeachers = classLevel.teachers.map((t) => t.teacherId.toString());
    const teachersToAdd = sanitizedTeachers.filter((t) => !existingTeachers.includes(t.teacherId.toString()));
    const teachersToRemove = existingTeachers.filter((id) => !sanitizedTeachers.some((t) => t.teacherId.toString() === id));

    if (teachersToAdd.length > 0 || teachersToRemove.length > 0) {
      classLevel.teachers = sanitizedTeachers;
    }

    // Update subclass subject teacher assignments for JSS/SS
    if (isSeniorOrJunior) {
      classLevel.subclasses = classLevel.subclasses.map((sub) => {
        const updatedSub = subclassesToAssign.find((s) => s.letter === sub.letter) || { letter: sub.letter, subjects: [] };
        return {
          ...sub.toObject(),
          subjects: updatedSub.subjects.map((subject) => ({
            subject: subject.subject,
            teachers: subject.teacherIds || [],
          })),
        };
      });
    }

    await classLevel.save();

    // Update Teacher.teachingAssignments
    if (teachersToRemove.length > 0) {
      await Teacher.updateMany(
        { _id: { $in: teachersToRemove } },
        {
          $pull: {
            teachingAssignments: {
              section: classLevel.section,
              className: classLevel.name,
            },
          },
        }
      );
    }

    if (sanitizedTeachers.length > 0) {
      await Teacher.updateMany(
        { _id: { $in: sanitizedTeachers.map((t) => t.teacherId) } },
        {
          $pull: {
            teachingAssignments: {
              section: classLevel.section,
              className: classLevel.name,
            },
          },
        }
      );
      await Teacher.updateMany(
        { _id: { $in: sanitizedTeachers.map((t) => t.teacherId) } },
        {
          $addToSet: {
            teachingAssignments: {
              section: classLevel.section,
              className: classLevel.name,
              subclasses: subclassesToAssign.map((sub) => sub.letter),
            },
          },
        }
      );
    }

    const populatedClass = await ClassLevel.findById(classId).populate(
      "createdBy academicYear teachers students subclasses.subjects"
    );

    return responseStatus(res, 200, "success", populatedClass);
  } catch (error) {
    console.error("Assign Teachers to Class Error:", error.message, error.stack);
    return responseStatus(res, 500, "error", `An error occurred while assigning teachers to class: ${error.message}`);
  }
};

/**
 * Add a subclass to an existing ClassLevel.
 * @param {Object} data - Subclass data including letter and feesPerTerm.
 * @param {string} classId - The ID of the ClassLevel to add the subclass to.
 * @param {string} userId - The ID of the admin adding the subclass.
 * @param {Object} res - The response object.
 * @returns {Object} - Response status.
 */
exports.addSubclassToClassLevelService = async (data, classId, userId, res) => {
  const { letter, feesPerTerm = [] } = data;

  try {
    if (!mongoose.isValidObjectId(classId)) {
      return responseStatus(res, 400, "failed", `Invalid class ID: ${classId}`);
    }
    if (!mongoose.isValidObjectId(userId)) {
      return responseStatus(res, 400, "failed", `Invalid user ID: ${userId}`);
    }

    // Find the ClassLevel
    const classLevel = await ClassLevel.findById(classId);
    if (!classLevel) {
      return responseStatus(res, 404, "failed", "ClassLevel not found");
    }

    // Validate subclass letter
    if (!letter.match(/^[A-Z]$/)) {
      return responseStatus(res, 400, "failed", "Subclass letter must be a single uppercase letter (A-Z)");
    }

    // Check for duplicate subclass letter
    if (classLevel.subclasses.some((sub) => sub.letter === letter)) {
      return responseStatus(res, 400, "failed", `Subclass with letter ${letter} already exists`);
    }

    // Validate feesPerTerm
    if (feesPerTerm.length > 0) {
      const terms = feesPerTerm.map((fee) => fee.termName);
      if (new Set(terms).size !== terms.length) {
        return responseStatus(res, 400, "failed", "Duplicate fee terms in subclass");
      }
      for (const fee of feesPerTerm) {
        if (!["1st Term", "2nd Term", "3rd Term"].includes(fee.termName)) {
          return responseStatus(res, 400, "failed", `Invalid term name: ${fee.termName}`);
        }
        if (fee.amount < 0) {
          return responseStatus(res, 400, "failed", "Fee amount must be non-negative");
        }
        if (fee.student && fee.student.length > 0) {
          for (const studentId of fee.student) {
            if (!mongoose.isValidObjectId(studentId)) {
              return responseStatus(res, 400, "failed", `Invalid student ID ${studentId} in feesPerTerm`);
            }
          }
        }
      }
    }

    // Create new subclass
    const newSubclass = {
      letter,
      feesPerTerm,
    };

    // Add subclass to ClassLevel
    classLevel.subclasses.push(newSubclass);

    // Save the updated ClassLevel
    await classLevel.save();

    // Populate and return the updated ClassLevel
    const populatedClass = await ClassLevel.findById(classId).populate(
      "createdBy academicYear teachers students subclasses.subjects"
    );

    return responseStatus(res, 200, "success", populatedClass);
  } catch (error) {
    console.error("Add Subclass Error:", error.message, error.stack);
    return responseStatus(res, 500, "error", `An error occurred while adding the subclass: ${error.message}`);
  }
};