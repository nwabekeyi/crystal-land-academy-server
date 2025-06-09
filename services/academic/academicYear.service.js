// services/academicYear.service.js
const AcademicYear = require("../../models/Academic/academicYear.model");

// Create academic year service
exports.createAcademicYearService = async (data, userId) => {
  const { name, fromYear, toYear } = data;

  // Validate inputs
  if (!name || !fromYear || !toYear) {
    return { status: 400, success: false, message: "Name, fromYear, and toYear are required" };
  }

  // Validate dates
  const fromDate = new Date(fromYear);
  const toDate = new Date(toYear);
  if (isNaN(fromDate) || isNaN(toDate)) {
    return { status: 400, success: false, message: "Invalid date format for fromYear or toYear" };
  }
  if (fromDate >= toDate) {
    return { status: 400, success: false, message: "fromYear must be before toYear" };
  }

  // Check if academic year already exists
  const existingYear = await AcademicYear.findOne({ name });
  if (existingYear) {
    return { status: 400, success: false, message: "Academic year already exists" };
  }

  // Create academic year
  try {
    const academicYear = await AcademicYear.create({
      name,
      fromYear: fromDate,
      toYear: toDate,
      createdBy: userId,
      isCurrent: false, // Default per schema
      students: [],
      teachers: [],
    });
    return { status: 201, success: true, data: academicYear };
  } catch (error) {
    return { status: 500, success: false, message: "Failed to create academic year" };
  }
};

// Get all academic years service
exports.getAcademicYearsService = async () => {
  try {
    const academicYears = await AcademicYear.find().lean();
    return { status: 200, success: true, data: academicYears };
  } catch (error) {
    return { status: 500, success: false, message: "Failed to fetch academic years" };
  }
};

// Get current academic year service
exports.getCurrentAcademicYearService = async () => {
  try {
    const currentYear = await AcademicYear.findOne({ isCurrent: true }).lean();
    if (!currentYear) {
      return { status: 404, success: false, message: "No current academic year found" };
    }
    return { status: 200, success: true, data: currentYear };
  } catch (error) {
    return { status: 500, success: false, message: "Failed to fetch current academic year" };
  }
};

// Get academic year by ID service
exports.getAcademicYearService = async (id) => {
  try {
    const academicYear = await AcademicYear.findById(id).lean();
    if (!academicYear) {
      return { status: 404, success: false, message: "Academic year not found" };
    }
    return { status: 200, success: true, data: academicYear };
  } catch (error) {
    return { status: 500, success: false, message: "Failed to fetch academic year" };
  }
};

// Update academic year service
exports.updateAcademicYearService = async (data, academicId, userId) => {
  const { name, fromYear, toYear } = data;

  // Validate inputs
  if (!name || !fromYear || !toYear) {
    return { status: 400, success: false, message: "Name, fromYear, and toYear are required" };
  }

  // Validate dates
  const fromDate = new Date(fromYear);
  const toDate = new Date(toYear);
  if (isNaN(fromDate) || isNaN(toDate)) {
    return { status: 400, success: false, message: "Invalid date format for fromYear or toYear" };
  }
  if (fromDate >= toDate) {
    return { status: 400, success: false, message: "fromYear must be before toYear" };
  }

  // Check if updated name already exists (excluding current ID)
  const existingYear = await AcademicYear.findOne({ name, _id: { $ne: academicId } });
  if (existingYear) {
    return { status: 400, success: false, message: "Academic year name already exists" };
  }

  // Update academic year
  try {
    const academicYear = await AcademicYear.findByIdAndUpdate(
      academicId,
      { name, fromYear: fromDate, toYear: toDate, createdBy: userId },
      { new: true, runValidators: true }
    ).lean();
    if (!academicYear) {
      return { status: 404, success: false, message: "Academic year not found" };
    }
    return { status: 200, success: true, data: academicYear };
  } catch (error) {
    return { status: 500, success: false, message: "Failed to update academic year" };
  }
};

// Change current academic year service
exports.changeCurrentAcademicYearService = async (academicId) => {
  try {
    // Verify academic year exists
    const academicYear = await AcademicYear.findById(academicId);
    if (!academicYear) {
      return { status: 404, success: false, message: "Academic year not found" };
    }

    // Set all academic years to isCurrent: false
    await AcademicYear.updateMany({}, { isCurrent: false });

    // Set specified academic year to isCurrent: true
    const updatedYear = await AcademicYear.findByIdAndUpdate(
      academicId,
      { isCurrent: true },
      { new: true, runValidators: true }
    ).lean();

    return { status: 200, success: true, data: updatedYear };
  } catch (error) {
    return { status: 500, success: false, message: "Failed to change current academic year" };
  }
};

// Delete academic year service
exports.deleteAcademicYearService = async (id) => {
  try {
    const academicYear = await AcademicYear.findByIdAndDelete(id).lean();
    if (!academicYear) {
      return { status: 404, success: false, message: "Academic year not found" };
    }
    return { status: 200, success: true, data: academicYear };
  } catch (error) {
    return { status: 500, success: false, message: "Failed to delete academic year" };
  }
};