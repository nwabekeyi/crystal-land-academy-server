const { getTeachersByClassLevelIdService } = require('../../services/Review/teacherToReview.service');

exports.getTeachersByClassLevelIdController = async (req, res) => {
  try {
    const { classLevelId } = req.params; // Extract classLevelId from request params
    console.log('Class Level ID:', classLevelId); // Debug

    const teachers = await getTeachersByClassLevelIdService(classLevelId);

    res.status(200).json({
      status: 'success',
      message: 'Teachers fetched successfully',
      data: teachers,
    });
  } catch (error) {
    console.error('Error fetching teachers:', error);
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to fetch teachers',
    });
  }
};