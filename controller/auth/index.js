const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const {createRefreshToken, createAccessToken, findUserByEmail} = require('./utils')
const { getModelByRole } = require('../onlinUsers/utils'); // Import the controller for fetching users
const jwtRefreshSecret = require('../../configs/dotenv').JWT_REFRESH_SECRET


// Login logic with access token and refresh token
const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    // Find user by email
    const userWithRole = await findUserByEmail(email);

    if (!userWithRole) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { user, role } = userWithRole;

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    };


    // Generate tokens
    const accessToken = createAccessToken(user);
    const refreshToken = createRefreshToken(user);

    // Set tokens in HTTP-only cookies
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: true,    // Set to `true` in production (HTTPS)
      maxAge: 15 * 60 * 1000, // 15 minutes
      sameSite: 'strict'
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: false,    // Set to `true` in production (HTTPS)
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: 'None'
    });


        // Send response with only logged-in user details for other roles
    return res.status(200).json({
      message: 'Login successful',
      user: user
    });


  
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
};


// refresj token logic
const refreshToken = (req, res) => {
  console.log(jwtRefreshSecret);  // Log the refresh token to verify

  const token = req.cookies.refreshToken;  // Get refreshToken from cookie

  if (!token) {
    console.error('Refresh token is missing in the cookies');
    return res.status(403).json({ message: 'Refresh token is missing' });
  }

  try {
    // Verify the refresh token using the same secret
    const decoded = jwt.verify(token, jwtRefreshSecret);  // Verify and decode the token

    // Ensure the decoded token contains the required properties
    if (!decoded || !decoded.email || !decoded.role) {
      console.error('Decoded refresh token is invalid:', decoded);
      return res.status(403).json({ message: 'Invalid refresh token' });
    }

    // Generate a new access token
    const accessToken = createAccessToken({
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role
    });

    // Set the new access token in an HTTP-only cookie
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: true,    // Set to `true` in production (HTTPS)
      maxAge: 15 * 60 * 1000, // 15 minutes
      sameSite: 'Strict',
    });

    console.log('Access token generated and set in cookie');
    return res.status(200).json({ message: 'Access token refreshed' });
  } catch (error) {
    console.error('Error while verifying refresh token:', error.message);
    return res.status(403).json({ message: 'Invalid refresh token', error: error.message });
  }
};

// Logout logic (clears cookies)
const logout = (req, res) => {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  return res.status(200).json({ message: 'Logout successful' });
};

module.exports = { login, refreshToken, logout };
