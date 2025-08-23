/**
 * API Helpers
 * CRUD operation helpers, pagination utilities, error handling, and response formatting
 */

import { supabaseAdmin } from './supabase-admin.js';

/**
 * Response formatter
 */
export const formatResponse = (success, data = null, error = null, meta = {}) => {
  return {
    success,
    data,
    error,
    timestamp: new Date().toISOString(),
    ...meta
  };
};

/**
 * Error handler
 */
export const handleError = (error, context = '') => {
  console.error(`API Error ${context}:`, error);
  
  // Format different error types
  if (error.code) {
    switch (error.code) {
      case 'PGRST116':
        return formatResponse(false, null, 'Record not found');
      case 'PGRST204':
        return formatResponse(false, null, 'No records found');
      case '23505':
        return formatResponse(false, null, 'Record already exists');
      case '23503':
        return formatResponse(false, null, 'Referenced record does not exist');
      default:
        return formatResponse(false, null, error.message || 'Database error');
    }
  }
  
  return formatResponse(false, null, error.message || 'Unknown error');
};

/**
 * Pagination utilities
 */
export const createPagination = (page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  return {
    offset,
    limit,
    range: [offset, offset + limit - 1]
  };
};

export const formatPaginatedResponse = (data, count, page, limit) => {
  const totalPages = Math.ceil(count / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;
  
  return formatResponse(true, data, null, {
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: count,
      totalPages,
      hasNextPage,
      hasPrevPage,
      nextPage: hasNextPage ? page + 1 : null,
      prevPage: hasPrevPage ? page - 1 : null
    }
  });
};

/**
 * CRUD Operation Helpers
 */
export class CrudHelper {
  constructor(tableName) {
    this.tableName = tableName;
    this.client = supabaseAdmin;
  }

  /**
   * Get all records with advanced filtering
   */
  async getAll(options = {}) {
    try {
      const {
        filters = {},
        search = null,
        searchColumns = [],
        page = 1,
        limit = 10,
        orderBy = 'created_at',
        ascending = false,
        select = '*'
      } = options;

      let query = this.client.from(this.tableName).select(select, { count: 'exact' });

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            query = query.in(key, value);
          } else if (typeof value === 'object' && value.operator) {
            switch (value.operator) {
              case 'gt':
                query = query.gt(key, value.value);
                break;
              case 'gte':
                query = query.gte(key, value.value);
                break;
              case 'lt':
                query = query.lt(key, value.value);
                break;
              case 'lte':
                query = query.lte(key, value.value);
                break;
              case 'like':
                query = query.like(key, value.value);
                break;
              case 'ilike':
                query = query.ilike(key, value.value);
                break;
              case 'neq':
                query = query.neq(key, value.value);
                break;
              default:
                query = query.eq(key, value.value);
            }
          } else {
            query = query.eq(key, value);
          }
        }
      });

      // Apply search
      if (search && searchColumns.length > 0) {
        const searchQuery = searchColumns
          .map(col => `${col}.ilike.%${search}%`)
          .join(',');
        query = query.or(searchQuery);
      }

      // Apply sorting
      query = query.order(orderBy, { ascending });

      // Apply pagination
      const { offset, limit: paginationLimit } = createPagination(page, limit);
      query = query.range(offset, offset + paginationLimit - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      return formatPaginatedResponse(data, count, page, limit);
    } catch (error) {
      return handleError(error, `getting all ${this.tableName}`);
    }
  }

  /**
   * Get single record by ID
   */
  async getById(id, options = {}) {
    try {
      const { select = '*' } = options;
      
      const { data, error } = await this.client
        .from(this.tableName)
        .select(select)
        .eq('id', id)
        .single();

      if (error) throw error;
      return formatResponse(true, data);
    } catch (error) {
      return handleError(error, `getting ${this.tableName} by ID`);
    }
  }

  /**
   * Create new record
   */
  async create(data, options = {}) {
    try {
      const { returning = true } = options;
      
      let query = this.client.from(this.tableName).insert(data);
      
      if (returning) {
        query = query.select();
      }

      const { data: result, error } = await query;

      if (error) throw error;
      
      const returnData = returning ? (Array.isArray(result) ? result[0] : result) : { success: true };
      return formatResponse(true, returnData);
    } catch (error) {
      return handleError(error, `creating ${this.tableName}`);
    }
  }

  /**
   * Update record by ID
   */
  async update(id, data, options = {}) {
    try {
      const { returning = true } = options;
      
      let query = this.client
        .from(this.tableName)
        .update(data)
        .eq('id', id);
      
      if (returning) {
        query = query.select();
      }

      const { data: result, error } = await query;

      if (error) throw error;
      
      const returnData = returning ? (Array.isArray(result) ? result[0] : result) : { success: true };
      return formatResponse(true, returnData);
    } catch (error) {
      return handleError(error, `updating ${this.tableName}`);
    }
  }

  /**
   * Delete record by ID
   */
  async delete(id, options = {}) {
    try {
      const { soft = false, deletedColumn = 'deleted_at' } = options;
      
      let query;
      
      if (soft) {
        query = this.client
          .from(this.tableName)
          .update({ [deletedColumn]: new Date().toISOString() })
          .eq('id', id);
      } else {
        query = this.client
          .from(this.tableName)
          .delete()
          .eq('id', id);
      }

      const { error } = await query;

      if (error) throw error;
      return formatResponse(true, { id, deleted: true });
    } catch (error) {
      return handleError(error, `deleting ${this.tableName}`);
    }
  }

  /**
   * Bulk operations
   */
  async bulkCreate(records, options = {}) {
    try {
      const { returning = true } = options;
      
      let query = this.client.from(this.tableName).insert(records);
      
      if (returning) {
        query = query.select();
      }

      const { data, error } = await query;

      if (error) throw error;
      return formatResponse(true, data);
    } catch (error) {
      return handleError(error, `bulk creating ${this.tableName}`);
    }
  }

  async bulkUpdate(updates, options = {}) {
    try {
      const { idColumn = 'id', returning = true } = options;
      
      const results = await Promise.all(
        updates.map(({ id, ...data }) => 
          this.update(id, data, { returning })
        )
      );

      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      return formatResponse(true, {
        successful: successful.map(r => r.data),
        failed: failed.map(r => r.error),
        total: updates.length,
        successCount: successful.length,
        failureCount: failed.length
      });
    } catch (error) {
      return handleError(error, `bulk updating ${this.tableName}`);
    }
  }

  async bulkDelete(ids, options = {}) {
    try {
      const { soft = false } = options;
      
      const results = await Promise.all(
        ids.map(id => this.delete(id, { soft }))
      );

      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      return formatResponse(true, {
        successful: successful.map(r => r.data),
        failed: failed.map(r => r.error),
        total: ids.length,
        successCount: successful.length,
        failureCount: failed.length
      });
    } catch (error) {
      return handleError(error, `bulk deleting ${this.tableName}`);
    }
  }
}

