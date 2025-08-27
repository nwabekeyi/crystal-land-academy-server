const dotenv = require('dotenv');
dotenv.config();

const port = process.env.PORT || 5000;
const db = process.env.DB;
const jwt_secret_key = process.env.JWT_SECRET_KEY;

const cloudinary_name = process.env.CLOUDINARY_CLOUD_NAME;
const cloudinary_key = process.env.CLOUDINARY_API_KEY;
const cloudinary_secret = process.env.CLOUDINARY_API_SECRET;

const emailHost = process.env.SMTP_HOST;
const emailPort = process.env.SMTP_PORT;
const emailUser = process.env.SMTP_USER;
const emailPass = process.env.SMTP_PASS;
const senderEmail = process.env.SENDER_EMAIL;
const senderName = process.env.SENDER_NAME;
const prodUrl = process.env.PROD_URL;


const verifyEnv = () => {
  if (!db || !jwt_secret_key || !cloudinary_name || !cloudinary_key || !cloudinary_secret) {
    throw new Error('Missing required environment variables for core app. Please check your .env file.');
  }
  // if (!smtp_host || !smtp_port || !smtp_user || !smtp_pass || !sender_email || !sender_name) {
  //   throw new Error('Missing required SMTP environment variables. Please check your .env file.');
  // }
};

module.exports = {
  port,
  db,
  jwt_secret_key,
  cloudinary_name,
  cloudinary_key,
  cloudinary_secret,
  emailHost,
  emailPort,
  emailUser,
  emailPass,
  senderEmail,
  senderName,
  prodUrl,
  verifyEnv
};