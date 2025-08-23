/**
 * GraphQL API Routes
 * Flexible query layer for complex data requirements
 */

const express = require('express');
const { graphqlHTTP } = require('express-graphql');
const { buildSchema } = require('graphql');
const { authenticateToken } = require('../../middleware/auth');
const { cacheMiddleware } = require('../../middleware/cache');
const contentService = require('../../services/contentService');
const analyticsService = require('../../services/analyticsService');
const webhookService = require('../../services/webhookService');
const logger = require('../../utils/logger');

const router = express.Router();

// GraphQL Schema Definition
const schema = buildSchema(`
  scalar DateTime
  scalar JSON

  type Query {
    # Content Queries
    blogPosts(
      first: Int = 20
      after: String
      where: BlogPostFilter
      orderBy: BlogPostOrderBy
    ): BlogPostConnection!
    
    blogPost(id: ID, slug: String): BlogPost
    
    portfolioItems(
      first: Int = 20
      after: String
      where: PortfolioFilter
      orderBy: PortfolioOrderBy
    ): PortfolioConnection!
    
    portfolioItem(id: ID, slug: String): PortfolioItem
    
    # Search Queries
    search(
      query: String!
      types: [ContentType!]
      first: Int = 20
      after: String
    ): SearchConnection!
    
    # Analytics Queries
    analytics(period: AnalyticsPeriod = MONTH): AnalyticsOverview!
    contentMetrics(id: ID!, period: AnalyticsPeriod = MONTH): ContentMetrics
    
    # Taxonomy Queries
    categories(type: ContentType): [Category!]!
    tags(type: ContentType, popular: Boolean = false): [Tag!]!
  }

  type Mutation {
    # Content Mutations
    createBlogPost(input: CreateBlogPostInput!): BlogPost!
    updateBlogPost(id: ID!, input: UpdateBlogPostInput!): BlogPost!
    deleteBlogPost(id: ID!): Boolean!
    
    createPortfolioItem(input: CreatePortfolioInput!): PortfolioItem!
    updatePortfolioItem(id: ID!, input: UpdatePortfolioInput!): PortfolioItem!
    deletePortfolioItem(id: ID!): Boolean!
    
    # Analytics Mutations
    trackEvent(input: TrackEventInput!): Boolean!
  }

  # Enums
  enum ContentType {
    BLOG
    PORTFOLIO
    TOOLS
    TEACHING
    PAGES
  }

  enum ContentStatus {
    DRAFT
    PUBLISHED
    ARCHIVED
  }

  enum Language {
    EN
    ES
  }

  enum AnalyticsPeriod {
    DAY
    WEEK
    MONTH
    QUARTER
    YEAR
  }

  enum BlogPostOrderBy {
    CREATED_AT_ASC
    CREATED_AT_DESC
    UPDATED_AT_ASC
    UPDATED_AT_DESC
    PUBLISHED_AT_ASC
    PUBLISHED_AT_DESC
    TITLE_ASC
    TITLE_DESC
    VIEWS_ASC
    VIEWS_DESC
  }

  enum PortfolioOrderBy {
    CREATED_AT_ASC
    CREATED_AT_DESC
    UPDATED_AT_ASC
    UPDATED_AT_DESC
    TITLE_ASC
    TITLE_DESC
    FEATURED_ASC
    FEATURED_DESC
  }

  # Filters
  input BlogPostFilter {
    status: ContentStatus
    language: Language
    category: String
    tags: [String!]
    author: String
    featured: Boolean
    dateRange: DateRangeInput
  }

  input PortfolioFilter {
    category: String
    technologies: [String!]
    featured: Boolean
    status: String
    language: Language
  }

  input DateRangeInput {
    from: DateTime
    to: DateTime
  }

  # Input Types
  input CreateBlogPostInput {
    title: String!
    slug: String
    excerpt: String
    content: String!
    status: ContentStatus!
    language: Language = EN
    categories: [String!]
    tags: [String!]
    featuredImage: String
    publishedAt: DateTime
    seo: SEOInput
  }

  input UpdateBlogPostInput {
    title: String
    slug: String
    excerpt: String
    content: String
    status: ContentStatus
    categories: [String!]
    tags: [String!]
    featuredImage: String
    publishedAt: DateTime
    seo: SEOInput
  }

  input CreatePortfolioInput {
    title: String!
    slug: String
    description: String!
    content: String
    category: String!
    technologies: [String!]
    featured: Boolean = false
    liveUrl: String
    repositoryUrl: String
    demoUrl: String
    status: String = "active"
    language: Language = EN
    seo: SEOInput
  }

  input UpdatePortfolioInput {
    title: String
    slug: String
    description: String
    content: String
    category: String
    technologies: [String!]
    featured: Boolean
    liveUrl: String
    repositoryUrl: String
    demoUrl: String
    status: String
    seo: SEOInput
  }

  input SEOInput {
    metaTitle: String
    metaDescription: String
    metaKeywords: [String!]
    openGraph: OpenGraphInput
    twitter: TwitterInput
  }

  input OpenGraphInput {
    title: String
    description: String
    image: String
  }

  input TwitterInput {
    title: String
    description: String
    image: String
  }

  input TrackEventInput {
    event: String!
    category: String!
    label: String
    value: Int
    properties: JSON
    userId: String
    sessionId: String
  }

  # Object Types
  type BlogPost {
    id: ID!
    title: String!
    slug: String!
    excerpt: String
    content: String!
    status: ContentStatus!
    language: Language!
    author: User!
    categories: [Category!]!
    tags: [Tag!]!
    featuredImage: String
    publishedAt: DateTime
    createdAt: DateTime!
    updatedAt: DateTime!
    seo: SEOMetadata
    metrics: ContentMetrics
  }

  type PortfolioItem {
    id: ID!
    title: String!
    slug: String!
    description: String!
    content: String
    category: String!
    technologies: [String!]!
    featured: Boolean!
    images: [String!]!
    liveUrl: String
    repositoryUrl: String
    demoUrl: String
    status: String!
    language: Language!
    createdAt: DateTime!
    updatedAt: DateTime!
    seo: SEOMetadata
  }

  type User {
    id: ID!
    email: String!
    role: String!
    firstName: String
    lastName: String
    avatar: String
    isActive: Boolean!
  }

  type Category {
    id: ID!
    name: String!
    slug: String!
    description: String
    color: String
    itemCount: Int!
  }

  type Tag {
    id: ID!
    name: String!
    slug: String!
    color: String
    itemCount: Int!
  }

  type SEOMetadata {
    metaTitle: String
    metaDescription: String
    metaKeywords: [String!]
    openGraph: OpenGraphData
    twitter: TwitterData
    structuredData: JSON
  }

  type OpenGraphData {
    title: String
    description: String
    image: String
    type: String
  }

  type TwitterData {
    card: String
    title: String
    description: String
    image: String
  }

  type ContentMetrics {
    views: Int!
    uniqueViews: Int!
    averageTimeOnPage: Float
    bounceRate: Float
    socialShares: SocialShares!
    engagement: EngagementMetrics!
  }

  type SocialShares {
    total: Int!
    twitter: Int!
    facebook: Int!
    linkedin: Int!
  }

  type EngagementMetrics {
    likes: Int!
    comments: Int!
    bookmarks: Int!
  }

  type AnalyticsOverview {
    period: String!
    metrics: OverviewMetrics!
    topPages: [PageMetric!]!
    topReferrers: [ReferrerMetric!]!
    deviceTypes: DeviceMetrics!
    countries: [CountryMetric!]!
  }

  type OverviewMetrics {
    totalViews: Int!
    uniqueVisitors: Int!
    bounceRate: Float!
    averageSessionDuration: Float!
  }

  type PageMetric {
    path: String!
    title: String
    views: Int!
  }

  type ReferrerMetric {
    source: String!
    visits: Int!
  }

  type DeviceMetrics {
    desktop: Int!
    mobile: Int!
    tablet: Int!
  }

  type CountryMetric {
    country: String!
    visitors: Int!
  }

  # Connection Types (for pagination)
  type BlogPostConnection {
    edges: [BlogPostEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type BlogPostEdge {
    node: BlogPost!
    cursor: String!
  }

  type PortfolioConnection {
    edges: [PortfolioEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type PortfolioEdge {
    node: PortfolioItem!
    cursor: String!
  }

  type SearchConnection {
    edges: [SearchEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
    facets: SearchFacets!
  }

  type SearchEdge {
    node: SearchResult!
    cursor: String!
  }

  type SearchResult {
    id: ID!
    type: ContentType!
    title: String!
    excerpt: String
    url: String!
    language: Language!
    publishedAt: DateTime
    relevanceScore: Float!
    highlights: [String!]!
  }

  type SearchFacets {
    types: [FacetItem!]!
    categories: [FacetItem!]!
    tags: [FacetItem!]!
    languages: [FacetItem!]!
  }

  type FacetItem {
    name: String!
    count: Int!
  }

  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    startCursor: String
    endCursor: String
  }
`);

