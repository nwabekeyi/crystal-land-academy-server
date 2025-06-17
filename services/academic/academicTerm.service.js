const AcademicTerm = require("../../models/Academic/academicTerm.model");
const AcademicYear = require("../../models/Academic/academicYear.model");
const Admin = require("../../models/Staff/admin.model");
const responseStatus = require("../../handlers/responseStatus.handler");

// Helper function to check if two date ranges intersect
const doDateRangesIntersect = (start1, end1, start2, end2) => {
  return start1 <= end2 && start2 <= end1;
};

/**
 * Create academic term service.
 *
 * @param {Object} data - The data containing information about the academic term.
 * @param {Object[]} data.terms - Array of term objects (1st, 2nd, 3rd Term).
 * @param {string} data.terms[].name - Name of the term (1st Term, 2nd Term, 3rd Term).
 * @param {string} data.terms[].description - Description of the term.
 * @param {string} data.terms[].duration - Duration of the term.
 * @param {Date} data.terms[].startDate - Start date of the term.
 * @param {Date} data.terms[].endDate - End date of the term.
 * @param {boolean} data.terms[].isCurrent - Whether the term is current.
 * @param {string} data.academicYearId - The ID of the academic year.
 * @param {string} userId - The ID of the user creating the academic term.
 * @param {Object} res - The response object (for responseStatus).
 * @returns {Object} - The response object indicating success or failure.
 */
