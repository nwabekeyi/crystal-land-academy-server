const AcademicYear = require('../../models/Academic/academicYear.model');

const getAllAcademicYears = async () => {
  try {
    const academicYears = await AcademicYear.find({}, '_id name')
      .lean()
      .exec();
    return academicYears.map((ay) => ({
      academicYearId: ay._id.toString(),
      name: ay.name,
    }));
  } catch (error) {
    throw new Error(`Failed to fetch academic years: ${error.message}`);
  }
};

module.exports = {
  getAllAcademicYears,
};