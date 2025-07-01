// services/academicYear.service.js
const AcademicYear = require("../../models/Academic/academicYear.model");
const responseStatus = require("../../handlers/responseStatus.handler");

// Helper function to validate isCurrent academic year date constraints
const validateCurrentYearDates = (fromYear, toYear, res) => {
  const now = new Date();
  const oneMonthFromNow = new Date();
  oneMonthFromNow.setMonth(now.getMonth() + 1);

  const start = new Date(fromYear);
  const end = new Date(toYear);

  // Check if start date is more than one month ahead
  if (start > oneMonthFromNow) {
    return responseStatus(res, 400, "error", "Academic year cannot be current: start date is more than one month in the future");
  }

  // Check if end date is in the past
  if (end < now) {
    return responseStatus(res, 400, "error", "Academic year cannot be current: end date is in the past");
  }

  return null; // Valid
};

// Helper function to validate academic year duration (at least one year)
const validateYearDuration = (fromYear, toYear, res) => {
  const start = new Date(fromYear);
  const end = new Date(toYear);
  const oneYearInMs = 365 * 24 * 60 * 60 * 1000; // One year in milliseconds

  if ((end - start) < oneYearInMs) {
    return responseStatus(res, 400, "error", "Academic year must span at least one year");
  }

  return null; // Valid
};

/**
 * Create academic year service.
 */
exports.createAcademicYearService = async (res, data) => {
  const { name, fromYear, toYear, isCurrent, createdBy } = data;

  // Validate inputs
  if (!name || !fromYear || !toYear) {
    return responseStatus(res, 400, "error", "Name, fromYear, and toYear are required");
  }

  // Validate dates
  const fromDate = new Date(fromYear);
  const toDate = new Date(toYear);
  if (isNaN(fromDate) || isNaN(toDate)) {
    return responseStatus(res, 400, "error", "Invalid date format for fromYear or toYear");
  }
  if (fromDate >= toDate) {
    return responseStatus(res, 400, "error", "fromYear must be before toYear");
  }

  // Validate minimum duration of one year
  const durationError = validateYearDuration(fromYear, toYear, res);
  if (durationError) return durationError;

  // Validate isCurrent date constraints
  if (isCurrent) {
    const validationError = validateCurrentYearDates(fromYear, toYear, res);
    if (validationError) return validationError;
  }

  // Check if academic year already exists
  const existingYear = await AcademicYear.findOne({ name });
  if (existingYear) {
    return responseStatus(res, 400, "error", "Academic year already exists");
  }

  try {
    // If isCurrent is true, set any existing current academic year to false
    if (isCurrent) {
      await AcademicYear.updateMany(
        { isCurrent: true },
        { $set: { isCurrent: false } }
      );
    }

    // Create academic year
    const academicYear = await AcademicYear.create({
      name,
      fromYear: fromDate,
      toYear: toDate,
      isCurrent: isCurrent || false,
      createdBy,
      students: [],
      teachers: [],
    });

    return responseStatus(res, 201, "success", academicYear);
  } catch (error) {
    console.error("Error creating academic year:", error);
    return responseStatus(res, 500, "error", "Failed to create academic year");
  }
};

/**
 * Get all academic years service.
 */
exports.getAcademicYearsService = async (res) => {
  try {
    const academicYears = await AcademicYear.find().lean();
    return responseStatus(res, 200, "success", academicYears);
  } catch (error) {
    return responseStatus(res, 500, "error", "Failed to fetch academic years");
  }
};

/**
 * Get current academic year service.
 */
exports.getCurrentAcademicYearService = async (res) => {
  try {
    const currentYear = await AcademicYear.findOne({ isCurrent: true })
      .populate('createdBy', 'name email')
      .lean();
    if (!currentYear) {
      return responseStatus(res, 404, "error", "No current academic year found");
    }
    return responseStatus(res, 200, "success", currentYear);
  } catch (error) {
    console.error("Error fetching current academic year:", error.stack);
    return responseStatus(res, 500, "error", "Failed to fetch current academic year");
  }
};

