const multer = require('multer');
const path = require('path');

// Set up storage configuration for Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // 'req' can be used if needed in the future for accessing form data or user info
    cb(null, 'uploads/'); // Store uploaded files in the 'uploads' directory
  },
  filename: (req, file, cb) => {
    // 'file' is used here to append the correct file extension
    cb(null, Date.now() + path.extname(file.originalname)); // Use current timestamp for unique file names
  }
});

// Set up file size limit (in bytes)
const fileSizeLimit = 20 * 1024 * 1024; // 20 MB in bytes

// Create a multer instance with the storage configuration and size limit
const upload = multer({ 
  storage,
  limits: { fileSize: fileSizeLimit } // Add the size limit for uploaded files
});

// Middleware to handle single or multiple file uploads
const uploadImages = upload.fields([
  { name: 'profilePictureUrl', maxCount: 1 },
  { name: 'idCardUrl', maxCount: 1 }
]);

module.exports = { uploadImages };
