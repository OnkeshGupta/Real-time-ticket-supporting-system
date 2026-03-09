const jwt = require('jsonwebtoken');

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

const buildUserResponse = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt,
});

const sendAuthResponse = (res, user, statusCode = 200) => {
  const token = generateToken(user._id);
  res.status(statusCode).json({
    success: true,
    token,
    user: buildUserResponse(user),
  });
};

module.exports = { generateToken, buildUserResponse, sendAuthResponse };