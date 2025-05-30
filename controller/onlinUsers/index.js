const { 
  findUserByEmail,
  uploadToDropbox, 
  generateUniqueTransactionId,  
  generateInstructorId, 
  generateStudentId, 
  getModelByRole, 
  userValidationSchemas, 
  deleteFromDropbox
} = require('./utils');
const fs = require('fs');;
const {sendPasswordResetEmail}= require('../../configs/nodeMailer')

const yup = require('yup');
const bcrypt = require('bcryptjs');
const { Course } = require('../../models/schema/courseSchema');
const { Cohort } = require('../../models/schema/courseSchema'); // Import Cohort model
const Payment = require('../../models/schema/paymentSchema');
const Chatroom = require('../../models/schema/chatRoom');
const path = require('path');
const {Student, Admin, SuperAdmin, Instructor} = require('../../models/schema/onlineUsers')

const createUser = async (req, res) => {
  const { role, program, password, cohort, amountPaid } = req.body;

  try {
    // Validate the role using schemas
    const validationSchema = userValidationSchemas[role];
    if (!validationSchema) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    // Validate the request data based on the role schema
    await validationSchema.validate(req.body, { abortEarly: false });

    // Prepare the user data object
    const user = {
      ...req.body,
      role,  // Ensure role is preserved
    };

    // Generate role-specific IDs
    if (role === 'student') {
      user.studentId = await generateStudentId(program);
    } else if (role === 'instructor') {
      user.instructorId = await generateInstructorId();
    }

    // Hash the password if provided
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      user.password = hashedPassword;
    }

    // Handle file uploads (e.g., profile picture, ID card)
    const processFileUpload = async (file, folderName, dbField) => {
      const filePath = path.join(__dirname, '../../uploads', file.filename);

      if (fs.existsSync(filePath)) {
        try {
          const encodedFileName = encodeURIComponent(file.originalname);
          const dropboxPath = `/theTechArchival/${folderName}/${encodedFileName}`;
          user[dbField] = await uploadToDropbox(filePath, dropboxPath);
        } catch (error) {
          throw new Error(`Error uploading ${dbField}: ${error.message}`);
        }
      } else {
        throw new Error(`${dbField} file not found in uploads directory`);
      }
    };

    if (req.files) {
      if (req.files.profilePictureUrl) {
        const profilePicture = req.files.profilePictureUrl[0];
        await processFileUpload(profilePicture, 'profilepictures', 'profilePictureUrl');
      }

      if (req.files.idCardUrl) {
        const idCard = req.files.idCardUrl[0];
        await processFileUpload(idCard, 'idcards', 'idCardUrl');
      }
    }

    // Ensure the profile picture is available before proceeding
    if (!user.profilePictureUrl) {
      return res.status(400).json({ message: 'Profile picture URL is missing' });
    }

    const Model = getModelByRole(role);
    const newUser = new Model(user);
    await newUser.save();

    if (role === 'student') {
      if (amountPaid) {
        const transactionId = await generateUniqueTransactionId();
        const payment = new Payment({
          userId: newUser.userId,
          amount: amountPaid,
          status: "completed",
          transactionId,
        });
        await payment.save();
      }

      await Course.updateOne(
        { courseName: program },
        { $addToSet: { students: newUser.userId } }
      );

      const cohortDoc = await Cohort.findOne({ cohortName: cohort });
      if (cohortDoc) {
        await Cohort.updateOne(
          { cohortName: cohort },
          { $addToSet: { students: newUser.userId } }
        );
      } else {
        return res.status(404).json({ message: 'Cohort not found' });
      }

      await Chatroom.updateOne(
        { name: { $regex: new RegExp(`^${cohort.trim()}`, "i") } },  // case-insensitive regex match
        {
          $addToSet: {
            participants: {
              userId: newUser.userId,
              profilePictureUrl: newUser.profilePictureUrl,
              firstName: newUser.firstName,
              lastName: newUser.lastName,
              role: newUser.role,
            }
          }
        }
      );

      await Course.updateOne(
        { 'cohorts.cohortName': cohort },
        { $addToSet: { 'cohorts.$.students': newUser.userId } }
      );
    }

    if (role === 'instructor') {
      await Course.updateOne(
        { courseName: program },
        { $addToSet: { instructors: newUser.userId } }
      );

      const cohortDoc = await Cohort.findOne({ cohortName: cohort });
      if (cohortDoc) {
        await Cohort.updateOne(
          { cohortName: cohort },
          { $addToSet: { instructors: newUser.userId } }
        );
      } else {
        return res.status(404).json({ message: 'Cohort not found' });
      }

      await Chatroom.updateOne(
        { name: { $regex: new RegExp(`^${cohort.trim()}`, "i") } },  // case-insensitive regex match
        {
          $addToSet: {
            participants: {
              userId: newUser.userId,
              profilePictureUrl: newUser.profilePictureUrl,
              firstName: newUser.firstName,
              lastName: newUser.lastName,
            }
          }
        }
      );

      await Course.updateOne(
        { 'cohorts.cohortName': cohort },
        { $addToSet: { 'cohorts.$.instructors': newUser.userId } }
      );
    }

    if (role === 'admin' || role === 'superadmin') {
      await Chatroom.updateMany(
        {},
        {
          $addToSet: {
            participants: {
              userId: newUser.userId,
              profilePictureUrl: newUser.profilePictureUrl,
              firstName: newUser.firstName,
              lastName: newUser.lastName
            }
          }
        }
      );
    }

    // Send success response
    return res.status(201).json({ message: `${role} created successfully`, user: newUser });
  } catch (error) {
    console.error(error);
    if (error instanceof yup.ValidationError) {
      return res.status(400).json({ message: 'Validation error', details: error.errors });
    }
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update User
const updateUser = async (req, res) => {
  const { role, program, cohort } = req.body;
  const { userId } = req.params;

  try {
    const Model = getModelByRole(role);

    if (role === 'student' || role === 'instructor') {
      const user = await Model.findOne({ userId });

      const oldProgram = user.program;
      const oldCohort = user.cohort;

      if (program !== oldProgram || cohort !== oldCohort) {
        await Course.updateOne(
          { courseName: oldProgram },
          { $pull: { [role === 'student' ? 'students' : 'instructors']: userId } }
        );

        await Cohort.updateOne(
          { cohortName: oldCohort },
          { $pull: { [role === 'student' ? 'students' : 'instructors']: userId } }
        );

        await Course.updateOne(
          { courseName: program },
          { $push: { [role === 'student' ? 'students' : 'instructors']: userId } }
        );

        await Cohort.updateOne(
          { cohortName: cohort },
          { $push: { participants: userId } }
        );

        await Chatroom.updateOne(
          { name: oldCohort },
          { $pull: { participants: { userId } } }
        );

        await Chatroom.updateOne(
          { name: cohort },
          { $push: { participants: { userId } } }
        );
      }
    }

    const updateData = {};
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        updateData[key] = req.body[key];
      }
    });

    const updatedUser = await Model.findOneAndUpdate(
      { userId: userId },
      { $set: updateData },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({ message: 'User updated successfully', user: updatedUser });
  } catch (error) {
    return res.status(500).json({ message: 'Error updating user', error: error.message });
  }
};

