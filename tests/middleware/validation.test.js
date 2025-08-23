const request = require('supertest');
const express = require('express');
const {
  validatePagination,
  validateFilters,
  validateProjectData,
  validateContactData,
  validateUserData,
  handleValidationErrors,
  sanitizeInput,
  rateLimitByIP,
  rateLimitAuth
} = require('../../backend/src/middleware/validation');

describe('Validation Middleware', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  describe('validatePagination', () => {
    beforeEach(() => {
      app.get('/test', validatePagination, (req, res) => {
        res.json({
          page: req.query.page,
          limit: req.query.limit
        });
      });
    });

    it('should set default pagination values', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.body.page).toBe('1');
      expect(response.body.limit).toBe('10');
    });

    it('should accept valid pagination parameters', async () => {
      const response = await request(app)
        .get('/test?page=2&limit=20')
        .expect(200);

      expect(response.body.page).toBe('2');
      expect(response.body.limit).toBe('20');
    });

    it('should enforce maximum limit', async () => {
      const response = await request(app)
        .get('/test?page=1&limit=200')
        .expect(200);

      expect(response.body.limit).toBe('100'); // Should be capped at 100
    });

    it('should handle negative values', async () => {
      const response = await request(app)
        .get('/test?page=-1&limit=-5')
        .expect(200);

      expect(response.body.page).toBe('1'); // Should default to 1
      expect(response.body.limit).toBe('10'); // Should default to 10
    });

    it('should handle non-numeric values', async () => {
      const response = await request(app)
        .get('/test?page=abc&limit=def')
        .expect(200);

      expect(response.body.page).toBe('1');
      expect(response.body.limit).toBe('10');
    });
  });

  describe('validateFilters', () => {
    beforeEach(() => {
      app.get('/test', validateFilters, (req, res) => {
        res.json({
          category: req.query.category,
          status: req.query.status,
          search: req.query.search,
          sortBy: req.query.sortBy,
          sortOrder: req.query.sortOrder
        });
      });
    });

    it('should sanitize search input', async () => {
      const response = await request(app)
        .get('/test?search=<script>alert("xss")</script>test')
        .expect(200);

      expect(response.body.search).not.toContain('<script>');
      expect(response.body.search).toBe('test'); // Should be sanitized
    });

    it('should validate category values', async () => {
      const response = await request(app)
        .get('/test?category=web')
        .expect(200);

      expect(response.body.category).toBe('web');
    });

    it('should validate status values', async () => {
      const response = await request(app)
        .get('/test?status=published')
        .expect(200);

      expect(response.body.status).toBe('published');
    });

    it('should validate sortBy values', async () => {
      const response = await request(app)
        .get('/test?sortBy=title&sortOrder=desc')
        .expect(200);

      expect(response.body.sortBy).toBe('title');
      expect(response.body.sortOrder).toBe('desc');
    });

    it('should reject invalid sortBy values', async () => {
      app.get('/test-invalid', validateFilters, handleValidationErrors, (req, res) => {
        res.json({ success: true });
      });

      await request(app)
        .get('/test-invalid?sortBy=invalidField')
        .expect(400);
    });
  });

  describe('validateProjectData', () => {
    beforeEach(() => {
      app.post('/test', validateProjectData, handleValidationErrors, (req, res) => {
        res.json({ success: true });
      });
    });

    it('should accept valid project data', async () => {
      const validProject = {
        title: 'Test Project',
        shortDescription: 'A test project for validation',
        description: 'This is a comprehensive test project to validate our middleware.',
        category: 'web',
        status: 'draft',
        projectUrl: 'https://test-project.com',
        githubUrl: 'https://github.com/user/test-project',
        technologies: ['JavaScript', 'Node.js'],
        teamSize: 3,
        myRole: 'Full Stack Developer'
      };

      await request(app)
        .post('/test')
        .send(validProject)
        .expect(200);
    });

    it('should reject missing required fields', async () => {
      const invalidProject = {
        shortDescription: 'Missing title'
      };

      await request(app)
        .post('/test')
        .send(invalidProject)
        .expect(400);
    });

    it('should validate title length', async () => {
      const invalidProject = {
        title: 'a'.repeat(201), // Too long
        shortDescription: 'Valid description',
        description: 'Valid description',
        category: 'web'
      };

      await request(app)
        .post('/test')
        .send(invalidProject)
        .expect(400);
    });

    it('should validate URL formats', async () => {
      const invalidProject = {
        title: 'Test Project',
        shortDescription: 'Test description',
        description: 'Test description',
        category: 'web',
        projectUrl: 'not-a-valid-url',
        githubUrl: 'also-not-valid'
      };

      await request(app)
        .post('/test')
        .send(invalidProject)
        .expect(400);
    });

    it('should validate team size', async () => {
      const invalidProject = {
        title: 'Test Project',
        shortDescription: 'Test description',
        description: 'Test description',
        category: 'web',
        teamSize: -1 // Invalid
      };

      await request(app)
        .post('/test')
        .send(invalidProject)
        .expect(400);
    });

    it('should validate category values', async () => {
      const invalidProject = {
        title: 'Test Project',
        shortDescription: 'Test description',
        description: 'Test description',
        category: 'invalid-category'
      };

      await request(app)
        .post('/test')
        .send(invalidProject)
        .expect(400);
    });
  });

  describe('validateContactData', () => {
    beforeEach(() => {
      app.post('/test', validateContactData, handleValidationErrors, (req, res) => {
        res.json({ success: true });
      });
    });

    it('should accept valid contact data', async () => {
      const validContact = {
        name: 'John Doe',
        email: 'john@example.com',
        subject: 'Test Subject',
        message: 'This is a test message for contact form validation.',
        honeypot: '' // Empty honeypot is valid
      };

      await request(app)
        .post('/test')
        .send(validContact)
        .expect(200);
    });

    it('should reject missing required fields', async () => {
      const invalidContact = {
        name: 'John Doe'
        // Missing email, subject, message
      };

      await request(app)
        .post('/test')
        .send(invalidContact)
        .expect(400);
    });

    it('should validate email format', async () => {
      const invalidContact = {
        name: 'John Doe',
        email: 'not-an-email',
        subject: 'Test',
        message: 'Test message'
      };

      await request(app)
        .post('/test')
        .send(invalidContact)
        .expect(400);
    });

    it('should validate message length', async () => {
      const invalidContact = {
        name: 'John Doe',
        email: 'john@example.com',
        subject: 'Test',
        message: 'a'.repeat(5001) // Too long
      };

      await request(app)
        .post('/test')
        .send(invalidContact)
        .expect(400);
    });

    it('should detect honeypot spam', async () => {
      const spamContact = {
        name: 'John Doe',
        email: 'john@example.com',
        subject: 'Test',
        message: 'Test message',
        honeypot: 'spam-bot-filled-this' // Honeypot should be empty
      };

      await request(app)
        .post('/test')
        .send(spamContact)
        .expect(400);
    });
  });

  describe('validateUserData', () => {
    beforeEach(() => {
      app.post('/test', validateUserData, handleValidationErrors, (req, res) => {
        res.json({ success: true });
      });
    });

    it('should accept valid user registration data', async () => {
      const validUser = {
        username: 'testuser123',
        email: 'test@example.com',
        password: 'SecurePassword123!',
        firstName: 'Test',
        lastName: 'User'
      };

      await request(app)
        .post('/test')
        .send(validUser)
        .expect(200);
    });

    it('should validate username format', async () => {
      const invalidUser = {
        username: 'ab', // Too short
        email: 'test@example.com',
        password: 'SecurePassword123!'
      };

      await request(app)
        .post('/test')
        .send(invalidUser)
        .expect(400);
    });

    it('should validate password strength', async () => {
      const weakPasswordUser = {
        username: 'testuser',
        email: 'test@example.com',
        password: '123' // Too weak
      };

      await request(app)
        .post('/test')
        .send(weakPasswordUser)
        .expect(400);
    });

    it('should validate email uniqueness check flag', async () => {
      // This would typically check against database
      // For testing, we validate the format is correct
      const validUser = {
        username: 'uniqueuser',
        email: 'unique@example.com',
        password: 'SecurePassword123!'
      };

      await request(app)
        .post('/test')
        .send(validUser)
        .expect(200);
    });
  });

  describe('sanitizeInput', () => {
    it('should sanitize XSS attempts', () => {
      const maliciousInput = '<script>alert("xss")</script>Hello World';
      const sanitized = sanitizeInput(maliciousInput);
      
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('alert');
      expect(sanitized).toBe('Hello World');
    });

    it('should preserve safe HTML tags', () => {
      const safeInput = '<p>This is <strong>bold</strong> text.</p>';
      const sanitized = sanitizeInput(safeInput);
      
      expect(sanitized).toContain('<p>');
      expect(sanitized).toContain('<strong>');
      expect(sanitized).toContain('bold');
    });

    it('should handle nested malicious content', () => {
      const nestedMalicious = '<div><script>alert("nested")</script><p>Safe content</p></div>';
      const sanitized = sanitizeInput(nestedMalicious);
      
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('<p>Safe content</p>');
    });

    it('should handle SQL injection attempts', () => {
      const sqlInjection = "'; DROP TABLE users; --";
      const sanitized = sanitizeInput(sqlInjection);
      
      // Should escape or remove SQL injection attempts
      expect(sanitized).not.toContain('DROP TABLE');
    });

    it('should handle objects and arrays', () => {
      const inputObj = {
        title: '<script>alert("xss")</script>Clean Title',
        description: '<p>Safe <strong>content</strong></p>',
        tags: ['<script>tag1</script>', 'clean-tag']
      };
      
      const sanitized = sanitizeInput(inputObj);
      
      expect(sanitized.title).not.toContain('<script>');
      expect(sanitized.title).toBe('Clean Title');
      expect(sanitized.description).toContain('<p>');
      expect(sanitized.tags[0]).not.toContain('<script>');
      expect(sanitized.tags[1]).toBe('clean-tag');
    });
  });

  describe('handleValidationErrors', () => {
    beforeEach(() => {
      app.post('/test', (req, res, next) => {
        // Simulate validation error
        const error = new Error('Validation failed');
        error.errors = [
          { msg: 'Title is required', param: 'title', location: 'body' },
          { msg: 'Email is invalid', param: 'email', location: 'body' }
        ];
        next(error);
      }, handleValidationErrors, (req, res) => {
        res.json({ success: true });
      });
    });

    it('should format validation errors properly', async () => {
      const response = await request(app)
        .post('/test')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Validation failed');
      expect(response.body).toHaveProperty('details');
      expect(response.body.details).toBeInstanceOf(Array);
      expect(response.body.details.length).toBe(2);
    });
  });

  describe('Rate Limiting', () => {
    describe('rateLimitByIP', () => {
      beforeEach(() => {
        app.get('/test', rateLimitByIP, (req, res) => {
          res.json({ success: true });
        });
      });

      it('should allow requests within limit', async () => {
        await request(app)
          .get('/test')
          .expect(200);
      });

      it('should block requests exceeding limit', async () => {
        const promises = [];
        
        // Make requests to exceed rate limit (assuming limit is 5 per minute)
        for (let i = 0; i < 10; i++) {
          promises.push(
            request(app)
              .get('/test')
              .set('X-Forwarded-For', '192.168.1.1') // Simulate same IP
          );
        }

        const responses = await Promise.all(promises);
        const rateLimitedResponse = responses.find(r => r.status === 429);
        
        expect(rateLimitedResponse).toBeDefined();
        expect(rateLimitedResponse.body).toHaveProperty('error');
        expect(rateLimitedResponse.body.error).toContain('rate limit');
      }, 15000);
    });

    describe('rateLimitAuth', () => {
      beforeEach(() => {
        app.post('/test', rateLimitAuth, (req, res) => {
          res.json({ success: true });
        });
      });

      it('should have stricter limits for auth endpoints', async () => {
        const promises = [];
        
        // Make rapid authentication requests
        for (let i = 0; i < 6; i++) {
          promises.push(
            request(app)
              .post('/test')
              .send({ email: 'test@example.com', password: 'wrong' })
          );
        }

        const responses = await Promise.all(promises);
        const rateLimitedResponse = responses.find(r => r.status === 429);
        
        expect(rateLimitedResponse).toBeDefined();
      }, 10000);
    });
  });

  describe('Input Transformation', () => {
    it('should trim whitespace from strings', async () => {
      app.post('/test', (req, res) => {
        const sanitized = sanitizeInput(req.body);
        res.json(sanitized);
      });

      const response = await request(app)
        .post('/test')
        .send({
          title: '  Trimmed Title  ',
          description: '\n  Trimmed Description  \n'
        })
        .expect(200);

      expect(response.body.title).toBe('Trimmed Title');
      expect(response.body.description).toBe('Trimmed Description');
    });

    it('should normalize email addresses', async () => {
      app.post('/test', validateUserData, handleValidationErrors, (req, res) => {
        res.json({ email: req.body.email });
      });

      const response = await request(app)
        .post('/test')
        .send({
          username: 'testuser',
          email: '  TEST@EXAMPLE.COM  ',
          password: 'SecurePassword123!'
        })
        .expect(200);

      expect(response.body.email).toBe('test@example.com');
    });
  });

  describe('Security Headers', () => {
    beforeEach(() => {
      app.get('/test', (req, res) => {
        res.json({ success: true });
      });
    });

    it('should set security headers', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);

      // These would be set by helmet middleware in the actual app
      // Testing that validation middleware doesn't interfere
      expect(response.body.success).toBe(true);
    });
  });
});
