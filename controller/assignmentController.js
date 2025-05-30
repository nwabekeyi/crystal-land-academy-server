const { Cohort} = require('../models/schema/courseSchema');
const { uploadToDropbox, deleteFromDropbox} = require('../controller/onlinUsers/utils');
const {Student} = require('../models/schema/onlineUsers')
// POST: Add new assignment
const postAssignment = async (req, res) => {
  try {
    const { cohortName } = req.params;
    const { title, description, dueDate } = req.body;

    // Find the cohort by ID
    const cohort = await Cohort.findOne({ cohortName: cohortName }); // Ensure this matches your field name
    if (!cohort) {
      return res.status(404).json({ message: 'Cohort not found' });
    }

    // Add new assignment
    const newAssignment = {
      title,
      description,
      dueDate,
      submissions: []
    };

    cohort.assignments.push(newAssignment);
    await cohort.save();

    res.status(201).json(cohort.assignments);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

// PUT: Update assignment
const updateAssignment = async (req, res) => {
  try {
    const { cohortName, assignmentId } = req.params;
    const { title, description, dueDate } = req.body;

    // Find cohort by ID
    const cohort = await Cohort.findOne({ cohortName: cohortName }); // Ensure this matches your field name
    if (!cohort) {
      return res.status(404).json({ message: 'Cohort not found' });
    }

    // Find assignment in the cohort
    const assignment = cohort.assignments.id(assignmentId);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Update assignment fields
    assignment.title = title || assignment.title;
    assignment.description = description || assignment.description;
    assignment.dueDate = dueDate || assignment.dueDate;

    await cohort.save();
    res.status(200).json(assignment);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

// DELETE: Delete assignment
const deleteAssignment = async (req, res) => {
  try {
    const { cohortName, assignmentId } = req.params;
    console.log({ cohortName, assignmentId });

    // Find cohort by ID (Ensure this matches your field name)
    const cohort = await Cohort.findOne({ cohortName: cohortName });
    if (!cohort) {
      return res.status(404).json({ message: 'Cohort not found' });
    }

    // Remove assignment by ID
    const assignmentIndex = cohort.assignments.findIndex(
      (assignment) => assignment._id.toString() === assignmentId
    );
    
    if (assignmentIndex === -1) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Remove the assignment from the array
    cohort.assignments.splice(assignmentIndex, 1);

    // Save the updated cohort
    await cohort.save();

    res.status(200).json({ message: 'Assignment deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error });
  }
};


// GET: Get assignment by ID
const getAssignment = async (req, res) => {
  try {
    const { cohortName, assignmentId } = req.params;

    // Find cohort by ID
    const cohort = await Cohort.findOne({ cohortName: cohortName }); // Ensure this matches your field name
    if (!cohort) {
      return res.status(404).json({ message: 'Cohort not found' });
    }

    // Find assignment by ID
    const assignment = cohort.assignments.id(assignmentId);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    res.status(200).json(assignment);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};



const path = require('path'); // Import the path module

// PATCH: Add student submission to assignment
const addSubmission = async (req, res) => {
  try {
    const { cohortName, assignmentId } = req.params;
    const { studentId } = req.body; // Student ID
    const file = req.files ? req.files.submission : null; // Assume 'submission' is the field for file upload

    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Find the cohort by cohortName
    const cohort = await Cohort.findOne({ cohortName: cohortName }).exec(); // Ensure to call exec() for proper execution
    if (!cohort) {
      return res.status(404).json({ message: 'Cohort not found' });
    }

    // Find the assignment by assignmentId in the cohort's assignments array
    const assignment = cohort.assignments.find(a => a.id.toString() === assignmentId);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Find the student by studentId using findOne
    const student = await Student.findOne({ studentId: studentId });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const { firstName, lastName, profilePictureUrl } = student;

    // Resolve the local file path using path.resolve to get the absolute path
    const localFilePath = path.join(__dirname, '../uploads', file[0].filename); // Resolves to the absolute path in 'uploads/' folder
    const dropboxPath = `/${file[0].filename}`;  // Use file.filename for Dropbox path (e.g., '/1734538091439.docx')

    console.log(`Local File Path: ${localFilePath}`);
    console.log(`Dropbox Path: ${dropboxPath}`);

    // Upload the file to Dropbox and get the link
    const dropboxLink = await uploadToDropbox(localFilePath, dropboxPath);

    // Push the student submission with the Dropbox link and student details
    assignment.submissions.push({
      studentId,
      firstName,  // Include student firstName
      lastName,   // Include student lastName
      profilePictureUrl, // Include student profile picture
      submission: dropboxLink, // Store Dropbox link instead of the file
    });

    // Save the updated cohort
    await cohort.save();

    // Send response with success message and updated assignment
    res.status(200).json({
      message: 'Submission added successfully',
      assignment,
      studentDetails: { firstName, lastName, profilePictureUrl }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error });
  }
};

// GET: Get all assignments for a specific cohort
const getAllAssignments = async (req, res) => {
  try {
    const { cohortName } = req.params;
    // Find cohort by cohortName
    const cohort = await Cohort.findOne({ cohortName: { $regex: new RegExp(cohortName, 'i') } });
    console.log(cohortName)
    if (!cohort) {
      return res.status(404).json({ message: 'Cohort not found' });
    }

    // Return all assignments
    res.status(200).json(cohort.assignments);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};


// PATCH: Resubmit student assignment
const resubmitAssignment = async (req, res) => {
  try {
    const { cohortName, assignmentId } = req.params;
    const { studentId } = req.body; // Student ID
    const file = req.files ? req.files.submission : null; // Assume 'submission' is the field for file upload

    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Find the cohort by cohortName
    const cohort = await Cohort.findOne({ cohortName: cohortName }).exec();
    if (!cohort) {
      return res.status(404).json({ message: 'Cohort not found' });
    }

    // Find the assignment by assignmentId in the cohort's assignments array
    const assignment = cohort.assignments.find(a => a.id.toString() === assignmentId);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Check if the student has already submitted an assignment
    const existingSubmission = assignment.submissions.find(sub => sub.studentId === studentId);
    if (!existingSubmission) {
      return res.status(404).json({ message: 'Student submission not found' });
    }

    // Resolve the local file path using path.resolve to get the absolute path
    const localFilePath = path.join(__dirname, '../uploads', file[0].filename); // Resolves to the absolute path in 'uploads/' folder
    const dropboxPath = `/${file[0].filename}`;  // Use file.filename for Dropbox path (e.g., '/1734538091439.docx')

    console.log(`Local File Path: ${localFilePath}`);
    console.log(`Dropbox Path: ${dropboxPath}`);

    // Upload the new file to Dropbox and get the link
    const dropboxLink = await uploadToDropbox(localFilePath, dropboxPath);

    // Update the student's existing submission with the new Dropbox link
    existingSubmission.submission = dropboxLink;
    existingSubmission.submittedAt = new Date(); // Update submission time

    // Save the updated cohort
    await cohort.save();

   // Delete the old file from Dropbox after the new file is uploaded
   if (existingSubmission.submission) {
    // Extract the file name from the existing Dropbox URL (e.g., /scl/fi/.../filename.jpg)
    const url = new URL(existingSubmission.submission);
    const path = url.pathname; // This will give us something like "/scl/fi/..."
    
    // Extract the file name from the URL path
    const fileNameMatch = path.match(/\/scl\/fi\/[^/]+\/([^?]+)\?/);
    if (fileNameMatch) {
      const dropboxPathToDelete = `/Apps/The Tech Archival/${fileNameMatch[1]}`; // Create the delete path based on the file name
      console.log(dropboxPathToDelete);
      await deleteFromDropbox(dropboxPathToDelete);  // Delete the old file from Dropbox
    }
  }

    // Send response with success message and updated assignment
    res.status(200).json({
      message: 'Assignment resubmitted successfully',
      updatedSubmission: existingSubmission
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error });
  }
};




module.exports = {
  resubmitAssignment, // Export the new function
  postAssignment,
  updateAssignment,
  deleteAssignment,
  getAssignment,
  addSubmission,
  getAllAssignments, // Export the new function
}