// Delete User
const deleteUser = async (req, res) => {
  const { userId, role, courseName, cohortName } = req.body;

  // Validate required fields
  if (!userId || !role) {
    return res.status(400).json({ message: 'User ID and role are required' });
  }


  try {
    // Get model based on the role
    const Model = getModelByRole(role);
    if (!Model) {
      return res.status(400).json({ message: `Invalid role: ${role}` });
    }

    // Find and delete user by userId
    const userToDelete = await Model.findOneAndDelete({ userId });

    if (!userToDelete) {
      return res.status(404).json({ message: 'User not found' });
    }

    // If user has a profile picture, delete from Dropbox
    if (userToDelete.profilePictureUrl) {
      try {
        await deleteFromDropbox(userToDelete.profilePictureUrl);
      } catch (dropboxError) {
        return res.status(500).json({ message: 'Error deleting user profile picture from Dropbox', error: dropboxError.message });
      }
    }

    // Handle specific role-based deletion
    if (role === 'admin' || role === 'superadmin') {
      try {
        await Chatroom.updateMany(
          { participants: { userId } },
          { $pull: { participants: { userId } } }
        );
      } catch (chatroomError) {
        return res.status(500).json({ message: 'Error updating chatrooms after admin/superadmin deletion', error: chatroomError.message });
      }
    }

    if (role === 'student') {
      try {
        await Course.updateMany(
          { courseName },
          { $pull: { students: userId } }
        );
        await Cohort.updateMany(
          { cohortName },
          { $pull: { students: userId } }
        );
      } catch (courseError) {
        return res.status(500).json({ message: 'Error removing student from courses or cohorts', error: courseError.message });
      }
    } else if (role === 'instructor') {
      try {
        await Course.updateMany(
          { courseName },
          { $pull: { instructors: userId } }
        );
        await Cohort.updateMany(
          { cohortName },
          { $pull: { instructors: userId } }
        );
      } catch (instructorError) {
        return res.status(500).json({ message: 'Error removing instructor from courses or cohorts', error: instructorError.message });
      }
    }

    // Successful deletion
    return res.status(200).json({ message: 'User deleted successfully and removed from all related fields' });

  } catch (error) {
    // Catch any general errors and respond with a 500 status
    return res.status(500).json({ message: 'Error deleting user and removing them from related fields', error: error.message });
  }
};



