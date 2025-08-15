const { promisify } = require('util');

const redis = require('redis');

const config = require('../config');
const logger = require('../utils/logger');

class CacheService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.commands = {};
  }

  async connect() {
    try {
      // Skip Redis if not configured
      if (!config.redis.host) {
        logger.info('Redis not configured, using in-memory cache');
        this.inMemoryCache = new Map();
        this.isConnected = false;
        return;
      }

      // Create Redis client
      this.client = redis.createClient({
        socket: {
          host: config.redis.host,
          port: config.redis.port,
        },
        password: config.redis.password || undefined,
        database: config.redis.db,
      });

      // Set up event handlers
      this.client.on('error', err => {
        logger.error('Redis Client Error', err);
        this.isConnected = false;
        // Fallback to in-memory cache
        if (!this.inMemoryCache) {
          this.inMemoryCache = new Map();
        }
      });

      this.client.on('connect', () => {
        logger.info('Redis Client Connected');
        this.isConnected = true;
      });

      this.client.on('ready', () => {
        logger.info('Redis Client Ready');
        this.isConnected = true;
      });

      this.client.on('end', () => {
        logger.info('Redis Client Connection Closed');
        this.isConnected = false;
      });

      // Connect to Redis
      await this.client.connect();

      // Promisify common Redis commands for backward compatibility
      this.commands = {
        get: this.client.get.bind(this.client),
        set: this.client.set.bind(this.client),
        setEx: this.client.setEx.bind(this.client),
        del: this.client.del.bind(this.client),
        exists: this.client.exists.bind(this.client),
        expire: this.client.expire.bind(this.client),
        ttl: this.client.ttl.bind(this.client),
        keys: this.client.keys.bind(this.client),
        flushAll: this.client.flushAll.bind(this.client),
        hGet: this.client.hGet.bind(this.client),
        hSet: this.client.hSet.bind(this.client),
        hGetAll: this.client.hGetAll.bind(this.client),
        hDel: this.client.hDel.bind(this.client),
        sAdd: this.client.sAdd.bind(this.client),
        sMembers: this.client.sMembers.bind(this.client),
        sRem: this.client.sRem.bind(this.client),
        incr: this.client.incr.bind(this.client),
        decr: this.client.decr.bind(this.client),
      };

      return true;
    } catch (error) {
      logger.error('Failed to connect to Redis', error);
      this.isConnected = false;
      return false;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
      logger.info('Redis connection closed');
    }
  }

  // Helper method to add key prefix
  getKey(key) {
    return `${config.redis.keyPrefix}${key}`;
  }

  // Basic cache operations
  async get(key) {
    // Use in-memory cache if Redis not connected
    if (!this.isConnected) {
      if (this.inMemoryCache) {
        const item = this.inMemoryCache.get(this.getKey(key));
        if (item && (!item.expires || item.expires > Date.now())) {
          return item.value;
        }
        this.inMemoryCache.delete(this.getKey(key));
      }
      return null;
    }
    try {
      const value = await this.commands.get(this.getKey(key));
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Cache get error', { key, error: error.message });
      return null;
    }
  }

  async set(key, value, ttl = config.redis.ttl) {
    // Use in-memory cache if Redis not connected
    if (!this.isConnected) {
      if (this.inMemoryCache) {
        this.inMemoryCache.set(this.getKey(key), {
          value,
          expires: ttl ? Date.now() + (ttl * 1000) : null,
        });
        return true;
      }
      return false;
    }
    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await this.commands.setEx(this.getKey(key), ttl, serialized);
      } else {
        await this.commands.set(this.getKey(key), serialized);
      }
      return true;
    } catch (error) {
      logger.error('Cache set error', { key, error: error.message });
      return false;
    }
  }

  async delete(key) {
    if (!this.isConnected) {
      if (this.inMemoryCache) {
        this.inMemoryCache.delete(this.getKey(key));
        return true;
      }
      return false;
    }
    try {
      await this.commands.del(this.getKey(key));
      return true;
    } catch (error) {
      logger.error('Cache delete error', { key, error: error.message });
      return false;
    }
  }

  async exists(key) {
    if (!this.isConnected) {
      if (this.inMemoryCache) {
        const item = this.inMemoryCache.get(this.getKey(key));
        return item && (!item.expires || item.expires > Date.now());
      }
      return false;
    }
    try {
      const result = await this.commands.exists(this.getKey(key));
      return result === 1;
    } catch (error) {
      logger.error('Cache exists error', { key, error: error.message });
      return false;
    }
  }

  async expire(key, ttl) {
    if (!this.isConnected) return false;
    try {
      await this.commands.expire(this.getKey(key), ttl);
      return true;
    } catch (error) {
      logger.error('Cache expire error', { key, error: error.message });
      return false;
    }
  }

  async getTTL(key) {
    if (!this.isConnected) return -1;
    try {
      return await this.commands.ttl(this.getKey(key));
    } catch (error) {
      logger.error('Cache TTL error', { key, error: error.message });
      return -1;
    }
  }

  // Pattern-based operations
  async deletePattern(pattern) {
    if (!this.isConnected) return false;
    try {
      const keys = await this.commands.keys(this.getKey(pattern));
      if (keys.length > 0) {
        await this.commands.del(keys);
      }
      return true;
    } catch (error) {
      logger.error('Cache delete pattern error', { pattern, error: error.message });
      return false;
    }
  }

  async getKeys(pattern = '*') {
    if (!this.isConnected) return [];
    try {
      const keys = await this.commands.keys(this.getKey(pattern));
      return keys.map(key => key.replace(config.redis.keyPrefix, ''));
    } catch (error) {
      logger.error('Cache get keys error', { pattern, error: error.message });
      return [];
    }
  }

  // Hash operations
  async hGet(hash, field) {
    if (!this.isConnected) return null;
    try {
      const value = await this.commands.hGet(this.getKey(hash), field);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Cache hGet error', { hash, field, error: error.message });
      return null;
    }
  }

  async hSet(hash, field, value) {
    if (!this.isConnected) return false;
    try {
      await this.commands.hSet(this.getKey(hash), field, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.error('Cache hSet error', { hash, field, error: error.message });
      return false;
    }
  }

  async hGetAll(hash) {
    if (!this.isConnected) return {};
    try {
      const data = await this.commands.hGetAll(this.getKey(hash));
      const result = {};
      for (const [key, value] of Object.entries(data)) {
        result[key] = JSON.parse(value);
      }
      return result;
    } catch (error) {
      logger.error('Cache hGetAll error', { hash, error: error.message });
      return {};
    }
  }

  async hDelete(hash, field) {
    if (!this.isConnected) return false;
    try {
      await this.commands.hDel(this.getKey(hash), field);
      return true;
    } catch (error) {
      logger.error('Cache hDelete error', { hash, field, error: error.message });
      return false;
    }
  }

  // Set operations
  async sAdd(set, member) {
    if (!this.isConnected) return false;
    try {
      await this.commands.sAdd(this.getKey(set), JSON.stringify(member));
      return true;
    } catch (error) {
      logger.error('Cache sAdd error', { set, error: error.message });
      return false;
    }
  }

  async sMembers(set) {
    if (!this.isConnected) return [];
    try {
      const members = await this.commands.sMembers(this.getKey(set));
      return members.map(member => JSON.parse(member));
    } catch (error) {
      logger.error('Cache sMembers error', { set, error: error.message });
      return [];
    }
  }

  async sRemove(set, member) {
    if (!this.isConnected) return false;
    try {
      await this.commands.sRem(this.getKey(set), JSON.stringify(member));
      return true;
    } catch (error) {
      logger.error('Cache sRemove error', { set, error: error.message });
      return false;
    }
  }

  // Counter operations
  async increment(key, amount = 1) {
    if (!this.isConnected) return 0;
    try {
      if (amount === 1) {
        return await this.commands.incr(this.getKey(key));
      }
      return await this.client.incrBy(this.getKey(key), amount);
    } catch (error) {
      logger.error('Cache increment error', { key, error: error.message });
      return 0;
    }
  }

  async decrement(key, amount = 1) {
    if (!this.isConnected) return 0;
    try {
      if (amount === 1) {
        return await this.commands.decr(this.getKey(key));
      }
      return await this.client.decrBy(this.getKey(key), amount);
    } catch (error) {
      logger.error('Cache decrement error', { key, error: error.message });
      return 0;
    }
  }

  // Cache warming
  async warmCache(data, keyGenerator) {
    if (!this.isConnected) return false;
    try {
      const promises = [];
      for (const item of data) {
        const key = keyGenerator(item);
        promises.push(this.set(key, item));
      }
      await Promise.all(promises);
      logger.info('Cache warmed', { count: data.length });
      return true;
    } catch (error) {
      logger.error('Cache warming error', error);
      return false;
    }
  }

  // Cache invalidation
  async invalidate(tags = []) {
    if (!this.isConnected) return false;
    try {
      const promises = [];
      for (const tag of tags) {
        promises.push(this.deletePattern(`${tag}:*`));
      }
      await Promise.all(promises);
      logger.info('Cache invalidated', { tags });
      return true;
    } catch (error) {
      logger.error('Cache invalidation error', error);
      return false;
    }
  }

  // Flush all cache
  async flush() {
    if (!this.isConnected) return false;
    try {
      await this.commands.flushAll();
      logger.info('Cache flushed');
      return true;
    } catch (error) {
      logger.error('Cache flush error', error);
      return false;
    }
  }

  // Cache middleware for Express
  middleware(keyGenerator, ttl = config.redis.ttl) {
    return async (req, res, next) => {
      if (!this.isConnected) {
        return next();
      }

      const key = typeof keyGenerator === 'function' ? keyGenerator(req) : keyGenerator;

      try {
        const cached = await this.get(key);
        if (cached) {
          logger.debug('Cache hit', { key });
          return res.json(cached);
        }
      } catch (error) {
        logger.error('Cache middleware error', error);
      }

      // Store original send method
      const originalSend = res.json;

      // Override send method
      res.json = data => {
        // Cache the response
        this.set(key, data, ttl).catch(error => {
          logger.error('Failed to cache response', error);
        });

        // Call original send
        return originalSend.call(res, data);
      };

      next();
    };
  }

  // Cache decorator for functions
  async cached(key, fn, ttl = config.redis.ttl) {
    if (!this.isConnected) {
      return await fn();
    }

    try {
      const cached = await this.get(key);
      if (cached) {
        logger.debug('Cache hit', { key });
        return cached;
      }

      const result = await fn();
      await this.set(key, result, ttl);
      return result;
    } catch (error) {
      logger.error('Cached function error', error);
      return await fn();
    }
  }

  // Rate limiting using Redis
  async rateLimit(identifier, limit, window) {
    if (!this.isConnected) return { allowed: true, remaining: limit };

    const key = `ratelimit:${identifier}`;

    try {
      const count = await this.increment(key);

      if (count === 1) {
        await this.expire(key, window);
      }

      const ttl = await this.getTTL(key);
      const remaining = Math.max(0, limit - count);

      return {
        allowed: count <= limit,
        remaining,
        resetIn: ttl,
      };
    } catch (error) {
      logger.error('Rate limit error', error);
      return { allowed: true, remaining: limit };
    }
  }

  // Session storage
  async getSession(sessionId) {
    return await this.get(`session:${sessionId}`);
  }

  async setSession(sessionId, data, ttl = 86400) {
    return await this.set(`session:${sessionId}`, data, ttl);
  }

  async deleteSession(sessionId) {
    return await this.delete(`session:${sessionId}`);
  }

  // Health check
  async ping() {
    if (!this.isConnected) {
      if (this.inMemoryCache) {
        return 'PONG (in-memory)';
      }
      throw new Error('Cache not available');
    }
    try {
      return await this.client.ping();
    } catch (error) {
      logger.error('Cache ping error', error);
      throw error;
    }
  }
}

// Create singleton instance
const cacheService = new CacheService();

// Auto-connect on startup
cacheService.connect().catch(error => {
  logger.error('Failed to initialize Redis cache', error);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await cacheService.disconnect();
});

process.on('SIGINT', async () => {
  await cacheService.disconnect();
});

module.exports = cacheService;
