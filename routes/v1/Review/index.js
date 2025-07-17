const express = require('express');
const reviewRouter = express.Router();
const loggedIn = require('../../../middlewares/isLoggedIn');
const {
  createReviewController,
  getTeacherReviewsController,
  getReviewByIdController,
  updateReviewController,
  deleteReviewController,
  getCurrentAcademicYearController,
} = require('../../../controllers/Review/index');

reviewRouter.post('/reviews',  createReviewController);
reviewRouter.get('/reviews/teacher/:teacherId/year/:academicYearId', getTeacherReviewsController);reviewRouter.get('/reviews/:id',  getReviewByIdController);
reviewRouter.put('/reviews/:id',  updateReviewController);
reviewRouter.delete('/reviews/:id',  deleteReviewController);
reviewRouter.get('/academicYears/current',  getCurrentAcademicYearController);

module.exports = reviewRouter;