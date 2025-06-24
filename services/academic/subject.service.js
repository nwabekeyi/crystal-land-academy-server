// services/academic/subject.service.js
const Subject = require("../../models/Academic/subject.model");
const ClassLevel = require("../../models/Academic/class.model");
const AcademicYear = require("../../models/Academic/academicYear.model");
const mongoose = require("mongoose");

/**
 * Create Subject service.
 * @param {Object} data - The data containing information about the Subject.
 * @param {string} userId - The ID of the user creating the Subject.
 * @returns {Object} - The created subject.
 * @throws {Error} - If validation fails or an error occurs.
 */
exports.createSubjectService = async (data, userId) => {
  const { name, description, academicYear, classLevels } = data;

  // Check if the Subject already exists for the same AcademicYear
  const subjectFound = await Subject.findOne({ name, academicYear });
  if (subjectFound) {
    const error = new Error("Subject already exists for this Academic Year");
    error.statusCode = 409;
    throw error;
  }

  // Validate classLevels and teachers
  if (classLevels && classLevels.length > 0) {
    for (const cl of classLevels) {
      const classLevel = await ClassLevel.findById(cl.classLevel);
      if (!classLevel) {
        const error = new Error(`ClassLevel with ID ${cl.classLevel} does not exist`);
        error.statusCode = 400;
        throw error;
      }
      if (cl.teachers && cl.teachers.length > 0) {
        const validTeachers = await mongoose.model("Teacher").find({
          _id: { $in: cl.teachers },
        });
        if (validTeachers.length !== cl.teachers.length) {
          const error = new Error(`One or more Teachers for ClassLevel ${cl.classLevel} are invalid`);
          error.statusCode = 400;
          throw error;
        }
      }
    }
  }

  // Create the Subject
  const subjectCreated = await Subject.create({
    name,
    description,
    academicYear,
    classLevels: classLevels || [],
    createdBy: userId,
  });

  // Populate relevant fields for the response
  const populatedSubject = await Subject.findById(subjectCreated._id).populate({
    path: "academicYear classLevels.classLevel classLevels.teachers createdBy",
  });

  return populatedSubject;
};

/**
 * Get all Subjects service.
 * @returns {Array} - Array of all subjects.
 * @throws {Error} - If an error occurs during fetching.
 */
exports.getAllSubjectsService = async () => {
  const subjects = await Subject.find().populate({
    path: "academicYear classLevels.classLevel classLevels.teachers createdBy",
  });
  return subjects;
};

/**
 * Get a single Subject by ID service.
 * @param {string} id - The ID of the Subject.
 * @returns {Object} - The found subject.
 * @throws {Error} - If the subject is not found or an error occurs.
 */
exports.getSubjectsService = async (id) => {
  const subject = await Subject.findById(id).populate({
    path: "academicYear classLevels.classLevel classLevels.teachers createdBy",
  });
  if (!subject) {
    const error = new Error("Subject not found");
    error.statusCode = 404;
    throw error;
  }
  return subject;
};

/**
 * Update Subject data service.
 * @param {Object} data - The data containing updated information about the Subject.
 * @param {string} id - The ID of the Subject to be updated.
 * @param {string} userId - The ID of the user updating the Subject.
 * @returns {Object} - The updated subject.
 * @throws {Error} - If validation fails or an error occurs.
 */
exports.updateSubjectService = async (data, id, userId) => {
  const { name, description, academicYear, classLevels } = data;

  // Check if the Subject exists
  const subject = await Subject.findById(id);
  if (!subject) {
    const error = new Error("Subject not found");
    error.statusCode = 404;
    throw error;
  }

  // Check if the updated name already exists for the same AcademicYear
  const subjectFound = await Subject.findOne({
    name,
    academicYear: academicYear || subject.academicYear,
    _id: { $ne: id },
  });
  if (subjectFound) {
    const error = new Error("Subject already exists for this Academic Year");
    error.statusCode = 409;
    throw error;
  }

  // Validate classLevels and teachers
  if (classLevels && classLevels.length > 0) {
    for (const cl of classLevels) {
      const classLevel = await ClassLevel.findById(cl.classLevel);
      if (!classLevel) {
        const error = new Error(`ClassLevel with ID ${cl.classLevel} does not exist`);
        error.statusCode = 400;
        throw error;
      }
      if (cl.teachers && cl.teachers.length > 0) {
        const validTeachers = await mongoose.model("Teacher").find({
          _id: { $in: cl.teachers },
        });
        if (validTeachers.length !== cl.teachers.length) {
          const error = new Error(`One or more Teachers for ClassLevel ${cl.classLevel} are invalid`);
          error.statusCode = 400;
          throw error;
        }
      }
    }
  }

  // Update the Subject
  const updatedSubject = await Subject.findByIdAndUpdate(
    id,
    {
      name,
      description,
      academicYear: academicYear || subject.academicYear,
      classLevels: classLevels !== undefined ? classLevels : subject.classLevels,
      createdBy: userId,
    },
    { new: true }
  ).populate({
    path: "academicYear classLevels.classLevel classLevels.teachers createdBy",
  });

  return updatedSubject;
};

/**
 * Delete Subject data service.
 * @param {string} id - The ID of the Subject to be deleted.
 * @returns {string} - Success message.
 * @throws {Error} - If the subject is not found or an error occurs.
 */
exports.deleteSubjectService = async (id) => {
  const subject = await Subject.findById(id);
  if (!subject) {
    const error = new Error("Subject not found");
    error.statusCode = 404;
    throw error;
  }

  // Delete the Subject
  await Subject.findByIdAndDelete(id);

  return "Subject deleted successfully";
};