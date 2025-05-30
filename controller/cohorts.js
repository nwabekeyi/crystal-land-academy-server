const { Course, Cohort } = require('../models/schema/courseSchema'); 
const Chatroom = require('../models/schema/chatRoom'); 
const {Student, Instructor, Admin, SuperAdmin} = require('../models/schema/onlineUsers');

// Add a new cohort to a course and automatically create a chatroom
const addCohort = async (req, res) => {
  try {
    const { courseId } = req.params; 
    const cohortData = req.body;

    // Find the course by the custom courseId field (not _id)
    const course = await Course.findOne({ courseId });
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Create a new cohort document
    const newCohort = new Cohort({
      courseId,
      cohortName: cohortData.name,  
      instructor: '', 
      assignments: [],  
      students: [],  
      timetable: [],  
    });

    // Save the new cohort to the database
    await newCohort.save();

    // Fetch all admins and superadmins from their respective collections
    const admins = await Admin.find({});
    const superAdmins = await SuperAdmin.find({});

    // Combine admins and superadmins into one array
    const allAdmins = [...admins, ...superAdmins];

    // Map all admins and superadmins into the participant structure
    const participants = allAdmins.map(admin => ({
      userId: admin._id,
      firstName: admin.firstName,
      lastName: admin.lastName,
      role: admin.role,  // Assume `role` is a field in the Admin and SuperAdmin schema
      profilePictureUrl: admin.profilePictureUrl // Assume this field exists
    }));

    // Include the cohort instructor as a participant if available
    if (cohortData.instructorId) {
      const instructor = await Instructor.findById(cohortData.instructorId);
      if (instructor) {
        participants.push({
          userId: instructor._id,
          firstName: instructor.firstName,
          lastName: instructor.lastName,
          role: 'Instructor',
          profilePictureUrl: instructor.profilePictureUrl,
        });
      }
    }

    // Create the chatroom for the cohort with the admins, superadmins, and instructor
    const newChatroom = new Chatroom({
      name: cohortData.name, 
      participants, // Add admins, superadmins, and instructor to participants
    });

    // Save the new chatroom to the database
    await newChatroom.save();

    // Add the newly created cohort's _id to the course's cohorts array
    course.cohorts.push(newCohort.id);

    // Save the updated course with the new cohort
    await course.save();

    res.status(201).json({
      message: 'Cohort added successfully, and chatroom created with participants',
      course,
      cohort: newCohort,
      chatroom: newChatroom,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error adding cohort and creating chatroom', error });
  }
};

// Get all cohorts for a course
const getAllCohorts = async (req, res) => {
  try {
    const { courseId } = req.params;

    // Find all cohorts associated with the courseId
    const cohorts = await Cohort.find({ courseId });
    if (!cohorts || cohorts.length === 0) {
      return res.status(404).json({ message: 'No cohorts found for this course' });
    }

    res.status(200).json({ cohorts });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching cohorts', error });
  }
};

// Get a single cohort from a course using cohortName
const getCohort = async (req, res) => {
  try {
    const { courseId, cohortName } = req.params;

    // Find the cohort by courseId and cohortName
    const cohort = await Cohort.findOne({ courseId, cohortName });
    if (!cohort) {
      return res.status(404).json({ message: 'Cohort not found' });
    }

    res.status(200).json({ cohort });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching cohort', error });
  }
};

// Delete a cohort from a course using cohortName
const deleteCohort = async (req, res) => {
  try {
    const { courseId, cohortName } = req.params;

    // Find and delete the cohort by courseId and cohortName
    const cohort = await Cohort.findOneAndDelete({ courseId, cohortName });
    if (!cohort) {
      return res.status(404).json({ message: 'Cohort not found' });
    }

    // Remove the cohort's _id from the course's cohorts array
    const course = await Course.findOne({ courseId });
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    course.cohorts = course.cohorts.filter(id => id.toString() !== cohort._id.toString());
    await course.save();

    // Update all students and instructors associated with the deleted cohort
    await Student.updateMany(
      { cohort: cohort.cohortName },
      { $set: { cohort: '' } } 
    );

    await Instructor.updateMany(
      { cohort: cohort.cohortName },
      { $set: { cohort: '' } } 
    );

    // Delete the corresponding chatroom where the name matches the cohort name
    await Chatroom.findOneAndDelete({ name: cohort.cohortName });

    res.status(200).json({ message: 'Cohort deleted successfully, and associated data updated' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting cohort', error });
  }
};

// Update a specific cohort within a course using cohortName
const updateCohort = async (req, res) => {
  try {
    const { courseId, cohortName } = req.params;
    const updatedCohortData = req.body;

    // Find the cohort by courseId and cohortName
    const cohort = await Cohort.findOne({ courseId, cohortName });
    if (!cohort) {
      return res.status(404).json({ message: 'Cohort not found' });
    }

    // Update the cohort with the new data
    Object.assign(cohort, updatedCohortData);
    await cohort.save();

    res.status(200).json({ message: 'Cohort updated successfully', cohort });
  } catch (error) {
    res.status(500).json({ message: 'Error updating cohort', error });
  }
};

// Get cohort students by cohortName
const getCohortStudents = async (req, res) => {
  try {
    const { cohortName } = req.params;

    // Find the cohort by cohortName
    const cohort = await Cohort.findOne({ cohortName });

    if (!cohort) {
      return res.status(404).json({ message: 'Cohort not found' });
    }

    const studentIds = cohort.students;

    if (!studentIds || studentIds.length === 0) {
      return res.status(404).json({ message: 'No students found in this cohort' });
    }

    // Find all the students in this cohort
    const students = await Student.find({ _id: { $in: studentIds } });

    // Calculate activity rate for each student
    const assignments = cohort.assignments;
    const timetable = cohort.timetable;

    const result = students.map(student => {
      const studentId = student._id.toString();

      // Count submissions for this student
      const submissionCount = assignments.reduce((count, assignment) => {
        return count + assignment.submissions.filter(submission => submission.studentId.toString() === studentId).length;
      }, 0);

      // Count attendance for this student
      const attendanceCount = timetable.reduce((count, classSession) => {
        return count + classSession.attendance.filter(attendant => attendant === studentId).length;
      }, 0);

      // Total submissions and attendance combined
      const totalSubmissions = assignments.reduce((count, assignment) => count + assignment.submissions.length, 0);
      const totalClasses = timetable.reduce((count, classSession) => count + classSession.attendance.length, 0);

      // Calculate activity rate: (Submissions + Attendance) / (Total Submissions + Total Classes)
      const activityRate = totalSubmissions + totalClasses > 0
        ? ((submissionCount + attendanceCount) / (totalSubmissions + totalClasses)) * 100
        : 0; // Prevent division by zero

      return {
        userId: student.userId,
        studentId: student.studentId,
        phoneNumber: student.phoneNumber,
        email: student.email,
        firstName: student.firstName,
        lastName: student.lastName,
        profilePicture: student.profilePictureUrl,
        activityRate: activityRate.toFixed(2), // Activity rate as a percentage
      };
    });

    res.status(200).json({
      cohortName: cohort.cohortName,
      students: result,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};


// Get instructors in a cohort by cohortName
const getInstructorsByCohort = async (req, res) => {
  try {
    const { cohortName } = req.params;

    // Find the cohort with the specified cohortName
    const cohort = await Cohort.findOne({ cohortName });
    if (!cohort) {
      return res.status(404).json({ error: 'Cohort not found' });
    }

    const instructorIds = cohort.instructors;
    const instructors = await Instructor.find({ userId: { $in: instructorIds } });

    res.status(200).json({ data: instructors });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch instructors' });
  }
};

// Exporting controller functions for destructured import
module.exports = {
  getInstructorsByCohort,
  addCohort,
  getAllCohorts,
  getCohort,
  deleteCohort,
  updateCohort,
  getCohortStudents
};
