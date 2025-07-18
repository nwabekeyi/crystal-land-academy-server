const ClassLevel = require("../../models/Academic/class.model");
const Admin = require("../../models/Staff/admin.model");
const responseStatus = require("../../handlers/responseStatus.handler");

/**
 * Create a new ClassLevel.
 * @param {Object} data - Class data including section, name, description, academicYear, subclasses, etc.
 * @param {string} userId - The ID of the admin creating the class.
 * @param {Object} res - The response object.
 * @returns {Object} - Response status.
 */
exports.createClassLevelService = async (data, userId, res) => {
  const {
    section,
    name,
    description,
    academicYear,
    subclasses = [],
    teachers = [],
  } = data;

  try {
    // Check for duplicate class
    const existing = await ClassLevel.findOne({ section, name, academicYear });
    if (existing) {
      return responseStatus(res, 400, "failed", "Class already exists for this academic year");
    }

    // Validate subclasses
    if (subclasses.length > 0) {
      const letters = subclasses.map((sub) => sub.letter);
      if (new Set(letters).size !== letters.length) {
        return responseStatus(res, 400, "failed", "Subclass letters must be unique");
      }

      const isSeniorSecondary = ["SS 1", "SS 2", "SS 3"].includes(name);
      for (const sub of subclasses) {
        // Restrict subjects to SS1-SS3
        if (!isSeniorSecondary && sub.subjects && sub.subjects.length > 0) {
          return responseStatus(res, 400, "failed", `Subjects not allowed for non-SS class: ${name}`);
        }
        // Validate feesPerTerm
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

    // Populate response
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
 * @param {Object} res - The response object.
 */
exports.getAllClassesService = async (query, res) => {
  try {
    const { page = 1, limit = 10, section, classLevels } = query;

    // Convert page and limit to integers and ensure valid values
    const pageNum = parseInt(page, 10) > 0 ? parseInt(page, 10) : 1;
    const limitNum = parseInt(limit, 10) > 0 ? parseInt(limit, 10) : 10;
    const skip = (pageNum - 1) * limitNum;

    // Build filter object
    const filter = {};
    if (section) {
      filter.section = section; // e.g., "Primary" or "Secondary"
    }
    if (classLevels) {
      // Support multiple class levels as a comma-separated string or array
      const levels = Array.isArray(classLevels)
        ? classLevels
        : classLevels.split(",").map((level) => level.trim());
      if (levels.length > 0) {
        filter.name = { $in: levels }; // e.g., ["JSS 1", "SS 1"]
      }
    }

    // Fetch paginated and filtered classes
    const classes = await ClassLevel.find(filter)
      .skip(skip)
      .limit(limitNum);

    // Get total count for pagination metadata
    const total = await ClassLevel.countDocuments(filter);

    // Prepare response with pagination metadata
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
  const {
    section,
    name,
    description,
    academicYear,
    subclasses,
    teachers,
  } = data;

  try {
    // Check for duplicate class
    const classFound = await ClassLevel.findOne({
      _id: { $ne: id },
      section,
      name,
      academicYear,
    });
    if (classFound) {
      return responseStatus(res, 400, "failed", "Another class with same name already exists");
    }

    // Validate subclasses
    if (subclasses && subclasses.length > 0) {
      const letters = subclasses.map((sub) => sub.letter);
      if (new Set(letters).size !== letters.length) {
        return responseStatus(res, 400, "failed", "Subclass letters must be unique");
      }

      const isSeniorSecondary = ["SS 1", "SS 2", "SS 3"].includes(name);
      for (const sub of subclasses) {
        // Restrict subjects to SS1-SS3
        if (!isSeniorSecondary && sub.subjects && sub.subjects.length > 0) {
          return responseStatus(res, 400, "failed", `Subjects not allowed for non-SS class: ${name}`);
        }
        // Validate feesPerTerm
        if (sub.feesPerTerm && sub.feesPerTerm.length > 0) {
          const terms = sub.feesPerTerm.map((fee) => fee.termName);
          if (new Set(terms).size !== terms.length) {
            return responseStatus(res, 400, "failed", `Duplicate fee terms in subclass ${sub.letter}`);
          }
        }
      }
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
    // Fetch all class levels with required fields and populate subjects
    const classLevels = await ClassLevel.find()
      .select("section name subclasses.letter subclasses.subjects _id")
      .populate({
        path: "subclasses.subjects",
        select: "_id name",
      });

    // Check if no class levels are found
    if (!classLevels || classLevels.length === 0) {
      return responseStatus(res, 404, "failed", "No class levels found");
    }

    // Map class levels to the desired structure
    const sections = [...new Set(classLevels.map((cl) => cl.section))];
    const classData = sections.map((section) => {
      const classNames = classLevels
        .filter((cl) => cl.section === section)
        .map((cl) => ({
          classLevel: cl._id.toString(), // Use _id as classLevel
          name: cl.name, // Include name for UI display
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