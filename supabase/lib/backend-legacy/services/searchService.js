const { Client } = require('@elastic/elasticsearch');
const config = require('../config');
const logger = require('../utils/logger');
const cacheService = require('./cache');

class SearchService {
  constructor() {
    this.client = null;
    this.indexPrefix = config.search.elasticsearch?.indexPrefix || 'portfolio_';
    this.initialized = false;
    this.indices = {
      portfolios: `${this.indexPrefix}portfolios`,
      projects: `${this.indexPrefix}projects`,
      experiences: `${this.indexPrefix}experiences`,
      education: `${this.indexPrefix}education`,
      content: `${this.indexPrefix}content`
    };
  }

  /**
   * Initialize search service
   */
  async initialize() {
    try {
      if (config.search.type === 'elasticsearch') {
        this.client = new Client({
          node: config.search.elasticsearch.node,
          auth: config.search.elasticsearch.auth,
          maxRetries: config.search.elasticsearch.maxRetries,
          requestTimeout: config.search.elasticsearch.requestTimeout,
          sniffOnStart: config.search.elasticsearch.sniffOnStart,
          sniffOnConnectionFault: config.search.elasticsearch.sniffOnConnectionFault
        });

        // Test connection
        await this.client.ping();
        
        // Create indices if they don't exist
        await this.createIndices();
        
        this.initialized = true;
        logger.info('Elasticsearch search service initialized successfully');
      } else {
        // Use memory-based search as fallback
        this.initialized = true;
        logger.info('Memory-based search service initialized');
      }
    } catch (error) {
      logger.error('Failed to initialize search service:', error);
      // Fall back to memory search
      this.initialized = true;
      logger.info('Falling back to memory-based search');
    }
  }

  /**
   * Create search indices
   */
  async createIndices() {
    const indexConfigs = {
      portfolios: {
        mappings: {
          properties: {
            title: { type: 'text', analyzer: 'standard' },
            description: { type: 'text', analyzer: 'standard' },
            bio: { type: 'text', analyzer: 'standard' },
            skills: { type: 'keyword' },
            technologies: { type: 'keyword' },
            userId: { type: 'keyword' },
            isPublic: { type: 'boolean' },
            status: { type: 'keyword' },
            tags: { type: 'keyword' },
            createdAt: { type: 'date' },
            updatedAt: { type: 'date' }
          }
        }
      },
      projects: {
        mappings: {
          properties: {
            title: { type: 'text', analyzer: 'standard' },
            description: { type: 'text', analyzer: 'standard' },
            shortDescription: { type: 'text', analyzer: 'standard' },
            content: { type: 'text', analyzer: 'standard' },
            technologies: { type: 'keyword' },
            category: { type: 'keyword' },
            status: { type: 'keyword' },
            priority: { type: 'keyword' },
            portfolioId: { type: 'keyword' },
            featured: { type: 'boolean' },
            isPublic: { type: 'boolean' },
            tags: { type: 'keyword' },
            startDate: { type: 'date' },
            endDate: { type: 'date' },
            createdAt: { type: 'date' },
            updatedAt: { type: 'date' }
          }
        }
      },
      experiences: {
        mappings: {
          properties: {
            title: { type: 'text', analyzer: 'standard' },
            company: { type: 'text', analyzer: 'standard' },
            description: { type: 'text', analyzer: 'standard' },
            type: { type: 'keyword' },
            portfolioId: { type: 'keyword' },
            skills: { type: 'keyword' },
            location: { type: 'object' },
            current: { type: 'boolean' },
            featured: { type: 'boolean' },
            isPublic: { type: 'boolean' },
            startDate: { type: 'date' },
            endDate: { type: 'date' },
            createdAt: { type: 'date' },
            updatedAt: { type: 'date' }
          }
        }
      },
      education: {
        mappings: {
          properties: {
            institution: { type: 'text', analyzer: 'standard' },
            degree: { type: 'text', analyzer: 'standard' },
            field: { type: 'text', analyzer: 'standard' },
            description: { type: 'text', analyzer: 'standard' },
            level: { type: 'keyword' },
            portfolioId: { type: 'keyword' },
            current: { type: 'boolean' },
            featured: { type: 'boolean' },
            isPublic: { type: 'boolean' },
            startDate: { type: 'date' },
            endDate: { type: 'date' },
            createdAt: { type: 'date' },
            updatedAt: { type: 'date' }
          }
        }
      },
      content: {
        mappings: {
          properties: {
            title: { type: 'text', analyzer: 'standard' },
            content: { type: 'text', analyzer: 'standard' },
            excerpt: { type: 'text', analyzer: 'standard' },
            type: { type: 'keyword' },
            section: { type: 'keyword' },
            subsection: { type: 'keyword' },
            language: { type: 'keyword' },
            tags: { type: 'keyword' },
            categories: { type: 'keyword' },
            status: { type: 'keyword' },
            authorId: { type: 'keyword' },
            isPublic: { type: 'boolean' },
            publishedAt: { type: 'date' },
            createdAt: { type: 'date' },
            updatedAt: { type: 'date' }
          }
        }
      }
    };

    for (const [indexName, config] of Object.entries(indexConfigs)) {
      const fullIndexName = this.indices[indexName];
      
      try {
        const exists = await this.client.indices.exists({ index: fullIndexName });
        
        if (!exists) {
          await this.client.indices.create({
            index: fullIndexName,
            body: config
          });
          logger.info(`Created search index: ${fullIndexName}`);
        }
      } catch (error) {
        logger.error(`Failed to create index ${fullIndexName}:`, error);
      }
    }
  }

