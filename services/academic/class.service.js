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
exports.getAllClassesService = async (res) => {
  try {
    const classes = await ClassLevel.find().populate([
      { path: 'createdBy', select: '_id firstName lastName email' },
      { path: 'academicYear', select: '_id name' }, // Select only _id and name
      { path: 'teachers', select: '_id firstName lastName email' },
      { path: 'students', select: '_id firstName lastName email' },
      { path: 'subclasses.subjects', select: '_id name' },
    ]);
    return classes;
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