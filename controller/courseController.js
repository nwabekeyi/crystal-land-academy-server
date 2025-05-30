const {Course, Cohort} = require('../models/schema/courseSchema');  // Adjust the path based on your folder structure
const Chatroom = require('../models/schema/chatRoom');
const {Student, Instructor} = require('../models/schema/onlineUsers');

// Function to generate a unique courseId
async function generateCourseId(courseName) {
  const baseCourseId = `${courseName.replace(/\s+/g, '')}`; // Remove spaces in courseName
  let randomNumber = Math.floor(10000 + Math.random() * 90000); // Generate a 5-digit number
  let courseId = baseCourseId + randomNumber;

  // Check if the generated courseId already exists in the database
  const existingCourse = await Course.findOne({ courseId });

  // If the courseId exists, generate a new one and try again
  while (existingCourse) {
    randomNumber = Math.floor(10000 + Math.random() * 90000); // Generate new 5-digit number
    courseId = baseCourseId + randomNumber;
    existingCourse = await Course.findOne({ courseId });
  }

  return courseId;
}

// Controller function to create a new course
async function addCourse(req, res) {
  try {
    const { courseName, cost, duration, description, startDate, instructors, curriculum, students } = req.body;

    // Generate a unique courseId
    const courseId = await generateCourseId(courseName);

    // Create a new course with the generated courseId
    const newCourse = new Course({
      courseName,
      courseId,
      cost,
      duration,
      description,
      startDate,
      instructors,
      curriculum,
      students,
    });

    // Save the course to the database
    await newCourse.save();

    res.status(201).json({ message: "Course created successfully", course: newCourse });
  } catch (error) {
    res.status(500).json({ message: "Error creating course", error });
  }
};

// Get all courses
const getCourses = async (req, res) => {
  try {
    // Fetch all courses from the database
    const courses = await Course.find();

    return res.status(200).json({
      message: 'Courses fetched successfully',
      courses,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Error fetching courses',
      error: error.message,
    });
  }
};

// Update a course
const updateCourse = async (req, res) => {
  const { courseId } = req.params; // Using courseId from the request parameters
  const updatedDetails = req.body;

  try {
    // Find the course by courseId and update it
    const course = await Course.findOneAndUpdate({ courseId: courseId }, updatedDetails, { new: true });

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    return res.status(200).json({
      message: 'Course updated successfully',
      course,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Error updating course',
      error: error.message,
    });
  }
};

const deleteCourse = async (req, res) => {
  const { courseId } = req.params; // Using courseId from the request parameters

  try {
    // Find the course by courseId
    const course = await Course.findOne({ courseId: courseId });

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Loop over the cohort IDs in the course
    for (const cohortId of course.cohorts) {
      // Find and delete the cohort from the Cohorts collection
      const cohort = await Cohort.findByIdAndDelete(cohortId);

      if (cohort) {
        // Delete the corresponding chatroom where cohort.cohortName === chatRoom.name
        await Chatroom.findOneAndDelete({ name: cohort.cohortName });
      }
    }

    // After deleting cohorts and chatrooms, delete the course itself
    await Course.findOneAndDelete({ courseId: courseId });

    // Update all students and instructors with the deleted course name
    await Student.updateMany(
      { program: course.courseName },
      { $set: { program: '', cohort: '' } } // Set program and cohort to empty string
    );

    await Instructor.updateMany(
      { program: course.courseName },
      { $set: { program: '', cohort: '' } } // Set program and cohort to empty string
    );

    return res.status(200).json({
      message: 'Course and related cohorts and chatrooms deleted successfully, program and cohort updated for students and instructors',
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Error deleting course and related data',
      error: error.message,
    });
  }
};



module.exports = {
  addCourse,
  getCourses,
  updateCourse,
  deleteCourse,
};
