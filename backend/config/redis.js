const Redis = require('ioredis');
const logger = require('./logger');

let redisClient = null;

const createRedisClient = () => {
  const client = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
    retryStrategy: (times) => {
      if (times > 3) {
        logger.warn('Redis connection failed after 3 retries. Running without cache.');
        return null;
      }
      return Math.min(times * 200, 2000);
    },
    lazyConnect: true,
    enableOfflineQueue: false,
  });

  client.on('connect', () => logger.info('Redis connected'));
  client.on('error', (err) => logger.warn(`Redis error (non-fatal): ${err.message}`));
  client.on('close', () => logger.warn('Redis connection closed'));
  return client;
};

const getRedisClient = () => {
  if (!redisClient) redisClient = createRedisClient();
  return redisClient;
};

const connectRedis = async () => {
  const client = getRedisClient();
  try {
    await client.connect();
  } catch (error) {
    logger.warn(`Redis unavailable: ${error.message}. App will run without caching.`);
  }
};

const cacheGet = async (key) => {
  try {
    const client = getRedisClient();
    if (client.status !== 'ready') return null;
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    logger.warn(`Cache GET error for key ${key}: ${error.message}`);
    return null;
  }
};

const cacheSet = async (key, value, ttl = null) => {
  try {
    const client = getRedisClient();
    if (client.status !== 'ready') return false;
    const expiry = ttl || parseInt(process.env.REDIS_TTL || '3600');
    await client.setex(key, expiry, JSON.stringify(value));
    return true;
  } catch (error) {
    logger.warn(`Cache SET error for key ${key}: ${error.message}`);
    return false;
  }
};

const cacheDel = async (key) => {
  try {
    const client = getRedisClient();
    if (client.status !== 'ready') return false;
    await client.del(key);
    return true;
  } catch (error) {
    logger.warn(`Cache DEL error for key ${key}: ${error.message}`);
    return false;
  }
};

const cacheDelPattern = async (pattern) => {
  try {
    const client = getRedisClient();
    if (client.status !== 'ready') return false;
    const keys = await client.keys(pattern);
    if (keys.length > 0) await client.del(...keys);
    return true;
  } catch (error) {
    logger.warn(`Cache DEL pattern error for ${pattern}: ${error.message}`);
    return false;
  }
};

module.exports = { connectRedis, getRedisClient, cacheGet, cacheSet, cacheDel, cacheDelPattern };