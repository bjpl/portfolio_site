// Advanced caching strategies for performance optimization

// Service Worker cache configuration
export const cacheStrategies = {
  // Cache-first strategy for static assets
  static: {
    cacheName: 'static-cache-v1',
    strategy: 'CacheFirst',
    maxEntries: 100,
    maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
    patterns: [
      /\.(?:js|css|html|ico|png|jpg|jpeg|svg|webp|woff2?)$/,
      /\/_next\/static\//,
    ],
  },

  // Network-first strategy for API calls
  api: {
    cacheName: 'api-cache-v1',
    strategy: 'NetworkFirst',
    maxEntries: 50,
    maxAgeSeconds: 5 * 60, // 5 minutes
    patterns: [
      /\/api\//,
      /\.json$/,
    ],
  },

  // Stale-while-revalidate for content
  content: {
    cacheName: 'content-cache-v1',
    strategy: 'StaleWhileRevalidate',
    maxEntries: 200,
    maxAgeSeconds: 24 * 60 * 60, // 24 hours
    patterns: [
      /\/blog\//,
      /\/projects\//,
      /\/writing\//,
    ],
  },

  // Cache-only for precached resources
  precached: {
    cacheName: 'precache-v1',
    strategy: 'CacheOnly',
    patterns: [
      '/manifest.json',
      '/favicon.ico',
      '/_offline',
    ],
  },
};

// Browser cache headers configuration
export const browserCacheHeaders = {
  // Static assets - long-term caching
  static: {
    'Cache-Control': 'public, max-age=31536000, immutable', // 1 year
    'Vary': 'Accept-Encoding',
  },

  // Images - medium-term caching
  images: {
    'Cache-Control': 'public, max-age=2592000', // 30 days
    'Vary': 'Accept-Encoding',
  },

  // API responses - short-term caching
  api: {
    'Cache-Control': 'public, max-age=300, stale-while-revalidate=86400', // 5 minutes, stale for 1 day
    'Vary': 'Accept-Encoding, Authorization',
  },

  // HTML pages - validate on each request
  html: {
    'Cache-Control': 'public, max-age=0, must-revalidate',
    'Vary': 'Accept-Encoding, Cookie',
  },

  // Dynamic content - no cache
  dynamic: {
    'Cache-Control': 'private, no-cache, no-store, must-revalidate',
    'Expires': '0',
  },
};

// CDN cache configuration
export const cdnCacheConfig = {
  // Static assets
  static: {
    ttl: 31536000, // 1 year
    browserTtl: 31536000,
    edgeTtl: 31536000,
    bypassOnCookie: false,
  },

  // Images
  images: {
    ttl: 2592000, // 30 days
    browserTtl: 2592000,
    edgeTtl: 2592000,
    bypassOnCookie: false,
  },

  // API responses
  api: {
    ttl: 300, // 5 minutes
    browserTtl: 0,
    edgeTtl: 300,
    bypassOnCookie: true,
  },

  // HTML pages
  html: {
    ttl: 3600, // 1 hour
    browserTtl: 0,
    edgeTtl: 3600,
    bypassOnCookie: true,
  },
};

