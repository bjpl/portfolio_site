/**
 * Cache Service
 * Centralized caching with Redis and in-memory fallback
 */

const Redis = require('ioredis');
const NodeCache = require('node-cache');
const config = require('../config');
const logger = require('../utils/logger');

class CacheService {
  constructor() {
    this.redis = null;
    this.nodeCache = null;
    this.isRedisAvailable = false;
    this.initialized = false;
  }

  /**
   * Initialize cache service
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      // Initialize Redis if configured
      if (config.cache.type === 'redis' || config.cache.type === 'both') {
        await this.initializeRedis();
      }

      // Initialize in-memory cache as fallback
      this.initializeNodeCache();

      this.initialized = true;
      logger.info('Cache service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize cache service:', error);
      throw error;
    }
  }

  /**
   * Initialize Redis connection
   */
  async initializeRedis() {
    try {
      this.redis = new Redis({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        db: config.redis.db,
        keyPrefix: config.redis.keyPrefix,
        retryDelayOnFailover: config.redis.retryDelayOnFailover,
        enableReadyCheck: config.redis.enableReadyCheck,
        maxRetriesPerRequest: config.redis.maxRetriesPerRequest,
        lazyConnect: config.redis.lazyConnect,
        family: config.redis.family,
        connectTimeout: config.redis.connectTimeout,
        commandTimeout: config.redis.commandTimeout
      });

      // Redis event handlers
      this.redis.on('connect', () => {
        logger.info('Redis connected');
        this.isRedisAvailable = true;
      });

      this.redis.on('ready', () => {
        logger.info('Redis ready');
        this.isRedisAvailable = true;
      });

      this.redis.on('error', (error) => {
        logger.error('Redis error:', error);
        this.isRedisAvailable = false;
      });

      this.redis.on('close', () => {
        logger.warn('Redis connection closed');
        this.isRedisAvailable = false;
      });

      this.redis.on('reconnecting', () => {
        logger.info('Redis reconnecting...');
      });

      // Test connection
      await this.redis.ping();
      this.isRedisAvailable = true;
      logger.info('Redis connection established');
    } catch (error) {
      logger.warn('Redis connection failed, falling back to in-memory cache:', error.message);
      this.isRedisAvailable = false;
    }
  }

  /**
   * Initialize Node.js in-memory cache
   */
  initializeNodeCache() {
    this.nodeCache = new NodeCache({
      stdTTL: config.cache.memory.maxAge / 1000, // Convert to seconds
      checkperiod: 60, // Check for expired keys every 60 seconds
      useClones: false, // Better performance, but be careful with object mutations
      deleteOnExpire: true,
      enableLegacyCallbacks: false,
      maxKeys: config.cache.memory.max
    });

    this.nodeCache.on('set', (key, value) => {
      logger.debug(`Cache set: ${key}`);
    });

    this.nodeCache.on('del', (key, value) => {
      logger.debug(`Cache delete: ${key}`);
    });

    this.nodeCache.on('expired', (key, value) => {
      logger.debug(`Cache expired: ${key}`);
    });

    logger.info('In-memory cache initialized');
  }

