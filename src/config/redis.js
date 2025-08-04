const redis = require('redis');
const logger = require('../utils/logger');

let redisClient = null;

const connectRedis = async () => {
  try {
    redisClient = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    redisClient.on('error', (err) => {
      logger.error('Redis error:', err);
    });

    redisClient.on('connect', () => {
      logger.info('Connected to Redis');
    });

    await redisClient.connect();
    await redisClient.ping();
    logger.info('Redis connection successful');

  } catch (error) {
    logger.warn('Redis connection failed, using in-memory fallback:', error.message);
    redisClient = null;
  }
};

const getRedisClient = () => {
  if (!redisClient || !redisClient.isOpen) {
    return null;
  }
  return redisClient;
};

module.exports = { connectRedis, getRedisClient };