  /**
   * Index a document
   */
  async indexDocument(index, id, document) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.client) {
      return { success: false, message: 'Search service not available' };
    }

    try {
      const fullIndex = this.indices[index] || index;
      
      const result = await this.client.index({
        index: fullIndex,
        id: id,
        body: {
          ...document,
          indexed_at: new Date().toISOString()
        }
      });

      logger.debug(`Document indexed: ${fullIndex}/${id}`);
      
      return {
        success: true,
        id: result._id,
        version: result._version
      };
    } catch (error) {
      logger.error('Failed to index document:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Update a document
   */
  async updateDocument(index, id, document) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.client) {
      return { success: false, message: 'Search service not available' };
    }

    try {
      const fullIndex = this.indices[index] || index;
      
      const result = await this.client.update({
        index: fullIndex,
        id: id,
        body: {
          doc: {
            ...document,
            updated_at: new Date().toISOString()
          }
        }
      });

      logger.debug(`Document updated: ${fullIndex}/${id}`);
      
      return {
        success: true,
        id: result._id,
        version: result._version
      };
    } catch (error) {
      logger.error('Failed to update document:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Delete a document
   */
  async deleteDocument(index, id) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.client) {
      return { success: false, message: 'Search service not available' };
    }

    try {
      const fullIndex = this.indices[index] || index;
      
      const result = await this.client.delete({
        index: fullIndex,
        id: id
      });

      logger.debug(`Document deleted: ${fullIndex}/${id}`);
      
      return {
        success: true,
        result: result.result
      };
    } catch (error) {
      if (error.meta?.statusCode === 404) {
        return { success: true, result: 'not_found' };
      }
      logger.error('Failed to delete document:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Search across all indices or specific index
   */
  async search(query, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    const {
      index = null,
      from = 0,
      size = 20,
      sort = [{ _score: { order: 'desc' } }],
      filters = {},
      highlight = true,
      facets = false
    } = options;

    // Use cache for search results
    const cacheKey = `search:${JSON.stringify({ query, index, from, size, sort, filters })}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      if (!this.client) {
        // Fallback to memory search
        return await this.memorySearch(query, options);
      }

      const searchIndex = index ? (this.indices[index] || index) : Object.values(this.indices).join(',');
      
      // Build search body
      const searchBody = {
        query: this.buildQuery(query, filters),
        from,
        size,
        sort,
        _source: true
      };

      // Add highlighting
      if (highlight) {
        searchBody.highlight = {
          fields: {
            title: {},
            description: {},
            content: {},
            bio: {}
          },
          pre_tags: ['<mark>'],
          post_tags: ['</mark>']
        };
      }

      // Add aggregations for facets
      if (facets) {
        searchBody.aggs = {
          types: { terms: { field: 'type' } },
          categories: { terms: { field: 'category' } },
          technologies: { terms: { field: 'technologies' } },
          status: { terms: { field: 'status' } }
        };
      }

      const result = await this.client.search({
        index: searchIndex,
        body: searchBody
      });

      const searchResult = {
        hits: result.body.hits.hits.map(hit => ({
          ...hit._source,
          _id: hit._id,
          _index: hit._index,
          _score: hit._score,
          highlight: hit.highlight || {}
        })),
        total: result.body.hits.total.value || result.body.hits.total,
        took: result.body.took,
        facets: result.body.aggregations || null,
        pagination: {
          from,
          size,
          total: result.body.hits.total.value || result.body.hits.total
        }
      };

      // Cache results for 5 minutes
      await cacheService.set(cacheKey, searchResult, 300);
      
      return searchResult;
      
    } catch (error) {
      logger.error('Search failed:', error);
      // Fallback to memory search
      return await this.memorySearch(query, options);
    }
  }

  /**
   * Build Elasticsearch query
   */
  buildQuery(query, filters = {}) {
    const must = [];
    const filter = [];

    // Text search
    if (query && query.trim()) {
      must.push({
        multi_match: {
          query: query,
          fields: [
            'title^3',
            'description^2',
            'content',
            'bio',
            'company',
            'institution',
            'degree',
            'field'
          ],
          type: 'best_fields',
          fuzziness: 'AUTO'
        }
      });
    } else {
      must.push({ match_all: {} });
    }

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          filter.push({ terms: { [key]: value } });
        } else if (typeof value === 'object' && value.range) {
          filter.push({ range: { [key]: value.range } });
        } else {
          filter.push({ term: { [key]: value } });
        }
      }
    });

    // Always filter for public content unless specified
    if (!filters.hasOwnProperty('isPublic')) {
      filter.push({ term: { isPublic: true } });
    }

    return {
      bool: {
        must,
        filter
      }
    };
  }

  /**
   * Fallback memory search
   */
  async memorySearch(query, options = {}) {
    const { index = null, from = 0, size = 20 } = options;
    
    // This is a simplified memory search - in production you'd want a more sophisticated solution
    const results = {
      hits: [],
      total: 0,
      took: Date.now(),
      facets: null,
      pagination: { from, size, total: 0 }
    };

    // You could implement memory-based search using loaded data
    logger.warn('Using fallback memory search - consider setting up Elasticsearch for better performance');
    
    return results;
  }

  /**
   * Get search suggestions/autocomplete
   */
  async suggest(query, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.client) {
      return { suggestions: [] };
    }

    const { index = null, size = 10 } = options;
    
    try {
      const searchIndex = index ? (this.indices[index] || index) : Object.values(this.indices).join(',');
      
      const result = await this.client.search({
        index: searchIndex,
        body: {
          suggest: {
            text: query,
            suggestions: {
              prefix: {
                field: 'title.suggest',
                size: size
              }
            }
          },
          size: 0
        }
      });

      const suggestions = result.body.suggest.suggestions[0].options.map(option => ({
        text: option.text,
        score: option._score
      }));

      return { suggestions };
    } catch (error) {
      logger.error('Suggestion failed:', error);
      return { suggestions: [] };
    }
  }

  /**
   * Bulk index documents
   */
  async bulkIndex(documents, index) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.client) {
      return { success: false, message: 'Search service not available' };
    }

    try {
      const fullIndex = this.indices[index] || index;
      const body = [];

      documents.forEach(doc => {
        body.push({ index: { _index: fullIndex, _id: doc.id } });
        body.push({
          ...doc,
          indexed_at: new Date().toISOString()
        });
      });

      const result = await this.client.bulk({ body });
      
      const errors = result.body.items.filter(item => item.index.error);
      
      if (errors.length > 0) {
        logger.error('Bulk indexing had errors:', errors);
      }

      logger.info(`Bulk indexed ${documents.length} documents to ${fullIndex}, ${errors.length} errors`);
      
      return {
        success: true,
        indexed: documents.length - errors.length,
        errors: errors.length
      };
    } catch (error) {
      logger.error('Bulk indexing failed:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Reindex all data
   */
  async reindexAll() {
    if (!this.initialized) {
      await this.initialize();
    }

    logger.info('Starting full reindex...');

    try {
      // Clear all indices
      for (const indexName of Object.values(this.indices)) {
        try {
          await this.client.indices.delete({ index: indexName });
          logger.info(`Deleted index: ${indexName}`);
        } catch (error) {
          // Index might not exist
        }
      }

      // Recreate indices
      await this.createIndices();

      // You would load data from your database and reindex here
      // This is a placeholder - implement based on your data models
      logger.info('Full reindex completed successfully');
      
      return { success: true };
    } catch (error) {
      logger.error('Reindex failed:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Get search analytics
   */
  async getSearchAnalytics(days = 7) {
    const cacheKey = `search:analytics:${days}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    // This would typically come from search logs
    const analytics = {
      totalSearches: 0,
      popularQueries: [],
      noResultQueries: [],
      avgResponseTime: 0,
      facetUsage: {},
      period: `${days} days`
    };

    await cacheService.set(cacheKey, analytics, 3600); // Cache for 1 hour
    
    return analytics;
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      if (!this.client) {
        return {
          status: 'degraded',
          message: 'Using fallback memory search'
        };
      }

      await this.client.ping();
      
      const clusterHealth = await this.client.cluster.health();
      
      return {
        status: 'healthy',
        cluster: clusterHealth.body.status,
        indices: Object.keys(this.indices).length
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error.message
      };
    }
  }
}

// Export singleton instance
const searchService = new SearchService();

module.exports = searchService;