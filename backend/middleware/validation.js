const { body, param, query, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      status: 'fail',
      message: 'Validation failed',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

const validateRegister = [
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['customer', 'agent']).withMessage('Role must be customer or agent'),
  handleValidationErrors,
];

const validateLogin = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required'),
  handleValidationErrors,
];

const validateCreateTicket = [
  body('title').trim().isLength({ min: 5, max: 200 }).withMessage('Title must be 5-200 characters'),
  body('description').trim().isLength({ min: 10, max: 5000 }).withMessage('Description must be 10-5000 characters'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority'),
  body('category').optional().isIn(['billing', 'technical', 'general', 'feature_request', 'bug_report', 'other']),
  handleValidationErrors,
];

const validateUpdateTicket = [
  param('id').isMongoId().withMessage('Invalid ticket ID'),
  body('status').optional().isIn(['open', 'in_progress', 'waiting_for_customer', 'resolved', 'closed']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('assignedTo').optional().isMongoId().withMessage('Invalid agent ID'),
  handleValidationErrors,
];

const validateComment = [
  param('id').isMongoId().withMessage('Invalid ticket ID'),
  body('content').trim().isLength({ min: 1, max: 2000 }).withMessage('Comment must be 1-2000 characters'),
  body('isInternal').optional().isBoolean(),
  handleValidationErrors,
];

const validateTicketQuery = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
  query('status').optional().isIn(['open', 'in_progress', 'waiting_for_customer', 'resolved', 'closed', 'all']),
  query('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  handleValidationErrors,
];

module.exports = {
  validateRegister,
  validateLogin,
  validateCreateTicket,
  validateUpdateTicket,
  validateComment,
  validateTicketQuery,
};