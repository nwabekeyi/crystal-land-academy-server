const jwt = require('jsonwebtoken');
const { Admin, SuperAdmin, Instructor, Student } = require('../../models/schema/onlineUsers');
const { JWT_ACCESS_SECRET, JWT_REFRESH_SECRET } = require('../../configs/dotenv');

// Helper function to find user by email and role
const findUserByEmail = async (email) => {
  
  try {
    let user = await Admin.findOne({ email });
    if (user) return { user, role: 'admin' };

    user = await SuperAdmin.findOne({ email });
    if (user) return { user, role: 'superadmin' };

    user = await Instructor.findOne({ email });
    if (user) return { user, role: 'instructor' };

    user = await Student.findOne({ email });
    if (user) return { user, role: 'student' };

    return null;
  } catch (err) {
    console.error('Error finding user:', err); // Log the error
    throw new Error('Database query failed');
  }
};


// Create access token (short-lived)
const createAccessToken = (user) => {
  return jwt.sign(
    { userId: user.userId, email: user.email, role: user.role },
    JWT_ACCESS_SECRET,
    { expiresIn: '15m' } // Access token expires in 15 minutes
  );
};

// Create refresh token (long-lived)
const createRefreshToken = (user) => {
  return jwt.sign(
    { userId: user.userId, email: user.email, role: user.role },
    JWT_REFRESH_SECRET,
    { expiresIn: '7d' } // Refresh token expires in 7 days
  );
};

module.exports ={
    createAccessToken,
    createRefreshToken,
    findUserByEmail
}