const AcademicTerm = require("../../models/Academic/academicTerm.model");
const AcademicYear = require("../../models/Academic/academicYear.model");
const Admin = require("../../models/Staff/admin.model");
const responseStatus = require("../../handlers/responseStatus.handler");

// Helper function to check if two date ranges intersect
const doDateRangesIntersect = (start1, end1, start2, end2) => {
  return start1 <= end2 && start2 <= end1;
};

// Helper function to validate isCurrent term date constraints
const validateCurrentTermDates = (startDate, endDate, termName, res) => {
  const now = new Date('2025-07-23T20:46:00+01:00'); // 08:46 PM WAT, July 23, 2025
  const oneMonthFromNow = new Date(now);
  oneMonthFromNow.setMonth(now.getMonth() + 1);

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (start > oneMonthFromNow) {
    return responseStatus(res, 400, "failed", `Term ${termName} cannot be current: start date is more than one month in the future`);
  }

  if (end < now) {
    return responseStatus(res, 400, "failed", `Term ${termName} cannot be current: end date is in the past`);
  }

  return null;
};

// Helper function to validate term dates against academic year
const validateTermDatesAgainstYear = async (terms, academicYearId, res) => {
  const academicYear = await AcademicYear.findById(academicYearId);
  if (!academicYear) {
    return responseStatus(res, 404, "failed", "Academic Year not found");
  }

  const yearEndDate = new Date(academicYear.toYear); // Use toYear for end date
  for (const term of terms) {
    const termEndDate = new Date(term.endDate);
    if (termEndDate > yearEndDate) {
      return responseStatus(res, 400, "failed", `Term ${term.name} end date (${termEndDate.toISOString().split('T')[0]}) exceeds academic year end date (${yearEndDate.toISOString().split('T')[0]})`);
    }
  }
  return null;
};

/**
 * Create academic term service.
 */