// GraphQL Resolvers
const rootValue = {
  // Query Resolvers
  blogPosts: async ({ first = 20, after, where = {}, orderBy = 'CREATED_AT_DESC' }, context) => {
    try {
      const filters = {
        status: where.status?.toLowerCase(),
        language: where.language?.toLowerCase(),
        category: where.category,
        tags: where.tags,
        author: where.author,
        featured: where.featured,
        dateRange: where.dateRange
      };

      const [sortField, sortOrder] = orderBy.split('_');
      const options = {
        page: after ? Math.ceil(Buffer.from(after, 'base64').toString('utf-8') / first) + 1 : 1,
        limit: first,
        sort: sortField.toLowerCase(),
        order: sortOrder.toLowerCase()
      };

      const result = await contentService.getBlogPosts(filters, options);
      
      return {
        edges: result.data.map((post, index) => ({
          node: post,
          cursor: Buffer.from(((options.page - 1) * first + index).toString()).toString('base64')
        })),
        pageInfo: {
          hasNextPage: result.pagination.hasNext,
          hasPreviousPage: result.pagination.hasPrevious,
          startCursor: result.data.length > 0 ? Buffer.from('0').toString('base64') : null,
          endCursor: result.data.length > 0 ? 
            Buffer.from((result.data.length - 1).toString()).toString('base64') : null
        },
        totalCount: result.pagination.totalItems
      };
    } catch (error) {
      logger.error('GraphQL blogPosts error:', error);
      throw new Error('Failed to fetch blog posts');
    }
  },

  blogPost: async ({ id, slug }) => {
    try {
      if (id) {
        return await contentService.getBlogPostById(id, { includeMetrics: true });
      } else if (slug) {
        return await contentService.getBlogPostBySlug(slug, { includeMetrics: true });
      }
      throw new Error('Either id or slug must be provided');
    } catch (error) {
      logger.error('GraphQL blogPost error:', error);
      throw new Error('Failed to fetch blog post');
    }
  },

  portfolioItems: async ({ first = 20, after, where = {}, orderBy = 'CREATED_AT_DESC' }) => {
    try {
      const filters = {
        category: where.category,
        technologies: where.technologies,
        featured: where.featured,
        status: where.status,
        language: where.language?.toLowerCase()
      };

      const [sortField, sortOrder] = orderBy.split('_');
      const options = {
        page: after ? Math.ceil(Buffer.from(after, 'base64').toString('utf-8') / first) + 1 : 1,
        limit: first,
        sort: sortField.toLowerCase(),
        order: sortOrder.toLowerCase()
      };

      const result = await contentService.getPortfolioItems(filters, options);
      
      return {
        edges: result.data.map((item, index) => ({
          node: item,
          cursor: Buffer.from(((options.page - 1) * first + index).toString()).toString('base64')
        })),
        pageInfo: {
          hasNextPage: result.pagination.hasNext,
          hasPreviousPage: result.pagination.hasPrevious,
          startCursor: result.data.length > 0 ? Buffer.from('0').toString('base64') : null,
          endCursor: result.data.length > 0 ? 
            Buffer.from((result.data.length - 1).toString()).toString('base64') : null
        },
        totalCount: result.pagination.totalItems
      };
    } catch (error) {
      logger.error('GraphQL portfolioItems error:', error);
      throw new Error('Failed to fetch portfolio items');
    }
  },

  portfolioItem: async ({ id, slug }) => {
    try {
      if (id) {
        return await contentService.getPortfolioItemById(id);
      } else if (slug) {
        return await contentService.getPortfolioItemBySlug(slug);
      }
      throw new Error('Either id or slug must be provided');
    } catch (error) {
      logger.error('GraphQL portfolioItem error:', error);
      throw new Error('Failed to fetch portfolio item');
    }
  },

  search: async ({ query, types = ['BLOG', 'PORTFOLIO', 'TOOLS', 'TEACHING', 'PAGES'], first = 20, after }) => {
    try {
      const searchService = require('../../services/searchService');
      
      const searchOptions = {
        query,
        filters: {
          types: types.map(type => type.toLowerCase()),
          status: 'published'
        },
        pagination: {
          page: after ? Math.ceil(Buffer.from(after, 'base64').toString('utf-8') / first) + 1 : 1,
          limit: first
        },
        options: {
          highlight: true,
          facets: true
        }
      };

      const result = await searchService.search(searchOptions);
      
      return {
        edges: result.results.map((item, index) => ({
          node: {
            ...item,
            type: item.type.toUpperCase()
          },
          cursor: Buffer.from(index.toString()).toString('base64')
        })),
        pageInfo: {
          hasNextPage: result.pagination.hasNext,
          hasPreviousPage: result.pagination.hasPrevious,
          startCursor: result.results.length > 0 ? Buffer.from('0').toString('base64') : null,
          endCursor: result.results.length > 0 ? 
            Buffer.from((result.results.length - 1).toString()).toString('base64') : null
        },
        totalCount: result.total,
        facets: {
          types: result.facets.types || [],
          categories: result.facets.categories || [],
          tags: result.facets.tags || [],
          languages: result.facets.languages || []
        }
      };
    } catch (error) {
      logger.error('GraphQL search error:', error);
      throw new Error('Search failed');
    }
  },

  analytics: async ({ period = 'MONTH' }) => {
    try {
      const analyticsData = await analyticsService.getOverview({
        period: period.toLowerCase()
      });
      
      return {
        period: period,
        metrics: analyticsData.metrics,
        topPages: analyticsData.topPages || [],
        topReferrers: analyticsData.topReferrers || [],
        deviceTypes: analyticsData.deviceTypes || { desktop: 0, mobile: 0, tablet: 0 },
        countries: analyticsData.countries || []
      };
    } catch (error) {
      logger.error('GraphQL analytics error:', error);
      throw new Error('Failed to fetch analytics');
    }
  },

  contentMetrics: async ({ id, period = 'MONTH' }) => {
    try {
      return await analyticsService.getContentMetrics(id, {
        period: period.toLowerCase()
      });
    } catch (error) {
      logger.error('GraphQL contentMetrics error:', error);
      throw new Error('Failed to fetch content metrics');
    }
  },

  categories: async ({ type }) => {
    try {
      return await contentService.getCategories(type?.toLowerCase());
    } catch (error) {
      logger.error('GraphQL categories error:', error);
      throw new Error('Failed to fetch categories');
    }
  },

  tags: async ({ type, popular = false }) => {
    try {
      return await contentService.getTags(type?.toLowerCase(), 'en', popular);
    } catch (error) {
      logger.error('GraphQL tags error:', error);
      throw new Error('Failed to fetch tags');
    }
  },

  // Mutation Resolvers
  createBlogPost: async ({ input }, context) => {
    try {
      if (!context.user) {
        throw new Error('Authentication required');
      }

      const blogPostData = {
        ...input,
        status: input.status.toLowerCase(),
        language: input.language.toLowerCase(),
        authorId: context.user.id
      };

      return await contentService.createBlogPost(blogPostData);
    } catch (error) {
      logger.error('GraphQL createBlogPost error:', error);
      throw new Error('Failed to create blog post');
    }
  },

  updateBlogPost: async ({ id, input }, context) => {
    try {
      if (!context.user) {
        throw new Error('Authentication required');
      }

      const updateData = {
        ...input,
        status: input.status?.toLowerCase(),
        updatedBy: context.user.id
      };

      return await contentService.updateBlogPost(id, updateData);
    } catch (error) {
      logger.error('GraphQL updateBlogPost error:', error);
      throw new Error('Failed to update blog post');
    }
  },

  deleteBlogPost: async ({ id }, context) => {
    try {
      if (!context.user) {
        throw new Error('Authentication required');
      }

      await contentService.deleteBlogPost(id);
      return true;
    } catch (error) {
      logger.error('GraphQL deleteBlogPost error:', error);
      throw new Error('Failed to delete blog post');
    }
  },

  createPortfolioItem: async ({ input }, context) => {
    try {
      if (!context.user) {
        throw new Error('Authentication required');
      }

      const portfolioData = {
        ...input,
        language: input.language.toLowerCase(),
        authorId: context.user.id
      };

      return await contentService.createPortfolioItem(portfolioData);
    } catch (error) {
      logger.error('GraphQL createPortfolioItem error:', error);
      throw new Error('Failed to create portfolio item');
    }
  },

  updatePortfolioItem: async ({ id, input }, context) => {
    try {
      if (!context.user) {
        throw new Error('Authentication required');
      }

      const updateData = {
        ...input,
        updatedBy: context.user.id
      };

      return await contentService.updatePortfolioItem(id, updateData);
    } catch (error) {
      logger.error('GraphQL updatePortfolioItem error:', error);
      throw new Error('Failed to update portfolio item');
    }
  },

  deletePortfolioItem: async ({ id }, context) => {
    try {
      if (!context.user) {
        throw new Error('Authentication required');
      }

      await contentService.deletePortfolioItem(id);
      return true;
    } catch (error) {
      logger.error('GraphQL deletePortfolioItem error:', error);
      throw new Error('Failed to delete portfolio item');
    }
  },

  trackEvent: async ({ input }, context) => {
    try {
      const eventData = {
        ...input,
        ip: context.ip,
        userAgent: context.userAgent,
        timestamp: new Date()
      };

      await analyticsService.trackEvent(eventData);
      return true;
    } catch (error) {
      logger.error('GraphQL trackEvent error:', error);
      throw new Error('Failed to track event');
    }
  }
};

