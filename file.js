// scripts/testReview.js
require('dotenv').config();
const mongoose = require('mongoose');
const { createReviewService } = require('./services/Review/index');
const Teacher = require('./models/Staff/teachers.model');

async function testReview() {
  try {
    await mongoose.connect(process.env.DB, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000,
    });
    console.log('Connected to MongoDB Atlas');

    const teacher = await Teacher.findOne({ teacherId: 'TEA37053CCT' }).lean();
    if (!teacher) throw new Error('Teacher not found');

    const AcademicYear = require('./models/Academic/academicYear.model');
    const academicYear = await AcademicYear.findOne({ isCurrent: true }).lean();
    if (!academicYear) throw new Error('Academic year not found');

    const Student = require('./models/Students/students.model');
    const student = await Student.findOne({}).lean();
    if (!student) throw new Error('Student not found');

    console.log('Student class:', student.currentClassLevel);
    console.log('AcademicYear:', academicYear._id);

    const reviewData = {
      id: `REV${Date.now()}`,
      studentId: student.studentId,
      teacherId: teacher._id.toString(),
      classId: 'Primary_Primary6_A',
      rating: 3,
      reviewText: 'Good teacher!',
      academicYearId: academicYear._id.toString(),
    };

    await createReviewService(reviewData);
    const updatedTeacher = await Teacher.findById(teacher._id).lean();
    console.log('Teacher data:', {
      teacherId: updatedTeacher.teacherId,
      rating: updatedTeacher.rating,
      reviews: updatedTeacher.reviews,
    });

    const Review = require('./models/review/index');
    const reviews = await Review.find({ teacherId: teacher._id }).lean();
    console.log('Reviews:', reviews.map(r => ({ id: r.id, rating: r.rating, _id: r._id })));

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB Atlas');
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

testReview().catch(console.error);