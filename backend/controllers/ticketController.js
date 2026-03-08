const Ticket = require('../models/Ticket');
const Comment = require('../models/Comment');
const { createError } = require('../utils/errorHandler');
const { cacheGet, cacheSet, cacheDel, cacheDelPattern } = require('../config/redis');
const logger = require('../config/logger');

const CACHE_TTL = 300; // 5 minutes
const TICKET_LIST_CACHE_PREFIX = 'tickets:list:';
const TICKET_DETAIL_CACHE_PREFIX = 'tickets:detail:';
const STATS_CACHE_KEY = 'tickets:stats';

// Build cache key from query params
const buildCacheKey = (prefix, params) => {
  const sorted = Object.keys(params).sort().reduce((acc, key) => {
    acc[key] = params[key];
    return acc;
  }, {});
  return `${prefix}${JSON.stringify(sorted)}`;
};

const getTickets = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      priority,
      search,
      assignedTo,
      createdBy,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const filter = {};
    const isAgent = ['agent', 'admin'].includes(req.user.role);

    // Customers can only see their own tickets
    if (!isAgent) {
      filter.createdBy = req.user._id;
    } else if (createdBy) {
      filter.createdBy = createdBy;
    }

    if (status && status !== 'all') filter.status = status;
    if (priority) filter.priority = priority;
    if (assignedTo) filter.assignedTo = assignedTo === 'me' ? req.user._id : assignedTo;
    if (search) {
      filter.$text = { $search: search };
    }

    const cacheKey = buildCacheKey(TICKET_LIST_CACHE_PREFIX, {
      ...filter,
      page,
      limit,
      sortBy,
      sortOrder,
      userId: req.user._id.toString(),
    });

    // Try cache first
    const cached = await cacheGet(cacheKey);
    if (cached) {
      return res.json({ success: true, ...cached, fromCache: true });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [tickets, total] = await Promise.all([
      Ticket.find(filter)
        .populate('createdBy', 'name email role')
        .populate('assignedTo', 'name email role')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Ticket.countDocuments(filter),
    ]);

    const result = {
      tickets,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };

    await cacheSet(cacheKey, result, CACHE_TTL);

    res.json({ success: true, ...result, fromCache: false });
  } catch (error) {
    next(error);
  }
};

const getTicketById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const cacheKey = `${TICKET_DETAIL_CACHE_PREFIX}${id}`;

    const cached = await cacheGet(cacheKey);
    if (cached) {
      // Auth check on cached data
      const isAgent = ['agent', 'admin'].includes(req.user.role);
      if (!isAgent && cached.ticket.createdBy._id.toString() !== req.user._id.toString()) {
        return next(createError(403, 'Access denied.'));
      }
      return res.json({ success: true, ...cached, fromCache: true });
    }

    const ticket = await Ticket.findById(id)
      .populate('createdBy', 'name email role')
      .populate('assignedTo', 'name email role')
      .populate('activity.performedBy', 'name role');

    if (!ticket) return next(createError(404, 'Ticket not found.'));

    const isAgent = ['agent', 'admin'].includes(req.user.role);
    if (!isAgent && ticket.createdBy._id.toString() !== req.user._id.toString()) {
      return next(createError(403, 'Access denied.'));
    }

    // Fetch comments
    const commentFilter = isAgent ? { ticket: id } : { ticket: id, isInternal: false };
    const comments = await Comment.find(commentFilter)
      .populate('author', 'name email role')
      .sort({ createdAt: 1 })
      .lean();

    const result = { ticket, comments };
    await cacheSet(cacheKey, result, CACHE_TTL);

    res.json({ success: true, ...result, fromCache: false });
  } catch (error) {
    next(error);
  }
};

const createTicket = async (req, res, next) => {
  try {
    const { title, description, priority, category, tags } = req.body;

    const ticket = await Ticket.create({
      title,
      description,
      priority: priority || 'medium',
      category: category || 'general',
      tags: tags || [],
      createdBy: req.user._id,
      activity: [
        {
          type: 'created',
          description: 'Ticket created',
          performedBy: req.user._id,
          newValue: 'open',
        },
      ],
    });

    const populated = await Ticket.findById(ticket._id)
      .populate('createdBy', 'name email role')
      .populate('assignedTo', 'name email role');

    // Invalidate ticket list cache and stats
    await Promise.all([
      cacheDelPattern(`${TICKET_LIST_CACHE_PREFIX}*`),
      cacheDel(STATS_CACHE_KEY),
    ]);

    // Emit socket event
    if (req.io) {
      req.io.emit('ticket:created', populated);
      req.io.to('agents').emit('ticket:new_notification', {
        message: `New ticket: ${populated.title}`,
        ticket: populated,
      });
    }

    logger.info(`Ticket created: ${populated.ticketNumber} by ${req.user.email}`);
    res.status(201).json({ success: true, ticket: populated });
  } catch (error) {
    next(error);
  }
};