/**
 * Get academic year by ID service.
 */
exports.getAcademicYearService = async (res, id) => {
  try {
    const academicYear = await AcademicYear.findById(id).lean();
    if (!academicYear) {
      return responseStatus(res, 404, "error", "Academic year not found");
    }
    return responseStatus(res, 200, "success", academicYear);
  } catch (error) {
    return responseStatus(res, 500, "error", "Failed to fetch academic year");
  }
};

/**
 * Update academic year service.
 */
exports.updateAcademicYearService = async (res, data, academicId, userId) => {
  const { name, fromYear, toYear, isCurrent } = data;

  // Validate inputs
  if (!name || !fromYear || !toYear) {
    return responseStatus(res, 400, "error", "Name, fromYear, and toYear are required");
  }

  // Validate dates
  const fromDate = new Date(fromYear);
  const toDate = new Date(toYear);
  if (isNaN(fromDate) || isNaN(toDate)) {
    return responseStatus(res, 400, "error", "Invalid date format for fromYear or toYear");
  }
  if (fromDate >= toDate) {
    return responseStatus(res, 400, "error", "fromYear must be before toYear");
  }

  // Validate minimum duration of one year
  const durationError = validateYearDuration(fromYear, toYear, res);
  if (durationError) return durationError;

  // Validate isCurrent date constraints
  if (isCurrent) {
    const validationError = validateCurrentYearDates(fromYear, toYear, res);
    if (validationError) return validationError;
  }

  // Check if updated name already exists (excluding current ID)
  const existingYear = await AcademicYear.findOne({ name, _id: { $ne: academicId } });
  if (existingYear) {
    return responseStatus(res, 400, "error", "Academic year name already exists");
  }

  try {
    // If isCurrent is true, set other academic years to isCurrent: false
    if (isCurrent) {
      await AcademicYear.updateMany(
        { _id: { $ne: academicId }, isCurrent: true },
        { $set: { isCurrent: false } }
      );
    }

    const academicYear = await AcademicYear.findByIdAndUpdate(
      academicId,
      { name, fromYear: fromDate, toYear: toDate, createdBy: userId, isCurrent: isCurrent || false },
      { new: true, runValidators: true }
    ).lean();
    if (!academicYear) {
      return responseStatus(res, 404, "error", "Academic year not found");
    }
    return responseStatus(res, 200, "success", academicYear);
  } catch (error) {
    return responseStatus(res, 500, "error", "Failed to update academic year");
  }
};

/**
 * Change current academic year service.
 */
exports.changeCurrentAcademicYearService = async (res, academicId) => {
  try {
    // Verify academic year exists
    const academicYear = await AcademicYear.findById(academicId);
    if (!academicYear) {
      return responseStatus(res, 404, "error", "Academic year not found");
    }

    // Validate date constraints for isCurrent
    const validationError = validateCurrentYearDates(academicYear.fromYear, academicYear.toYear, res);
    if (validationError) return validationError;

    // Validate minimum duration of one year
    const durationError = validateYearDuration(academicYear.fromYear, academicYear.toYear, res);
    if (durationError) return durationError;

    // Set all academic years to isCurrent: false
    await AcademicYear.updateMany({}, { isCurrent: false });

    // Set specified academic year to isCurrent: true
    const updatedYear = await AcademicYear.findByIdAndUpdate(
      academicId,
      { isCurrent: true },
      { new: true, runValidators: true }
    ).lean();

    return responseStatus(res, 200, "success", updatedYear);
  } catch (error) {
    return responseStatus(res, 500, "error", "Failed to change current academic year");
  }
};

/**
 * Delete academic year service.
 */
exports.deleteAcademicYearService = async (res, id) => {
  try {
    const academicYear = await AcademicYear.findByIdAndDelete(id).lean();
    if (!academicYear) {
      return responseStatus(res, 404, "error", "Academic year not found");
    }
    return responseStatus(res, 200, "success", academicYear);
  } catch (error) {
    return responseStatus(res, 500, "error", "Failed to delete academic year");
  }
};