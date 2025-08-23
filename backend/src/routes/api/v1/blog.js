/**
 * Blog API Routes
 * Public endpoints for blog posts and content
 */

const express = require('express');
const { query, param, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const fs = require('fs').promises;
const path = require('path');
const matter = require('gray-matter');

const { optionalAuth, requireAdmin } = require('../../../middleware/auth');
const { logger } = require('../../../utils/logger');
const { Op } = require('sequelize');

const router = express.Router();

// Rate limiting for blog endpoints
const blogRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 200, // 200 requests per window
  message: {
    error: 'Too many requests to blog API',
    code: 'BLOG_RATE_LIMIT'
  }
});

router.use(blogRateLimit);

// Hugo content directory path
const CONTENT_DIR = path.join(process.cwd(), '..', 'content');
const BLOG_DIR = path.join(CONTENT_DIR, 'blog');

// Validation helpers
const validatePagination = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('sortBy').optional().isIn(['date', 'title', 'modified', 'views']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc')
];

const validateFilters = [
  query('category').optional().isString().withMessage('Category must be a string'),
  query('tag').optional().isString().withMessage('Tag must be a string'),
  query('author').optional().isString().withMessage('Author must be a string'),
  query('featured').optional().isBoolean().withMessage('Featured must be a boolean'),
  query('search').optional().isString().isLength({ max: 100 }).withMessage('Search query too long'),
  query('year').optional().isInt({ min: 2020, max: 2030 }).withMessage('Invalid year'),
  query('month').optional().isInt({ min: 1, max: 12 }).withMessage('Invalid month')
];

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors.array()
    });
  }
  next();
};

/**
 * Parse Hugo markdown file
 */
const parseMarkdownFile = async (filePath) => {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const { data: frontmatter, content: markdown } = matter(content);
    
    return {
      frontmatter,
      content: markdown,
      slug: path.basename(filePath, '.md')
    };
  } catch (error) {
    logger.warn(`Failed to parse markdown file: ${filePath}`, { error: error.message });
    return null;
  }
};

/**
 * Get all blog posts from filesystem
 */
const getAllBlogPosts = async () => {
  try {
    const files = await fs.readdir(BLOG_DIR);
    const markdownFiles = files.filter(file => file.endsWith('.md') && file !== '_index.md');
    
    const posts = await Promise.all(
      markdownFiles.map(async (file) => {
        const filePath = path.join(BLOG_DIR, file);
        const stat = await fs.stat(filePath);
        const parsed = await parseMarkdownFile(filePath);
        
        if (!parsed) return null;
        
        return {
          ...parsed.frontmatter,
          content: parsed.content,
          slug: parsed.slug,
          filename: file,
          modifiedDate: stat.mtime,
          createdDate: stat.birthtime || stat.ctime
        };
      })
    );
    
    return posts.filter(Boolean);
  } catch (error) {
    logger.error('Failed to read blog directory', { error: error.message, blogDir: BLOG_DIR });
    return [];
  }
};

/**
 * Filter and sort blog posts
 */
const filterAndSortPosts = (posts, filters, sort) => {
  let filteredPosts = [...posts];
  
  // Apply filters
  if (filters.category) {
    filteredPosts = filteredPosts.filter(post => 
      post.categories?.some(cat => 
        cat.toLowerCase().includes(filters.category.toLowerCase())
      )
    );
  }
  
  if (filters.tag) {
    filteredPosts = filteredPosts.filter(post =>
      post.tags?.some(tag =>
        tag.toLowerCase().includes(filters.tag.toLowerCase())
      )
    );
  }
  
  if (filters.author) {
    filteredPosts = filteredPosts.filter(post =>
      post.author?.toLowerCase().includes(filters.author.toLowerCase())
    );
  }
  
  if (filters.featured !== undefined) {
    filteredPosts = filteredPosts.filter(post => !!post.featured === filters.featured);
  }
  
  if (filters.search) {
    const searchTerm = filters.search.toLowerCase();
    filteredPosts = filteredPosts.filter(post =>
      post.title?.toLowerCase().includes(searchTerm) ||
      post.description?.toLowerCase().includes(searchTerm) ||
      post.content?.toLowerCase().includes(searchTerm) ||
      post.excerpt?.toLowerCase().includes(searchTerm)
    );
  }
  
  if (filters.year) {
    filteredPosts = filteredPosts.filter(post => {
      const postDate = new Date(post.date || post.createdDate);
      return postDate.getFullYear() === parseInt(filters.year);
    });
  }
  
  if (filters.month && filters.year) {
    filteredPosts = filteredPosts.filter(post => {
      const postDate = new Date(post.date || post.createdDate);
      return postDate.getFullYear() === parseInt(filters.year) && 
             postDate.getMonth() + 1 === parseInt(filters.month);
    });
  }
  
  // Apply sorting
  const { sortBy = 'date', sortOrder = 'desc' } = sort;
  
  filteredPosts.sort((a, b) => {
    let aValue, bValue;
    
    switch (sortBy) {
      case 'title':
        aValue = a.title || '';
        bValue = b.title || '';
        break;
      case 'modified':
        aValue = new Date(a.modifiedDate);
        bValue = new Date(b.modifiedDate);
        break;
      case 'views':
        aValue = a.views || 0;
        bValue = b.views || 0;
        break;
      case 'date':
      default:
        aValue = new Date(a.date || a.createdDate);
        bValue = new Date(b.date || b.createdDate);
        break;
    }
    
    if (sortOrder === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    }
  });
  
  return filteredPosts;
};

