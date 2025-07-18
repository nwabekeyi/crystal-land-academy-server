const Review = require('../models/review/index');
const Teacher = require('../models/Staff/teachers.model');
const mongoose = require('mongoose');

const updateTeacherAverageRating = async (teacherId) => {
  if (!mongoose.isValidObjectId(teacherId)) return;

  const reviews = await Review.find({ teacherId });
  const total = reviews.reduce((sum, r) => sum + r.rating, 0);
  const average = reviews.length ? total / reviews.length : 0;

  await Teacher.findByIdAndUpdate(teacherId, {
    rating: parseFloat(average.toFixed(2))
  });
};

module.exports = updateTeacherAverageRating;