const updateTicket = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, priority, assignedTo, title, description, tags } = req.body;
    const isAgent = ['agent', 'admin'].includes(req.user.role);

    const ticket = await Ticket.findById(id);
    if (!ticket) return next(createError(404, 'Ticket not found.'));

    // Customers can only update their own tickets and only certain fields
    if (!isAgent && ticket.createdBy.toString() !== req.user._id.toString()) {
      return next(createError(403, 'Access denied.'));
    }

    const activity = [];

    if (status && status !== ticket.status) {
      if (!isAgent && !['waiting_for_customer', 'resolved'].includes(status)) {
        return next(createError(403, 'Customers can only set status to resolved.'));
      }
      activity.push({
        type: 'status_change',
        description: `Status changed from ${ticket.status} to ${status}`,
        performedBy: req.user._id,
        oldValue: ticket.status,
        newValue: status,
      });
      ticket.status = status;
    }

    if (priority && priority !== ticket.priority && isAgent) {
      activity.push({
        type: 'priority_change',
        description: `Priority changed from ${ticket.priority} to ${priority}`,
        performedBy: req.user._id,
        oldValue: ticket.priority,
        newValue: priority,
      });
      ticket.priority = priority;
    }

    if (assignedTo !== undefined && isAgent) {
      const oldAgent = ticket.assignedTo?.toString();
      activity.push({
        type: 'assignment',
        description: assignedTo ? `Assigned to agent` : 'Unassigned',
        performedBy: req.user._id,
        oldValue: oldAgent,
        newValue: assignedTo || null,
      });
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

    // Invalidate caches
    await Promise.all([
      cacheDel(`${TICKET_DETAIL_CACHE_PREFIX}${id}`),
      cacheDelPattern(`${TICKET_LIST_CACHE_PREFIX}*`),
      cacheDel(STATS_CACHE_KEY),
    ]);

    // Emit socket events
    if (req.io) {
      req.io.emit('ticket:updated', populated);
      if (status) {
        req.io.emit('ticket:status_changed', {
          ticketId: id,
          ticketNumber: populated.ticketNumber,
          oldStatus: activity.find(a => a.type === 'status_change')?.oldValue,
          newStatus: status,
          updatedBy: req.user.name,
        });
      }
    }

    logger.info(`Ticket ${populated.ticketNumber} updated by ${req.user.email}`);
    res.json({ success: true, ticket: populated });
  } catch (error) {
    next(error);
  }
};

const addComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content, isInternal } = req.body;
    const isAgent = ['agent', 'admin'].includes(req.user.role);

    const ticket = await Ticket.findById(id);
    if (!ticket) return next(createError(404, 'Ticket not found.'));

    // Customers can't see/create internal notes
    if (!isAgent && ticket.createdBy.toString() !== req.user._id.toString()) {
      return next(createError(403, 'Access denied.'));
    }

    if (isInternal && !isAgent) {
      return next(createError(403, 'Only agents can create internal notes.'));
    }

    // Set first response time
    if (isAgent && !ticket.firstResponseAt) {
      ticket.firstResponseAt = new Date();
    }

    // If customer replies on a "waiting_for_customer" ticket, move to in_progress
    if (!isAgent && ticket.status === 'waiting_for_customer') {
      ticket.status = 'in_progress';
      ticket.activity.push({
        type: 'status_change',
        description: 'Status changed to In Progress (customer replied)',
        performedBy: req.user._id,
        oldValue: 'waiting_for_customer',
        newValue: 'in_progress',
      });
    }

    ticket.activity.push({
      type: 'comment',
      description: `${isInternal ? 'Internal note' : 'Comment'} added`,
      performedBy: req.user._id,
    });

    await ticket.save();

    const comment = await Comment.create({
      ticket: id,
      author: req.user._id,
      content,
      isInternal: isAgent ? (isInternal || false) : false,
    });

    const populated = await Comment.findById(comment._id).populate('author', 'name email role');

    // Invalidate cache
    await Promise.all([
      cacheDel(`${TICKET_DETAIL_CACHE_PREFIX}${id}`),
      cacheDelPattern(`${TICKET_LIST_CACHE_PREFIX}*`),
    ]);

    // Emit socket event
    if (req.io) {
      req.io.to(`ticket:${id}`).emit('comment:new', {
        ticketId: id,
        comment: populated,
      });
      req.io.emit('ticket:updated', { _id: id, ticketNumber: ticket.ticketNumber });
    }

    res.status(201).json({ success: true, comment: populated });
  } catch (error) {
    next(error);
  }
};

const getStats = async (req, res, next) => {
  try {
    const isAgent = ['agent', 'admin'].includes(req.user.role);
    const cacheKey = isAgent ? STATS_CACHE_KEY : `${STATS_CACHE_KEY}:user:${req.user._id}`;

    const cached = await cacheGet(cacheKey);
    if (cached) return res.json({ success: true, ...cached, fromCache: true });

    const matchFilter = isAgent ? {} : { createdBy: req.user._id };

    const [statusCounts, priorityCounts, recentTickets] = await Promise.all([
      Ticket.aggregate([
        { $match: matchFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Ticket.aggregate([
        { $match: { ...matchFilter, status: { $nin: ['resolved', 'closed'] } } },
        { $group: { _id: '$priority', count: { $sum: 1 } } },
      ]),
      Ticket.find(matchFilter)
        .populate('createdBy', 'name')
        .populate('assignedTo', 'name')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    const stats = {
      byStatus: statusCounts.reduce((acc, { _id, count }) => ({ ...acc, [_id]: count }), {}),
      byPriority: priorityCounts.reduce((acc, { _id, count }) => ({ ...acc, [_id]: count }), {}),
      recentTickets,
      total: Object.values(statusCounts.reduce((a, { _id, count }) => ({ ...a, [_id]: count }), {})).reduce((a, b) => a + b, 0),
    };

    await cacheSet(cacheKey, stats, CACHE_TTL);
    res.json({ success: true, ...stats, fromCache: false });
  } catch (error) {
    next(error);
  }
};

module.exports = { getTickets, getTicketById, createTicket, updateTicket, addComment, getStats };