/**
 * Transform post for API response
 */
const transformPost = (post, includeContent = false) => {
  const transformed = {
    slug: post.slug,
    title: post.title,
    description: post.description,
    excerpt: post.excerpt,
    author: post.author || 'Brandon Currie',
    date: post.date || post.createdDate,
    modifiedDate: post.modifiedDate,
    categories: post.categories || [],
    tags: post.tags || [],
    featured: !!post.featured,
    draft: !!post.draft,
    image: post.image,
    thumbnail: post.thumbnail,
    readingTime: post.readingTime,
    wordCount: post.content?.split(/\s+/).length || 0,
    views: post.views || 0,
    likes: post.likes || 0,
    comments: post.comments || 0,
    seo: {
      metaTitle: post.metaTitle || post.title,
      metaDescription: post.metaDescription || post.description,
      keywords: post.keywords || post.tags,
      canonicalUrl: post.canonicalUrl,
      noindex: !!post.noindex
    }
  };
  
  if (includeContent) {
    transformed.content = post.content;
  }
  
  return transformed;
};

/**
 * @route GET /api/v1/blog/posts
 * @desc Get all blog posts with filtering and pagination
 * @access Public
 */
router.get('/posts',
  validatePagination,
  validateFilters,
  handleValidationErrors,
  optionalAuth,
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = 'date',
        sortOrder = 'desc',
        ...filters
      } = req.query;

      const allPosts = await getAllBlogPosts();
      
      // Filter out drafts for non-admin users
      let posts = allPosts;
      if (!req.user || req.user.role !== 'admin') {
        posts = posts.filter(post => !post.draft);
      }

      // Apply filters and sorting
      const filteredPosts = filterAndSortPosts(posts, filters, { sortBy, sortOrder });

      // Apply pagination
      const offset = (page - 1) * limit;
      const paginatedPosts = filteredPosts.slice(offset, offset + parseInt(limit));

      // Transform posts
      const transformedPosts = paginatedPosts.map(post => transformPost(post, false));

      // Get categories and tags for metadata
      const allCategories = [...new Set(allPosts.flatMap(post => post.categories || []))];
      const allTags = [...new Set(allPosts.flatMap(post => post.tags || []))];
      const authors = [...new Set(allPosts.map(post => post.author).filter(Boolean))];

      res.json({
        posts: transformedPosts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: filteredPosts.length,
          pages: Math.ceil(filteredPosts.length / limit),
          hasNext: offset + parseInt(limit) < filteredPosts.length,
          hasPrev: page > 1
        },
        filters: {
          applied: filters,
          available: {
            categories: allCategories.sort(),
            tags: allTags.sort(),
            authors: authors.sort()
          }
        },
        meta: {
          totalPosts: posts.length,
          publishedPosts: posts.filter(p => !p.draft).length,
          draftPosts: posts.filter(p => p.draft).length,
          featuredPosts: posts.filter(p => p.featured).length
        }
      });

    } catch (error) {
      logger.error('Failed to get blog posts', {
        error: error.message,
        stack: error.stack,
        query: req.query
      });

      res.status(500).json({
        error: 'Failed to retrieve blog posts',
        code: 'BLOG_POSTS_ERROR'
      });
    }
  }
);

/**
 * @route GET /api/v1/blog/posts/featured
 * @desc Get featured blog posts
 * @access Public
 */
