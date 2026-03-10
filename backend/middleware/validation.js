const { body, query, validationResult } = require('express-validator');
const { createError } = require('../utils/errorHandler');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

const validateRegister = [
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('email').trim().isEmail().withMessage('Please enter a valid email address').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  handleValidationErrors
];

const validateLogin = [
  body('email').trim().isEmail().withMessage('Please enter a valid email address').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors
];

const validateCreateTicket = [
  body('title').trim().isLength({ min: 5, max: 200 }).withMessage('Title must be between 5 and 200 characters'),
  body('description').trim().isLength({ min: 10, max: 5000 }).withMessage('Description must be between 10 and 5000 characters'),
  body('status').optional().isIn(['open', 'in_progress', 'waiting_for_customer', 'resolved', 'closed']).withMessage('Invalid status'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority'),
  body('category').optional().isIn(['billing', 'technical', 'general', 'feature_request', 'bug_report', 'other']).withMessage('Invalid category'),
  handleValidationErrors
];

const validateUpdateTicket = [
  body('status').optional().isIn(['open', 'in_progress', 'waiting_for_customer', 'resolved', 'closed']).withMessage('Invalid status'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority'),
  body('category').optional().isIn(['billing', 'technical', 'general', 'feature_request', 'bug_report', 'other']).withMessage('Invalid category'),
  body('assignedTo').optional(),
  handleValidationErrors
];

const validateComment = [
  body('content').trim().isLength({ min: 1, max: 2000 }).withMessage('Comment must be between 1 and 2000 characters'),
  body('isInternal').optional().isBoolean(),
  handleValidationErrors
];

const validateTicketQuery = [
  query('status').optional().isIn(['open', 'in_progress', 'waiting_for_customer', 'resolved', 'closed']),
  query('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  query('category').optional().isIn(['billing', 'technical', 'general', 'feature_request', 'bug_report', 'other']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  handleValidationErrors
];

module.exports = {
  validateRegister,
  validateLogin,
  validateCreateTicket,
  validateUpdateTicket,
  validateComment,
  validateTicketQuery
};