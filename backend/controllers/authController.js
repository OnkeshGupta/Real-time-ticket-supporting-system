const User = require('../models/User');
const { createError } = require('../utils/errorHandler');
const { sendAuthResponse } = require('../services/authService');
const logger = require('../config/logger');

const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return next(createError(409, 'Email already registered.'));

    const user = await User.create({ name, email, password, role: role || 'customer' });
    logger.info(`New user registered: ${email} (${user.role})`);
    sendAuthResponse(res, user, 201);
  } catch (error) { next(error); }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password)))
      return next(createError(401, 'Invalid email or password.'));
    if (!user.isActive) return next(createError(403, 'Account deactivated. Contact support.'));

    logger.info(`User logged in: ${email}`);
    sendAuthResponse(res, user);
  } catch (error) { next(error); }
};

const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return next(createError(404, 'User not found.'));
    res.json({ success: true, user });
  } catch (error) { next(error); }
};

const getAgents = async (req, res, next) => {
  try {
    const agents = await User.find({ role: { $in: ['agent', 'admin'] }, isActive: true })
      .select('name email role').sort('name');
    res.json({ success: true, agents });
  } catch (error) { next(error); }
};

module.exports = { register, login, getMe, getAgents };