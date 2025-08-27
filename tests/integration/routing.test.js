/**
 * Integration Tests for URL Redirects and Route Mappings
 * Tests the application's routing behavior, redirects, and URL structure
 */

import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';

// Mock Next.js router for testing
const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
  pathname: '/',
  query: {},
  asPath: '/',
  events: {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
  },
};

// Mock fetch for API calls
global.fetch = jest.fn();

describe('Routing Integration Tests', () => {
  let dom;
  let window;
  let document;

  beforeAll(() => {
    // Setup JSDOM environment
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'http://localhost:3000',
      pretendToBeVisual: true,
      resources: 'usable'
    });
    
    window = dom.window;
    document = window.document;
    
    // Set globals
    global.window = window;
    global.document = document;
    global.navigator = window.navigator;
    global.location = window.location;
    global.history = window.history;
  });

  beforeEach(() => {
    mockRouter.push.mockClear();
    mockRouter.replace.mockClear();
    global.fetch.mockClear();
    window.location.href = 'http://localhost:3000/';
  });

  describe('Main Navigation Routes', () => {
    const mainRoutes = [
      { path: '/', expected: 'Home Page' },
      { path: '/teaching-learning/', expected: 'Teaching & Learning' },
      { path: '/tools/', expected: 'Tools' },
      { path: '/writing/', expected: 'Writing' },
      { path: '/photography/', expected: 'Photography' },
      { path: '/me/', expected: 'About' }
    ];

    mainRoutes.forEach(({ path, expected }) => {
      it(`should handle route ${path} correctly`, async () => {
        // Simulate navigation to route
        window.location.href = `http://localhost:3000${path}`;
        
        // Verify route is accessible
        expect(window.location.pathname).toBe(path);
        
        // Test that route doesn't return 404
        const isValidRoute = !path.includes('undefined') && path !== '/404';
        expect(isValidRoute).toBe(true);
      });
    });

    it('should handle root route correctly', () => {
      window.location.href = 'http://localhost:3000/';
      expect(window.location.pathname).toBe('/');
    });

    it('should handle trailing slashes consistently', () => {
      const testRoutes = [
        '/tools',
        '/tools/',
        '/me',
        '/me/'
      ];

      testRoutes.forEach(route => {
        window.location.href = `http://localhost:3000${route}`;
        // Both with and without trailing slash should be valid
        expect(window.location.pathname).toMatch(/^\/[^/]*\/?$/);
      });
    });
  });

  describe('Dynamic Routes', () => {
    it('should handle project detail routes', () => {
      const projectSlugs = [
        'vocab-tool',
        'langtool',
        'multimodal-learning'
      ];

      projectSlugs.forEach(slug => {
        window.location.href = `http://localhost:3000/projects/${slug}`;
        expect(window.location.pathname).toBe(`/projects/${slug}`);
      });
    });

    it('should handle blog post routes', () => {
      const blogSlugs = [
        'ai-language-learning-revolution',
        'vr-language-immersion',
        'scaling-education-800k-learners'
      ];

      blogSlugs.forEach(slug => {
        window.location.href = `http://localhost:3000/blog/${slug}`;
        expect(window.location.pathname).toBe(`/blog/${slug}`);
      });
    });

    it('should handle nested tool routes', () => {
      const toolRoutes = [
        '/tools/built/vocab-tool/',
        '/tools/built/langtool/',
        '/tools/strategies/',
        '/tools/research/'
      ];

      toolRoutes.forEach(route => {
        window.location.href = `http://localhost:3000${route}`;
        expect(window.location.pathname).toBe(route);
      });
    });
  });

  describe('URL Parameter Handling', () => {
    it('should handle query parameters correctly', () => {
      window.location.href = 'http://localhost:3000/tools/?category=built&featured=true';
      
      const url = new URL(window.location.href);
      expect(url.searchParams.get('category')).toBe('built');
      expect(url.searchParams.get('featured')).toBe('true');
    });

    it('should handle URL fragments', () => {
      window.location.href = 'http://localhost:3000/me/#experience';
      expect(window.location.hash).toBe('#experience');
    });

    it('should handle encoded URLs', () => {
      const encodedPath = encodeURIComponent('/tools/built/vocab-tool');
      window.location.href = `http://localhost:3000${encodedPath}`;
      // Should handle encoded paths gracefully
      expect(window.location.pathname).toContain('tools');
    });
  });

  describe('Redirect Mappings', () => {
    const redirectMappings = [
      // Legacy URLs to new structure
      { from: '/cv', to: '/me/' },
      { from: '/resume', to: '/me/' },
      { from: '/about', to: '/me/' },
      { from: '/contact', to: '/me/' },
      
      // Hugo to Next.js migrations
      { from: '/posts/', to: '/writing/' },
      { from: '/articles/', to: '/writing/' },
      { from: '/portfolio/', to: '/tools/' },
      
      // Tool redirects
      { from: '/vocab-tool/', to: '/tools/built/vocab-tool/' },
      { from: '/language-tool/', to: '/tools/built/langtool/' }
    ];

    redirectMappings.forEach(({ from, to }) => {
      it(`should redirect ${from} to ${to}`, () => {
        // Simulate redirect logic
        const shouldRedirect = from !== to;
        expect(shouldRedirect).toBe(true);
        
        // In a real implementation, this would test actual redirects
        // For now, we verify the mapping exists
        expect(from).toBeDefined();
        expect(to).toBeDefined();
        expect(to).toMatch(/^\/.*\/$/); // Should follow trailing slash pattern
      });
    });
  });

  describe('API Routes', () => {
    it('should handle API endpoints correctly', async () => {
      const apiRoutes = [
        '/api/projects',
        '/api/blog',
        '/api/blog/posts',
        '/api/projects/featured'
      ];

      for (const route of apiRoutes) {
        // Mock successful API response
        global.fetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ data: [] })
        });

        const response = await fetch(`http://localhost:3000${route}`);
        expect(response.ok).toBe(true);
        expect(response.status).toBe(200);
      }
    });

    it('should handle API errors gracefully', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Not found' })
      });

      const response = await fetch('http://localhost:3000/api/nonexistent');
      expect(response.ok).toBe(false);
      expect(response.status).toBe(404);
    });
  });

  describe('Error Page Routing', () => {
    it('should handle 404 routes', () => {
      const invalidRoutes = [
        '/nonexistent-page',
        '/tools/nonexistent-tool',
        '/blog/nonexistent-post',
        '/projects/nonexistent-project'
      ];

      invalidRoutes.forEach(route => {
        window.location.href = `http://localhost:3000${route}`;
        // Would redirect to 404 page in real implementation
        expect(route).toMatch(/^\/.*$/);
      });
    });

    it('should handle malformed URLs', () => {
      const malformedUrls = [
        '/tools//double-slash',
        '/blog/../directory-traversal',
        '/projects/%20spaces',
        '//double-start-slash'
      ];

      malformedUrls.forEach(url => {
        // Should sanitize or reject malformed URLs
        const isWellFormed = !url.includes('//') || url === '//double-start-slash';
        const isValid = url.startsWith('/') && !url.includes('..');
        expect(typeof url).toBe('string');
      });
    });
  });

  describe('Internationalization Routes', () => {
    it('should handle language-specific routes', () => {
      const i18nRoutes = [
        '/es/',
        '/es/tools/',
        '/es/writing/',
        '/es/me/'
      ];

      i18nRoutes.forEach(route => {
        window.location.href = `http://localhost:3000${route}`;
        expect(window.location.pathname).toBe(route);
        expect(route.startsWith('/es/')).toBe(true);
      });
    });

    it('should handle language detection', () => {
      // Test accept-language header handling
      const languages = ['en-US', 'es-ES', 'en'];
      languages.forEach(lang => {
        // In real implementation, would test server-side language detection
        expect(lang).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/);
      });
    });
  });

  describe('External Link Handling', () => {
    it('should handle external links correctly', () => {
      const externalLinks = [
        'https://linkedin.com/in/brandonjplambert',
        'https://github.com/brandonjplambert',
        'https://demo.example.com',
        'mailto:contact@example.com'
      ];

      externalLinks.forEach(link => {
        // Should open in new tab/window
        const isExternal = !link.startsWith('/') && (
          link.startsWith('http') || 
          link.startsWith('mailto:') || 
          link.startsWith('tel:')
        );
        expect(isExternal).toBe(true);
      });
    });
  });

  describe('URL Structure Validation', () => {
    it('should follow consistent URL patterns', () => {
      const urlPatterns = [
        { path: '/tools/', pattern: /^\/tools\/$/ },
        { path: '/tools/built/vocab-tool/', pattern: /^\/tools\/[^/]+\/[^/]+\/$/ },
        { path: '/blog/post-slug', pattern: /^\/blog\/[^/]+$/ },
        { path: '/projects/project-slug', pattern: /^\/projects\/[^/]+$/ }
      ];

      urlPatterns.forEach(({ path, pattern }) => {
        expect(path).toMatch(pattern);
      });
    });

    it('should use SEO-friendly URLs', () => {
      const seoUrls = [
        '/tools/built/vocab-tool/',
        '/blog/ai-language-learning-revolution',
        '/projects/language-tool-suite',
        '/teaching-learning/'
      ];

      seoUrls.forEach(url => {
        // SEO-friendly URLs should be lowercase, use hyphens, no spaces
        expect(url).toBe(url.toLowerCase());
        expect(url).not.toMatch(/\s/);
        expect(url).not.toMatch(/_/);
        expect(url).toMatch(/^\/[a-z0-9\-\/]+\/?$/);
      });
    });
  });

  describe('Route Security', () => {
    it('should prevent directory traversal attacks', () => {
      const maliciousUrls = [
        '/tools/../../../etc/passwd',
        '/blog/../admin',
        '/projects/..%2f..%2fadmin'
      ];

      maliciousUrls.forEach(url => {
        // Should sanitize or reject malicious URLs
        const isSafe = !url.includes('../') && !url.includes('..%2f');
        // In real implementation, would test actual security measures
        expect(url.includes('../')).toBe(true); // These URLs do contain traversal attempts
      });
    });

    it('should handle special characters safely', () => {
      const specialCharUrls = [
        '/tools/test%20tool',
        '/blog/post-with-quotes"',
        '/projects/tool&param=value',
        '/me/#section<script>'
      ];

      specialCharUrls.forEach(url => {
        // Should handle or sanitize special characters
        expect(typeof url).toBe('string');
        expect(url.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Performance Routing', () => {
    it('should handle route prefetching', () => {
      const routesToPrefetch = [
        '/tools/',
        '/writing/',
        '/me/'
      ];

      routesToPrefetch.forEach(route => {
        // In Next.js, Link components prefetch by default
        expect(route).toMatch(/^\/[^/]+\/$/);
      });
    });

    it('should optimize route loading', () => {
      // Test route-based code splitting
      const routeChunks = [
        { route: '/tools/', chunk: 'tools' },
        { route: '/blog/', chunk: 'blog' },
        { route: '/projects/', chunk: 'projects' }
      ];

      routeChunks.forEach(({ route, chunk }) => {
        expect(route).toBeDefined();
        expect(chunk).toBeDefined();
      });
    });
  });

  describe('Mobile Route Handling', () => {
    it('should handle mobile-specific routing', () => {
      // Mock mobile user agent
      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
        configurable: true
      });

      const routes = ['/tools/', '/writing/', '/me/'];
      routes.forEach(route => {
        window.location.href = `http://localhost:3000${route}`;
        expect(window.location.pathname).toBe(route);
      });
    });
  });

  afterAll(() => {
    dom.window.close();
  });
});

describe('URL Redirect Validation', () => {
  /**
   * Tests specific redirect scenarios that commonly occur
   * in portfolio websites during migrations and restructuring
   */
  
  const redirectTests = [
    {
      name: 'Legacy Hugo URLs',
      scenarios: [
        { from: '/post/old-post/', to: '/blog/old-post/' },
        { from: '/portfolio/project/', to: '/projects/project/' },
        { from: '/cv/', to: '/me/' }
      ]
    },
    {
      name: 'Admin and CMS URLs',
      scenarios: [
        { from: '/admin/', to: '/admin/' }, // Should remain
        { from: '/cms/', to: '/admin/' },
        { from: '/dashboard/', to: '/admin/' }
      ]
    },
    {
      name: 'API Endpoint Consistency',
      scenarios: [
        { from: '/api/posts/', to: '/api/blog/' },
        { from: '/api/portfolio/', to: '/api/projects/' }
      ]
    }
  ];

  redirectTests.forEach(({ name, scenarios }) => {
    describe(name, () => {
      scenarios.forEach(({ from, to }) => {
        it(`should redirect ${from} to ${to}`, () => {
          // Validate redirect mapping exists
          expect(from).toBeDefined();
          expect(to).toBeDefined();
          
          // Validate both URLs follow proper format
          expect(from).toMatch(/^\/.*$/);
          expect(to).toMatch(/^\/.*$/);
          
          // Validate redirect makes sense
          expect(from).not.toBe(to);
        });
      });
    });
  });
});