// Get users by role
const getUsers = async (req, res) => {
console.log('users');
try {
// Fetch all users from each role
const adminModel = getModelByRole('admin');
const superAdminModel = getModelByRole('superadmin');
const instructorModel = getModelByRole('instructor');
const studentModel = getModelByRole('student');

const admins = await adminModel.find();
const superAdmins = await superAdminModel.find();
const instructors = await instructorModel.find();
const students = await studentModel.find();

// Return an object containing arrays of users for each role
return res.status(200).json({
admins,
superAdmins,
instructors,
students
});
} catch (error) {
return res.status(500).json({ message: 'Error fetching users', error: error.message });
}
};



// Patch user (partial update)
const patchUser = async (req, res) => {
const { userId, role, password } = req.body;

try {
const Model = getModelByRole(role);

// Hash the password if it's being updated
if (password) {
const hashedPassword = await bcrypt.hash(password, 10);
req.body.password = hashedPassword;
}

const updatedUser = await Model.findOneAndUpdate({ userId }, req.body, {
new: true,
runValidators: true,
});

if (!updatedUser) {
return res.status(404).json({ message: 'User not found' });
}

return res.status(200).json({ message: 'User patched successfully', user: updatedUser });
} catch (error) {
return res.status(500).json({ message: 'Error patching user', error: error.message });
}
};


