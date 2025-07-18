const ClassLevel = require("../../models/Academic/class.model");
const Teacher = require("../../models/Staff/teachers.model");
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
    // Check for duplicate class
    const existing = await ClassLevel.findOne({ section, name, academicYear });
    if (existing) {
      return responseStatus(res, 400, "failed", "Class already exists for this academic year");
    }

    // Validate teacher IDs
    if (teachers.length > 0) {
      const validTeachers = await Teacher.find({ _id: { $in: teachers } });
      if (validTeachers.length !== teachers.length) {
        return responseStatus(res, 400, "failed", "One or more teacher IDs are invalid");
      }
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
        if (sub.feesPerTerm && sub.feesPerTerm.length > 0) {
          const terms = sub.feesPerTerm.map((fee) => fee.termName);
          if (new Set(terms).size !== terms.length) {
            return responseStatus(res, 400, "failed", `Duplicate fee terms in subclass ${sub.letter}`);
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
      teachers,
    });

    // Update teachers' teachingAssignments
    if (teachers.length > 0) {
      const subclassLetters = subclasses.map(sub => sub.letter);
      await Teacher.updateMany(
        { _id: { $in: teachers } },
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
    console.error("Create ClassLevel Error:", error);
    return responseStatus(res, 500, "error", "An error occurred while creating the class");
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
    console.error("Fetch All Classes Error:", error);
    return responseStatus(res, 500, "error", "An error occurred while fetching classes");
  }
};

/**
 * Get a single ClassLevel by ID.
 * @param {string} id - ClassLevel ID.
 * @param {Object} res - The response object.
 */
exports.getClassLevelsService = async (id, res) => {
  try {
    const classLevel = await ClassLevel.findById(id).populate(
      "createdBy academicYear teachers students subclasses.subjects"
    );
    if (!classLevel) {
      return responseStatus(res, 404, "failed", "Class not found");
    }
    return responseStatus(res, 200, "success", classLevel);
  } catch (error) {
    console.error("Get ClassLevel Error:", error);
    return responseStatus(res, 500, "error", "An error occurred while fetching the class");
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
    const classFound = await ClassLevel.findOne({
      _id: { $ne: id },
      section,
      name,
      academicYear,
    });
    if (classFound) {
      return responseStatus(res, 400, "failed", "Another class with same name already exists");
    }

    if (teachers.length > 0) {
      const validTeachers = await Teacher.find({ _id: { $in: teachers } });
      if (validTeachers.length !== teachers.length) {
        return responseStatus(res, 400, "failed", "One or more teacher IDs are invalid");
      }
    }

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
        if (sub.feesPerTerm && sub.feesPerTerm.length > 0) {
          const terms = sub.feesPerTerm.map((fee) => fee.termName);
          if (new Set(terms).size !== terms.length) {
            return responseStatus(res, 400, "failed", `Duplicate fee terms in subclass ${sub.letter}`);
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
        teachers,
        createdBy: userId,
      },
      { new: true }
    ).populate("createdBy academicYear teachers students subclasses.subjects");

    if (!updated) {
      return responseStatus(res, 404, "failed", "Class not found");
    }

    const subclassLetters = subclasses.map(sub => sub.letter);
    const newAssignment = { section, className: name, subclasses: subclassLetters };

    const removedTeachers = existingClass.teachers.filter(
      teacherId => !teachers.includes(teacherId.toString())
    );
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

    if (teachers.length > 0) {
      await Teacher.updateMany(
        { _id: { $in: teachers } },
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
        { _id: { $in: teachers } },
        {
          $addToSet: {
            teachingAssignments: newAssignment,
          },
        }
      );
    }

    return responseStatus(res, 200, "success", updated);
  } catch (error) {
    console.error("Update ClassLevel Error:", error);
    return responseStatus(res, 500, "error", "An error occurred while updating the class");
  }
};

/**
 * Delete a ClassLevel.
 * @param {string} id - ClassLevel ID.
 * @param {Object} res - The response object.
 */
exports.deleteClassLevelService = async (id, res) => {
  try {
    const classLevel = await ClassLevel.findById(id);
    if (!classLevel) {
      return responseStatus(res, 404, "failed", "Class not found");
    }

    if (classLevel.teachers.length > 0) {
      await Teacher.updateMany(
        { _id: { $in: classLevel.teachers } },
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
    console.error("Delete ClassLevel Error:", error);
    return responseStatus(res, 500, "error", "An error occurred while deleting the class");
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
        path: "subclasses.subjects",
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
              _id: subject._id,
              name: subject.name,
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
    console.error("Fetch SignUp Class Data Error:", error);
    return responseStatus(res, 500, "error", "An error occurred while fetching class data for sign-up");
  }
};

/**
 * Get Class Levels and Subclasses for a Teacher
 * @param {string} teacherId - Teacher ID.
 * @param {Object} res - The response object.
 */
exports.getClassLevelsAndSubclassesForTeacherService = async (teacherId, res) => {
  try {
    const teacher = await Teacher.findById(teacherId).select("teachingAssignments");
    if (!teacher) {
      return responseStatus(res, 404, "failed", "Teacher not found");
    }

    const classLevels = await ClassLevel.find({
      "teachers": teacherId,
    }).select("section name subclasses.letter _id");

    return responseStatus(res, 200, "success", {
      teacherId,
      teachingAssignments: teacher.teachingAssignments,
      assignedClasses: classLevels,
    });
  } catch (error) {
    console.error("Get Class Levels for Teacher Error:", error);
    return responseStatus(res, 500, "error", "An error occurred while fetching class levels for teacher");
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
    // Validate classId
    const classLevel = await ClassLevel.findById(classId);
    if (!classLevel) {
      return responseStatus(res, 404, "failed", "Class not found");
    }

    // Validate teacherIds (array of objects with teacherId, firstName, lastName)
    if (teacherIds.length > 0) {
      const teacherObjectIds = teacherIds.map(t => t.teacherId);
      const validTeachers = await Teacher.find({ _id: { $in: teacherObjectIds } });
      if (validTeachers.length !== teacherObjectIds.length) {
        return responseStatus(res, 400, "failed", "One or more teacher IDs are invalid");
      }
      // Validate firstName and lastName
      for (const teacher of teacherIds) {
        const teacherDoc = validTeachers.find(t => t._id.toString() === teacher.teacherId.toString());
        if (!teacherDoc || teacher.firstName !== teacherDoc.firstName || teacher.lastName !== teacherDoc.lastName) {
          return responseStatus(res, 400, "failed", `Teacher data mismatch for ID ${teacher.teacherId}`);
        }
      }
    }

    // Validate subclasses and subject assignments
    const validSubclasses = classLevel.subclasses.map(sub => sub.letter);
    const isSeniorOrJunior = ["JSS", "SS"].includes(classLevel.section);

    if (subclasses.length > 0) {
      for (const sub of subclasses) {
        if (!validSubclasses.includes(sub.letter)) {
          return responseStatus(res, 400, "failed", `Invalid subclass: ${sub.letter}`);
        }
        if (isSeniorOrJunior && (!sub.subjects || sub.subjects.length === 0)) {
          return responseStatus(res, 400, "failed", `Subjects required for subclass ${sub.letter} in ${classLevel.section} class`);
        }
        if (sub.subjects) {
          for (const subject of sub.subjects) {
            const subjectExists = await Subject.findById(subject.subjectId);
            if (!subjectExists) {
              return responseStatus(res, 400, "failed", `Invalid subject ID: ${subject.subjectId}`);
            }
            if (subject.teacherIds.length > 0) {
              const validSubjectTeachers = await Teacher.find({ _id: { $in: subject.teacherIds } });
              if (validSubjectTeachers.length !== subject.teacherIds.length) {
                return responseStatus(res, 400, "failed", `Invalid teacher IDs for subject ${subject.subjectId}`);
              }
            }
          }
        }
      }
    }

    // Use all subclasses if none provided, ensuring subjects for JSS/SS
    const subclassesToAssign = subclasses.length > 0 ? subclasses : classLevel.subclasses.map(sub => ({
      letter: sub.letter,
      subjects: isSeniorOrJunior ? sub.subjects.map(s => ({
        subjectId: s.subject,
        teacherIds: s.teachers || [],
      })) : [],
    }));

    // Update ClassLevel.teachers
    const existingTeachers = classLevel.teachers.map(t => t.teacherId.toString());
    const teachersToAdd = teacherIds.filter(t => !existingTeachers.includes(t.teacherId.toString()));
    const teachersToRemove = existingTeachers.filter(id => !teacherIds.some(t => t.teacherId.toString() === id));

    if (teachersToAdd.length > 0 || teachersToRemove.length > 0) {
      classLevel.teachers = teacherIds.map(t => ({
        teacherId: t.teacherId,
        firstName: t.firstName,
        lastName: t.lastName,
      }));
    }

    // Update subclass subject teacher assignments for JSS/SS
    if (isSeniorOrJunior) {
      classLevel.subclasses = classLevel.subclasses.map(sub => {
        const updatedSub = subclassesToAssign.find(s => s.letter === sub.letter) || { letter: sub.letter, subjects: [] };
        return {
          ...sub,
          subjects: sub.subjects.map(subject => {
            const updatedSubject = updatedSub.subjects.find(s => s.subjectId.toString() === subject.subject.toString());
            return {
              ...subject,
              teachers: updatedSubject ? updatedSubject.teacherIds : subject.teachers,
            };
          }),
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

    if (teacherIds.length > 0) {
      await Teacher.updateMany(
        { _id: { $in: teacherIds.map(t => t.teacherId) } },
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
        { _id: { $in: teacherIds.map(t => t.teacherId) } },
        {
          $addToSet: {
            teachingAssignments: {
              section: classLevel.section,
              className: classLevel.name,
              subclasses: subclassesToAssign.map(sub => sub.letter), // Send only subclass letters
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
    console.error("Assign Teachers to Class Error:", error);
    return responseStatus(res, 500, "error", "An error occurred while assigning teachers to class");
  }
};