exports.createAcademicTermService = async (data, userId, res) => {
  const { terms, academicYearId } = data;

  // Validate academicYearId
  const academicYear = await AcademicYear.findById(academicYearId);
  if (!academicYear) {
    return responseStatus(res, 404, "failed", "Academic Year not found");
  }

  // Validate terms array
  if (!terms || terms.length !== 3 || !terms.every((term) => ["1st Term", "2nd Term", "3rd Term"].includes(term.name))) {
    return responseStatus(res, 400, "failed", "Exactly three terms (1st Term, 2nd Term, 3rd Term) are required");
  }

  // Validate term fields
  for (const term of terms) {
    if (!term.description || !term.duration || !term.startDate || !term.endDate) {
      return responseStatus(res, 400, "failed", "All term fields (description, duration, startDate, endDate) are required");
    }
    if (new Date(term.startDate) >= new Date(term.endDate)) {
      return responseStatus(res, 400, "failed", `Term ${term.name} start date must be before end date`);
    }
  }


  // Validate no date intersection within terms
  for (let i = 0; i < terms.length; i++) {
    for (let j = i + 1; j < terms.length; j++) {
      if (
        doDateRangesIntersect(
          new Date(terms[i].startDate),
          new Date(terms[i].endDate),
          new Date(terms[j].startDate),
          new Date(terms[j].endDate)
        )
      ) {
        return responseStatus(res, 400, "failed", `Terms ${terms[i].name} and ${terms[j].name} have overlapping dates`);
      }
    }
  }

  // Validate against existing terms in the same academic year
  const existingTerms = await AcademicTerm.find({ academicYear: academicYearId });
  for (const existing of existingTerms) {
    for (const existingTerm of existing.terms) {
      for (const newTerm of terms) {
        if (existingTerm.name === newTerm.name) {
          return responseStatus(res, 400, "failed", `Term name ${newTerm.name} already exists in this academic year`);
        }
        if (existingTerm.duration === newTerm.duration) {
          return responseStatus(res, 400, "failed", `Term duration ${newTerm.duration} already exists in this academic year`);
        }
        if (
          doDateRangesIntersect(
            new Date(existingTerm.startDate),
            new Date(existingTerm.endDate),
            new Date(newTerm.startDate),
            new Date(newTerm.endDate)
          )
        ) {
          return responseStatus(res, 400, "failed", `New term ${newTerm.name} overlaps with existing term ${existingTerm.name}`);
        }
      }
    }
  }

  // Create the academic term
  const academicTermCreated = await AcademicTerm.create({
    academicYear: academicYearId,
    terms: terms.map((term) => ({
      ...term,
      createdBy: userId,
    })),
  });

  // The pre-save hook in AcademicTerm schema adds the term to AcademicYear.academicTerms

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
 * @param {Object[]} data.terms - Updated array of term objects.
 * @param {string} data.terms[].name - Name of the term (1st Term, 2nd Term, 3rd Term).
 * @param {string} data.terms[].description - Description of the term.
 * @param {string} data.terms[].duration - Duration of the term.
 * @param {Date} data.terms[].startDate - Start date of the term.
 * @param {Date} data.terms[].endDate - End date of the term.
 * @param {boolean} data.terms[].isCurrent - Whether the term is current.
 * @param {string} data.academicYearId - The updated Academic Year ID.
 * @param {string} academicId - The ID of the academic term to be updated.
 * @param {string} userId - The ID of the user updating the academic term.
 * @param {Object} res - The response object (for responseStatus).
 * @returns {Object} - The response object indicating success or failure.
 */
exports.updateAcademicTermService = async (data, academicId, userId, res) => {
  const { terms, academicYearId } = data;

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

  // Validate terms array if provided
  if (terms) {
    if (terms.length !== 3 || !terms.every((term) => ["1st Term", "2nd Term", "3rd Term"].includes(term.name))) {
      return responseStatus(res, 400, "failed", "Exactly three terms (1st Term, 2nd Term, 3rd Term) are required");
    }

    // Validate term fields
    for (const term of terms) {
      if (!term.description || !term.duration || !term.startDate || !term.endDate) {
        return responseStatus(res, 400, "failed", "All term fields (description, duration, startDate, endDate) are required");
      }
      if (new Date(term.startDate) >= new Date(term.endDate)) {
        return responseStatus(res, 400, "failed", `Term ${term.name} start date must be before end date`);
      }
    }

    // Validate unique durations within terms
    const durations = terms.map((term) => term.duration);
    if (new Set(durations).size !== durations.length) {
      return responseStatus(res, 400, "failed", "All terms must have unique durations");
    }

    // Validate no date intersection within terms
    for (let i = 0; i < terms.length; i++) {
      for (let j = i + 1; j < terms.length; j++) {
        if (
          doDateRangesIntersect(
            new Date(terms[i].startDate),
            new Date(terms[i].endDate),
            new Date(terms[j].startDate),
            new Date(terms[j].endDate)
          )
        ) {
          return responseStatus(res, 400, "failed", `Terms ${terms[i].name} and ${terms[j].name} have overlapping dates`);
        }
      }
    }

    // Validate against existing terms in the same academic year (excluding current academic term)
    const existingTerms = await AcademicTerm.find({
      academicYear: academicYearId || academicTerm.academicYear,
      _id: { $ne: academicId },
    });
    for (const existing of existingTerms) {
      for (const existingTerm of existing.terms) {
        for (const newTerm of terms) {
          if (existingTerm.name === newTerm.name) {
            return responseStatus(res, 400, "failed", `Term name ${newTerm.name} already exists in this academic year`);
          }
          if (existingTerm.duration === newTerm.duration) {
            return responseStatus(res, 400, "failed", `Term duration ${newTerm.duration} already exists in this academic year`);
          }
          if (
            doDateRangesIntersect(
              new Date(existingTerm.startDate),
              new Date(existingTerm.endDate),
              new Date(newTerm.startDate),
              new Date(newTerm.endDate)
            )
          ) {
            return responseStatus(res, 400, "failed", `New term ${newTerm.name} overlaps with existing term ${existingTerm.name}`);
          }
        }
      }
    }
  }

  // Prepare update object
  const updateData = {};
  if (terms) updateData.terms = terms.map((term) => ({ ...term, createdBy: userId }));
  if (academicYearId) updateData.academicYear = academicYearId;

  // Update the academic term
  const updatedAcademicTerm = await AcademicTerm.findByIdAndUpdate(academicId, updateData, { new: true });

  // If academicYearId is updated, update the AcademicYear references
  if (academicYearId && academicTerm.academicYear.toString() !== academicYearId) {
    await AcademicYear.updateOne(
      { academicTerms: academicId },
      { $pull: { academicTerms: academicId } }
    );
    await AcademicYear.updateOne(
      { _id: academicYearId },
      { $addToSet: { academicTerms: academicId } }
    );
  }

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