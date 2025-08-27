/**
 * Mock Service Worker for API responses
 * Provides mock data for testing without hitting real APIs
 */

import { setupServer } from 'msw/node';
import { rest } from 'msw';

const mockProjects = [
  {
    id: 1,
    title: 'Vocab Tool',
    slug: 'vocab-tool',
    description: 'Python-based vocabulary management tool with Docker support and modern development practices.',
    image: '/images/projects/vocab-tool.jpg',
    technologies: ['Python', 'Docker', 'Testing'],
    status: 'Completed',
    featured: true,
    demo: 'https://demo.example.com/vocab-tool',
    github: 'https://github.com/example/vocab-tool',
    type: 'CLI Tool'
  },
  {
    id: 2,
    title: 'Language Tool Suite',
    slug: 'language-tool-suite',
    description: 'Comprehensive language learning tools including conjugation practice and interactive dashboards.',
    image: '/images/projects/langtool.jpg',
    technologies: ['JavaScript', 'React', 'Educational Design'],
    status: 'In Progress',
    featured: false,
    demo: null,
    github: 'https://github.com/example/langtool',
    type: 'Web App'
  },
  {
    id: 3,
    title: 'Multimodal Learning Strategies',
    slug: 'multimodal-learning',
    description: 'Research-backed strategies for virtual immersion and chaos-to-curriculum methodology.',
    image: '/images/projects/multimodal.jpg',
    technologies: ['Pedagogy', 'Research', 'SLA Theory'],
    status: 'Completed',
    featured: false,
    demo: null,
    github: null,
    type: 'Research'
  }
];

const mockBlogPosts = [
  {
    id: 1,
    title: 'The AI Revolution in Language Learning',
    slug: 'ai-language-learning-revolution',
    excerpt: 'How AI is transforming language education beyond simple chatbots, creating personalized, adaptive learning experiences at scale.',
    content: 'Artificial intelligence is fundamentally changing how we approach language education...',
    featured_image: '/images/blog/ai-revolution.jpg',
    published_at: '2025-01-17T10:00:00.000Z',
    tags: ['AI', 'EdTech', 'Innovation'],
    profiles: {
      id: 1,
      username: 'brandon',
      full_name: 'Brandon JP Lambert',
      avatar_url: '/images/avatars/brandon.jpg'
    }
  },
  {
    id: 2,
    title: 'VR Language Immersion: Lessons from Coaching Instructors',
    slug: 'vr-language-immersion',
    excerpt: 'Insights from working with VR instructors and creating immersive language learning environments.',
    content: 'Virtual reality is opening new frontiers in language immersion...',
    featured_image: '/images/blog/vr-immersion.jpg',
    published_at: '2025-01-10T09:00:00.000Z',
    tags: ['VR', 'Immersion', 'Teaching'],
    profiles: {
      id: 1,
      username: 'brandon',
      full_name: 'Brandon JP Lambert',
      avatar_url: '/images/avatars/brandon.jpg'
    }
  },
  {
    id: 3,
    title: 'Scaling Education for 800,000+ Learners',
    slug: 'scaling-education-800k-learners',
    excerpt: 'Lessons learned from developing curriculum and tools for massive scale language education programs.',
    content: 'When tasked with creating educational content for hundreds of thousands of learners...',
    featured_image: '/images/blog/scaling-education.jpg',
    published_at: '2024-12-28T08:00:00.000Z',
    tags: ['Scale', 'Curriculum', 'EdTech'],
    profiles: {
      id: 1,
      username: 'brandon',
      full_name: 'Brandon JP Lambert',
      avatar_url: '/images/avatars/brandon.jpg'
    }
  }
];

const mockUser = {
  id: 1,
  username: 'brandon',
  full_name: 'Brandon JP Lambert',
  email: 'brandon@example.com',
  avatar_url: '/images/avatars/brandon.jpg',
  bio: 'Fourth-generation educator and EdTech developer specializing in language learning innovation.',
  location: 'Mountain View, CA',
  website: 'https://brandonjplambert.com',
  linkedin: 'https://linkedin.com/in/brandonjplambert',
  github: 'https://github.com/brandonjplambert',
  twitter: 'https://twitter.com/brandonjplambert'
};

