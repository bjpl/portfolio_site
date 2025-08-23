/**
 * Netlify Function: Blog API
 * Serves blog posts data with caching and filtering
 */

exports.handler = async (event, context) => {
  // Handle CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        error: 'Method not allowed. Use GET.'
      })
    };
  }

  try {
    // Parse query parameters
    const params = new URLSearchParams(event.queryString || '');
    const limit = parseInt(params.get('limit')) || 10;
    const page = parseInt(params.get('page')) || 1;
    const category = params.get('category');
    const search = params.get('search');

    // Mock blog data (in production, you'd fetch from a CMS or database)
    const allPosts = [
      {
        id: 1,
        title: 'Building Universal API Systems',
        slug: 'building-universal-api-systems',
        excerpt: 'Learn how to create API systems that work seamlessly across all environments with intelligent fallbacks and error handling.',
        content: 'Full content would be here...',
        author: {
          name: 'Portfolio Author',
          avatar: '/images/author.jpg'
        },
        category: 'Development',
        tags: ['API', 'JavaScript', 'Architecture'],
        publishedAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z',
        readingTime: 8,
        featured: true,
        status: 'published'
      },
      {
        id: 2,
        title: 'Progressive Web Apps with Offline Support',
        slug: 'progressive-web-apps-offline-support',
        excerpt: 'Create robust web applications that work offline using service workers, caching strategies, and intelligent fallbacks.',
        content: 'Full content would be here...',
        author: {
          name: 'Portfolio Author',
          avatar: '/images/author.jpg'
        },
        category: 'Web Development',
        tags: ['PWA', 'Service Workers', 'Offline'],
        publishedAt: '2024-01-10T14:30:00Z',
        updatedAt: '2024-01-10T14:30:00Z',
        readingTime: 12,
        featured: true,
        status: 'published'
      },
      {
        id: 3,
        title: 'Modern JavaScript Patterns for Resilient Applications',
        slug: 'modern-javascript-patterns-resilient-applications',
        excerpt: 'Explore advanced JavaScript patterns that make your applications more robust, maintainable, and user-friendly.',
        content: 'Full content would be here...',
        author: {
          name: 'Portfolio Author',
          avatar: '/images/author.jpg'
        },
        category: 'JavaScript',
        tags: ['JavaScript', 'Patterns', 'Architecture'],
        publishedAt: '2024-01-05T09:15:00Z',
        updatedAt: '2024-01-05T09:15:00Z',
        readingTime: 6,
        featured: false,
        status: 'published'
      },
      {
        id: 4,
        title: 'Error Handling Best Practices',
        slug: 'error-handling-best-practices',
        excerpt: 'Master the art of graceful error handling to create applications that never break the user experience.',
        content: 'Full content would be here...',
        author: {
          name: 'Portfolio Author',
          avatar: '/images/author.jpg'
        },
        category: 'Development',
        tags: ['Error Handling', 'UX', 'Best Practices'],
        publishedAt: '2023-12-28T16:45:00Z',
        updatedAt: '2023-12-28T16:45:00Z',
        readingTime: 10,
        featured: false,
        status: 'published'
      }
    ];

    // Filter posts
    let filteredPosts = allPosts.filter(post => post.status === 'published');

    // Category filter
    if (category) {
      filteredPosts = filteredPosts.filter(post => 
        post.category.toLowerCase() === category.toLowerCase()
      );
    }

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      filteredPosts = filteredPosts.filter(post =>
        post.title.toLowerCase().includes(searchLower) ||
        post.excerpt.toLowerCase().includes(searchLower) ||
        post.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    // Sort by date (newest first)
    filteredPosts.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

    // Pagination
    const total = filteredPosts.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paginatedPosts = filteredPosts.slice(offset, offset + limit);

    // Get categories for filter options
    const categories = [...new Set(allPosts.map(post => post.category))];

    const response = {
      posts: paginatedPosts,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      meta: {
        categories,
        totalPublished: allPosts.filter(p => p.status === 'published').length,
        lastUpdated: new Date().toISOString()
      }
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    };

  } catch (error) {
    console.error('Blog API error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: 'Failed to fetch blog posts',
        timestamp: new Date().toISOString()
      })
    };
  }
};