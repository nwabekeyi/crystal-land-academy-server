const express = require('express');
const router = express.Router();
const { login, refreshToken, logout } = require('../controller/auth');
const authenticateToken = require('../middleware/verifyToken');

// Login route
router.post('/api/v1/login', login);

// Refresh token route
router.post('/api/v1/refresh-token', refreshToken);

// Logout route
router.post('/api/v1/logout', logout);

// Example of a protected route
router.get('/api/v1/protected', authenticateToken, (req, res) => {
  res.json({ message: 'This is a protected route', user: req.user });
});

module.exports = router;