// Memory cache implementation for client-side
export class MemoryCache {
  constructor(maxSize = 100, ttl = 5 * 60 * 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  set(key, value, customTtl) {
    const expiresAt = Date.now() + (customTtl || this.ttl);
    
    // Remove oldest entry if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, { value, expiresAt });
    
    // Schedule cleanup
    setTimeout(() => this.delete(key), customTtl || this.ttl);
  }

  get(key) {
    const item = this.cache.get(key);
    
    if (!item) return null;
    
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  has(key) {
    return this.get(key) !== null;
  }

  delete(key) {
    return this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  size() {
    return this.cache.size;
  }
}

// LRU Cache implementation
export class LRUCache {
  constructor(capacity = 100) {
    this.capacity = capacity;
    this.cache = new Map();
  }

  get(key) {
    if (this.cache.has(key)) {
      const value = this.cache.get(key);
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
      return value;
    }
    return null;
  }

  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      // Remove least recently used (first item)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  has(key) {
    return this.cache.has(key);
  }

  delete(key) {
    return this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  size() {
    return this.cache.size;
  }
}

// Request deduplication
export class RequestDeduplicator {
  constructor() {
    this.pending = new Map();
  }

  async request(key, requestFn) {
    // If request is already pending, return the same promise
    if (this.pending.has(key)) {
      return this.pending.get(key);
    }

    // Create new request
    const promise = requestFn()
      .then(result => {
        this.pending.delete(key);
        return result;
      })
      .catch(error => {
        this.pending.delete(key);
        throw error;
      });

    this.pending.set(key, promise);
    return promise;
  }
}

// Cache warming strategies
export const cacheWarming = {
  // Warm critical routes
  async warmCriticalRoutes(routes) {
    const promises = routes.map(route => {
      return fetch(route, { method: 'GET' })
        .catch(err => console.warn(`Failed to warm route ${route}:`, err));
    });
    
    await Promise.allSettled(promises);
  },

  // Preload next page
  async preloadRoute(route) {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = route;
        document.head.appendChild(link);
      });
    }
  },

  // Preload images
  async preloadImages(imageUrls) {
    const promises = imageUrls.map(url => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = img.onerror = resolve;
        img.src = url;
      });
    });
    
    await Promise.allSettled(promises);
  },
};

// Cache invalidation strategies
export const cacheInvalidation = {
  // Invalidate by pattern
  invalidateByPattern(pattern) {
    if ('caches' in window) {
      return caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            return caches.open(cacheName).then(cache => {
              return cache.keys().then(requests => {
                const matchingRequests = requests.filter(request =>
                  pattern.test(request.url)
                );
                return Promise.all(
                  matchingRequests.map(request => cache.delete(request))
                );
              });
            });
          })
        );
      });
    }
    return Promise.resolve();
  },

  // Invalidate by tag
  invalidateByTag(tag) {
    // Implementation depends on cache tagging system
    return this.invalidateByPattern(new RegExp(`tag=${tag}`));
  },

  // Time-based invalidation
  invalidateExpired() {
    const now = Date.now();
    if ('caches' in window) {
      return caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            return caches.open(cacheName).then(cache => {
              return cache.keys().then(requests => {
                return Promise.all(
                  requests.map(async request => {
                    const response = await cache.match(request);
                    if (response) {
                      const cachedAt = response.headers.get('sw-cached-at');
                      if (cachedAt && now - parseInt(cachedAt) > 86400000) { // 24 hours
                        return cache.delete(request);
                      }
                    }
                  })
                );
              });
            });
          })
        );
      });
    }
    return Promise.resolve();
  },
};

// Cache metrics and monitoring
export class CacheMetrics {
  constructor() {
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
    };
  }

  recordHit() {
    this.metrics.hits++;
  }

  recordMiss() {
    this.metrics.misses++;
  }

  recordSet() {
    this.metrics.sets++;
  }

  recordDelete() {
    this.metrics.deletes++;
  }

  recordError() {
    this.metrics.errors++;
  }

  getHitRate() {
    const total = this.metrics.hits + this.metrics.misses;
    return total > 0 ? (this.metrics.hits / total) * 100 : 0;
  }

  getMetrics() {
    return {
      ...this.metrics,
      hitRate: this.getHitRate(),
    };
  }

  reset() {
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
    };
  }
}

// Global cache instances
export const memoryCache = new MemoryCache(200, 10 * 60 * 1000); // 200 items, 10 minutes
export const lruCache = new LRUCache(100);
export const requestDeduplicator = new RequestDeduplicator();
export const cacheMetrics = new CacheMetrics();

export default {
  cacheStrategies,
  browserCacheHeaders,
  cdnCacheConfig,
  MemoryCache,
  LRUCache,
  RequestDeduplicator,
  cacheWarming,
  cacheInvalidation,
  CacheMetrics,
  memoryCache,
  lruCache,
  requestDeduplicator,
  cacheMetrics,
};