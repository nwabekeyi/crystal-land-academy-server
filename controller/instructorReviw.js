const{Instructor}= require('../models/schema/onlineUsers'); // Assuming your model is in 'models/instructor'

// GET all reviews for an instructor by userId
const getReviews = async (req, res) => {
  try {
    const userId = req.params.userId; // Get userId from params
    const instructor = await Instructor.findOne({ userId }).select('reviews'); // Find instructor by userId
    
    if (!instructor) {
      return res.status(404).json({ message: 'Instructor not found' });
    }

    return res.status(200).json(instructor.reviews);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// POST a new review for an instructor by userId
const addReview = async (req, res) => {
  try {
    const { userId, reviewText, rating } = req.body; // Get review details from request body
    const instructorUserId = req.params.userId; // Get instructor userId from params
    
    // Validate the review data
    if (!userId || !reviewText || !rating) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const review = {
      userId,
      reviewText,
      rating,
      createdAt: new Date().toISOString()
    };

    const instructor = await Instructor.findOne({ userId: instructorUserId });
    
    if (!instructor) {
      return res.status(404).json({ message: 'Instructor not found' });
    }

    // Add the review directly to the instructor's reviews array
    instructor.reviews.push(review);

    // Recalculate the instructor's average rating
    instructor.rating = instructor.calculateAverageRating();

    // Save the updated instructor document
    await instructor.save();
    
    return res.status(201).json({ message: 'Review added successfully', review });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
};


// DELETE a review for an instructor by userId
const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params; // Get review ID from params
    const instructorUserId = req.params.userId; // Get instructor userId from params
    
    const instructor = await Instructor.findOne({ userId: instructorUserId });
    
    if (!instructor) {
      return res.status(404).json({ message: 'Instructor not found' });
    }

    const reviewIndex = instructor.reviews.findIndex(review => review._id.toString() === reviewId);
    
    if (reviewIndex === -1) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Remove the review from the reviews array
    instructor.reviews.splice(reviewIndex, 1);
    instructor.rating = instructor.calculateAverageRating(); // Recalculate the average rating

    await instructor.save();
    
    return res.status(200).json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// UPDATE a review for an instructor by userId
const updateReview = async (req, res) => {
  try {
    const { reviewId } = req.params; // Get review ID from params
    const { reviewText, rating } = req.body; // Get updated review details from request body
    const instructorUserId = req.params.userId; // Get instructor userId from params
    
    // Validate the updated review data
    if (!reviewText || !rating) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const instructor = await Instructor.findOne({ userId: instructorUserId });
    
    if (!instructor) {
      return res.status(404).json({ message: 'Instructor not found' });
    }

    const review = instructor.reviews.id(reviewId);
    
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Update the review fields
    review.reviewText = reviewText;
    review.rating = rating;
    review.createdAt = new Date().toISOString(); // Optionally update the timestamp

    instructor.rating = instructor.calculateAverageRating(); // Recalculate the average rating

    await instructor.save();
    
    return res.status(200).json({ message: 'Review updated successfully', review });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
};


module.exports = {
    updateReview,
    getReviews,
    addReview,
    deleteReview
}