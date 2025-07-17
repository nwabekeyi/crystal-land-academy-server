const ClassLevel = require('../../models/Academic/class.model');
const Teacher = require('../../models/Staff/teachers.model');
const mongoose = require('mongoose');

exports.getTeachersByClassLevelIdService = async (classLevelId) => {
  console.log('Received classLevelId:', classLevelId); // Debug

  if (!mongoose.isValidObjectId(classLevelId)) {
    throw new Error('Invalid class level MongoDB ID');
  }

  // Fetch the class level document
  const classLevel = await ClassLevel.findById(classLevelId).lean();
  console.log('ClassLevel:', classLevel); // Debug

  if (!classLevel) {
    throw new Error('Class level not found');
  }

  // Extract teacher IDs from the class level
  const teacherIds = classLevel.teachers.map((t) => t.teacherId);
  console.log('Teacher IDs:', teacherIds); // Debug

  if (teacherIds.length === 0) {
    return []; // No teachers assigned to this class
  }

  // Fetch teachers based on the teacher IDs and other filters
  const teachers = await Teacher.find({
    _id: { $in: teacherIds }
  }).lean();
  console.log("Basic teacher check:", teachers);
  

  // Map the teacher data to the desired format
  return teachers.map((teacher) => ({
    _id: teacher._id,
    teacherId: teacher.teacherId,
    name: `${teacher.firstName} ${teacher.lastName}`,
    firstName: teacher.firstName,
    lastName: teacher.lastName,
    role: teacher.subject.length > 0 ? 'Teacher' : 'Teacher',
    program: classLevel.section || 'Unknown',
    profilePictureUrl: teacher.profilePictureUrl || '',
  }));
};