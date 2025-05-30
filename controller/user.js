const Student = require('../models/schema/user')
// Function to create a new student
exports.createStudent = async (req, res) => {
  const {
    userId,
    email,
    passwordHash,
    role,
    firstName,
    lastName,
    idCardUrl,
    studentId,
    offline,
    courses,
    amountPaid,
    program,
    learningSchedules,
    instructors,
    studentProgress,
    learningPlanClassesAndLessons,
    chatsWithInstructor,
    profilePictureUrl,
  } = req.body;

  try {
    const newStudent = new Student({
      userId,
      email,
      passwordHash,
      role,
      firstName,
      lastName,
      idCardUrl,
      messages: [], // Initialize with an empty array
      studentId,
      offline,
      courses,
      amountPaid,
      program,
      learningSchedules,
      instructors,
      studentProgress,
      learningPlanClassesAndLessons,
      chatsWithInstructor,
      profilePictureUrl,
    });

    await newStudent.save();
    return res
      .status(201)
      .json({ message: "Student created successfully", student: newStudent });
  } catch (error) {
    console.error("Error creating student:", error);
    return res
      .status(500)
      .json({ error: "An error occurred while creating the student" });
  }
};
