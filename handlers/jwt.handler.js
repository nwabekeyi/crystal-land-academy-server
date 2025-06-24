const jwt = require('jsonwebtoken');
const {jwt_secret_key} = require('../config/env.Config')

const signJwt = (payload, expiresIn) => {
  return jwt.sign(payload, jwt_secret_key, { expiresIn });
};

const verifyJwt = (token) => {
  try {
    return jwt.verify(token, jwt_secret_key);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

module.exports = { signJwt, verifyJwt };