/**
 * Caching Layer
 */
export class CacheManager {
  constructor(ttl = 300000) { // Default 5 minutes
    this.cache = new Map();
    this.ttl = ttl;
  }

  generateKey(table, operation, params = {}) {
    return `${table}:${operation}:${JSON.stringify(params)}`;
  }

  set(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expires: Date.now() + this.ttl
    });
  }

  get(key) {
    const cached = this.cache.get(key);
    
    if (!cached) return null;
    
    if (Date.now() > cached.expires) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  delete(key) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  cleanup() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now > value.expires) {
        this.cache.delete(key);
      }
    }
  }
}

/**
 * Cached CRUD Helper
 */
export class CachedCrudHelper extends CrudHelper {
  constructor(tableName, cacheOptions = {}) {
    super(tableName);
    this.cache = new CacheManager(cacheOptions.ttl);
    this.enableCache = cacheOptions.enabled !== false;
  }

  async getAll(options = {}) {
    if (!this.enableCache) return super.getAll(options);
    
    const cacheKey = this.cache.generateKey(this.tableName, 'getAll', options);
    const cached = this.cache.get(cacheKey);
    
    if (cached) return cached;
    
    const result = await super.getAll(options);
    
    if (result.success) {
      this.cache.set(cacheKey, result);
    }
    
    return result;
  }

  async getById(id, options = {}) {
    if (!this.enableCache) return super.getById(id, options);
    
    const cacheKey = this.cache.generateKey(this.tableName, 'getById', { id, ...options });
    const cached = this.cache.get(cacheKey);
    
    if (cached) return cached;
    
    const result = await super.getById(id, options);
    
    if (result.success) {
      this.cache.set(cacheKey, result);
    }
    
    return result;
  }

  async create(data, options = {}) {
    const result = await super.create(data, options);
    
    if (result.success && this.enableCache) {
      // Invalidate list caches
      this.invalidateListCaches();
    }
    
    return result;
  }

