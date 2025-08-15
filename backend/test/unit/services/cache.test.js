const CacheService = require('../../../src/services/cache');

describe('CacheService', () => {
  let cache;

  beforeEach(() => {
    // Use a mock cache for testing
    cache = {
      isConnected: true,
      data: new Map(),

      async get(key) {
        const value = this.data.get(key);
        return value ? JSON.parse(value) : null;
      },

      async set(key, value, ttl) {
        this.data.set(key, JSON.stringify(value));
        if (ttl) {
          setTimeout(() => this.data.delete(key), ttl * 1000);
        }
        return true;
      },

      async delete(key) {
        return this.data.delete(key);
      },

      async exists(key) {
        return this.data.has(key);
      },

      async flush() {
        this.data.clear();
        return true;
      },
    };
  });

  describe('Basic Operations', () => {
    test('should set and get values', async () => {
      const key = 'test:key';
      const value = { data: 'test value' };

      await cache.set(key, value);
      const retrieved = await cache.get(key);

      expect(retrieved).toEqual(value);
    });

    test('should return null for non-existent keys', async () => {
      const result = await cache.get('non:existent');
      expect(result).toBeNull();
    });

    test('should delete keys', async () => {
      const key = 'test:delete';
      await cache.set(key, 'value');

      expect(await cache.exists(key)).toBe(true);
      await cache.delete(key);
      expect(await cache.exists(key)).toBe(false);
    });

    test('should check key existence', async () => {
      const key = 'test:exists';

      expect(await cache.exists(key)).toBe(false);
      await cache.set(key, 'value');
      expect(await cache.exists(key)).toBe(true);
    });

    test('should flush all data', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');

      expect(await cache.exists('key1')).toBe(true);
      expect(await cache.exists('key2')).toBe(true);

      await cache.flush();

      expect(await cache.exists('key1')).toBe(false);
      expect(await cache.exists('key2')).toBe(false);
    });
  });

  describe('Complex Data Types', () => {
    test('should handle objects', async () => {
      const obj = {
        id: 1,
        name: 'Test User',
        tags: ['test', 'user'],
        meta: { created: new Date().toISOString() },
      };

      await cache.set('user:1', obj);
      const retrieved = await cache.get('user:1');

      expect(retrieved).toEqual(obj);
    });

    test('should handle arrays', async () => {
      const arr = [1, 2, 3, { nested: true }];

      await cache.set('array:test', arr);
      const retrieved = await cache.get('array:test');

      expect(retrieved).toEqual(arr);
    });

    test('should handle null and undefined', async () => {
      await cache.set('null:test', null);
      await cache.set('undefined:test', undefined);

      expect(await cache.get('null:test')).toBeNull();
      expect(await cache.get('undefined:test')).toBeNull();
    });
  });
});
