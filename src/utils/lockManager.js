const { v4: uuidv4 } = require('uuid');
const { getRedisClient } = require('../config/redis');
const logger = require('./logger');

class LockManager {
  constructor() {
    this.locks = new Map(); 
  }

  async acquireLock(resource, ttl = 30000, timeout = 5000) {
    const redisClient = getRedisClient();
    const lockKey = `lock:${resource}`;
    const lockToken = uuidv4();
    const startTime = Date.now();

    if (redisClient) {
      return this._acquireRedisLock(redisClient, lockKey, lockToken, ttl, timeout, startTime);
    } else {
      logger.warn('Using in-memory locking - not suitable for production with multiple instances');
      return this._acquireMemoryLock(lockKey, lockToken, ttl, timeout, startTime);
    }
  }

  async releaseLock(resource, lockToken) {
    const redisClient = getRedisClient();
    const lockKey = `lock:${resource}`;

    if (redisClient) {
      return this._releaseRedisLock(redisClient, lockKey, lockToken);
    } else {
      return this._releaseMemoryLock(lockKey, lockToken);
    }
  }

  async withLock(resource, fn, ttl = 30000, timeout = 5000) {
    const lockToken = await this.acquireLock(resource, ttl, timeout);
    
    if (!lockToken) {
      throw new Error(`Failed to acquire lock for resource: ${resource}`);
    }

    try {
      return await fn();
    } finally {
      await this.releaseLock(resource, lockToken);
    }
  }


  async _acquireRedisLock(redisClient, lockKey, lockToken, ttl, timeout, startTime) {
    while (Date.now() - startTime < timeout) {
      try {
        const result = await redisClient.set(lockKey, lockToken, {
          NX: true,
          PX: ttl
        });

        if (result === 'OK') {
          return lockToken;
        }

        await this._sleep(50 + Math.random() * 50);
      } catch (error) {
        logger.error('Error acquiring Redis lock:', error);
        break;
      }
    }
    return null;
  }

  async _releaseRedisLock(redisClient, lockKey, lockToken) {
    try {
      const luaScript = `
        if redis.call("GET", KEYS[1]) == ARGV[1] then
          return redis.call("DEL", KEYS[1])
        else
          return 0
        end
      `;

      const result = await redisClient.eval(luaScript, {
        keys: [lockKey],
        arguments: [lockToken]
      });

      return result === 1;
    } catch (error) {
      logger.error('Error releasing Redis lock:', error);
      return false;
    }
  }


  async _acquireMemoryLock(lockKey, lockToken, ttl, timeout, startTime) {
    while (Date.now() - startTime < timeout) {
      const existingLock = this.locks.get(lockKey);
      
      if (!existingLock || Date.now() > existingLock.expiresAt) {
        this.locks.set(lockKey, {
          token: lockToken,
          expiresAt: Date.now() + ttl
        });
        
        this._cleanupExpiredLocks();
        return lockToken;
      }

      await this._sleep(50 + Math.random() * 50);
    }
    return null;
  }

  async _releaseMemoryLock(lockKey, lockToken) {
    const existingLock = this.locks.get(lockKey);
    
    if (existingLock && existingLock.token === lockToken) {
      this.locks.delete(lockKey);
      return true;
    }
    
    return false;
  }

  _cleanupExpiredLocks() {
    const now = Date.now();
    for (const [key, lock] of this.locks.entries()) {
      if (now > lock.expiresAt) {
        this.locks.delete(key);
      }
    }
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new LockManager();