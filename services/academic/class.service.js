const ClassLevel = require("../../models/Academic/class.model");
const Admin = require("../../models/Staff/admin.model");
const responseStatus = require("../../handlers/responseStatus.handler");

/**
 * Create a new ClassLevel.
 * @param {Object} data - Class data including section, name, description, academicYear, subclasses, etc.
 * @param {string} userId - The ID of the admin creating the class.
 * @returns {Object} - Response status.
 */
exports.createClassLevelService = async (data, userId) => {
  const {
    section,
    name,
    description,
    academicYear,
    subclasses = [],
    subjectsPerTerm = [],
    teachers = [],
  } = data;

  try {
    const existing = await ClassLevel.findOne({ section, name, academicYear });
    if (existing) {
      return responseStatus(null, 400, "failed", "Class already exists for this academic year");
    }

    const classLevel = await ClassLevel.create({
      section,
      name,
      description,
      academicYear,
      createdBy: userId,
      subclasses,
      subjectsPerTerm,
      teachers,
    });

    const admin = await Admin.findById(userId);
    if (admin) {
      admin.classLevels.push(classLevel._id);
      await admin.save();
    }

    return responseStatus(null, 201, "success", classLevel);
  } catch (error) {
    console.error("Create ClassLevel Error:", error);
    return responseStatus(null, 500, "error", "An error occurred while creating the class");
  }
};

/**
 * Get all ClassLevels.
 */
exports.getAllClassesService = async () => {
  try {
    const classes = await ClassLevel.find().populate("createdBy academicYear teachers students");
    return classes;
  } catch (error) {
    console.error("Fetch All Classes Error:", error);
    return [];
  }
};

/**
 * Get a single ClassLevel by ID.
 * @param {string} id - ClassLevel ID.
 */
exports.getClassLevelsService = async (id) => {
  try {
    const classLevel = await ClassLevel.findById(id).populate("createdBy academicYear teachers students");
    return classLevel;
  } catch (error) {
    console.error("Get ClassLevel Error:", error);
    return null;
  }
};

/**
 * Update a ClassLevel.
 * @param {Object} data - Class data to update.
 * @param {string} id - ClassLevel ID.
 * @param {string} userId - Admin ID performing the update.
 */
exports.updateClassLevelService = async (data, id, userId) => {
  const {
    section,
    name,
    description,
    academicYear,
    subclasses,
    subjectsPerTerm,
    teachers,
  } = data;

  try {
    const classFound = await ClassLevel.findOne({
      _id: { $ne: id },
      section,
      name,
      academicYear,
    });

    if (classFound) {
      return responseStatus(null, 400, "failed", "Another class with same name already exists");
    }

    const updated = await ClassLevel.findByIdAndUpdate(
      id,
      {
        section,
        name,
        description,
        academicYear,
        subclasses,
        subjectsPerTerm,
        teachers,
        createdBy: userId,
      },
      { new: true }
    );

    return responseStatus(null, 200, "success", updated);
  } catch (error) {
    console.error("Update ClassLevel Error:", error);
    return responseStatus(null, 500, "error", "An error occurred while updating the class");
  }
};

/**
 * Delete a ClassLevel.
 * @param {string} id - ClassLevel ID.
 */
exports.deleteClassLevelService = async (id) => {
  try {
    const deleted = await ClassLevel.findByIdAndDelete(id);
    return deleted;
  } catch (error) {
    console.error("Delete ClassLevel Error:", error);
    return null;
  }
};
