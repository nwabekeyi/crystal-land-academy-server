const express = require('express');
const router = express.Router();
const reviewsController = require('../controller/instructorReviw');

// Get all reviews for an instructor by userId
router.get('/api/v1/instructors/reviews/:userId', reviewsController.getReviews);

// Post a new review for an instructor by userId
router.post('/api/v1/instructors/reviews/:userId', reviewsController.addReview);

// Delete a review fora an instructor by userId
router.delete('/api/v1/instructors/reviews/:userId', reviewsController.deleteReview);

// Update a review for an instructor by userId
router.put('/api/v1/instructors/reviews/:userId', reviewsController.updateReview);

module.exports = router;


