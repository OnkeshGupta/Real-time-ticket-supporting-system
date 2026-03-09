const Ticket = require('../models/Ticket');
const Comment = require('../models/Comment');
const { createError } = require('../utils/errorHandler');
const { getTicketList, getTicketDetail, getTicketStats, invalidateTicketCaches, STATS_CACHE_KEY } = require('../services/ticketService');
const logger = require('../config/logger');

const getTickets = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, priority, search, assignedTo, createdBy, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const filter = {};
    const isAgent = ['agent', 'admin'].includes(req.user.role);

    if (!isAgent) { filter.createdBy = req.user._id; }
    else if (createdBy) { filter.createdBy = createdBy; }

    if (status && status !== 'all') filter.status = status;
    if (priority) filter.priority = priority;
    if (assignedTo) filter.assignedTo = assignedTo === 'me' ? req.user._id : assignedTo;
    if (search) filter.$text = { $search: search };

    const result = await getTicketList({ filter, page: parseInt(page), limit: parseInt(limit), sortBy, sortOrder, userId: req.user._id.toString() });
    res.json({ success: true, ...result });
  } catch (error) { next(error); }
};

const getTicketById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isAgent = ['agent', 'admin'].includes(req.user.role);
    const result = await getTicketDetail(id, isAgent);
    if (!result) return next(createError(404, 'Ticket not found.'));

    if (!isAgent) {
      const creatorId = result.ticket.createdBy?._id?.toString() || result.ticket.createdBy?.toString();
      if (creatorId !== req.user._id.toString()) return next(createError(403, 'Access denied.'));
    }
    res.json({ success: true, ...result });
  } catch (error) { next(error); }
};

const createTicket = async (req, res, next) => {
  try {
    const { title, description, priority, category, tags } = req.body;
    const ticket = await Ticket.create({
      title, description,
      priority: priority || 'medium',
      category: category || 'general',
      tags: tags || [],
      createdBy: req.user._id,
      activity: [{ type: 'created', description: 'Ticket created', performedBy: req.user._id, newValue: 'open' }],
    });

    const populated = await Ticket.findById(ticket._id)
      .populate('createdBy', 'name email role')
      .populate('assignedTo', 'name email role');

    await invalidateTicketCaches();

    if (req.io) {
      req.io.emit('ticket:created', populated);
      req.io.to('agents').emit('ticket:new_notification', { message: `New ticket: ${populated.title}`, ticket: populated });
    }

    logger.info(`Ticket created: ${populated.ticketNumber} by ${req.user.email}`);
    res.status(201).json({ success: true, ticket: populated });
  } catch (error) { next(error); }
};

const updateTicket = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, priority, assignedTo, title, description, tags } = req.body;
    const isAgent = ['agent', 'admin'].includes(req.user.role);

    const ticket = await Ticket.findById(id);
    if (!ticket) return next(createError(404, 'Ticket not found.'));
    if (!isAgent && ticket.createdBy.toString() !== req.user._id.toString())
      return next(createError(403, 'Access denied.'));

    const activity = [];

    if (status && status !== ticket.status) {
      if (!isAgent && !['resolved', 'waiting_for_customer'].includes(status))
        return next(createError(403, 'Customers can only set status to Resolved or Waiting.'));
      activity.push({ type: 'status_change', description: `Status changed from ${ticket.status} to ${status}`, performedBy: req.user._id, oldValue: ticket.status, newValue: status });
      ticket.status = status;
    }

    if (priority && priority !== ticket.priority && isAgent) {
      activity.push({ type: 'priority_change', description: `Priority changed from ${ticket.priority} to ${priority}`, performedBy: req.user._id, oldValue: ticket.priority, newValue: priority });
      ticket.priority = priority;
    }

    if (assignedTo !== undefined && isAgent) {
      activity.push({ type: 'assignment', description: assignedTo ? 'Ticket assigned to agent' : 'Ticket unassigned', performedBy: req.user._id, oldValue: ticket.assignedTo?.toString() || null, newValue: assignedTo || null });
      ticket.assignedTo = assignedTo || null;
    }

    if (title) ticket.title = title;
    if (description) ticket.description = description;
    if (tags) ticket.tags = tags;
    ticket.activity.push(...activity);
    await ticket.save();

    const populated = await Ticket.findById(id)
      .populate('createdBy', 'name email role')
      .populate('assignedTo', 'name email role')
      .populate('activity.performedBy', 'name role');

    await invalidateTicketCaches(id);

    if (req.io) {
      req.io.emit('ticket:updated', populated);
      if (status) {
        const sa = activity.find((a) => a.type === 'status_change');
        req.io.emit('ticket:status_changed', { ticketId: id, ticketNumber: populated.ticketNumber, oldStatus: sa?.oldValue, newStatus: status, updatedBy: req.user.name });
      }
    }

    logger.info(`Ticket ${populated.ticketNumber} updated by ${req.user.email}`);
    res.json({ success: true, ticket: populated });
  } catch (error) { next(error); }
};

const addComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content, isInternal } = req.body;
    const isAgent = ['agent', 'admin'].includes(req.user.role);

    const ticket = await Ticket.findById(id);
    if (!ticket) return next(createError(404, 'Ticket not found.'));
    if (!isAgent && ticket.createdBy.toString() !== req.user._id.toString())
      return next(createError(403, 'Access denied.'));
    if (isInternal && !isAgent)
      return next(createError(403, 'Only agents can create internal notes.'));

    if (isAgent && !ticket.firstResponseAt) ticket.firstResponseAt = new Date();

    if (!isAgent && ticket.status === 'waiting_for_customer') {
      ticket.status = 'in_progress';
      ticket.activity.push({ type: 'status_change', description: 'Status changed to In Progress (customer replied)', performedBy: req.user._id, oldValue: 'waiting_for_customer', newValue: 'in_progress' });
    }

    ticket.activity.push({ type: 'comment', description: `${isInternal ? 'Internal note' : 'Comment'} added`, performedBy: req.user._id });
    await ticket.save();

    const comment = await Comment.create({ ticket: id, author: req.user._id, content, isInternal: isAgent ? (isInternal || false) : false });
    const populated = await Comment.findById(comment._id).populate('author', 'name email role');
    await invalidateTicketCaches(id);

    if (req.io) {
      req.io.to(`ticket:${id}`).emit('comment:new', { ticketId: id, comment: populated });
      req.io.emit('ticket:updated', { _id: id, ticketNumber: ticket.ticketNumber });
    }

    res.status(201).json({ success: true, comment: populated });
  } catch (error) { next(error); }
};

const getStats = async (req, res, next) => {
  try {
    const isAgent = ['agent', 'admin'].includes(req.user.role);
    const matchFilter = isAgent ? {} : { createdBy: req.user._id };
    const cacheKey = isAgent ? STATS_CACHE_KEY : `${STATS_CACHE_KEY}:user:${req.user._id}`;
    const stats = await getTicketStats(matchFilter, cacheKey);
    res.json({ success: true, ...stats });
  } catch (error) { next(error); }
};

module.exports = { getTickets, getTicketById, createTicket, updateTicket, addComment, getStats };