// Backend logic to update a notification by ID
const updateNotificationById = async (req, res) => {
const { notificationId } = req.params; // Get notification ID from request parameters
const { userId, role, message, type, priority, readStatus, actionLink, isDeleted } = req.body; // Get updated data from request body

// Validate required parameters
if (!userId || !role || !notificationId) {
return res.status(400).json({ message: 'userId, role, and notificationId are required' });
}

try {
// Get the correct model based on the role (admin, instructor, etc.)
const Model = getModelByRole(role);

// Find the user by userId
const user = await Model.findOne({ userId });

if (!user) {
return res.status(404).json({ message: 'User not found' });
}

// Find the specific notification within the user's notifications array
const notification = user.notifications.find(n => n.id === notificationId);

if (!notification) {
return res.status(404).json({ message: 'Notification not found' });
}

// Update the notification fields if provided in the request body
notification.message = message || notification.message;
notification.type = type || notification.type;
notification.priority = priority || notification.priority;
notification.readStatus = readStatus || notification.readStatus;
notification.actionLink = actionLink || notification.actionLink;
notification.isDeleted = isDeleted || notification.isDeleted;

// Save the updated user document with the modified notification
await user.save();

return res.status(200).json({ message: 'Notification updated successfully', notification });
} catch (error) {
return res.status(500).json({ message: 'Error updating notification', error: error.message });
}
};

// Fetch student by studentId
const getStudentById = async (req, res) => {
  const { userId } = req.params; // Extract studentId from URL params

  try {
    // Check if studentId is provided
    if (!userId) {
      return res.status(400).json({ message: 'Student ID is required' });
    }

    // Fetch student from the database using the studentId
    const student = await Student.findOne({ userId });

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Respond with the student data
    return res.status(200).json({ student });
  } catch (error) {
    // Handle errors and return a response
    console.error(error);
    return res.status(500).json({ message: 'Error fetching student', error: error.message });
  }
};



// Change Password Function
const changePassword = async (req, res) => {
  const { role, userId, currentPassword, newPassword } = req.body;

  try {
    const Model = getModelByRole(role);
    
    // Find the user by their userId
    const user = await Model.findOne({ userId });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Compare the current password with the stored password in the database
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Hash the new password before updating
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update the password in the database
    user.password = hashedNewPassword;
    
    // Save the updated user record
    await user.save();

    return res.status(200).json({ message: 'Password updated successfully' });

  } catch (error) {
    return res.status(500).json({ message: 'Error updating password', error: error.message });
  }
};


const resetPassword = async (req, res) => {
  const { email, token, newPassword } = req.body;

  try {
    console.log('Password reset process started');
    // Search for the user across different collections
    let user = await Admin.findOne({ email })
                || await SuperAdmin.findOne({ email: email })
                || await Instructor.findOne({ email: email })
                || await Student.findOne({ email: email });

    console.log('User lookup complete', user);

    if (!user) {
      console.log('User not found');
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if the token matches
    console.log('Checking token');
    if (user.passwordReset.resetToken !== token) {
      console.log('Invalid token');
      return res.status(400).json({ error: 'Invalid token' });
    }

    // Check if the token has expired
    const now = new Date();
    if (user.passwordReset.resetTokenExpires < now) {
      console.log('Token expired');
      return res.status(400).json({ error: 'Token expired' });
    }

    // Hash the new password
    console.log('Hashing new password');
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the user's password and reset tokens
    user.password = hashedPassword;
    user.passwordReset.resetToken = null;
    user.passwordReset.resetTokenExpires = null;
    await user.save();
    
    console.log('Password reset successful');
    return res.status(200).json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Error resetting password:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};


const sendPasswordlink = async (req, res) => {
  try {
    const result = await findUserByEmail(req.body.email); // Get result containing user and role
    if (!result) {
      // If user is not found, respond and stop further execution
      return res.status(404).json({ message: 'User not found' });
    } else {
      const { user } = result; // Extract the user object from result
      await sendPasswordResetEmail(user.email, user); // Assuming you have an async function for sending email.

      // Send success response after email is sent
      return res.status(200).json({ message: 'Password reset link sent successfully' });
    }

  } catch (error) {
    // Handle errors and send the response if there's an error
    return res.status(500).json({ message: 'Error sending password reset link', error: error.message });
  }
};



module.exports = {
  resetPassword,
  createUser,
  getUsers,
  updateUser,
  patchUser,
  deleteUser,
  updateNotificationById,
  getStudentById,
  changePassword,
  sendPasswordlink
};
