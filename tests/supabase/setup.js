/**
 * Supabase Test Suite Setup
 * Global setup and utilities for Supabase integration tests
 */

require('dotenv').config({ path: '.env.test' });

// Global test timeout
jest.setTimeout(30000);

// Global test utilities
global.testUtils = {
  /**
   * Generate unique test email
   */
  generateTestEmail: () => `test.${Date.now()}@example.com`,

  /**
   * Generate test user data
   */
  generateTestUser: () => ({
    email: global.testUtils.generateTestEmail(),
    password: 'TestPassword123!',
    full_name: `Test User ${Date.now()}`,
    role: 'user'
  }),

  /**
   * Generate test data based on type
   */
  generateTestData: (type, overrides = {}) => {
    const baseData = {
      profile: {
        user_id: `test-user-${Date.now()}`,
        email: global.testUtils.generateTestEmail(),
        full_name: 'Test Profile User',
        bio: 'Test bio for integration testing',
        role: 'user',
        website: 'https://test-example.com',
        location: 'Test City',
        language_preference: 'en',
        ...overrides
      },

      project: {
        title: `Test Project ${Date.now()}`,
        slug: `test-project-${Date.now()}`,
        description: 'A test project for integration testing',
        content: 'Detailed project content for testing purposes',
        tech_stack: ['React', 'Node.js', 'PostgreSQL'],
        github_url: 'https://github.com/test/project',
        live_url: 'https://test-project.com',
        status: 'active',
        category: 'web-development',
        tags: ['frontend', 'backend'],
        difficulty_level: 3,
        ...overrides
      },

      blogPost: {
        title: `Test Blog Post ${Date.now()}`,
        slug: `test-blog-post-${Date.now()}`,
        content: 'This is test blog content with **markdown** formatting.',
        excerpt: 'A test excerpt for integration testing',
        status: 'published',
        tags: ['testing', 'integration', 'supabase'],
        categories: ['technology', 'development'],
        language: 'en',
        reading_time: 5,
        published_at: new Date().toISOString(),
        ...overrides
      },

      contactMessage: {
        name: `Test Contact ${Date.now()}`,
        email: global.testUtils.generateTestEmail(),
        subject: 'Test Subject',
        message: 'Test message content for integration testing',
        status: 'new',
        priority: 'normal',
        source: 'contact_form',
        ...overrides
      },

      mediaAsset: {
        filename: `test_image_${Date.now()}.jpg`,
        original_filename: 'test-image.jpg',
        url: 'https://example.com/uploads/test-image.jpg',
        type: 'image',
        mime_type: 'image/jpeg',
        size_bytes: 1024000,
        width: 1920,
        height: 1080,
        alt_text: 'Test image for integration testing',
        caption: 'A sample test image',
        tags: ['test', 'sample', 'integration'],
        folder: 'test-uploads',
        is_public: true,
        ...overrides
      },

      skill: {
        name: `Test Skill ${Date.now()}`,
        category: 'programming',
        level: 7,
        years_experience: 3.5,
        description: 'Test skill for integration testing',
        is_featured: false,
        ...overrides
      },

      testimonial: {
        client_name: `Test Client ${Date.now()}`,
        client_title: 'Test Manager',
        client_company: 'Test Company Inc.',
        content: 'This is a test testimonial for integration testing purposes.',
        rating: 5,
        is_featured: true,
        is_approved: true,
        source: 'direct',
        date_given: new Date().toISOString().split('T')[0],
        ...overrides
      }
    };

    return baseData[type] || {};
  },

  /**
   * Wait for a specified amount of time
   */
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  /**
   * Retry a function with exponential backoff
   */
  retry: async (fn, maxAttempts = 3, delay = 1000) => {
    let lastError;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxAttempts) {
          throw error;
        }
        
        await global.testUtils.wait(delay * Math.pow(2, attempt - 1));
      }
    }
    
    throw lastError;
  },

  /**
   * Clean up test data from database
   */
  cleanupTestData: async (supabase) => {
    try {
      // Clean up in reverse dependency order to avoid foreign key constraints
      const cleanupQueries = [
        supabase.from('comments').delete().like('content', '%TEST_%'),
        supabase.from('testimonials').delete().like('content', '%test%'),
        supabase.from('blog_posts').delete().like('title', '%Test%'),
        supabase.from('projects').delete().like('title', '%Test%'),
        supabase.from('contact_messages').delete().like('name', '%Test%'),
        supabase.from('media_assets').delete().like('filename', '%test_%'),
        supabase.from('skills').delete().like('name', '%Test%'),
        supabase.from('tags').delete().like('name', '%Test%'),
        supabase.from('categories').delete().like('name', '%Test%'),
        supabase.from('profiles').delete().like('full_name', '%Test%')
      ];

      await Promise.allSettled(cleanupQueries);
    } catch (error) {
      console.warn('Test cleanup warning:', error.message);
    }
  },

  /**
   * Create test user with profile
   */
  createTestUser: async (adminClient, userData = {}) => {
    const testUser = global.testUtils.generateTestUser();
    Object.assign(testUser, userData);

    try {
      // Create auth user
      const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
        email: testUser.email,
        password: testUser.password,
        email_confirm: true
      });

      if (authError) throw authError;

      // Create profile
      const { data: profile, error: profileError } = await adminClient
        .from('profiles')
        .insert({
          user_id: authUser.user.id,
          email: testUser.email,
          full_name: testUser.full_name,
          role: testUser.role
        })
        .select()
        .single();

      if (profileError) throw profileError;

      return {
        authUser: authUser.user,
        profile: profile,
        credentials: {
          email: testUser.email,
          password: testUser.password
        }
      };
    } catch (error) {
      console.error('Failed to create test user:', error);
      throw error;
    }
  },

  /**
   * Validate test environment
   */
  validateTestEnvironment: () => {
    const requiredEnvVars = [
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY'
    ];

    const missing = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    // Check if using local Supabase instance (recommended for tests)
    if (!process.env.SUPABASE_URL.includes('localhost')) {
      console.warn('Warning: Not using local Supabase instance for tests');
    }

    return true;
  },

  /**
   * Mock browser environment for frontend tests
   */
  setupBrowserEnvironment: () => {
    if (typeof window === 'undefined') {
      const { JSDOM } = require('jsdom');
      
      const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
        url: 'http://localhost:3000',
        pretendToBeVisual: true,
        resources: 'usable'
      });

      global.window = dom.window;
      global.document = dom.window.document;
      global.localStorage = dom.window.localStorage;
      global.sessionStorage = dom.window.sessionStorage;
      global.location = dom.window.location;
      global.navigator = dom.window.navigator;
      global.fetch = require('node-fetch');

      return dom;
    }

    return null;
  },

  /**
   * Create mock file for upload tests
   */
  createMockFile: (name = 'test.txt', content = 'test content', type = 'text/plain') => {
    if (typeof window !== 'undefined' && window.File) {
      return new window.File([content], name, { type });
    }
    
    // Node.js environment mock
    return {
      name,
      size: Buffer.byteLength(content),
      type,
      lastModified: Date.now(),
      stream: () => new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(content));
          controller.close();
        }
      }),
      arrayBuffer: () => Promise.resolve(new TextEncoder().encode(content).buffer),
      text: () => Promise.resolve(content)
    };
  },

  /**
   * Assert error structure
   */
  assertSupabaseError: (error, expectedCode = null) => {
    expect(error).toBeDefined();
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBeDefined();
    
    if (expectedCode) {
      expect(error.code).toBe(expectedCode);
    }
  },

  /**
   * Assert successful response structure
   */
  assertSupabaseSuccess: (result, expectData = true) => {
    expect(result).toBeDefined();
    expect(result.error).toBeNull();
    
    if (expectData) {
      expect(result.data).toBeDefined();
    }
  },

  /**
   * Generate random test ID
   */
  generateTestId: (prefix = 'test') => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,

  /**
   * Create test channel name for realtime tests
   */
  generateChannelName: (prefix = 'test-channel') => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,

  /**
   * Cleanup realtime channels
   */
  cleanupChannels: (channels) => {
    channels.forEach(channel => {
      try {
        if (channel && typeof channel.unsubscribe === 'function') {
          channel.unsubscribe();
        }
      } catch (error) {
        console.warn('Channel cleanup warning:', error.message);
      }
    });
  }
};

