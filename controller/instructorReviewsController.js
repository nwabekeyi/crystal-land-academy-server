const {Instructor} = require('../models/schema/onlineUsers'); // Assuming Instructor model is in the models folder

// GET - Get all reviews for an instructor
const getReviews = async (req, res) => {
  const { instructorId } = req.params;
  
  try {
    const instructor = await Instructor.findById(instructorId);
    if (!instructor) {
      return res.status(404).json({ message: 'Instructor not found' });
    }
    return res.status(200).json(instructor.reviews);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server Error' });
  }
};

// POST - Add a new review for an instructor
const addReview = async (req, res) => {
  const { instructorId } = req.params;
  const { userId, reviewText, rating } = req.body;

  if (!userId || !reviewText || !rating) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    const instructor = await Instructor.findById(instructorId);
    if (!instructor) {
      return res.status(404).json({ message: 'Instructor not found' });
    }

    const newReview = {
      userId,
      reviewText,
      rating,
      createdAt: new Date().toISOString(),
    };

    // Add the new review and update the average rating
    await instructor.addReview(newReview);

    return res.status(201).json({ message: 'Review added successfully', reviews: instructor.reviews });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server Error' });
  }
};

// PUT - Update an existing review
const updateReview = async (req, res) => {
  const { instructorId, reviewId } = req.params;
  const { reviewText, rating } = req.body;

  if (!reviewText && !rating) {
    return res.status(400).json({ message: 'No changes detected in review' });
  }

  try {
    const instructor = await Instructor.findById(instructorId);
    if (!instructor) {
      return res.status(404).json({ message: 'Instructor not found' });
    }

    const review = instructor.reviews.id(reviewId);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Update the review text and rating if provided
    if (reviewText) {
      review.reviewText = reviewText;
    }
    if (rating) {
      review.rating = rating;
    }

    // Recalculate the average rating
    instructor.rating = instructor.calculateAverageRating();
    await instructor.save();

    return res.status(200).json({ message: 'Review updated successfully', reviews: instructor.reviews });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server Error' });
  }
};

// DELETE - Delete a review
const deleteReview = async (req, res) => {
  const { instructorId, reviewId } = req.params;

  try {
    const instructor = await Instructor.findById(instructorId);
    if (!instructor) {
      return res.status(404).json({ message: 'Instructor not found' });
    }

    const review = instructor.reviews.id(reviewId);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Remove the review and recalculate the average rating
    review.remove();
    instructor.rating = instructor.calculateAverageRating();
    await instructor.save();

    return res.status(200).json({ message: 'Review deleted successfully', reviews: instructor.reviews });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = {
  getReviews,
  addReview,
  updateReview,
  deleteReview,
};