  async update(id, data, options = {}) {
    const result = await super.update(id, data, options);
    
    if (result.success && this.enableCache) {
      // Invalidate related caches
      this.invalidateCaches(id);
    }
    
    return result;
  }

  async delete(id, options = {}) {
    const result = await super.delete(id, options);
    
    if (result.success && this.enableCache) {
      // Invalidate related caches
      this.invalidateCaches(id);
    }
    
    return result;
  }

  invalidateCaches(id = null) {
    if (id) {
      // Invalidate specific record cache
      const cachePattern = `${this.tableName}:getById:`;
      for (const key of this.cache.cache.keys()) {
        if (key.includes(cachePattern) && key.includes(`"id":"${id}"`)) {
          this.cache.delete(key);
        }
      }
    }
    
    // Invalidate list caches
    this.invalidateListCaches();
  }

  invalidateListCaches() {
    const cachePattern = `${this.tableName}:getAll:`;
    for (const key of this.cache.cache.keys()) {
      if (key.includes(cachePattern)) {
        this.cache.delete(key);
      }
    }
  }
}

/**
 * Query Builder
 */
export class QueryBuilder {
  constructor(tableName) {
    this.tableName = tableName;
    this.client = supabaseAdmin;
    this._filters = {};
    this._orderBy = null;
    this._limit = null;
    this._offset = null;
    this._select = '*';
  }

  select(columns) {
    this._select = columns;
    return this;
  }

  where(column, operator, value) {
    this._filters[column] = { operator, value };
    return this;
  }

  eq(column, value) {
    this._filters[column] = value;
    return this;
  }

  neq(column, value) {
    this._filters[column] = { operator: 'neq', value };
    return this;
  }

  gt(column, value) {
    this._filters[column] = { operator: 'gt', value };
    return this;
  }

  gte(column, value) {
    this._filters[column] = { operator: 'gte', value };
    return this;
  }

  lt(column, value) {
    this._filters[column] = { operator: 'lt', value };
    return this;
  }

  lte(column, value) {
    this._filters[column] = { operator: 'lte', value };
    return this;
  }

  like(column, pattern) {
    this._filters[column] = { operator: 'like', value: pattern };
    return this;
  }

  ilike(column, pattern) {
    this._filters[column] = { operator: 'ilike', value: pattern };
    return this;
  }

  in(column, values) {
    this._filters[column] = values;
    return this;
  }

  orderBy(column, ascending = true) {
    this._orderBy = { column, ascending };
    return this;
  }

  limit(count) {
    this._limit = count;
    return this;
  }

  offset(count) {
    this._offset = count;
    return this;
  }

  async execute() {
    try {
      let query = this.client.from(this.tableName).select(this._select);

      // Apply filters
      Object.entries(this._filters).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          query = query.in(key, value);
        } else if (typeof value === 'object' && value.operator) {
          query = query[value.operator](key, value.value);
        } else {
          query = query.eq(key, value);
        }
      });

      // Apply ordering
      if (this._orderBy) {
        query = query.order(this._orderBy.column, { ascending: this._orderBy.ascending });
      }

      // Apply pagination
      if (this._limit) {
        query = query.limit(this._limit);
      }
      if (this._offset) {
        query = query.range(this._offset, this._offset + (this._limit || 10) - 1);
      }

      const { data, error } = await query;

      if (error) throw error;
      return formatResponse(true, data);
    } catch (error) {
      return handleError(error, `executing query on ${this.tableName}`);
    }
  }
}

// Export helper functions
export const createCrudHelper = (tableName, options = {}) => {
  return options.cache 
    ? new CachedCrudHelper(tableName, options.cache)
    : new CrudHelper(tableName);
};

export const createQueryBuilder = (tableName) => new QueryBuilder(tableName);

// Export commonly used helpers
export const blogHelper = new CachedCrudHelper('blog_posts', { cache: { ttl: 600000 } }); // 10 minutes
export const projectHelper = new CachedCrudHelper('projects', { cache: { ttl: 300000 } }); // 5 minutes
export const contactHelper = new CrudHelper('contact_messages'); // No cache for contact messages

// Global cache manager
export const globalCache = new CacheManager();

// Periodic cache cleanup
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    globalCache.cleanup();
    blogHelper.cache.cleanup();
    projectHelper.cache.cleanup();
  }, 300000); // Clean up every 5 minutes
}

export default {
  CrudHelper,
  CachedCrudHelper,
  QueryBuilder,
  CacheManager,
  formatResponse,
  handleError,
  createPagination,
  formatPaginatedResponse
};