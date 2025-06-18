const Subject = require("../../models/Academic/subject.model");
const Program = require("../../models/Academic/program.model");
const responseStatus = require("../../handlers/responseStatus.handler");

/**
 * Create Subject service.
 *
 * @param {Object} data - The data containing information about the Subject.
 * @param {string} data.name - The name of the Subject.
 * @param {string} data.description - The description of the Subject.
 * @param {string} data.academicYear - The ID of the AcademicYear associated with the Subject.
 * @param {string} [data.teacher] - The ID of the Teacher assigned to the Subject (optional).
 * @param {string} programId - The ID of the Program the Subject is associated with.
 * @param {string} userId - The ID of the user creating the Subject.
 * @param {Object} res - The response object (for responseStatus).
 * @returns {Object} - The response object indicating success or failure.
 */
exports.createSubjectService = async (data, programId, userId, res) => {
  const { name, description, academicYear, teacher } = data;

  // Find the program
  const programFound = await Program.findById(programId);
  if (!programFound) {
    return responseStatus(res, 404, "failed", "Program not found");
  }

  // Check if the Subject already exists for the same AcademicYear
  const subjectFound = await Subject.findOne({ name, academicYear });
  if (subjectFound) {
    return responseStatus(res, 409, "failed", "Subject already exists for this Academic Year");
  }

  // Create the Subject
  try {
    const subjectCreated = await Subject.create({
      name,
      description,
      academicYear,
      teacher: teacher || null,
      createdBy: userId,
    });

    // Push the Subject ID to the program's subjects array
    programFound.subjects.push(subjectCreated._id);
    await programFound.save();

    // Populate relevant fields for the response
    const populatedSubject = await Subject.findById(subjectCreated._id).populate(
      "academicYear teacher createdBy"
    );

    // Send the response
    return responseStatus(res, 201, "success", populatedSubject);
  } catch (error) {
    return responseStatus(res, 500, "failed", "Error creating subject: " + error.message);
  }
};

/**
 * Get all Subjects service.
 *
 * @param {Object} res - The response object (for responseStatus).
 * @returns {Object} - The response object with an array of all Subjects.
 */
exports.getAllSubjectsService = async (res) => {
  try {
    const subjects = await Subject.find().populate("academicYear teacher createdBy");
    return responseStatus(res, 200, "success", subjects);
  } catch (error) {
    return responseStatus(res, 500, "failed", "Error fetching subjects: " + error.message);
  }
};

/**
 * Get a single Subject by ID service.
 *
 * @param {string} id - The ID of the Subject.
 * @param {Object} res - The response object (for responseStatus).
 * @returns {Object} - The response object with the Subject.
 */
exports.getSubjectsService = async (id, res) => {
  try {
    const subject = await Subject.findById(id).populate("academicYear teacher createdBy");
    if (!subject) {
      return responseStatus(res, 404, "failed", "Subject not found");
    }
    return responseStatus(res, 200, "success", subject);
  } catch (error) {
    return responseStatus(res, 500, "failed", "Error fetching subject: " + error.message);
  }
};

/**
 * Update Subject data service.
 *
 * @param {Object} data - The data containing updated information about the Subject.
 * @param {string} data.name - The updated name of the Subject.
 * @param {string} data.description - The updated description of the Subject.
 * @param {string} data.academicYear - The updated ID of the AcademicYear.
 * @param {string} [data.teacher] - The updated ID of the Teacher (optional).
 * @param {string} id - The ID of the Subject to be updated.
 * @param {string} userId - The ID of the user updating the Subject.
 * @param {Object} res - The response object (for responseStatus).
 * @returns {Object} - The response object indicating success or failure.
 */
exports.updateSubjectService = async (data, id, userId, res) => {
  const { name, description, academicYear, teacher } = data;

  // Check if the Subject exists
  const subject = await Subject.findById(id);
  if (!subject) {
    return responseStatus(res, 404, "failed", "Subject not found");
  }

  // Check if the updated name already exists for the same AcademicYear
  const subjectFound = await Subject.findOne({
    name,
    academicYear: academicYear || subject.academicYear,
    _id: { $ne: id },
  });
  if (subjectFound) {
    return responseStatus(res, 409, "failed", "Subject already exists for this Academic Year");
  }

  // Update the Subject
  try {
    const updatedSubject = await Subject.findByIdAndUpdate(
      id,
      {
        name,
        description,
        academicYear: academicYear || subject.academicYear,
        teacher: teacher !== undefined ? teacher : subject.teacher,
        createdBy: userId,
      },
      { new: true }
    ).populate("academicYear teacher createdBy");

    // Send the response
    return responseStatus(res, 200, "success", updatedSubject);
  } catch (error) {
    return responseStatus(res, 500, "failed", "Error updating subject: " + error.message);
  }
};

/**
 * Delete Subject data service.
 *
 * @param {string} id - The ID of the Subject to be deleted.
 * @param {Object} res - The response object (for responseStatus).
 * @returns {Object} - The response object indicating success or failure.
 */
exports.deleteSubjectService = async (id, res) => {
  try {
    const subject = await Subject.findById(id);
    if (!subject) {
      return responseStatus(res, 404, "failed", "Subject not found");
    }

    // Remove the Subject from the associated Program's subjects array
    await Program.updateMany(
      { subjects: id },
      { $pull: { subjects: id } }
    );

    // Delete the Subject
    await Subject.findByIdAndDelete(id);

    return responseStatus(res, 200, "success", "Subject deleted successfully");
  } catch (error) {
    return responseStatus(res, 500, "failed", "Error deleting subject: " + error.message);
  }
};