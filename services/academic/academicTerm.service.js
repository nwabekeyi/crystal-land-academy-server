const AcademicTerm = require("../../models/Academic/academicTerm.model");
const AcademicYear = require("../../models/Academic/academicYear.model");
const Admin = require("../../models/Staff/admin.model");
const responseStatus = require("../../handlers/responseStatus.handler");

/**
 * Create academic term service.
 *
 * @param {Object} data - The data containing information about the academic term.
 * @param {string} data.name - The name of the academic term.
 * @param {string} data.description - The description of the academic term.
 * @param {string} data.duration - The duration of the academic term.
 * @param {Date} data.startDate - The start date of the academic term.
 * @param {Date} data.endDate - The end date of the academic term.
 * @param {Object[]} data.terms - Array of term objects (1st, 2nd, 3rd Term).
 * @param {string} data.terms[].name - Name of the term (1st Term, 2nd Term, 3rd Term).
 * @param {string} data.terms[].description - Description of the term.
 * @param {string} data.terms[].duration - Duration of the term.
 * @param {Date} data.terms[].startDate - Start date of the term.
 * @param {Date} data.terms[].endDate - End date of the term.
 * @param {string} data.terms[].createdBy - ID of the admin creating the term.
 * @param {boolean} data.terms[].isCurrent - Whether the term is current.
 * @param {string} data.academicYearId - The ID of the academic year.
 * @param {string} userId - The ID of the user creating the academic term.
 * @param {Object} res - The response object (for responseStatus).
 * @returns {Object} - The response object indicating success or failure.
 */
exports.createAcademicTermService = async (data, userId, res) => {
  const { name, description, duration, startDate, endDate, terms, academicYearId } = data;

  // Validate academicYearId
  const academicYear = await AcademicYear.findById(academicYearId);
  if (!academicYear) {
    return responseStatus(res, 404, "failed", "Academic Year not found");
  }

  // Check if the academic term already exists for this academic year
  const academicTerm = await AcademicTerm.findOne({ name, academicYear: academicYearId });
  if (academicTerm) {
    return responseStatus(res, 402, "failed", "Academic term already exists for this Academic Year");
  }

  // Validate terms array
  if (!terms || terms.length !== 3 || !terms.every((term) => ["1st Term", "2nd Term", "3rd Term"].includes(term.name))) {
    return responseStatus(res, 400, "failed", "Exactly three terms (1st Term, 2nd Term, 3rd Term) are required");
  }

  // Validate term fields
  for (const term of terms) {
    if (!term.description || !term.startDate || !term.endDate || !term.createdBy) {
      return responseStatus(res, 400, "failed", "All term fields (description, startDate, endDate, createdBy) are required");
    }
  }

  // Create the academic term
  const academicTermCreated = await AcademicTerm.create({
    name,
    description,
    duration,
    startDate,
    endDate,
    terms,
    createdBy: userId,
    academicYear: academicYearId,
  });

  // Push the academic term into the admin's academicTerms array
  const admin = await Admin.findById(userId);
  if (!admin) {
    return responseStatus(res, 404, "failed", "Admin not found");
  }
  admin.academicTerms.push(academicTermCreated._id);
  await admin.save();

  // The pre-save hook in AcademicTerm schema adds the term to AcademicYear.academicTerms

  // Send the response
  return responseStatus(res, 200, "success", academicTermCreated);
};

/**
 * Get all academic terms service.
 *
 * @param {Object} res - The response object (for responseStatus).
 * @returns {Object} - The response object with an array of all academic terms.
 */
exports.getAcademicTermsService = async (res) => {
  try {
    const academicTerms = await AcademicTerm.find().populate("academicYear createdBy");
    return responseStatus(res, 200, "success", academicTerms);
  } catch (error) {
    return responseStatus(res, 500, "failed", "Error fetching academic terms: " + error.message);
  }
};

/**
 * Get academic term by ID service.
 *
 * @param {string} id - The ID of the academic term.
 * @param {Object} res - The response object (for responseStatus).
 * @returns {Object} - The response object with the academic term.
 */
exports.getAcademicTermService = async (id, res) => {
  try {
    const academicTerm = await AcademicTerm.findById(id).populate("academicYear createdBy");
    if (!academicTerm) {
      return responseStatus(res, 404, "failed", "Academic Term not found");
    }
    return responseStatus(res, 200, "success", academicTerm);
  } catch (error) {
    return responseStatus(res, 500, "failed", "Error fetching academic term: " + error.message);
  }
};

