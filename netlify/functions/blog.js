/**
 * Netlify Function: Blog API
 * Full CRUD operations for blog posts using Supabase
 */

const { 
  getSupabaseClient,
  getSupabaseServiceClient,
  withErrorHandling, 
  formatResponse, 
  getStandardHeaders, 
  handleCORS,
  validateRequiredFields,
  sanitizeInput
} = require('./utils/supabase');

exports.handler = async (event, context) => {
  // Handle CORS preflight
  const corsResponse = handleCORS(event);
  if (corsResponse) return corsResponse;

  const headers = getStandardHeaders({
    'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
  });

  const { httpMethod, path } = event;
  const pathSegments = path.split('/').filter(Boolean);
  const blogId = pathSegments[pathSegments.length - 1];

  try {
    switch (httpMethod) {
      case 'GET':
        return await handleGetPosts(event, headers);
      case 'POST':
        return await handleCreatePost(event, headers);
      case 'PUT':
      case 'PATCH':
        return await handleUpdatePost(event, headers, blogId);
      case 'DELETE':
        return await handleDeletePost(event, headers, blogId);
      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify(formatResponse(
            false, 
            null, 
            `Method ${httpMethod} not allowed`, 
            null, 
            405
          ))
        };
    }
  } catch (error) {
    console.error('Blog API error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify(formatResponse(
        false, 
        null, 
        'Internal server error', 
        error.message, 
        500
      ))
    };
  }
};

/**
 * Handle GET requests - fetch blog posts
 */
async function handleGetPosts(event, headers) {
  const supabase = getSupabaseClient();

  // Parse query parameters
  const params = new URLSearchParams(event.queryString || '');
  const limit = parseInt(params.get('limit')) || 10;
  const page = parseInt(params.get('page')) || 1;
  const category = params.get('category');
  const search = params.get('search');
  const status = params.get('status') || 'published';
  const featured = params.get('featured') === 'true';
  const slug = params.get('slug');

  // If requesting a specific post by slug
  if (slug) {
    const result = await withErrorHandling(async () => {
      return await supabase
        .from('blog_posts')
        .select(`
          id, title, slug, excerpt, content, author, category, tags,
          published_at, updated_at, reading_time, featured, status,
          meta_description, featured_image, view_count
        `)
        .eq('slug', slug)
        .eq('status', 'published')
        .single();
    }, 'single blog post fetch');

    if (!result.success) {
      return {
        statusCode: result.error.code === 'PGRST116' ? 404 : 500,
        headers,
        body: JSON.stringify(formatResponse(
          false, 
          null, 
          result.error.code === 'PGRST116' ? 'Post not found' : 'Failed to fetch post', 
          result.error
        ))
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(formatResponse(
        true,
        { post: result.data },
        'Post fetched successfully'
      ))
    };
  }

  // Build query for multiple posts
  let query = supabase
    .from('blog_posts')
    .select(`
      id, title, slug, excerpt, author, category, tags,
      published_at, updated_at, reading_time, featured, status,
      meta_description, featured_image, view_count
    `, { count: 'exact' });

  // Apply filters
  if (status) {
    query = query.eq('status', status);
  }
  
  if (category) {
    query = query.eq('category', category);
  }
  
  if (featured) {
    query = query.eq('featured', true);
  }
  
  if (search) {
    query = query.or(`title.ilike.%${search}%,excerpt.ilike.%${search}%,content.ilike.%${search}%`);
  }

  // Pagination
  const offset = (page - 1) * limit;
  query = query.range(offset, offset + limit - 1);
  
  // Order by featured first, then by published date
  query = query.order('featured', { ascending: false })
               .order('published_at', { ascending: false });

  const result = await withErrorHandling(async () => {
    return await query;
  }, 'blog posts fetch');

  if (!result.success) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify(formatResponse(
        false, 
        null, 
        'Failed to fetch blog posts', 
        result.error, 
        500
      ))
    };
  }

  const posts = result.data || [];
  const total = result.count || 0;
  const totalPages = Math.ceil(total / limit);

  // Get categories for metadata
  const categoriesResult = await withErrorHandling(async () => {
    return await supabase
      .from('blog_posts')
      .select('category')
      .eq('status', 'published');
  }, 'blog categories fetch');

  const categories = categoriesResult.success ? 
    [...new Set(categoriesResult.data.map(p => p.category).filter(Boolean))] : [];

  const response = formatResponse(
    true,
    {
      posts,
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
        totalPublished: total,
        lastUpdated: new Date().toISOString()
      }
    },
    'Blog posts fetched successfully'
  );

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(response)
  };
}

/**
 * Handle POST requests - create new blog post
 */
