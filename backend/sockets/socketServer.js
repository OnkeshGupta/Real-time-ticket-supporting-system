const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../config/logger');

const initializeSocket = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
      if (!token) return next(new Error('Authentication required'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (!user || !user.isActive) return next(new Error('User not found or inactive'));

      socket.user = user;
      next();
    } catch (error) { next(new Error('Invalid token')); }
  });

  io.on('connection', (socket) => {
    const user = socket.user;
    logger.info(`Socket connected: ${user.email} (${user.role}) - ${socket.id}`);

    socket.join(`user:${user._id}`);
    if (['agent', 'admin'].includes(user.role)) {
      socket.join('agents');
      logger.info(`${user.name} joined agents room`);
    }

    socket.on('ticket:join', (ticketId) => {
      socket.join(`ticket:${ticketId}`);
      logger.debug(`${user.name} joined ticket room: ${ticketId}`);
    });

    socket.on('ticket:leave', (ticketId) => {
      socket.leave(`ticket:${ticketId}`);
      logger.debug(`${user.name} left ticket room: ${ticketId}`);
    });

    socket.on('comment:typing', ({ ticketId }) => {
      socket.to(`ticket:${ticketId}`).emit('comment:user_typing', { userId: user._id, userName: user.name, ticketId });
    });

    socket.on('comment:stop_typing', ({ ticketId }) => {
      socket.to(`ticket:${ticketId}`).emit('comment:user_stop_typing', { userId: user._id, ticketId });
    });

    socket.on('disconnect', (reason) => logger.info(`Socket disconnected: ${user.email} - ${reason}`));
    socket.on('error', (error) => logger.error(`Socket error for ${user.email}: ${error.message}`));

    socket.emit('connected', { message: 'Connected to real-time updates', userId: user._id, role: user.role });
  });

  return io;
};

module.exports = initializeSocket;