/**
 * Update academic term service.
 *
 * @param {Object} data - The data containing updated information about the academic term.
 * @param {string} data.name - The updated name of the academic term.
 * @param {string} data.description - The updated description of the academic term.
 * @param {string} data.duration - The updated duration of the academic term.
 * @param {Date} data.startDate - The updated start date.
 * @param {Date} data.endDate - The updated end date.
 * @param {Object[]} data.terms - Updated array of term objects.
 * @param {string} data.academicYearId - The updated Academic Year ID.
 * @param {string} academicId - The ID of the academic term to be updated.
 * @param {string} userId - The ID of the user updating the academic term.
 * @param {Object} res - The response object (for responseStatus).
 * @returns {Object} - The response object indicating success or failure.
 */
exports.updateAcademicTermService = async (data, academicId, userId, res) => {
  const { name, description, duration, startDate, endDate, terms, academicYearId } = data;

  // Validate academicYearId if provided
  if (academicYearId) {
    const academicYear = await AcademicYear.findById(academicYearId);
    if (!academicYear) {
      return responseStatus(res, 404, "failed", "Academic Year not found");
    }
  }

  // Check if the academic term exists
  const academicTerm = await AcademicTerm.findById(academicId);
  if (!academicTerm) {
    return responseStatus(res, 404, "failed", "Academic Term not found");
  }

  // Check if the updated name already exists for the same academic year
  const existingTerm = await AcademicTerm.findOne({
    name,
    academicYear: academicYearId || academicTerm.academicYear,
    _id: { $ne: academicId },
  });
  if (existingTerm) {
    return responseStatus(res, 402, "failed", "Academic term already exists for this Academic Year");
  }

  // Validate terms array if provided
  if (terms && (terms.length !== 3 || !terms.every((term) => ["1st Term", "2nd Term", "3rd Term"].includes(term.name)))) {
    return responseStatus(res, 400, "failed", "Exactly three terms (1st Term, 2nd Term, 3rd Term) are required");
  }

  // Validate term fields if provided
  if (terms) {
    for (const term of terms) {
      if (!term.description || !term.startDate || !term.endDate || !term.createdBy) {
        return responseStatus(res, 400, "failed", "All term fields (description, startDate, endDate, createdBy) are required");
      }
    }
  }

  // Prepare update object
  const updateData = {
    name,
    description,
    duration,
    startDate,
    endDate,
    createdBy: userId,
  };
  if (terms) updateData.terms = terms;
  if (academicYearId) updateData.academicYear = academicYearId;

  // Update the academic term
  const updatedAcademicTerm = await AcademicTerm.findByIdAndUpdate(academicId, updateData, { new: true });

  // If academicYearId is updated, update the AcademicYear references
  if (academicYearId && academicTerm.academicYear.toString() !== academicYearId) {
    // Remove from old AcademicYear
    await AcademicYear.updateOne(
      { academicTerms: academicId },
      { $pull: { academicTerms: academicId } }
    );
    // Add to new AcademicYear
    await AcademicYear.updateOne(
      { _id: academicYearId },
      { $addToSet: { academicTerms: academicId } }
    );
  }

  // Send the response
  return responseStatus(res, 201, "success", updatedAcademicTerm);
};

/**
 * Delete academic term service.
 *
 * @param {string} id - The ID of the academic term to be deleted.
 * @param {Object} res - The response object (for responseStatus).
 * @returns {Object} - The response object indicating success or failure.
 */
exports.deleteAcademicTermService = async (id, res) => {
  try {
    const academicTerm = await AcademicTerm.findById(id);
    if (!academicTerm) {
      return responseStatus(res, 404, "failed", "Academic Term not found");
    }

    // Remove the academic term from the AcademicYear
    await AcademicYear.updateOne(
      { academicTerms: id },
      { $pull: { academicTerms: id } }
    );

    // Remove from Admin's academicTerms array
    await Admin.updateOne(
      { academicTerms: id },
      { $pull: { academicTerms: id } }
    );

    // Delete the academic term
    await AcademicTerm.findByIdAndDelete(id);

    return responseStatus(res, 200, "success", "Academic Term deleted successfully");
  } catch (error) {
    return responseStatus(res, 500, "failed", "Error deleting academic term: " + error.message);
  }
};