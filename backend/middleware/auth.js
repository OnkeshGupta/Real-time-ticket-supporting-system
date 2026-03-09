const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { createError } = require('../utils/errorHandler');

const authenticate = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer '))
      token = req.headers.authorization.split(' ')[1];

    if (!token) return next(createError(401, 'Authentication required. Please log in.'));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return next(createError(401, 'User no longer exists.'));
    if (!user.isActive) return next(createError(403, 'Your account has been deactivated.'));

    user.lastSeen = new Date();
    await user.save({ validateBeforeSave: false });
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') return next(createError(401, 'Invalid token. Please log in again.'));
    if (error.name === 'TokenExpiredError') return next(createError(401, 'Token expired. Please log in again.'));
    next(error);
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role))
    return next(createError(403, `Access denied. Required role: ${roles.join(' or ')}.`));
  next();
};

const optionalAuth = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer '))
      token = req.headers.authorization.split(' ')[1];
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (user && user.isActive) req.user = user;
    }
    next();
  } catch (error) { next(); }
};

module.exports = { authenticate, authorize, optionalAuth };