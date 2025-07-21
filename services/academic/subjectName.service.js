const SubjectName = require("../../models/Academic/subjectName.model");
const Subject = require("../../models/Academic/subject.model");

/**
 * Create a SubjectName
 * @param {Object} data - The data containing name and description
 * @returns {Object} - The created SubjectName
 * @throws {Error} - If validation fails or an error occurs
 */
exports.createSubjectNameService = async (data) => {
  const { name, description } = data;

  // Check if the SubjectName already exists
  const subjectNameFound = await SubjectName.findOne({ name });
  if (subjectNameFound) {
    const error = new Error("SubjectName already exists");
    error.statusCode = 409;
    throw error;
  }

  // Create the SubjectName
  const subjectName = await SubjectName.create({
    name,
    description: description || "",
  });

  return subjectName;
};

/**
 * Get all SubjectNames
 * @returns {Array} - List of all SubjectNames
 */
exports.getAllSubjectNamesService = async () => {
  return await SubjectName.find();
};

/**
 * Get a single SubjectName
 * @param {string} id - The ID of the SubjectName to retrieve
 * @returns {Object} - The requested SubjectName
 * @throws {Error} - If the SubjectName is not found
 */
exports.getSubjectNameService = async (id) => {
  const subjectName = await SubjectName.findById(id);
  if (!subjectName) {
    const error = new Error("SubjectName not found");
    error.statusCode = 404;
    throw error;
  }
  return subjectName;
};

/**
 * Update a SubjectName
 * @param {Object} data - The data containing updated name and description
 * @param {string} id - The ID of the SubjectName to update
 * @returns {Object} - The updated SubjectName
 * @throws {Error} - If validation fails or an error occurs
 */
exports.updateSubjectNameService = async (data, id) => {
  const { name, description } = data;

  // Check if the SubjectName exists
  const subjectName = await SubjectName.findById(id);
  if (!subjectName) {
    const error = new Error("SubjectName not found");
    error.statusCode = 404;
    throw error;
  }

  // Check if the updated name already exists
  if (name && name !== subjectName.name) {
    const subjectNameFound = await SubjectName.findOne({ name });
    if (subjectNameFound) {
      const error = new Error("SubjectName already exists");
      error.statusCode = 409;
      throw error;
    }
  }

  // Update the SubjectName
  const updatedSubjectName = await SubjectName.findByIdAndUpdate(
    id,
    {
      name: name || subjectName.name,
      description: description || subjectName.description,
    },
    { new: true }
  );

  return updatedSubjectName;
};

/**
 * Delete a SubjectName
 * @param {string} id - The ID of the SubjectName to delete
 * @returns {string} - Success message
 * @throws {Error} - If the SubjectName is not found or is in use
 */
exports.deleteSubjectNameService = async (id) => {
  const subjectName = await SubjectName.findById(id);
  if (!subjectName) {
    const error = new Error("SubjectName not found");
    error.statusCode = 404;
    throw error;
  }

  // Check if the SubjectName is used by any Subject
  const subjectInUse = await Subject.findOne({ name: id });
  if (subjectInUse) {
    const error = new Error("Cannot delete SubjectName because it is used by one or more Subjects");
    error.statusCode = 400;
    throw error;
  }

  // Delete the SubjectName
  await SubjectName.findByIdAndDelete(id);

  return "SubjectName deleted successfully";
};