const {
  createReviewService,
  getTeacherReviewsService,
  getReviewByIdService,
  updateReviewService,
  deleteReviewService,
  getCurrentAcademicYearService,
} = require('../../services/Review/index');

/**
 * Create a new teacher review
 */
exports.createReviewController = async (req, res) => {
  try {
    console.log('Incoming request body:', req.body);
    console.log('req.userAuth:', req.userAuth); // Debug

    const requiredFields = ['id', 'studentId', 'teacherId', 'classId', 'rating', 'academicYearId'];
    const missingFields = requiredFields.filter((field) => !req.body[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: `Missing required fields: ${missingFields.join(', ')}`,
        missingFields,
      });
    }

    // Optional: Validate authenticated user if middleware is present
    if (req.userAuth && req.userAuth.studentId && req.userAuth.studentId !== req.body.studentId) {
      return res.status(403).json({
        status: 'error',
        message: 'You can only submit reviews for yourself',
      });
    }

    const review = await createReviewService(req.body);

    if(review === 'Student already reviewed'){
      return res.status(200).json({
        status: 'already reviewed',
        message: 'You already reviewed and rated this teacher',
      });
    }

    return res.status(201).json({
      status: 'success',
      message: 'Teacher review created successfully',
      data: review,
    });
  } catch (error) {
    console.error('Error in createReviewController:', error);
    return res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to create review',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
};

/**
 * Get all reviews for a teacher in an academic year
 */
exports.getTeacherReviewsController = async (req, res) => {
  try {
    const { teacherId, academicYearId } = req.params; // ✅ fix here
    const { page = 1, limit = 10, sortBy = 'createdAt', sortDirection = 'desc' } = req.query;

    if (!teacherId || !academicYearId) {
      return res.status(400).json({
        status: 'error',
        message: 'teacherId and academicYearId are required',
      });
    }

    const skip = (page - 1) * limit;
    const reviews = await getTeacherReviewsService(
      teacherId,
      academicYearId,
      skip,
      parseInt(limit),
      sortBy,
      sortDirection
    );

    return res.status(200).json({
      status: 'success',
      message: 'Teacher reviews fetched successfully',
      data: reviews,
    });
  } catch (error) {
    console.error('Error in getTeacherReviewsController:', error);
    return res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to fetch teacher reviews',
    });
  }
};

/**
 * Get a single review by ID
 */
exports.getReviewByIdController = async (req, res) => {
  try {
    const { id } = req.params;

    const review = await getReviewByIdService(id);

    return res.status(200).json({
      status: 'success',
      message: 'Review fetched successfully',
      data: review,
    });
  } catch (error) {
    console.error('Error in getReviewByIdController:', error);
    return res.status(404).json({
      status: 'error',
      message: error.message || 'Review not found',
    });
  }
};

/**
 * Update a review by ID
 */
exports.updateReviewController = async (req, res) => {
  try {
    const { id } = req.params;

    if (Object.keys(req.body).length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No update data provided',
      });
    }

    // Optional: Validate authenticated user if middleware is present
    if (req.userAuth && req.userAuth.studentId) {
      const review = await getReviewByIdService(id);
      if (req.userAuth.studentId !== review.studentId) {
        return res.status(403).json({
          status: 'error',
          message: 'You can only update your own reviews',
        });
      }
    }

    console.log('Update data:', req.body); // Debug
    const updatedReview = await updateReviewService(id, req.body);

    return res.status(200).json({
      status: 'success',
      message: 'Review updated successfully',
      data: updatedReview,
    });
  } catch (error) {
    console.error('Error in updateReviewController:', error);
    return res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to update review',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
};

/**
 * Delete a review by ID
 */
exports.deleteReviewController = async (req, res) => {
  try {
    const { id } = req.params;

    // Optional: Validate authenticated user if middleware is present
    if (req.userAuth && req.userAuth.studentId) {
      const review = await getReviewByIdService(id);
      if (req.userAuth.studentId !== review.studentId) {
        return res.status(403).json({
          status: 'error',
          message: 'You can only delete your own reviews',
        });
      }
    }

    const deletedReview = await deleteReviewService(id);

    return res.status(200).json({
      status: 'success',
      message: 'Review deleted successfully',
      data: deletedReview,
    });
  } catch (error) {
    console.error('Error in deleteReviewController:', error);
    return res.status(404).json({
      status: 'error',
      message: error.message || 'Failed to delete review',
    });
  }
};

/**
 * Get current academic year
 */
exports.getCurrentAcademicYearController = async (req, res) => {
  try {
    const academicYear = await getCurrentAcademicYearService();
    return res.status(200).json({
      status: 'success',
      message: 'Current academic year fetched successfully',
      data: academicYear,
    });
  } catch (error) {
    console.error('Error in getCurrentAcademicYearController:', error);
    return res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to fetch current academic year',
    });
  }
};