const express = require('express');
const router = express.Router();
const {
  getTickets,
  getTicketById,
  createTicket,
  updateTicket,
  addComment,
  getStats,
} = require('../controllers/ticketController');
const { authenticate, authorize } = require('../middleware/auth');
const {
  validateCreateTicket,
  validateUpdateTicket,
  validateComment,
  validateTicketQuery,
} = require('../middleware/validation');

// Inject socket.io into req
const injectSocket = (io) => (req, res, next) => {
  req.io = io;
  next();
};

module.exports = (io) => {
  const socketMiddleware = injectSocket(io);

  router.get('/stats', authenticate, getStats);
  router.get('/', authenticate, validateTicketQuery, getTickets);
  router.post('/', authenticate, socketMiddleware, validateCreateTicket, createTicket);
  router.get('/:id', authenticate, getTicketById);
  router.patch('/:id', authenticate, socketMiddleware, validateUpdateTicket, updateTicket);
  router.post('/:id/comments', authenticate, socketMiddleware, validateComment, addComment);

  return router;
};