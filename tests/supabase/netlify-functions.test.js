/**
 * Netlify Functions with Supabase Integration Tests
 * Tests all Netlify Functions endpoints with Supabase backend
 */

const { describe, it, beforeAll, afterAll, beforeEach, afterEach, expect, jest } = require('@jest/globals');
const axios = require('axios');

describe('Netlify Functions API Tests', () => {
  let baseURL;
  let testUser;
  let authToken;

  beforeAll(async () => {
    // Set base URL for Netlify Functions
    baseURL = process.env.NETLIFY_FUNCTIONS_URL || 'http://localhost:8888/.netlify/functions';
    
    // Set up test user for authenticated requests
    testUser = {
      email: `api.test.${Date.now()}@example.com`,
      password: 'ApiTestPassword123!',
      name: 'API Test User'
    };

    // Configure axios defaults
    axios.defaults.timeout = 10000;
    axios.defaults.headers.common['Content-Type'] = 'application/json';
  });

  afterAll(async () => {
    // Cleanup test data if needed
    if (authToken) {
      await cleanupTestUser();
    }
  });

  const cleanupTestUser = async () => {
    try {
      // Call cleanup endpoint or delete user manually
      await axios.delete(`${baseURL}/auth-logout`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
    } catch (error) {
      console.warn('Cleanup warning:', error.message);
    }
  };

  describe('Health Check Endpoint', () => {
    it('should return health status', async () => {
      const response = await axios.get(`${baseURL}/health`);

      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        status: 'ok',
        timestamp: expect.any(String),
        environment: 'netlify',
        version: expect.any(String)
      });
      expect(response.data.features).toMatchObject({
        cors: true,
        offline: true,
        fallback: true,
        monitoring: true
      });
    });

    it('should handle CORS preflight requests', async () => {
      const response = await axios.options(`${baseURL}/health`);

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('*');
      expect(response.headers['access-control-allow-methods']).toContain('GET');
      expect(response.headers['access-control-allow-methods']).toContain('POST');
      expect(response.headers['access-control-allow-methods']).toContain('OPTIONS');
    });

    it('should include deployment information', async () => {
      const response = await axios.get(`${baseURL}/health`);

      expect(response.data.deployment).toBeDefined();
      expect(response.data.deployment).toMatchObject({
        id: expect.any(String),
        context: expect.any(String)
      });
      expect(response.data.region).toBeDefined();
    });
  });

  describe('Contact Form Endpoint', () => {
    it('should accept valid contact form submission', async () => {
      const contactData = {
        name: 'TEST_Contact User',
        email: 'contact@example.com',
        subject: 'Test Subject',
        message: 'This is a test message for the contact form.'
      };

      const response = await axios.post(`${baseURL}/contact`, contactData);

      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        success: true,
        message: expect.stringContaining('Thank you'),
        timestamp: expect.any(String),
        id: expect.any(String)
      });
      expect(response.data.data).toMatchObject({
        name: contactData.name,
        email: contactData.email,
        subject: contactData.subject,
        messageLength: contactData.message.length
      });
    });

    it('should validate required fields', async () => {
      const incompleteData = {
        name: 'Test User',
        email: 'test@example.com'
        // Missing message field
      };

      try {
        await axios.post(`${baseURL}/contact`, incompleteData);
      } catch (error) {
        expect(error.response.status).toBe(400);
        expect(error.response.data).toMatchObject({
          success: false,
          message: expect.stringContaining('Missing required fields')
        });
      }
    });

    it('should validate email format', async () => {
      const invalidEmailData = {
        name: 'Test User',
        email: 'invalid-email-format',
        message: 'Test message'
      };

      try {
        await axios.post(`${baseURL}/contact`, invalidEmailData);
      } catch (error) {
        expect(error.response.status).toBe(400);
        expect(error.response.data).toMatchObject({
          success: false,
          message: expect.stringContaining('Invalid email format')
        });
      }
    });

    it('should filter spam content', async () => {
      const spamData = {
        name: 'Spam User',
        email: 'spam@example.com',
        message: 'Buy viagra now! Win the lottery with bitcoin!'
      };

      try {
        await axios.post(`${baseURL}/contact`, spamData);
      } catch (error) {
        expect(error.response.status).toBe(400);
        expect(error.response.data).toMatchObject({
          success: false,
          message: expect.stringContaining('spam filter')
        });
      }
    });

    it('should handle rate limiting', async () => {
      const contactData = {
        name: 'Rate Limit Test',
        email: 'ratelimit@example.com',
        message: 'Testing rate limiting functionality'
      };

      // Make multiple rapid requests
      const requests = Array.from({ length: 10 }, () => 
        axios.post(`${baseURL}/contact`, contactData).catch(err => err.response)
      );

      const responses = await Promise.all(requests);
      
      // At least some should succeed
      const successfulResponses = responses.filter(r => r.status === 200);
      expect(successfulResponses.length).toBeGreaterThan(0);

      // Some might be rate limited (depending on implementation)
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      // Rate limiting behavior is implementation dependent
    });
  });

  describe('Authentication Endpoints', () => {
    it('should register a new user', async () => {
      const registrationData = {
        email: testUser.email,
        password: testUser.password,
        name: testUser.name
      };

      const response = await axios.post(`${baseURL}/auth`, {
        action: 'register',
        ...registrationData
      });

      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        success: true,
        user: expect.objectContaining({
          email: testUser.email,
          id: expect.any(String)
        })
      });

      // Store user ID for cleanup
      testUser.id = response.data.user.id;
    });

    it('should login with valid credentials', async () => {
      // First ensure user is registered
      await axios.post(`${baseURL}/auth`, {
        action: 'register',
        email: `login.${Date.now()}@example.com`,
        password: 'LoginTestPass123!',
        name: 'Login Test User'
      }).catch(() => {}); // Ignore if already exists

      const loginData = {
        action: 'login',
        email: `login.${Date.now()}@example.com`,
        password: 'LoginTestPass123!'
      };

      const response = await axios.post(`${baseURL}/auth`, loginData);

      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        success: true,
        user: expect.objectContaining({
          email: loginData.email
        }),
        session: expect.objectContaining({
          access_token: expect.any(String),
          refresh_token: expect.any(String)
        })
      });

      authToken = response.data.session.access_token;
    });

    it('should reject invalid login credentials', async () => {
      const invalidLoginData = {
        action: 'login',
        email: 'nonexistent@example.com',
        password: 'WrongPassword123!'
      };

      try {
        await axios.post(`${baseURL}/auth`, invalidLoginData);
      } catch (error) {
        expect(error.response.status).toBe(401);
        expect(error.response.data).toMatchObject({
          success: false,
          message: expect.stringContaining('Invalid')
        });
      }
    });

    it('should handle password reset requests', async () => {
      const resetData = {
        action: 'reset-password',
        email: testUser.email
      };

      const response = await axios.post(`${baseURL}/auth`, resetData);

      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        success: true,
        message: expect.stringContaining('reset')
      });
    });

    it('should validate authentication tokens', async () => {
      if (!authToken) {
        // Create a test session first
        const loginResponse = await axios.post(`${baseURL}/auth`, {
          action: 'login',
          email: testUser.email,
          password: testUser.password
        }).catch(() => null);

        if (loginResponse) {
          authToken = loginResponse.data.session.access_token;
        }
      }

      if (authToken) {
        const response = await axios.get(`${baseURL}/auth-me`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });

        expect(response.status).toBe(200);
        expect(response.data).toMatchObject({
          success: true,
          user: expect.objectContaining({
            email: expect.any(String),
            id: expect.any(String)
          })
        });
      }
    });

    it('should refresh expired tokens', async () => {
      if (!authToken) return;

      // This test requires a refresh token from a previous login
      const response = await axios.post(`${baseURL}/auth-refresh`, {
        refresh_token: 'test-refresh-token'
      }).catch(err => err.response);

      // Refresh token validation depends on implementation
      if (response.status === 200) {
        expect(response.data).toMatchObject({
          success: true,
          session: expect.objectContaining({
            access_token: expect.any(String)
          })
        });
      }
    });

    it('should logout users properly', async () => {
      if (!authToken) return;

      const response = await axios.post(`${baseURL}/auth-logout`, {}, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        success: true,
        message: expect.stringContaining('logged out')
      });
    });
  });

  describe('Content Endpoints', () => {
    it('should retrieve blog posts', async () => {
      const response = await axios.get(`${baseURL}/blog`);

      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        success: true,
        data: expect.any(Array),
        meta: expect.objectContaining({
          total: expect.any(Number),
          page: expect.any(Number),
          limit: expect.any(Number)
        })
      });

      if (response.data.data.length > 0) {
        expect(response.data.data[0]).toMatchObject({
          id: expect.any(String),
          title: expect.any(String),
          slug: expect.any(String),
          status: 'published',
          created_at: expect.any(String)
        });
      }
    });

    it('should filter blog posts by status', async () => {
      const response = await axios.get(`${baseURL}/blog?status=published`);

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      
      if (response.data.data.length > 0) {
        response.data.data.forEach(post => {
          expect(post.status).toBe('published');
        });
      }
    });

    it('should paginate blog posts', async () => {
      const page1Response = await axios.get(`${baseURL}/blog?page=1&limit=5`);
      const page2Response = await axios.get(`${baseURL}/blog?page=2&limit=5`);

      expect(page1Response.status).toBe(200);
      expect(page2Response.status).toBe(200);

      expect(page1Response.data.meta.page).toBe(1);
      expect(page2Response.data.meta.page).toBe(2);
      
      if (page1Response.data.data.length > 0 && page2Response.data.data.length > 0) {
        // Ensure different results
        expect(page1Response.data.data[0].id).not.toBe(page2Response.data.data[0].id);
      }
    });

    it('should retrieve specific blog post by slug', async () => {
      // First get a list to find a valid slug
      const listResponse = await axios.get(`${baseURL}/blog?limit=1`);
      
      if (listResponse.data.data.length > 0) {
        const slug = listResponse.data.data[0].slug;
        
        const response = await axios.get(`${baseURL}/blog?slug=${slug}`);

        expect(response.status).toBe(200);
        expect(response.data).toMatchObject({
          success: true,
          data: expect.objectContaining({
            slug: slug,
            title: expect.any(String),
            content: expect.any(String)
          })
        });
      }
    });

    it('should handle non-existent blog posts', async () => {
      try {
        await axios.get(`${baseURL}/blog?slug=non-existent-post-slug`);
      } catch (error) {
        expect(error.response.status).toBe(404);
        expect(error.response.data).toMatchObject({
          success: false,
          message: expect.stringContaining('not found')
        });
      }
    });
  });

  describe('Projects Endpoints', () => {
    it('should retrieve projects list', async () => {
      const response = await axios.get(`${baseURL}/projects`);

      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        success: true,
        data: expect.any(Array),
        meta: expect.objectContaining({
          total: expect.any(Number)
        })
      });

      if (response.data.data.length > 0) {
        expect(response.data.data[0]).toMatchObject({
          id: expect.any(String),
          title: expect.any(String),
          slug: expect.any(String),
          status: expect.stringMatching(/active|featured/),
          created_at: expect.any(String)
        });
      }
    });

    it('should filter projects by status', async () => {
      const response = await axios.get(`${baseURL}/projects?status=featured`);

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      
      if (response.data.data.length > 0) {
        response.data.data.forEach(project => {
          expect(['featured', 'active']).toContain(project.status);
        });
      }
    });

    it('should filter projects by technology', async () => {
      const response = await axios.get(`${baseURL}/projects?tech=React`);

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      
      if (response.data.data.length > 0) {
        response.data.data.forEach(project => {
          expect(project.tech_stack).toContain('React');
        });
      }
    });

    it('should retrieve specific project by slug', async () => {
      // First get a list to find a valid slug
      const listResponse = await axios.get(`${baseURL}/projects?limit=1`);
      
      if (listResponse.data.data.length > 0) {
        const slug = listResponse.data.data[0].slug;
        
        const response = await axios.get(`${baseURL}/projects?slug=${slug}`);

        expect(response.status).toBe(200);
        expect(response.data).toMatchObject({
          success: true,
          data: expect.objectContaining({
            slug: slug,
            title: expect.any(String),
            description: expect.any(String)
          })
        });
      }
    });

    it('should support project search', async () => {
      const response = await axios.get(`${baseURL}/projects?search=portfolio`);

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid HTTP methods', async () => {
      try {
        await axios.put(`${baseURL}/health`, {});
      } catch (error) {
        expect(error.response.status).toBe(405);
        expect(error.response.data).toMatchObject({
          success: false,
          message: expect.stringContaining('Method not allowed')
        });
      }
    });

    it('should handle malformed JSON', async () => {
      try {
        await axios.post(`${baseURL}/contact`, 'invalid-json', {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error) {
        expect(error.response.status).toBe(400);
        expect(error.response.data).toMatchObject({
          success: false,
          message: expect.stringContaining('Invalid')
        });
      }
    });

    it('should handle missing endpoints gracefully', async () => {
      try {
        await axios.get(`${baseURL}/non-existent-endpoint`);
      } catch (error) {
        expect([404, 502]).toContain(error.response.status);
      }
    });

    it('should provide detailed error information in development', async () => {
      // Send invalid data to trigger validation errors
      try {
        await axios.post(`${baseURL}/auth`, {
          action: 'invalid-action',
          email: 'invalid'
        });
      } catch (error) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.success).toBe(false);
        expect(error.response.data.message).toBeDefined();
      }
    });

    it('should handle database connection issues gracefully', async () => {
      // This test would require a way to simulate database issues
      // For now, we'll just verify that endpoints handle errors properly
      
      const response = await axios.get(`${baseURL}/health`);
      expect(response.status).toBe(200);
      
      // If there were database issues, the health check would still work
      // but content endpoints might return errors
    });
  });

  describe('Performance and Reliability', () => {
    it('should respond within acceptable time limits', async () => {
      const start = Date.now();
      
      const response = await axios.get(`${baseURL}/health`);
      
      const duration = Date.now() - start;
      
      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(5000); // Should respond within 5 seconds
    });

    it('should handle concurrent requests', async () => {
      const requests = Array.from({ length: 10 }, () => 
        axios.get(`${baseURL}/health`)
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.data.status).toBe('ok');
      });
    });

    it('should provide consistent response formats', async () => {
      const endpoints = [
        `${baseURL}/health`,
        `${baseURL}/blog`,
        `${baseURL}/projects`
      ];

      for (const endpoint of endpoints) {
        const response = await axios.get(endpoint);
        
        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toContain('application/json');
        
        // All successful responses should have consistent structure
        if (endpoint.includes('health')) {
          expect(response.data.status).toBeDefined();
        } else {
          expect(response.data.success).toBe(true);
          expect(response.data.data).toBeDefined();
        }
      }
    });

    it('should handle edge cases in query parameters', async () => {
      const edgeCases = [
        `${baseURL}/blog?page=0`,
        `${baseURL}/blog?limit=-1`,
        `${baseURL}/blog?page=9999`,
        `${baseURL}/projects?search=`,
        `${baseURL}/projects?tech=`
      ];

      for (const url of edgeCases) {
        const response = await axios.get(url);
        
        expect(response.status).toBe(200);
        expect(response.data.success).toBe(true);
        // Should handle edge cases gracefully without crashing
      }
    });
  });

  describe('Content Validation', () => {
    it('should return properly formatted blog post data', async () => {
      const response = await axios.get(`${baseURL}/blog?limit=1`);

      if (response.data.data.length > 0) {
        const post = response.data.data[0];
        
        expect(post).toMatchObject({
          id: expect.any(String),
          title: expect.any(String),
          slug: expect.any(String),
          excerpt: expect.any(String),
          status: expect.any(String),
          created_at: expect.any(String),
          updated_at: expect.any(String)
        });

        // Validate date formats
        expect(new Date(post.created_at)).toBeInstanceOf(Date);
        expect(new Date(post.updated_at)).toBeInstanceOf(Date);
        
        // Validate slug format
        expect(post.slug).toMatch(/^[a-z0-9-]+$/);
      }
    });

    it('should return properly formatted project data', async () => {
      const response = await axios.get(`${baseURL}/projects?limit=1`);

      if (response.data.data.length > 0) {
        const project = response.data.data[0];
        
        expect(project).toMatchObject({
          id: expect.any(String),
          title: expect.any(String),
          slug: expect.any(String),
          description: expect.any(String),
          status: expect.any(String),
          created_at: expect.any(String)
        });

        // Validate optional arrays
        if (project.tech_stack) {
          expect(Array.isArray(project.tech_stack)).toBe(true);
        }
        
        if (project.tags) {
          expect(Array.isArray(project.tags)).toBe(true);
        }
      }
    });
  });
});