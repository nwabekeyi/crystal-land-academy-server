// configs/envConfig.js
const dotenv = require('dotenv');
dotenv.config();

const port = process.env.PORT || 5000;
const db = process.env.DB;
const jwt_secret_key = process.env.JWT_SECRET_KEY;

const cloudinary_name = process.env.CLOUDINARY_CLOUD_NAME;
const cloudinary_key = process.env.CLOUDINARY_API_KEY;
const cloudinary_secret = process.env.CLOUDINARY_API_SECRET;
const emailKey = process.env.SENDGRID_API_KEY;
const senderEmail = process.env.SENDER_EMAIL;
const prodUrl = process.env.PROD_URL;



const verifyEnv = () => {
  if (!db || !jwt_secret_key || !cloudinary_name || !cloudinary_key || !cloudinary_secret) {
    throw new Error('Missing required environment variables. Please check your .env file.');
  }
};

module.exports = {
  port,
  db,
  jwt_secret_key,
  cloudinary_name,
  cloudinary_key,
  cloudinary_secret,
  verifyEnv,
  emailKey,
  senderEmail,
  prodUrl
};