/**
 * @swagger
 * /api/v2/graphql:
 *   post:
 *     summary: GraphQL endpoint
 *     description: |
 *       Flexible GraphQL endpoint for complex queries and mutations.
 *       
 *       ## Example Queries
 *       
 *       ### Get Blog Posts
 *       ```graphql
 *       query {
 *         blogPosts(first: 10, where: {status: PUBLISHED}) {
 *           edges {
 *             node {
 *               id
 *               title
 *               excerpt
 *               publishedAt
 *               author {
 *                 firstName
 *                 lastName
 *               }
 *               tags {
 *                 name
 *               }
 *             }
 *           }
 *           pageInfo {
 *             hasNextPage
 *             endCursor
 *           }
 *           totalCount
 *         }
 *       }
 *       ```
 *       
 *       ### Search Content
 *       ```graphql
 *       query {
 *         search(query: "language learning", types: [BLOG, PORTFOLIO]) {
 *           edges {
 *             node {
 *               id
 *               title
 *               type
 *               excerpt
 *               relevanceScore
 *               highlights
 *             }
 *           }
 *           facets {
 *             types {
 *               name
 *               count
 *             }
 *             categories {
 *               name
 *               count
 *             }
 *           }
 *         }
 *       }
 *       ```
 *       
 *       ### Get Analytics
 *       ```graphql
 *       query {
 *         analytics(period: MONTH) {
 *           metrics {
 *             totalViews
 *             uniqueVisitors
 *             bounceRate
 *           }
 *           topPages {
 *             path
 *             title
 *             views
 *           }
 *         }
 *       }
 *       ```
 *     tags: [GraphQL]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [query]
 *             properties:
 *               query:
 *                 type: string
 *                 description: GraphQL query string
 *               variables:
 *                 type: object
 *                 description: Query variables
 *               operationName:
 *                 type: string
 *                 description: Operation name for multiple operations
 *     responses:
 *       200:
 *         description: GraphQL response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   description: Query result data
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       message:
 *                         type: string
 *                       locations:
 *                         type: array
 *                         items:
 *                           type: object
 *                       path:
 *                         type: array
 *                         items:
 *                           type: string
 *                 extensions:
 *                   type: object
 */