router.get('/posts/featured', optionalAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    
    const allPosts = await getAllBlogPosts();
    
    // Filter for featured posts
    let featuredPosts = allPosts.filter(post => post.featured);
    
    // Filter out drafts for non-admin users
    if (!req.user || req.user.role !== 'admin') {
      featuredPosts = featuredPosts.filter(post => !post.draft);
    }
    
    // Sort by date (newest first) and limit
    featuredPosts.sort((a, b) => new Date(b.date || b.createdDate) - new Date(a.date || a.createdDate));
    featuredPosts = featuredPosts.slice(0, limit);
    
    const transformedPosts = featuredPosts.map(post => transformPost(post, false));
    
    res.json({
      posts: transformedPosts,
      count: transformedPosts.length
    });

  } catch (error) {
    logger.error('Failed to get featured blog posts', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Failed to retrieve featured blog posts',
      code: 'FEATURED_POSTS_ERROR'
    });
  }
});

/**
 * @route GET /api/v1/blog/posts/:slug
 * @desc Get single blog post by slug
 * @access Public
 */
router.get('/posts/:slug',
  [
    param('slug').isSlug().withMessage('Valid post slug required')
  ],
  handleValidationErrors,
  optionalAuth,
  async (req, res) => {
    try {
      const { slug } = req.params;
      
      const filePath = path.join(BLOG_DIR, `${slug}.md`);
      
      // Check if file exists
      try {
        await fs.access(filePath);
      } catch {
        return res.status(404).json({
          error: 'Blog post not found',
          code: 'POST_NOT_FOUND'
        });
      }
      
      const parsed = await parseMarkdownFile(filePath);
      if (!parsed) {
        return res.status(404).json({
          error: 'Failed to parse blog post',
          code: 'POST_PARSE_ERROR'
        });
      }
      
      const stat = await fs.stat(filePath);
      const post = {
        ...parsed.frontmatter,
        content: parsed.content,
        slug: parsed.slug,
        modifiedDate: stat.mtime,
        createdDate: stat.birthtime || stat.ctime
      };
      
      // Check if post is draft and user is not admin
      if (post.draft && (!req.user || req.user.role !== 'admin')) {
        return res.status(404).json({
          error: 'Blog post not found',
          code: 'POST_NOT_FOUND'
        });
      }
      
      // Get related posts based on categories and tags
      const allPosts = await getAllBlogPosts();
      const relatedPosts = allPosts
        .filter(p => p.slug !== slug && !p.draft)
        .filter(p => {
          const hasCommonCategory = post.categories?.some(cat => p.categories?.includes(cat));
          const hasCommonTag = post.tags?.some(tag => p.tags?.includes(tag));
          return hasCommonCategory || hasCommonTag;
        })
        .sort((a, b) => new Date(b.date || b.createdDate) - new Date(a.date || a.createdDate))
        .slice(0, 3)
        .map(p => transformPost(p, false));
      
      const transformedPost = transformPost(post, true);
      
      // Add navigation (previous/next posts)
      const allPublishedPosts = allPosts
        .filter(p => !p.draft)
        .sort((a, b) => new Date(b.date || b.createdDate) - new Date(a.date || a.createdDate));
      
      const currentIndex = allPublishedPosts.findIndex(p => p.slug === slug);
      const navigation = {
        previous: currentIndex > 0 ? {
          slug: allPublishedPosts[currentIndex - 1].slug,
          title: allPublishedPosts[currentIndex - 1].title
        } : null,
        next: currentIndex < allPublishedPosts.length - 1 ? {
          slug: allPublishedPosts[currentIndex + 1].slug,
          title: allPublishedPosts[currentIndex + 1].title
        } : null
      };
      
      res.json({
        post: transformedPost,
        related: relatedPosts,
        navigation
      });

    } catch (error) {
      logger.error('Failed to get blog post', {
        error: error.message,
        stack: error.stack,
        slug: req.params.slug
      });

      res.status(500).json({
        error: 'Failed to retrieve blog post',
        code: 'POST_FETCH_ERROR'
      });
    }
  }
);

/**
 * @route GET /api/v1/blog/categories
 * @desc Get all blog categories
 * @access Public
 */