// Define handlers
export const handlers = [
  // Projects API
  rest.get('/api/projects', (req, res, ctx) => {
    const featured = req.url.searchParams.get('featured');
    const limit = req.url.searchParams.get('limit');
    
    let projects = [...mockProjects];
    
    if (featured === 'true') {
      projects = projects.filter(p => p.featured);
    }
    
    if (limit) {
      projects = projects.slice(0, parseInt(limit));
    }
    
    return res(
      ctx.status(200),
      ctx.json(projects)
    );
  }),

  rest.get('/api/projects/:slug', (req, res, ctx) => {
    const { slug } = req.params;
    const project = mockProjects.find(p => p.slug === slug);
    
    if (!project) {
      return res(
        ctx.status(404),
        ctx.json({ error: 'Project not found' })
      );
    }
    
    return res(
      ctx.status(200),
      ctx.json(project)
    );
  }),

  // Blog API
  rest.get('/api/blog', (req, res, ctx) => {
    const page = parseInt(req.url.searchParams.get('page') || '1');
    const limit = parseInt(req.url.searchParams.get('limit') || '10');
    const tag = req.url.searchParams.get('tag');
    
    let posts = [...mockBlogPosts];
    
    if (tag) {
      posts = posts.filter(p => p.tags.includes(tag));
    }
    
    // Sort by published date (newest first)
    posts.sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
    
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedPosts = posts.slice(startIndex, endIndex);
    
    return res(
      ctx.status(200),
      ctx.json({
        data: paginatedPosts,
        pagination: {
          page,
          limit,
          total: posts.length,
          pages: Math.ceil(posts.length / limit)
        }
      })
    );
  }),

  rest.get('/api/blog/:slug', (req, res, ctx) => {
    const { slug } = req.params;
    const post = mockBlogPosts.find(p => p.slug === slug);
    
    if (!post) {
      return res(
        ctx.status(404),
        ctx.json({ error: 'Blog post not found' })
      );
    }
    
    return res(
      ctx.status(200),
      ctx.json(post)
    );
  }),

  // User/Profile API
  rest.get('/api/profile', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json(mockUser)
    );
  }),

  // Search API
  rest.get('/api/search', (req, res, ctx) => {
    const query = req.url.searchParams.get('q');
    const type = req.url.searchParams.get('type'); // 'projects' | 'blog' | 'all'
    
    if (!query) {
      return res(
        ctx.status(400),
        ctx.json({ error: 'Query parameter required' })
      );
    }
    
    const results = {
      projects: [],
      blog: [],
      total: 0
    };
    
    const searchTerm = query.toLowerCase();
    
    if (type === 'projects' || type === 'all' || !type) {
      results.projects = mockProjects.filter(p => 
        p.title.toLowerCase().includes(searchTerm) ||
        p.description.toLowerCase().includes(searchTerm) ||
        p.technologies.some(tech => tech.toLowerCase().includes(searchTerm))
      );
    }
    
    if (type === 'blog' || type === 'all' || !type) {
      results.blog = mockBlogPosts.filter(p => 
        p.title.toLowerCase().includes(searchTerm) ||
        p.excerpt.toLowerCase().includes(searchTerm) ||
        p.content.toLowerCase().includes(searchTerm) ||
        p.tags.some(tag => tag.toLowerCase().includes(searchTerm))
      );
    }
    
    results.total = results.projects.length + results.blog.length;
    
    return res(
      ctx.status(200),
      ctx.json(results)
    );
  }),

  // Contact form API
  rest.post('/api/contact', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({ 
        success: true, 
        message: 'Message sent successfully' 
      })
    );
  }),

  // Newsletter subscription API
  rest.post('/api/newsletter', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({ 
        success: true, 
        message: 'Subscribed successfully' 
      })
    );
  }),

  // Analytics API
  rest.post('/api/analytics', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({ success: true })
    );
  }),

  // Error simulation handlers for testing error states
  rest.get('/api/error/500', (req, res, ctx) => {
    return res(
      ctx.status(500),
      ctx.json({ error: 'Internal server error' })
    );
  }),

  rest.get('/api/error/timeout', (req, res, ctx) => {
    return res(
      ctx.delay(10000), // Simulate timeout
      ctx.status(200),
      ctx.json({ data: 'This should timeout' })
    );
  }),

  rest.get('/api/error/network', (req, res, ctx) => {
    return res.networkError('Network connection failed');
  }),

  // Manifest and PWA files
  rest.get('/manifest.json', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        name: 'Brandon JP Lambert - Portfolio',
        short_name: 'BJ Lambert',
        description: 'Portfolio of Brandon JP Lambert: Educator & Developer',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#4A90E2',
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable any'
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable any'
          }
        ]
      })
    );
  }),

  // Static file handlers for images
  rest.get('/images/*', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.set('Content-Type', 'image/jpeg'),
      ctx.body('mock-image-data')
    );
  }),

  rest.get('/icons/*', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.set('Content-Type', 'image/png'),
      ctx.body('mock-icon-data')
    );
  })
];

// Setup server
export const server = setupServer(...handlers);

// Export mock data for use in tests
export { mockProjects, mockBlogPosts, mockUser };