// GraphQL endpoint with optional authentication
router.use('/', 
  // Add optional authentication context
  (req, res, next) => {
    // Try to authenticate, but don't require it
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Add user to context if authenticated
      req.authContext = { headers: { authorization: authHeader } };
    }
    next();
  },
  
  // Add caching for GET requests (GraphQL introspection)
  (req, res, next) => {
    if (req.method === 'GET') {
      return cacheMiddleware(3600)(req, res, next);
    }
    next();
  },

  graphqlHTTP(async (req, res, graphQLParams) => {
    // Build context for resolvers
    const context = {
      req,
      res,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    // Add authenticated user to context if available
    if (req.authContext) {
      try {
        // Extract and verify token
        const token = req.authContext.headers.authorization.split(' ')[1];
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        context.user = decoded;
      } catch (error) {
        // Invalid token, but that's OK for GraphQL (some queries are public)
        logger.debug('Invalid token in GraphQL request:', error.message);
      }
    }

    return {
      schema,
      rootValue,
      context,
      graphiql: process.env.NODE_ENV === 'development', // Enable GraphiQL in development
      introspection: true,
      formatError: (error) => {
        logger.error('GraphQL error:', error);
        
        // Don't expose internal error details in production
        if (process.env.NODE_ENV === 'production') {
          return {
            message: error.message,
            path: error.path,
            extensions: {
              code: error.extensions?.code || 'INTERNAL_ERROR'
            }
          };
        }
        
        return error;
      },
      extensions: ({ document, variables, operationName, result }) => {
        // Add performance metrics
        return {
          timing: {
            startTime: Date.now()
          }
        };
      }
    };
  })
);

// GraphQL Schema endpoint for development
if (process.env.NODE_ENV === 'development') {
  router.get('/schema', (req, res) => {
    const { printSchema } = require('graphql');
    res.set('Content-Type', 'text/plain');
    res.send(printSchema(schema));
  });
}

module.exports = router;