router.get('/categories', async (req, res) => {
  try {
    const allPosts = await getAllBlogPosts();
    const posts = allPosts.filter(post => !post.draft);
    
    const categoryCounts = {};
    posts.forEach(post => {
      if (post.categories) {
        post.categories.forEach(category => {
          categoryCounts[category] = (categoryCounts[category] || 0) + 1;
        });
      }
    });
    
    const categories = Object.entries(categoryCounts)
      .map(([name, count]) => ({ name, count, slug: name.toLowerCase().replace(/\s+/g, '-') }))
      .sort((a, b) => b.count - a.count);
    
    res.json({
      categories,
      total: categories.length
    });

  } catch (error) {
    logger.error('Failed to get blog categories', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Failed to retrieve blog categories',
      code: 'CATEGORIES_ERROR'
    });
  }
});

/**
 * @route GET /api/v1/blog/tags
 * @desc Get all blog tags
 * @access Public
 */
router.get('/tags', async (req, res) => {
  try {
    const allPosts = await getAllBlogPosts();
    const posts = allPosts.filter(post => !post.draft);
    
    const tagCounts = {};
    posts.forEach(post => {
      if (post.tags) {
        post.tags.forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      }
    });
    
    const tags = Object.entries(tagCounts)
      .map(([name, count]) => ({ name, count, slug: name.toLowerCase().replace(/\s+/g, '-') }))
      .sort((a, b) => b.count - a.count);
    
    res.json({
      tags,
      total: tags.length
    });

  } catch (error) {
    logger.error('Failed to get blog tags', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Failed to retrieve blog tags',
      code: 'TAGS_ERROR'
    });
  }
});

/**
 * @route GET /api/v1/blog/archive
 * @desc Get blog archive by year/month
 * @access Public
 */
router.get('/archive', async (req, res) => {
  try {
    const allPosts = await getAllBlogPosts();
    const posts = allPosts.filter(post => !post.draft);
    
    const archive = {};
    posts.forEach(post => {
      const date = new Date(post.date || post.createdDate);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      
      if (!archive[year]) {
        archive[year] = {};
      }
      if (!archive[year][month]) {
        archive[year][month] = [];
      }
      
      archive[year][month].push({
        slug: post.slug,
        title: post.title,
        date: post.date || post.createdDate
      });
    });
    
    // Convert to sorted array format
    const archiveArray = Object.entries(archive).map(([year, months]) => ({
      year: parseInt(year),
      months: Object.entries(months).map(([month, posts]) => ({
        month: parseInt(month),
        monthName: new Date(year, month - 1).toLocaleString('en', { month: 'long' }),
        posts: posts.sort((a, b) => new Date(b.date) - new Date(a.date)),
        count: posts.length
      })).sort((a, b) => b.month - a.month)
    })).sort((a, b) => b.year - a.year);
    
    res.json({
      archive: archiveArray,
      totalYears: archiveArray.length
    });

  } catch (error) {
    logger.error('Failed to get blog archive', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Failed to retrieve blog archive',
      code: 'ARCHIVE_ERROR'
    });
  }
});

/**
 * @route GET /api/v1/blog/stats
 * @desc Get blog statistics
 * @access Public
 */
router.get('/stats', async (req, res) => {
  try {
    const allPosts = await getAllBlogPosts();
    const publishedPosts = allPosts.filter(post => !post.draft);
    
    const stats = {
      totalPosts: publishedPosts.length,
      draftPosts: allPosts.filter(post => post.draft).length,
      featuredPosts: publishedPosts.filter(post => post.featured).length,
      totalWords: publishedPosts.reduce((sum, post) => sum + (post.content?.split(/\s+/).length || 0), 0),
      totalCategories: [...new Set(publishedPosts.flatMap(post => post.categories || []))].length,
      totalTags: [...new Set(publishedPosts.flatMap(post => post.tags || []))].length,
      postsThisMonth: publishedPosts.filter(post => {
        const postDate = new Date(post.date || post.createdDate);
        const now = new Date();
        return postDate.getMonth() === now.getMonth() && postDate.getFullYear() === now.getFullYear();
      }).length,
      postsThisYear: publishedPosts.filter(post => {
        const postDate = new Date(post.date || post.createdDate);
        return postDate.getFullYear() === new Date().getFullYear();
      }).length,
      averageWordsPerPost: publishedPosts.length > 0 
        ? Math.round(publishedPosts.reduce((sum, post) => sum + (post.content?.split(/\s+/).length || 0), 0) / publishedPosts.length)
        : 0
    };
    
    res.json({ stats });

  } catch (error) {
    logger.error('Failed to get blog stats', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Failed to retrieve blog statistics',
      code: 'BLOG_STATS_ERROR'
    });
  }
});

module.exports = router;