// Validate environment on setup
try {
  global.testUtils.validateTestEnvironment();
} catch (error) {
  console.error('Test environment validation failed:', error.message);
  process.exit(1);
}

// Global error handlers for tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Global cleanup on test completion
afterAll(async () => {
  // Allow time for any pending operations
  await global.testUtils.wait(100);
});

// Add custom matchers
expect.extend({
  toBeValidUUID(received) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = typeof received === 'string' && uuidRegex.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid UUID`,
        pass: true
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid UUID`,
        pass: false
      };
    }
  },

  toBeValidEmail(received) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pass = typeof received === 'string' && emailRegex.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid email`,
        pass: true
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid email`,
        pass: false
      };
    }
  },

  toBeWithinTimeRange(received, expected, toleranceMs = 1000) {
    const receivedTime = new Date(received).getTime();
    const expectedTime = new Date(expected).getTime();
    const diff = Math.abs(receivedTime - expectedTime);
    const pass = diff <= toleranceMs;
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be within ${toleranceMs}ms of ${expected}`,
        pass: true
      };
    } else {
      return {
        message: () => `expected ${received} to be within ${toleranceMs}ms of ${expected}`,
        pass: false
      };
    }
  }
});

console.log('Supabase test suite setup completed');
console.log(`Test environment: ${process.env.SUPABASE_URL}`);
console.log(`Node environment: ${process.env.NODE_ENV}`);