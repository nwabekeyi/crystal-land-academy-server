const jwt = require('jsonwebtoken');
const {JWT_ACCESS_SECRET} = require('../configs/dotenv')

// Middleware to verify the access token
const authenticateToken = (req, res, next) => {
  const token = req.cookies.accessToken; // Get token from cookie

  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_ACCESS_SECRET);
    req.user = decoded; // Attach user info to request object
    next(); // Proceed to the next middleware or route handler
  } catch (err) {
    return res.status(403).json({ message: 'Invalid or expired access token' });
  }
};

module.exports = authenticateToken;
