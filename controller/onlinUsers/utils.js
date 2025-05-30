const yup = require('yup');
const { Admin, SuperAdmin, Instructor, Student } = require('../../models/schema/onlineUsers');
const mongoose = require('mongoose');
const { Dropbox } = require('dropbox');
const fs = require('fs'); // If you're dealing with local filesconst { loadTokens, saveTokens, refreshAccessToken } = require('../../configs/dropBox')
const { loadTokens, saveTokens, refreshAccessToken } = require('../../configs/dropBox')
const uuid = require('uuid');
const path = require('path');

// Assuming you have a Mongoose model for the `userIds` collection
const UserId = mongoose.model('UserId', new mongoose.Schema({
  userId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
}));


// Helper function to generate a unique transaction ID
const generateUniqueTransactionId = async () => {
  const Payment = mongoose.model('Payment');
  let transactionId;

  while (true) {
    transactionId = `TXN${Math.random().toString(36).substring(2, 15).toUpperCase()}`;
    const existingTransaction = await Payment.findOne({ transactionId });
    if (!existingTransaction) break; // If unique, exit loop
  }

  return transactionId;
};



const generateUserId = async () => {
  // Find the latest userId from the collection by sorting in descending order
  const lastUserId = await UserId.findOne({}).sort({ userId: -1 });

  let serialNumber = 1; // Default number if no userId exists yet

  if (lastUserId) {
    // Extract the current number from the last userId (e.g., "user/45" -> 45)
    const lastSerialNumber = parseInt(lastUserId.userId.split('/').pop(), 10);

    // Increment the number for the new userId
    serialNumber = lastSerialNumber + 1;
  }

  // Format the new userId as `user/number`, with leading zeros if needed
  const newUserId = `user/${serialNumber}`;

  // Save the new userId in the userIds collection
  const newUserIdEntry = new UserId({ userId: newUserId });
  await newUserIdEntry.save();

  // Return the newly generated userId
  return newUserId;
};



const uploadToDropbox = async (filePath, dropboxPath) => {
  try {
    let accessToken = await loadTokens();
    if (!accessToken) {
      throw new Error('No access token found');
    }

    const tokenExpiry = Date.now();
    if (accessToken.expires_at && accessToken.expires_at < tokenExpiry) {
      console.log('Access token expired, refreshing...');
      const refreshedToken = await refreshAccessToken(accessToken.refreshToken);
      accessToken = refreshedToken;
      await saveTokens(refreshedToken);
    }

    const dbx = new Dropbox({ accessToken: accessToken.access_token });

    // Read the file from the local path
    const fileBuffer = fs.readFileSync(filePath);
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new Error('File buffer is empty or invalid');
    }

    console.log('File size before upload to Dropbox:', fileBuffer.length);
    console.log('Initial file path to upload:', dropboxPath);

    let uploadResponse;

    // Generate a unique UUID for the file if needed and modify the path
    const uniqueId = uuid.v4();
    const ext = path.extname(dropboxPath);
    const baseName = path.basename(dropboxPath, ext);
    const newFileName = `${baseName}_${uniqueId}${ext}`;
    const newDropboxPath = path.join(path.dirname(dropboxPath), newFileName); 

    try {
      // Try uploading the file with the new unique name
      uploadResponse = await dbx.filesUpload({
        path: newDropboxPath,
        contents: fileBuffer,
        mode: 'add', // 'add' mode creates a new file if it doesn't exist
      });
      console.log('File uploaded successfully with a unique name:', uploadResponse);
    } catch (error) {
      throw new Error(`Error uploading file to Dropbox: ${error.message}`);
    }

    // Create a shared link for the uploaded file
    const shareLinkResponse = await dbx.sharingCreateSharedLinkWithSettings({
      path: uploadResponse.result.path_lower,
      settings: { requested_visibility: 'public' },
    });

    const shareableUrl = shareLinkResponse.result.url.replace('?dl=0', '?raw=1');
    const directUrl = shareableUrl.replace('www.dropbox.com', 'dl.dropboxusercontent.com');

    // Delete the file from the local filesystem after upload
    await fs.promises.unlink(filePath);
    console.log('File successfully deleted from local system after upload');

    return directUrl;

  } catch (error) {
    console.error('Error uploading file to Dropbox:', error);
    throw error; // re-throw the error after logging it
  }
};




// Validation schemas
const userValidationSchemas = {
  admin: yup.object().shape({
    userId: yup.string().optional(),
    email: yup.string().email('Invalid email').required('Email is required'),
    password: yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
    firstName: yup.string().required('First name is required'),
    lastName: yup.string().required('Last name is required'),
    phoneNumber: yup.string().required('Phone number is required'),
    idCardUrl: yup.string().url().optional(),
    role: yup.string().required('role is required'),
  }),
  superadmin: yup.object().shape({
    userId: yup.string().optional(),
    email: yup.string().email('Invalid email').required('Email is required'),
    password: yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
    firstName: yup.string().required('First name is required'),
    lastName: yup.string().required('Last name is required'),
    phoneNumber: yup.string().required('Phone number is required'),
    idCardUrl: yup.string().url().optional(),
    role: yup.string().required('role is required'),
  }),
  instructor: yup.object().shape({
    userId: yup.string().optional(),
    email: yup.string().email('Invalid email').required('Email is required'),
    password: yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
    firstName: yup.string().required('First name is required'),
    lastName: yup.string().required('Last name is required'),
    phoneNumber: yup.string().required('Phone number is required'),
    profilePictureUrl: yup.string().url().optional(),
    idCardUrl: yup.string().url().optional(),
    instructorId: yup.string().optional(),
    program: yup.string().required('Program is required'),
    role: yup.string().required('role is required'),
  }),
  student: yup.object().shape({
    userId: yup.string().optional(),
    email: yup.string().email('Invalid email').required('Email is required'),
    password: yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
    firstName: yup.string().required('First name is required'),
    lastName: yup.string().required('Last name is required'),
    phoneNumber: yup.string().required('Phone number is required'),
    profilePictureUrl: yup.string().url().optional(),
    idCardUrl: yup.string().url().optional(),
    program: yup.string().required('Program is required'),
    emergencyContactName: yup.string().required('Emergency contact name is required'),
    emergencyContactRelationship: yup.string().required('Emergency contact relationship is required'),
    emergencyContactPhone: yup.string().required('Emergency contact phone is required'),
    role: yup.string().required('role is required'),
  }),
};