  /**
   * Get value from cache
   */
  async get(key) {
    try {
      if (this.isRedisAvailable && this.redis) {
        const value = await this.redis.get(key);
        return value;
      } else if (this.nodeCache) {
        return this.nodeCache.get(key) || null;
      }
      return null;
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      // Try fallback cache
      if (this.nodeCache) {
        return this.nodeCache.get(key) || null;
      }
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set(key, value, ttl = null) {
    try {
      const actualTTL = ttl || config.cache.ttl.default;

      if (this.isRedisAvailable && this.redis) {
        if (actualTTL) {
          await this.redis.setex(key, actualTTL, value);
        } else {
          await this.redis.set(key, value);
        }
      }

      if (this.nodeCache) {
        this.nodeCache.set(key, value, actualTTL);
      }

      return true;
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete key from cache
   */
  async del(key) {
    try {
      if (this.isRedisAvailable && this.redis) {
        await this.redis.del(key);
      }

      if (this.nodeCache) {
        this.nodeCache.del(key);
      }

      return true;
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Check if key exists in cache
   */
  async exists(key) {
    try {
      if (this.isRedisAvailable && this.redis) {
        const exists = await this.redis.exists(key);
        return exists === 1;
      } else if (this.nodeCache) {
        return this.nodeCache.has(key);
      }
      return false;
    } catch (error) {
      logger.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Increment numeric value in cache
   */
  async incr(key, amount = 1) {
    try {
      if (this.isRedisAvailable && this.redis) {
        return await this.redis.incrby(key, amount);
      } else if (this.nodeCache) {
        const current = this.nodeCache.get(key) || 0;
        const newValue = parseInt(current) + amount;
        this.nodeCache.set(key, newValue);
        return newValue;
      }
      return 0;
    } catch (error) {
      logger.error(`Cache increment error for key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Set expiration time for existing key
   */
  async expire(key, ttl) {
    try {
      if (this.isRedisAvailable && this.redis) {
        await this.redis.expire(key, ttl);
      } else if (this.nodeCache) {
        const value = this.nodeCache.get(key);
        if (value !== undefined) {
          this.nodeCache.set(key, value, ttl);
        }
      }
      return true;
    } catch (error) {
      logger.error(`Cache expire error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Clear cache by pattern
   */
  async clear(pattern = '*') {
    try {
      let clearedCount = 0;

      if (this.isRedisAvailable && this.redis) {
        // Get all keys matching pattern
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          clearedCount = await this.redis.del(...keys);
        }
      }

      if (this.nodeCache) {
        if (pattern === '*') {
          const keys = this.nodeCache.keys();
          clearedCount += keys.length;
          this.nodeCache.flushAll();
        } else {
          // Simple pattern matching for Node cache
          const keys = this.nodeCache.keys();
          const regex = new RegExp(pattern.replace(/\*/g, '.*'));
          const matchingKeys = keys.filter(key => regex.test(key));
          matchingKeys.forEach(key => this.nodeCache.del(key));
          clearedCount += matchingKeys.length;
        }
      }

      logger.info(`Cleared ${clearedCount} cache keys matching pattern: ${pattern}`);
      return clearedCount;
    } catch (error) {
      logger.error(`Cache clear error for pattern ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    const stats = {
      redis: null,
      memory: null,
      isRedisAvailable: this.isRedisAvailable
    };

    try {
      if (this.isRedisAvailable && this.redis) {
        const info = await this.redis.info('memory');
        const keyspace = await this.redis.info('keyspace');
        stats.redis = {
          memory: info,
          keyspace: keyspace,
          connected: true
        };
      }

      if (this.nodeCache) {
        stats.memory = {
          keys: this.nodeCache.keys().length,
          stats: this.nodeCache.getStats()
        };
      }
    } catch (error) {
      logger.error('Error getting cache stats:', error);
    }

    return stats;
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const health = {
        status: 'healthy',
        redis: this.isRedisAvailable,
        memory: this.nodeCache !== null,
        timestamp: new Date().toISOString()
      };

      if (this.isRedisAvailable && this.redis) {
        await this.redis.ping();
      }

      if (!this.isRedisAvailable && !this.nodeCache) {
        health.status = 'unhealthy';
      } else if (!this.isRedisAvailable) {
        health.status = 'degraded';
      }

      return health;
    } catch (error) {
      logger.error('Cache health check failed:', error);
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Close connections
   */
  async close() {
    try {
      if (this.redis) {
        await this.redis.quit();
        this.redis = null;
      }

      if (this.nodeCache) {
        this.nodeCache.close();
        this.nodeCache = null;
      }

      this.isRedisAvailable = false;
      this.initialized = false;
      logger.info('Cache service closed');
    } catch (error) {
      logger.error('Error closing cache service:', error);
    }
  }

  /**
   * Cache wrapper for functions
   */
  async wrap(key, fn, ttl = null) {
    try {
      // Try to get from cache first
      const cached = await this.get(key);
      if (cached !== null) {
        try {
          return JSON.parse(cached);
        } catch (e) {
          return cached;
        }
      }

      // Execute function and cache result
      const result = await fn();
      const value = typeof result === 'string' ? result : JSON.stringify(result);
      await this.set(key, value, ttl);

      return result;
    } catch (error) {
      logger.error(`Cache wrap error for key ${key}:`, error);
      // If caching fails, still return the function result
      return await fn();
    }
  }

  /**
   * Batch operations
   */
  async mget(keys) {
    try {
      if (this.isRedisAvailable && this.redis) {
        return await this.redis.mget(...keys);
      } else if (this.nodeCache) {
        return keys.map(key => this.nodeCache.get(key) || null);
      }
      return keys.map(() => null);
    } catch (error) {
      logger.error('Cache mget error:', error);
      return keys.map(() => null);
    }
  }

  async mset(keyValuePairs, ttl = null) {
    try {
      if (this.isRedisAvailable && this.redis) {
        const pipeline = this.redis.pipeline();
        for (const [key, value] of keyValuePairs) {
          if (ttl) {
            pipeline.setex(key, ttl, value);
          } else {
            pipeline.set(key, value);
          }
        }
        await pipeline.exec();
      }

      if (this.nodeCache) {
        for (const [key, value] of keyValuePairs) {
          this.nodeCache.set(key, value, ttl);
        }
      }

      return true;
    } catch (error) {
      logger.error('Cache mset error:', error);
      return false;
    }
  }
}

// Create singleton instance
const cacheService = new CacheService();

module.exports = cacheService;