exports.createAcademicTermService = async (data, userId, res) => {
  const { terms, academicYearId } = data;

  // Validate academicYearId and term dates against academic year
  const yearValidationError = await validateTermDatesAgainstYear(terms, academicYearId, res);
  if (yearValidationError) return yearValidationError;

  // Validate terms array
  if (!terms || terms.length !== 3 || !terms.every((term) => ["1st Term", "2nd Term", "3rd Term"].includes(term.name))) {
    return responseStatus(res, 400, "failed", "Exactly three terms (1st Term, 2nd Term, 3rd Term) are required");
  }

  // Validate term fields and isCurrent date constraints
  for (const term of terms) {
    if (!term.description || !term.duration || !term.startDate || !term.endDate) {
      return responseStatus(res, 400, "failed", "All term fields (description, duration, startDate, endDate) are required");
    }
    if (new Date(term.startDate) >= new Date(term.endDate)) {
      return responseStatus(res, 400, "failed", `Term ${term.name} start date must be before end date`);
    }
    if (term.isCurrent) {
      const validationError = validateCurrentTermDates(term.startDate, term.endDate, term.name, res);
      if (validationError) return validationError;
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

  // Ensure only one term is marked as current
  const currentTermCount = terms.filter((term) => term.isCurrent).length;
  if (currentTermCount > 1) {
    return responseStatus(res, 400, "failed", "Only one term can be marked as current");
  }

  // If a term is marked as current, update other terms in the academic year to isCurrent: false
  if (currentTermCount === 1) {
    await AcademicTerm.updateMany(
      { academicYear: academicYearId, "terms.isCurrent": true },
      { $set: { "terms.$[].isCurrent": false } }
    );
  }

  // Create the academic term
  const academicTermCreated = await AcademicTerm.create({
    academicYear: academicYearId,
    terms: terms.map((term) => ({
      ...term,
      createdBy: userId,
    })),
  });

  return responseStatus(res, 200, "success", academicTermCreated);
};

/**
 * Update academic term service.
 */
exports.updateAcademicTermService = async (data, academicId, userId, res) => {
  const { terms, academicYearId } = data;

  // Validate academicYear
  const academicTerm = await AcademicTerm.findById(academicId);
  if (!academicTerm) {
    return responseStatus(res, 404, "failed", "Academic Term not found");
  }

  // Validate academicYearId if provided
  const targetAcademicYearId = academicYearId || academicTerm.academicYear;
  const yearValidationError = await validateTermDatesAgainstYear(terms, targetAcademicYearId, res);
  if (yearValidationError) return yearValidationError;

  // Validate terms array if provided
  if (terms) {
    if (terms.length !== 3 || !terms.every((term) => ["1st Term", "2nd Term", "3rd Term"].includes(term.name))) {
      return responseStatus(res, 400, "failed", "Exactly three terms (1st Term, 2nd Term, 3rd Term) are required");
    }

    // Validate term fields and isCurrent date constraints
    for (const term of terms) {
      if (!term.description || !term.duration || !term.startDate || !term.endDate) {
        return responseStatus(res, 400, "failed", "All term fields (description, duration, startDate, endDate) are required");
      }
      if (new Date(term.startDate) >= new Date(term.endDate)) {
        return responseStatus(res, 400, "failed", `Term ${term.name} start date must be before end date`);
      }
      if (term.isCurrent) {
        const validationError = validateCurrentTermDates(term.startDate, term.endDate, term.name, res);
        if (validationError) return validationError;
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
      academicYear: targetAcademicYearId,
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

    // Ensure only one term is marked as current
    const currentTermCount = terms.filter((term) => term.isCurrent).length;
    if (currentTermCount > 1) {
      return responseStatus(res, 400, "failed", "Only one term can be marked as current");
    }

    // If a term is marked as current, update other terms in the academic year to isCurrent: false
    if (currentTermCount === 1) {
      await AcademicTerm.updateMany(
        { academicYear: targetAcademicYearId, "terms.isCurrent": true },
        { $set: { "terms.$[].isCurrent": false } }
      );
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
 * Get all academic terms by academic year service.
 */
exports.getAcademicTermsByYearService = async (academicYearId, res) => {
  // Validate academicYearId
  const academicYear = await AcademicYear.findById(academicYearId);
  if (!academicYear) {
    return responseStatus(res, 404, "failed", "Academic Year not found");
  }

  const academicTerms = await AcademicTerm.find({ academicYear: academicYearId })
    .populate("academicYear");
  if (!academicTerms.length) {
    return responseStatus(res, 404, "failed", "No academic terms found for this academic year");
  }

  return responseStatus(res, 200, "success", academicTerms);
};

/**
 * Get current academic term service.
 */
exports.getCurrentAcademicTermService = async (res) => {
  // Find the current academic year
  const academicYear = await AcademicYear.findOne({ isCurrent: true });
  if (!academicYear) {
    return responseStatus(res, 404, "failed", "No current academic year found");
  }

  // Find academic terms for the current academic year
  const academicTerms = await AcademicTerm.find({ academicYear: academicYear._id });
  if (!academicTerms.length) {
    return responseStatus(res, 404, "failed", "No academic terms found for the current academic year");
  }

  // Find the term with isCurrent: true
  let currentTerm = null;
  for (const termDoc of academicTerms) {
    const foundTerm = termDoc.terms.find((term) => term.isCurrent);
    if (foundTerm) {
      currentTerm = {
        _id: termDoc._id,
        name: foundTerm.name,
        description: foundTerm.description,
        duration: foundTerm.duration,
        startDate: foundTerm.startDate,
        endDate: foundTerm.endDate,
        createdBy: foundTerm.createdBy,
        isCurrent: foundTerm.isCurrent,
        academicYear: academicYear._id,
      };
      break;
    }
  }

  if (!currentTerm) {
    return responseStatus(res, 404, "failed", "No current academic term found");
  }

  // Validate current term dates
  const validationError = validateCurrentTermDates(currentTerm.startDate, currentTerm.endDate, currentTerm.name, res);
  if (validationError) return validationError;

  return responseStatus(res, 200, "success", currentTerm);
};

/**
 * Get academic term by ID service.
 */
exports.getAcademicTermService = async (id, res) => {
  const academicTerm = await AcademicTerm.findById(id)
    .populate("academicYear")
    .populate("createdBy");
  if (!academicTerm) {
    return responseStatus(res, 404, "failed", "Academic Term not found");
  }
  return responseStatus(res, 200, "success", academicTerm);
};

/**
 * Delete academic term service.
 */
exports.deleteAcademicTermService = async (id, res) => {
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
};