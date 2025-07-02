const academicYearService = require('../../services/students/studentAcademicYear.service');

exports.getAllAcademicYears = async (req, res) => {
  try {
    const academicYears = await academicYearService.getAllAcademicYears();
    res.status(200).json({
      status: 'success',
      data: academicYears,
    });
  } catch (error) {
    console.error('Error in getAllAcademicYears controller:', error.message);
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
};