// Map role to the correct Model
const getModelByRole = (role) => {
  switch (role) {
    case 'admin':
      return Admin;
    case 'superadmin':
      return SuperAdmin;
    case 'instructor':
      return Instructor;
    case 'student':
      return Student;
    default:
      throw new Error('Invalid role');
  }
};

// Generate Student ID
const generateStudentId = async (program) => {
  const lastStudent = await Student.findOne({}).sort({ _id: -1 });
  let serialNumber = 1; // Default serial number

  if (lastStudent) {
    const lastStudentId = lastStudent.studentId;
    // Match the format: student/{program}/{serialNumber}
    const match = lastStudentId.match(/student\/([^\/]+)\/(\d+)$/);
    if (match) {
      const lastSerialNumber = parseInt(match[2], 10); // Extract the serial number part
      if (!isNaN(lastSerialNumber)) {
        serialNumber = lastSerialNumber + 1; // Increment the serial number
      }
    }
  }

  return `student/${program}/${String(serialNumber).padStart(2, '0')}`;
};


// Generate Instructor ID
const generateInstructorId = async () => {
  const lastInstructor = await Instructor.findOne({}).sort({ _id: -1 });
  let serialNumber = 1; // Default serial number

  if (lastInstructor) {
    const lastInstructorId = lastInstructor.instructorId;
    // Match the format: instructor/{serialNumber}
    const match = lastInstructorId.match(/instructor\/(\d+)$/);
    if (match) {
      const lastSerialNumber = parseInt(match[1], 10); // Extract the serial number part
      if (!isNaN(lastSerialNumber)) {
        serialNumber = lastSerialNumber + 1; // Increment the serial number
      }
    }
  }

  return `instructor/${String(serialNumber).padStart(2, '0')}`;
};

const deleteFromDropbox = async (filePath) => {
  try {
    // Load the current access token
    let accessToken = await loadTokens();
    if (!accessToken) {
      throw new Error('No access token found');
    }

    // Check if the token is still valid or needs to be refreshed
    const tokenExpiry = Date.now();
    if (accessToken.expires_at && accessToken.expires_at < tokenExpiry) {
      console.log('Access token expired, refreshing...');
      
      const refreshedToken = await refreshAccessToken(accessToken.refreshToken);
      accessToken = refreshedToken;
      await saveTokens(refreshedToken);
    }

    // Remove the Dropbox domain part of the file path if it exists
    const dropboxDomain = 'https://dl.dropboxusercontent.com';  // Dropbox domain name
    const pathWithoutDomain = filePath.replace(dropboxDomain, '');  // Remove the domain from the URL

    // Ensure that filePath after domain removal is a valid path
    if (!pathWithoutDomain) {
      throw new Error('Invalid file path after removing Dropbox domain');
    }

    // Dropbox API delete endpoint
    const deleteUrl = 'https://api.dropboxapi.com/2/files/delete_v2';
    const headers = {
      'Authorization': `Bearer ${accessToken.access_token}`,
      'Content-Type': 'application/json',
    };

    // Request body for deleting the file
    const body = JSON.stringify({
      path: pathWithoutDomain,  // Path of the file to delete in Dropbox
    });

    // Send the DELETE request to Dropbox API
    const deleteResponse = await fetch(deleteUrl, {
      method: 'POST',
      headers: headers,
      body: body,
    });

    if (!deleteResponse.ok) {
      throw new Error(`Dropbox delete failed with status: ${deleteResponse.status}`);
    }

    const deleteData = await deleteResponse.json();
    console.log('File deleted successfully:', deleteData);

    // Return success message or some response data
    return deleteData;
  } catch (error) {
    console.error('Error deleting file from Dropbox:', error.message);
    throw error;  // Rethrow the error after logging it
  }
};

// find user by email
const findUserByEmail = async (email) => {
  try {
    // Search in the Student collection
    let user = await Student.findOne({ email });
    if (user) return { user, role: 'student' };

    // Search in the Instructor collection
    user = await Instructor.findOne({ email });
    if (user) return { user, role: 'instructor' };

    // Search in the Admin collection
    user = await Admin.findOne({ email });
    if (user) return { user, role: 'admin' };

    // Search in the SuperAdmin collection
    user = await SuperAdmin.findOne({ email });
    if (user) return { user, role: 'superadmin' };

    // If user is not found in any collection, return null
    return null;
  } catch (error) {
    console.error(`Error finding user by email: ${error.message}`);
    throw new Error('Server error while finding user');
  }
};

module.exports = {
  uploadToDropbox,
  generateInstructorId,
  generateStudentId,
  getModelByRole,
  userValidationSchemas,
  generateUserId,
  generateUniqueTransactionId,
  deleteFromDropbox,
  findUserByEmail

};
