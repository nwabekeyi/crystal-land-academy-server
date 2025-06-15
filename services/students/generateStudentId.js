// helpers/generateStudentId.js
const Student = require("../../models/Students/students.model"); // Adjust path to your Student model

const generateStudentId = async (section) => {
  // Map section to prefix
  const sectionPrefix = section === "Primary" ? "PRI" : section === "Secondary" ? "SEC" : null;
  if (!sectionPrefix) {
    throw new Error("Invalid class section. Must be 'Primary' or 'Secondary'");
  }

  // Query the last studentId for the given section
  const lastStudent = await Student.findOne({
    studentId: { $regex: `^CL/${sectionPrefix}/`, $options: "i" },
  })
    .sort({ studentId: -1 }) // Sort descending to get the latest ID
    .select("studentId");

  let nextNumber = 1; // Default to 1 if no previous students
  if (lastStudent && lastStudent.studentId) {
    const match = lastStudent.studentId.match(/CL\/[A-Z]+\/(\d+)/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1; // Increment the last number
    }
  }

  // Format number as two digits (e.g., 01, 02, etc.)
  const formattedNumber = nextNumber.toString().padStart(2, "0");

  // Construct studentId
  const studentId = `CL/${sectionPrefix}/${formattedNumber}`;

  // Verify uniqueness (in case of race conditions)
  const existingStudent = await Student.findOne({ studentId });
  if (existingStudent) {
    throw new Error("Generated student ID already exists");
  }

  return studentId;
};

module.exports = generateStudentId;