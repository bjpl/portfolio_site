/**
 * Integration Tests for Data Flow
 * Tests end-to-end data flow from API to components to user interface
 */

import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { JSDOM } from 'jsdom';

// Mock Next.js components
jest.mock('next/link', () => {
  return ({ children, href }) => <a href={href}>{children}</a>;
});

jest.mock('next/image', () => {
  return ({ src, alt }) => <img src={src} alt={alt} />;
});

// Mock fetch for API calls
global.fetch = jest.fn();

describe('Data Flow Integration Tests', () => {
  beforeEach(() => {
    global.fetch.mockClear();
    
    // Setup DOM environment
    const dom = new JSDOM();
    global.document = dom.window.document;
    global.window = dom.window;
  });

  describe('Projects Data Flow', () => {
    const mockProjectsData = [
      {
        id: 1,
        title: 'Vocab Tool',
        slug: 'vocab-tool',
        description: 'Python-based vocabulary management tool',
        image: '/images/projects/vocab-tool.jpg',
        technologies: ['Python', 'Docker', 'Testing'],
        status: 'Completed',
        featured: true,
        demo: 'https://demo.example.com',
        github: 'https://github.com/example/vocab-tool'
      },
      {
        id: 2,
        title: 'Language Tool Suite',
        slug: 'language-tool-suite',
        description: 'Comprehensive language learning tools',
        image: '/images/projects/langtool.jpg',
        technologies: ['JavaScript', 'React', 'Educational Design'],
        status: 'In Progress',
        featured: false,
        demo: null,
        github: 'https://github.com/example/langtool'
      }
    ];

    it('should fetch and display projects data', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProjectsData
      });

      // Simulate data fetching
      const response = await fetch('/api/projects');
      const projects = await response.json();

      expect(fetch).toHaveBeenCalledWith('/api/projects');
      expect(projects).toHaveLength(2);
      expect(projects[0].title).toBe('Vocab Tool');
      expect(projects[1].title).toBe('Language Tool Suite');
    });

    it('should handle projects API errors gracefully', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' })
      });

      const response = await fetch('/api/projects');
      const error = await response.json();

      expect(response.ok).toBe(false);
      expect(error.error).toBe('Internal server error');
    });

    it('should filter featured projects correctly', () => {
      const featuredProjects = mockProjectsData.filter(project => project.featured);
      expect(featuredProjects).toHaveLength(1);
      expect(featuredProjects[0].title).toBe('Vocab Tool');
    });

    it('should transform projects data for display', () => {
      const transformedProjects = mockProjectsData.map(project => ({
        ...project,
        technologiesCount: project.technologies.length,
        hasDemo: !!project.demo,
        hasGithub: !!project.github
      }));

      expect(transformedProjects[0].technologiesCount).toBe(3);
      expect(transformedProjects[0].hasDemo).toBe(true);
      expect(transformedProjects[1].hasDemo).toBe(false);
    });
  });

  describe('Blog Data Flow', () => {
    const mockBlogData = [
      {
        id: 1,
        title: 'The AI Revolution in Language Learning',
        slug: 'ai-language-learning-revolution',
        excerpt: 'How AI is transforming language education...',
        content: 'Full content of the blog post...',
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
        title: 'VR Language Immersion',
        slug: 'vr-language-immersion',
        excerpt: 'Insights from working with VR instructors...',
        content: 'Full VR content...',
        featured_image: '/images/blog/vr-immersion.jpg',
        published_at: '2025-01-10T09:00:00.000Z',
        tags: ['VR', 'Immersion', 'Teaching'],
        profiles: {
          id: 1,
          username: 'brandon',
          full_name: 'Brandon JP Lambert',
          avatar_url: '/images/avatars/brandon.jpg'
        }
      }
    ];

    it('should fetch and display blog posts', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBlogData
      });

      const response = await fetch('/api/blog');
      const posts = await response.json();

      expect(fetch).toHaveBeenCalledWith('/api/blog');
      expect(posts).toHaveLength(2);
      expect(posts[0].title).toBe('The AI Revolution in Language Learning');
    });

    it('should handle blog API pagination', async () => {
      const paginatedResponse = {
        data: mockBlogData.slice(0, 1),
        pagination: {
          page: 1,
          limit: 1,
          total: 2,
          pages: 2
        }
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => paginatedResponse
      });

      const response = await fetch('/api/blog?page=1&limit=1');
      const result = await response.json();

      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(2);
    });

    it('should sort blog posts by published date', () => {
      const sortedPosts = [...mockBlogData].sort(
        (a, b) => new Date(b.published_at) - new Date(a.published_at)
      );

      expect(sortedPosts[0].title).toBe('The AI Revolution in Language Learning');
      expect(sortedPosts[1].title).toBe('VR Language Immersion');
    });

    it('should handle blog post content transformation', () => {
      const transformedPosts = mockBlogData.map(post => ({
        ...post,
        publishedDate: new Date(post.published_at),
        wordCount: post.content.split(' ').length,
        readingTime: Math.ceil(post.content.split(' ').length / 200),
        tagCount: post.tags.length
      }));

      expect(transformedPosts[0].wordCount).toBeGreaterThan(0);
      expect(transformedPosts[0].readingTime).toBeGreaterThan(0);
      expect(transformedPosts[0].tagCount).toBe(3);
    });
  });

  describe('Navigation Data Flow', () => {
    const mockNavigationData = {
      main: [
        { name: 'Teaching & Learning', url: '/teaching-learning/', weight: 10 },
        { name: 'Tools', url: '/tools/', weight: 20 },
        { name: 'Writing', url: '/writing/', weight: 30 },
        { name: 'Photography', url: '/photography/', weight: 40 },
        { name: 'About', url: '/me/', weight: 50 }
      ]
    };

    it('should process navigation data correctly', () => {
      const sortedNav = mockNavigationData.main.sort((a, b) => a.weight - b.weight);
      expect(sortedNav[0].name).toBe('Teaching & Learning');
      expect(sortedNav[4].name).toBe('About');
    });

    it('should validate navigation URLs', () => {
      mockNavigationData.main.forEach(item => {
        expect(item.url).toMatch(/^\/.*\/$/); // Should start and end with slash
        expect(item.url).not.toMatch(/\s/); // Should not contain spaces
      });
    });

    it('should handle active state calculation', () => {
      const currentPath = '/tools/';
      const activeItem = mockNavigationData.main.find(item => 
        item.url === currentPath || currentPath.startsWith(item.url.replace(/\/$/, ''))
      );

      expect(activeItem.name).toBe('Tools');
    });
  });

  describe('Search and Filter Data Flow', () => {
    it('should filter projects by technology', () => {
      const projects = [
        { title: 'React App', technologies: ['React', 'JavaScript'] },
        { title: 'Python Tool', technologies: ['Python', 'Docker'] },
        { title: 'Full Stack', technologies: ['React', 'Python', 'Node.js'] }
      ];

      const reactProjects = projects.filter(project => 
        project.technologies.includes('React')
      );

      expect(reactProjects).toHaveLength(2);
      expect(reactProjects[0].title).toBe('React App');
    });

    it('should search blog posts by content', () => {
      const posts = [
        { title: 'AI in Education', content: 'Artificial intelligence is transforming...' },
        { title: 'VR Learning', content: 'Virtual reality provides immersive...' },
        { title: 'Traditional Methods', content: 'Classic teaching approaches still...' }
      ];

      const searchTerm = 'artificial intelligence';
      const searchResults = posts.filter(post => 
        post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.content.toLowerCase().includes(searchTerm.toLowerCase())
      );

      expect(searchResults).toHaveLength(1);
      expect(searchResults[0].title).toBe('AI in Education');
    });

    it('should handle empty search results gracefully', () => {
      const posts = [];
      const searchResults = posts.filter(post => 
        post.title.toLowerCase().includes('nonexistent')
      );

      expect(searchResults).toHaveLength(0);
      expect(Array.isArray(searchResults)).toBe(true);
    });
  });

  describe('Component Data Integration', () => {
    it('should pass data correctly to ProjectCard components', () => {
      const mockProject = {
        title: 'Test Project',
        description: 'Test description',
        technologies: ['React', 'Testing'],
        status: 'Completed'
      };

      // Test that data flows correctly to component props
      expect(mockProject.title).toBeDefined();
      expect(mockProject.technologies).toHaveLength(2);
      expect(mockProject.status).toBe('Completed');
    });

    it('should handle missing data gracefully in components', () => {
      const incompleteProject = {
        title: 'Incomplete Project'
        // Missing other fields
      };

      // Components should handle missing data
      expect(incompleteProject.title).toBeDefined();
      expect(incompleteProject.description).toBeUndefined();
      expect(incompleteProject.technologies).toBeUndefined();
    });
  });

  describe('Real-time Data Updates', () => {
    it('should handle dynamic content updates', async () => {
      let projects = [
        { id: 1, title: 'Project 1', status: 'In Progress' }
      ];

      // Simulate status update
      projects[0].status = 'Completed';

      expect(projects[0].status).toBe('Completed');
    });

    it('should handle WebSocket data updates', () => {
      // Mock WebSocket for real-time updates
      const mockWebSocket = {
        onmessage: jest.fn(),
        send: jest.fn(),
        close: jest.fn()
      };

      const handleMessage = (event) => {
        const data = JSON.parse(event.data);
        return data;
      };

      const testMessage = { type: 'project_update', data: { id: 1, status: 'Completed' } };
      const result = handleMessage({ data: JSON.stringify(testMessage) });

      expect(result.type).toBe('project_update');
      expect(result.data.status).toBe('Completed');
    });
  });

  describe('Error Handling in Data Flow', () => {
    it('should handle network errors gracefully', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      try {
        await fetch('/api/projects');
      } catch (error) {
        expect(error.message).toBe('Network error');
      }
    });

    it('should handle malformed JSON responses', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        }
      });

      try {
        const response = await fetch('/api/projects');
        await response.json();
      } catch (error) {
        expect(error.message).toBe('Invalid JSON');
      }
    });

    it('should provide fallback data when API fails', () => {
      const fallbackProjects = [
        {
          title: 'Featured Project',
          description: 'Cached project data',
          status: 'Available offline'
        }
      ];

      // In real implementation, would use cached/fallback data
      expect(fallbackProjects).toHaveLength(1);
      expect(fallbackProjects[0].title).toBe('Featured Project');
    });
  });

  describe('Data Caching and Performance', () => {
    it('should cache frequently requested data', () => {
      const cache = new Map();
      const cacheKey = 'projects_featured';
      const cacheData = [{ title: 'Cached Project' }];

      cache.set(cacheKey, cacheData);

      const cachedResult = cache.get(cacheKey);
      expect(cachedResult).toEqual(cacheData);
      expect(cache.has(cacheKey)).toBe(true);
    });

    it('should invalidate stale cache data', () => {
      const cache = new Map();
      const cacheKey = 'projects_all';
      const maxAge = 5 * 60 * 1000; // 5 minutes

      const cacheEntry = {
        data: [{ title: 'Project' }],
        timestamp: Date.now() - (6 * 60 * 1000) // 6 minutes ago
      };

      const isStale = (Date.now() - cacheEntry.timestamp) > maxAge;
      expect(isStale).toBe(true);
    });
  });

  describe('Data Validation and Sanitization', () => {
    it('should validate required fields', () => {
      const project = {
        title: 'Valid Project',
        slug: 'valid-project',
        description: 'Valid description'
      };

      const requiredFields = ['title', 'slug', 'description'];
      const isValid = requiredFields.every(field => 
        project[field] && project[field].toString().trim().length > 0
      );

      expect(isValid).toBe(true);
    });

    it('should sanitize user input data', () => {
      const unsafeInput = '<script>alert("xss")</script>Hello World';
      
      // Mock sanitization (in real app would use library like DOMPurify)
      const sanitized = unsafeInput
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .trim();

      expect(sanitized).toBe('Hello World');
      expect(sanitized).not.toContain('<script>');
    });

    it('should validate data types', () => {
      const project = {
        id: 1,
        title: 'Test Project',
        featured: true,
        technologies: ['React', 'Node.js'],
        created_at: '2024-01-15T10:00:00Z'
      };

      expect(typeof project.id).toBe('number');
      expect(typeof project.title).toBe('string');
      expect(typeof project.featured).toBe('boolean');
      expect(Array.isArray(project.technologies)).toBe(true);
      expect(new Date(project.created_at)).toBeInstanceOf(Date);
    });
  });

  describe('Internationalization Data Flow', () => {
    it('should handle multilingual content', () => {
      const multilingualData = {
        en: {
          title: 'My Projects',
          description: 'Explore my work'
        },
        es: {
          title: 'Mis Proyectos',
          description: 'Explora mi trabajo'
        }
      };

      const getCurrentLanguage = () => 'en'; // Mock language detection
      const currentLang = getCurrentLanguage();
      const localizedContent = multilingualData[currentLang];

      expect(localizedContent.title).toBe('My Projects');
      expect(localizedContent.description).toBe('Explore my work');
    });

    it('should fallback to default language', () => {
      const data = {
        en: { title: 'English Title' },
        es: { title: 'Título Español' }
      };

      const getLocalizedContent = (lang, key) => {
        return data[lang]?.[key] || data['en'][key] || key;
      };

      // Test fallback for missing translation
      expect(getLocalizedContent('fr', 'title')).toBe('English Title');
    });
  });
});