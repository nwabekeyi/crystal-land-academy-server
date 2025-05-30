const dotenv = require('dotenv');

const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
dotenv.config({ path: envFile });

module.exports = {
  NODE_ENV: process.env.NODE_ENV,
  MONGO_URI: process.env.MONGO_URI,
  PORT: process.env.PORT,
  dbxClientId: process.env.DROPBOX_CLIENT_ID,
  dbxSecret: process.env.DROPBOX_CLIENT_SECRET,
  FIREBASE_ADMIN_SDK_PRIVAT_KEY: process.env.FIREBASE_ADMIN_SDK_PRIVAT_KEY,
  FIREBASE_ADMIN_SDK_PRIVAT_KEY_ID: process.env.FIREBASE_ADMIN_SDK_PRIVAT_KEY_ID,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  dbxToken: process.env.DROPBOX_ACCESS_TOKEN,
  MONGO_ATLAS_URI: process.env.MONGO_ATLAS_URI,
  dbxRefreshToken: process.env.DROPBOX_REFRESH_TOKEN,
  mailer_password: process.env.MAILER_PASS,
  domain: process.env.DOMAIN,
  paystackKey : process.env.PAYSTACK_KEY,
  liveDomain : process.env.LIVE_DOMAIN

};

