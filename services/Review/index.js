const Review = require('../../models/review/index');
const Student = require('../../models/Students/students.model');
const ClassLevel = require('../../models/Academic/class.model');
const Teacher = require('../../models/Staff/teachers.model');
const AcademicYear = require('../../models/Academic/academicYear.model');
const mongoose = require('mongoose');
const updateTeacherAverageRating = require('../../utils/updateTeacherAverage');

/**
 * Create a new teacher review
 */
exports.createReviewService = async (data) => {
  const { id, studentId, teacherId, classId, rating, reviewText, academicYearId } = data;

  if (!id || !studentId || !teacherId || !classId || !rating || !academicYearId) {
    throw new Error('Missing required fields: id, studentId, teacherId, classId, rating, academicYearId');
  }

  // Check if the student has already reviewed this teacher for the current academic year
  const existingReview = await Review.findOne({ studentId, teacherId, academicYearId }).lean();
  if (existingReview) {
    return ('Student already reviewed');
  }

  const student = await Student.findOne({ studentId }).lean();
  if (!student) throw new Error('Invalid studentId');

  if (!mongoose.isValidObjectId(teacherId)) throw new Error('Invalid teacherId');
  const teacher = await Teacher.findById(teacherId);
  if (!teacher) throw new Error('Teacher not found');

  const academicYear = await AcademicYear.findById(academicYearId).lean();
  if (!academicYear || !academicYear.isCurrent) {
    throw new Error('Academic year not found or not current');
  }

  if (
    !student.currentClassLevel ||
    !student.currentClassLevel.section ||
    !student.currentClassLevel.className ||
    !student.currentClassLevel.subclass
  ) {
    throw new Error('Student class information is incomplete');
  }

  const expectedClassId = `${student.currentClassLevel.section}_${student.currentClassLevel.className.replace(/\s+/g, '')}_${student.currentClassLevel.subclass}`;
  if (classId !== expectedClassId) {
    throw new Error(`Invalid classId. Expected: ${expectedClassId}`);
  }

  if (student.currentClassLevel.academicYear.academicYearId.toString() !== academicYearId) {
    throw new Error(`Academic year mismatch. Student is in ${student.currentClassLevel.academicYear.name}`);
  }

  const classLevel = await ClassLevel.findOne({
    _id: student.classLevelId,
    academicYear: academicYearId,
    'teachers.teacherId': teacherId,
  }).lean();
  if (!classLevel) {
    throw new Error('Teacher not assigned to your class for this academic year');
  }

  const review = new Review({ id, studentId, teacherId, classId, rating, reviewText, academicYearId });
  const savedReview = await review.save();

  teacher.reviews.push(savedReview._id);
  await teacher.save();

  // Update teacher's average rating
  await updateTeacherAverageRating(teacherId);

  const className = `${student.currentClassLevel.section} ${student.currentClassLevel.className}${student.currentClassLevel.subclass}`;

  return {
    ...savedReview.toObject(),
    className,
    teacherName: `${teacher.firstName} ${teacher.lastName}`,
  };
};

/**
 * Get all reviews for a teacher in an academic year
 */
exports.getTeacherReviewsService = async (teacherId, academicYearId, skip = 0, limit = 10, sortBy = 'createdAt', sortDirection = 'desc') => {
  if (!mongoose.isValidObjectId(teacherId) || !mongoose.isValidObjectId(academicYearId)) {
    throw new Error('Invalid teacherId or academicYearId');
  }

  const teacher = await Teacher.findById(teacherId).lean();
  if (!teacher) throw new Error('Teacher not found');

  const academicYear = await AcademicYear.findById(academicYearId).lean();
  if (!academicYear) throw new Error('Academic year not found');

  const sortOptions = {};
  if (sortBy) sortOptions[sortBy] = sortDirection === 'asc' ? 1 : -1;

  const reviews = await Review.find({ teacherId, academicYearId })
    .sort(sortOptions)
    .skip(skip)
    .limit(limit)
    .lean();

  const studentIds = reviews.map((review) => review.studentId);
  const students = await Student.find({ studentId: { $in: studentIds } }).lean();

  return reviews.map((review) => {
    const student = students.find((s) => s.studentId === review.studentId);
    const className = student
      ? `${student.currentClassLevel.section} ${student.currentClassLevel.className}${student.currentClassLevel.subclass}`
      : 'N/A';
    return {
      ...review,
      className,
      teacherName: `${teacher.firstName} ${teacher.lastName}`,
    };
  });
};

