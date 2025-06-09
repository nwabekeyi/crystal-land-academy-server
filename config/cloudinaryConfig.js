// cloudinaryConfig.js
const cloudinary = require('cloudinary').v2;
const {
  cloudinary_name,
  cloudinary_key,
  cloudinary_secret,
} = require('./env.Config');

cloudinary.config({
  cloud_name: cloudinary_name,
  api_key: cloudinary_key,
  api_secret: cloudinary_secret,
});

module.exports = cloudinary;
