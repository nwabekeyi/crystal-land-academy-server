const express = require('express');
const router = express.Router();
const instructorController = require('../controller/instructorReviewsController'); 

// Get reviews for an instructor
router.get('/instructors/:instructorId/reviews', instructorController.getReviews);

// Add a new review for an instructor
router.post('/instructors/:instructorId/reviews', instructorController.addReview);

// Update an existing review
router.put('/instructors/:instructorId/reviews/:reviewId', instructorController.updateReview);

// Delete a review
router.delete('/instructors/:instructorId/reviews/:reviewId', instructorController.deleteReview);

module.exports = router;