/**
 * Get a single review by ID
 */
exports.getReviewByIdService = async (id) => {
  const review = await Review.findOne({ id }).lean();
  if (!review) throw new Error('Review not found');

  const student = await Student.findOne({ studentId: review.studentId }).lean();
  const teacher = await Teacher.findById(review.teacherId).lean();
  const className = student
    ? `${student.currentClassLevel.section} ${student.currentClassLevel.className}${student.currentClassLevel.subclass}`
    : 'N/A';
  const teacherName = teacher ? `${teacher.firstName} ${teacher.lastName}` : 'N/A';

  return {
    ...review,
    className,
    teacherName,
  };
};

/**
 * Update a review by ID
 */
exports.updateReviewService = async (id, updateData) => {
  const review = await Review.findOne({ id });
  if (!review) throw new Error('Review not found');

  if (updateData.studentId || updateData.teacherId || updateData.classId) {
    const studentId = updateData.studentId || review.studentId;
    const teacherId = updateData.teacherId || review.teacherId;
    const classId = updateData.classId || review.classId;
    const academicYearId = updateData.academicYearId || review.academicYearId;

    const student = await Student.findOne({ studentId }).lean();
    if (!student) throw new Error('Invalid studentId');

    if (!mongoose.isValidObjectId(teacherId)) throw new Error('Invalid teacherId');
    const teacher = await Teacher.findById(teacherId).lean();
    if (!teacher) throw new Error('Teacher not found');

    const expectedClassId = `${student.currentClassLevel.section}_${student.currentClassLevel.className.replace(/\s+/g, '')}_${student.currentClassLevel.subclass}`;
    if (classId !== expectedClassId) {
      throw new Error(`Invalid classId. Expected: ${expectedClassId}`);
    }

    const classLevel = await ClassLevel.findOne({
      _id: student.classLevelId,
      academicYear: academicYearId,
      'teachers.teacherId': teacherId,
    }).lean();
    if (!classLevel) {
      throw new Error('Teacher not assigned to this class for the specified academic year');
    }
  }

  const updatedReview = await Review.findOneAndUpdate(
    { id },
    { $set: updateData },
    { new: true, runValidators: true, context: 'query' }
  ).lean();

  if (!updatedReview) throw new Error('Review not found');

  // ✅ Recalculate average rating
  await updateTeacherAverageRating(updatedReview.teacherId);

  const student = await Student.findOne({ studentId: updatedReview.studentId }).lean();
  const teacher = await Teacher.findById(updatedReview.teacherId).lean();
  const className = student
    ? `${student.currentClassLevel.section} ${student.currentClassLevel.className}${student.currentClassLevel.subclass}`
    : 'N/A';
  const teacherName = teacher ? `${teacher.firstName} ${teacher.lastName}` : 'N/A';

  return {
    ...updatedReview,
    className,
    teacherName,
  };
};

/**
 * Delete a review by ID
 */
exports.deleteReviewService = async (id) => {
  const review = await Review.findOneAndDelete({ id });
  if (!review) throw new Error('Review not found');

  // ✅ Recalculate average rating
  await updateTeacherAverageRating(review.teacherId);

  const student = await Student.findOne({ studentId: review.studentId }).lean();
  const teacher = await Teacher.findById(review.teacherId).lean();
  const className = student
    ? `${student.currentClassLevel.section} ${student.currentClassLevel.className}${student.currentClassLevel.subclass}`
    : 'N/A';
  const teacherName = teacher ? `${teacher.firstName} ${teacher.lastName}` : 'N/A';

  return {
    ...review.toObject(),
    className,
    teacherName,
  };
};

/**
 * Get current academic year
 */
exports.getCurrentAcademicYearService = async () => {
  const academicYear = await AcademicYear.findOne({ isCurrent: true }).lean();
  if (!academicYear) {
    throw new Error('No current academic year found');
  }
  return academicYear;
};
