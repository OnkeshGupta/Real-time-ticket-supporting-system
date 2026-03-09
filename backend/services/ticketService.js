const Ticket = require('../models/Ticket');
const Comment = require('../models/Comment');
const { cacheGet, cacheSet, cacheDel, cacheDelPattern } = require('../config/redis');
const logger = require('../config/logger');

const CACHE_TTL = 300;
const TICKET_LIST_PREFIX = 'tickets:list:';
const TICKET_DETAIL_PREFIX = 'tickets:detail:';
const STATS_CACHE_KEY = 'tickets:stats';

const buildListCacheKey = (params) => {
  const sorted = Object.keys(params).sort().reduce((acc, k) => { acc[k] = params[k]; return acc; }, {});
  return `${TICKET_LIST_PREFIX}${JSON.stringify(sorted)}`;
};

const invalidateTicketCaches = async (ticketId = null) => {
  const ops = [
    cacheDelPattern(`${TICKET_LIST_PREFIX}*`),
    cacheDel(STATS_CACHE_KEY),
  ];
  if (ticketId) ops.push(cacheDel(`${TICKET_DETAIL_PREFIX}${ticketId}`));
  await Promise.all(ops);
  logger.debug('Ticket caches invalidated');
};

const getTicketList = async ({ filter, page, limit, sortBy, sortOrder, userId }) => {
  const cacheKey = buildListCacheKey({ ...filter, page, limit, sortBy, sortOrder, userId });
  const cached = await cacheGet(cacheKey);
  if (cached) return { ...cached, fromCache: true };

  const skip = (page - 1) * limit;
  const sortOptions = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const [tickets, total] = await Promise.all([
    Ticket.find(filter)
      .populate('createdBy', 'name email role')
      .populate('assignedTo', 'name email role')
      .sort(sortOptions).skip(skip).limit(limit).lean(),
    Ticket.countDocuments(filter),
  ]);

  const result = {
    tickets,
    pagination: {
      total, page, limit,
      pages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  };

  await cacheSet(cacheKey, result, CACHE_TTL);
  return { ...result, fromCache: false };
};

const getTicketDetail = async (ticketId, isAgent) => {
  const cacheKey = `${TICKET_DETAIL_PREFIX}${ticketId}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return { ...cached, fromCache: true };

  const ticket = await Ticket.findById(ticketId)
    .populate('createdBy', 'name email role')
    .populate('assignedTo', 'name email role')
    .populate('activity.performedBy', 'name role');

  if (!ticket) return null;

  const commentFilter = isAgent ? { ticket: ticketId } : { ticket: ticketId, isInternal: false };
  const comments = await Comment.find(commentFilter)
    .populate('author', 'name email role')
    .sort({ createdAt: 1 }).lean();

  const result = { ticket, comments };
  await cacheSet(cacheKey, result, CACHE_TTL);
  return { ...result, fromCache: false };
};

const getTicketStats = async (matchFilter, cacheKey) => {
  const cached = await cacheGet(cacheKey);
  if (cached) return { ...cached, fromCache: true };

  const [statusCounts, priorityCounts, recentTickets] = await Promise.all([
    Ticket.aggregate([{ $match: matchFilter }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Ticket.aggregate([
      { $match: { ...matchFilter, status: { $nin: ['resolved', 'closed'] } } },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]),
    Ticket.find(matchFilter)
      .populate('createdBy', 'name').populate('assignedTo', 'name')
      .sort({ createdAt: -1 }).limit(5).lean(),
  ]);

  const stats = {
    byStatus: statusCounts.reduce((acc, { _id, count }) => ({ ...acc, [_id]: count }), {}),
    byPriority: priorityCounts.reduce((acc, { _id, count }) => ({ ...acc, [_id]: count }), {}),
    recentTickets,
    total: statusCounts.reduce((sum, { count }) => sum + count, 0),
  };

  await cacheSet(cacheKey, stats, CACHE_TTL);
  return { ...stats, fromCache: false };
};

module.exports = { getTicketList, getTicketDetail, getTicketStats, invalidateTicketCaches, STATS_CACHE_KEY };