async function handleCreatePost(event, headers) {
  const supabase = getSupabaseServiceClient(); // Use service key for admin operations

  let data;
  try {
    data = JSON.parse(event.body);
  } catch (parseError) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify(formatResponse(
        false, 
        null, 
        'Invalid JSON in request body', 
        parseError.message, 
        400
      ))
    };
  }

  // Validate required fields
  const validation = validateRequiredFields(data, ['title', 'content', 'author']);
  if (!validation.valid) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify(formatResponse(
        false, 
        null, 
        `Missing required fields: ${validation.missing.join(', ')}`, 
        null, 
        400
      ))
    };
  }

  // Generate slug if not provided
  if (!data.slug) {
    data.slug = data.title.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  // Sanitize inputs
  const postData = {
    title: sanitizeInput(data.title),
    slug: sanitizeInput(data.slug),
    excerpt: data.excerpt ? sanitizeInput(data.excerpt) : null,
    content: data.content, // Don't sanitize content as it may contain HTML
    author: sanitizeInput(data.author),
    category: data.category ? sanitizeInput(data.category) : null,
    tags: data.tags || [],
    status: data.status || 'draft',
    featured: Boolean(data.featured),
    meta_description: data.meta_description ? sanitizeInput(data.meta_description) : null,
    featured_image: data.featured_image || null,
    reading_time: data.reading_time || null,
    published_at: data.status === 'published' ? new Date().toISOString() : null
  };

  const result = await withErrorHandling(async () => {
    return await supabase
      .from('blog_posts')
      .insert([postData])
      .select()
      .single();
  }, 'blog post creation');

  if (!result.success) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify(formatResponse(
        false, 
        null, 
        'Failed to create blog post', 
        result.error, 
        500
      ))
    };
  }

  return {
    statusCode: 201,
    headers,
    body: JSON.stringify(formatResponse(
      true,
      { post: result.data },
      'Blog post created successfully'
    ))
  };
}

/**
 * Handle PUT/PATCH requests - update blog post
 */
async function handleUpdatePost(event, headers, blogId) {
  if (!blogId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify(formatResponse(
        false, 
        null, 
        'Blog post ID is required', 
        null, 
        400
      ))
    };
  }

  const supabase = getSupabaseServiceClient();

  let data;
  try {
    data = JSON.parse(event.body);
  } catch (parseError) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify(formatResponse(
        false, 
        null, 
        'Invalid JSON in request body', 
        parseError.message, 
        400
      ))
    };
  }

  // Sanitize inputs
  const updateData = {};
  if (data.title) updateData.title = sanitizeInput(data.title);
  if (data.slug) updateData.slug = sanitizeInput(data.slug);
  if (data.excerpt) updateData.excerpt = sanitizeInput(data.excerpt);
  if (data.content) updateData.content = data.content;
  if (data.author) updateData.author = sanitizeInput(data.author);
  if (data.category) updateData.category = sanitizeInput(data.category);
  if (data.tags) updateData.tags = data.tags;
  if (data.status) {
    updateData.status = data.status;
    if (data.status === 'published' && !data.published_at) {
      updateData.published_at = new Date().toISOString();
    }
  }
  if (typeof data.featured === 'boolean') updateData.featured = data.featured;
  if (data.meta_description) updateData.meta_description = sanitizeInput(data.meta_description);
  if (data.featured_image) updateData.featured_image = data.featured_image;
  if (data.reading_time) updateData.reading_time = data.reading_time;
  
  updateData.updated_at = new Date().toISOString();

  const result = await withErrorHandling(async () => {
    return await supabase
      .from('blog_posts')
      .update(updateData)
      .eq('id', blogId)
      .select()
      .single();
  }, 'blog post update');

  if (!result.success) {
    return {
      statusCode: result.error.code === 'PGRST116' ? 404 : 500,
      headers,
      body: JSON.stringify(formatResponse(
        false, 
        null, 
        result.error.code === 'PGRST116' ? 'Blog post not found' : 'Failed to update blog post', 
        result.error
      ))
    };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(formatResponse(
      true,
      { post: result.data },
      'Blog post updated successfully'
    ))
  };
}

/**
 * Handle DELETE requests - delete blog post
 */
async function handleDeletePost(event, headers, blogId) {
  if (!blogId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify(formatResponse(
        false, 
        null, 
        'Blog post ID is required', 
        null, 
        400
      ))
    };
  }

  const supabase = getSupabaseServiceClient();

  const result = await withErrorHandling(async () => {
    return await supabase
      .from('blog_posts')
      .delete()
      .eq('id', blogId)
      .select()
      .single();
  }, 'blog post deletion');

  if (!result.success) {
    return {
      statusCode: result.error.code === 'PGRST116' ? 404 : 500,
      headers,
      body: JSON.stringify(formatResponse(
        false, 
        null, 
        result.error.code === 'PGRST116' ? 'Blog post not found' : 'Failed to delete blog post', 
        result.error
      ))
    };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(formatResponse(
      true,
      { deletedPost: result.data },
      'Blog post deleted successfully'
    ))
  };
  // This fallback code is no longer used but kept for reference
  const fallbackPosts = [
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

    ];
    
    // Fallback should never be reached in new implementation
    console.warn('Using fallback blog data - this should not happen');
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(formatResponse(
        true,
        {
          posts: fallbackPosts,
          pagination: { page: 1, limit: 10, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
          meta: { categories: [], totalPublished: 0, lastUpdated: new Date().toISOString() }
        },
        'Blog posts fetched (fallback data)'
      ))
    };

