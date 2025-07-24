// utils/updateTeacherAverage.js
const mongoose = require('mongoose');
const Teacher = require('../models/Staff/teachers.model');
const Review = require('../models/review/index');

const updateTeacherAverageRating = async (teacherId, session = null) => {
  try {
    console.log('🔍 Updating teacher rating for:', teacherId);

    const teacher = await Teacher.findById(teacherId).lean();
    if (!teacher) {
      throw new Error('Teacher not found');
    }

    console.log('🔍 Previous rating:', teacher.rating);

    const reviews = await Review.find({ teacherId: teacher._id })
      .select('rating')
      .lean()
      .session(session);

    const validRatings = reviews
      .map(review => review.rating)
      .filter(rating => typeof rating === 'number' && !isNaN(rating));

    const sum = validRatings.reduce((acc, rating) => acc + rating, 0);
    const newRating = validRatings.length > 0 ? Number((sum / validRatings.length).toFixed(2)) : 0;

    console.log('✅ New rating saved:', newRating);

    const updateOptions = session ? { session } : {};
    await Teacher.updateOne(
      { _id: teacher._id },
      { $set: { rating: newRating } },
      updateOptions
    );

    console.log(`✅ Updated teacher (${teacher._id}) rating to:`, newRating);
    return newRating;
  } catch (error) {
    console.error('Error updating teacher rating:', error);
    throw error;
  }
};

module.exports = updateTeacherAverageRating;