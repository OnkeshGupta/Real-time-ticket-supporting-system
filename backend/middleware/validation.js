const express = require('express');
const router = express.Router();
const { register, login, getMe, getAgents } = require('../controllers/authController');
const { authenticate, authorize } = require('../middleware/auth');
const { validateRegister, validateLogin } = require('../middleware/validation');
const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many auth attempts. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/register', authLimiter, validateRegister, register);
router.post('/login', authLimiter, validateLogin, login);
router.get('/me', authenticate, getMe);
router.get('/agents', authenticate, authorize('agent', 'admin'), getAgents);

module.exports = router;