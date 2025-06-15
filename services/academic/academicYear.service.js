// services/academicYear.service.js
const AcademicYear = require("../../models/Academic/academicYear.model");
const responseStatus = require("../../handlers/responseStatus.handler"); // Adjust path as needed

// Create academic year service
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

  // Check if academic year already exists
  const existingYear = await AcademicYear.findOne({ name });
  if (existingYear) {
    return responseStatus(res, 400, "error", "Academic year already exists");
  }

  try {
    // If isCurrent is true, set any existing current academic year to false
    if (isCurrent) {
      await AcademicYear.updateOne(
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
      createdBy: createdBy,
      students: [],
      teachers: [],
    });

    return responseStatus(res, 201, "success", academicYear);
  } catch (error) {
    console.error("Error creating academic year:", error);
    return responseStatus(res, 500, "error", "Failed to create academic year");
  }
};

// Get all academic years service
exports.getAcademicYearsService = async (res) => {
  try {
    const academicYears = await AcademicYear.find().lean();
    return responseStatus(res, 200, "success", academicYears);
  } catch (error) {
    return responseStatus(res, 500, "error", "Failed to fetch academic years");
  }
};

// Get current academic year service
exports.getCurrentAcademicYearService = async (res) => {
  try {
    const currentYear = await AcademicYear.findOne({ isCurrent: true })
      .populate('createdBy', 'name email') // Optional: Populate createdBy
      .lean();
    if (!currentYear) {
      // Option 1: Keep 404 (current behavior)
      return responseStatus(res, 404, "error", "No current academic year found");
      
      // Option 2: Return 200 with null data (uncomment to use)
      // return responseStatus(res, 200, "success", null);
    }
    return responseStatus(res, 200, "success", currentYear);
  } catch (error) {
    console.error("Error fetching current academic year:", error.stack); // Enhanced logging
    return responseStatus(res, 500, "error", "Failed to fetch current academic year");
  }
};

// Get academic year by ID service
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

// Update academic year service
exports.updateAcademicYearService = async (res, data, academicId, userId) => {
  const { name, fromYear, toYear } = data;

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

  // Check if updated name already exists (excluding current ID)
  const existingYear = await AcademicYear.findOne({ name, _id: { $ne: academicId } });
  if (existingYear) {
    return responseStatus(res, 400, "error", "Academic year name already exists");
  }

  try {
    const academicYear = await AcademicYear.findByIdAndUpdate(
      academicId,
      { name, fromYear: fromDate, toYear: toDate, createdBy: userId },
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

// Change current academic year service
exports.changeCurrentAcademicYearService = async (res, academicId) => {
  try {
    // Verify academic year exists
    const academicYear = await AcademicYear.findById(academicId);
    if (!academicYear) {
      return responseStatus(res, 404, "error", "Academic year not found");
    }

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

// Delete academic year service
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