const request = require('supertest');
const app = require('../../backend/src/server');
const { sequelize, User, Project, Blog, Tag, MediaAsset } = require('../../backend/src/models');
const path = require('path');
const fs = require('fs');

/**
 * Integration tests that test complete API workflows
 * These tests simulate real user scenarios and API interactions
 */
describe('API Integration Flow Tests', () => {
  let testUser;
  let adminUser;
  let userAccessToken;
  let adminAccessToken;
  let userRefreshToken;
  let testProject;
  let testBlog;
  let testTag;
  let uploadedMediaId;

  beforeAll(async () => {
    // Setup test database
    await sequelize.sync({ force: true });

    // Create uploads directory for media tests
    const uploadsDir = path.join(process.cwd(), 'uploads', 'test');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
  });

  afterAll(async () => {
    // Clean up test files
    try {
      const testFiles = await MediaAsset.findAll();
      for (const file of testFiles) {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      }
    } catch (error) {
      console.log('Cleanup error:', error.message);
    }

    await sequelize.close();
  });

  describe('Complete User Registration and Authentication Flow', () => {
    it('should handle complete user registration workflow', async () => {
      // Step 1: Register new user
      const userData = {
        username: 'integrationuser',
        email: 'integration@example.com',
        password: 'SecurePassword123!',
        firstName: 'Integration',
        lastName: 'User'
      };

      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      expect(registerResponse.body).toHaveProperty('user');
      expect(registerResponse.body.user.email).toBe(userData.email);
      expect(registerResponse.body.message).toContain('verification email');

      testUser = registerResponse.body.user;

      // Step 2: Simulate email verification (in real app, user clicks email link)
      await User.update(
        { isVerified: true },
        { where: { id: testUser.id } }
      );

      // Step 3: Login with verified account
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        })
        .expect(200);

      expect(loginResponse.body).toHaveProperty('accessToken');
      expect(loginResponse.body).toHaveProperty('refreshToken');
      expect(loginResponse.body).toHaveProperty('user');

      userAccessToken = loginResponse.body.accessToken;
      userRefreshToken = loginResponse.body.refreshToken;

      // Step 4: Access protected endpoint
      const profileResponse = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .expect(200);

      expect(profileResponse.body.email).toBe(userData.email);
    });

    it('should handle token refresh workflow', async () => {
      // Wait a bit to ensure token timestamps differ
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 1: Refresh token
      const refreshResponse = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: userRefreshToken })
        .expect(200);

      expect(refreshResponse.body).toHaveProperty('accessToken');
      expect(refreshResponse.body).toHaveProperty('refreshToken');

      const newAccessToken = refreshResponse.body.accessToken;
      const newRefreshToken = refreshResponse.body.refreshToken;

      // Step 2: Use new access token
      const profileResponse = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${newAccessToken}`)
        .expect(200);

      expect(profileResponse.body.email).toBe('integration@example.com');

      // Step 3: Old refresh token should not work
      await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: userRefreshToken })
        .expect(401);

      userAccessToken = newAccessToken;
      userRefreshToken = newRefreshToken;
    });
  });

  describe('Admin User Setup and Permissions', () => {
    it('should create admin user and test elevated permissions', async () => {
      // Create admin user directly (simulating admin creation)
      const adminData = {
        username: 'adminuser',
        email: 'admin@example.com',
        password: 'AdminPassword123!',
        role: 'admin',
        isActive: true,
        isVerified: true
      };

      const hashedPassword = await require('bcryptjs').hash(adminData.password, 12);
      adminUser = await User.create({
        ...adminData,
        password: hashedPassword
      });

      // Login as admin
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: adminData.email,
          password: adminData.password
        })
        .expect(200);

      adminAccessToken = loginResponse.body.accessToken;

      // Test admin-only endpoint
      const adminResponse = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(adminResponse.body).toHaveProperty('users');
      expect(adminResponse.body.users.length).toBeGreaterThan(0);
    });
  });

  describe('Complete Content Management Workflow', () => {
    it('should handle complete project creation and management', async () => {
      // Step 1: Create tags first
      const tagResponse = await request(app)
        .post('/api/v1/admin/tags')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          name: 'Integration Testing',
          description: 'Tag for integration test projects'
        })
        .expect(201);

      testTag = tagResponse.body;

      // Step 2: Create a new project
      const projectData = {
        title: 'Integration Test Project',
        shortDescription: 'A project created during integration testing',
        description: 'This project demonstrates the complete API workflow for project management.',
        category: 'web',
        status: 'draft',
        projectUrl: 'https://integration-project.com',
        githubUrl: 'https://github.com/user/integration-project',
        demoUrl: 'https://demo.integration-project.com',
        technologies: ['Node.js', 'Express', 'Jest'],
        teamSize: 2,
        myRole: 'Full Stack Developer',
        challenges: 'Testing complex API workflows',
        solutions: 'Comprehensive integration test suite',
        outcomes: 'Robust API with full test coverage',
        tagIds: [testTag.id]
      };

      const createResponse = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send(projectData)
        .expect(201);

      expect(createResponse.body).toHaveProperty('id');
      expect(createResponse.body.title).toBe(projectData.title);
      expect(createResponse.body.slug).toBe('integration-test-project');
      expect(createResponse.body.status).toBe('draft');

      testProject = createResponse.body;

      // Step 3: Update project to published
      const updateResponse = await request(app)
        .put(`/api/v1/projects/${testProject.id}`)
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send({
          status: 'published',
          visibility: 'public',
          isFeatured: true
        })
        .expect(200);

      expect(updateResponse.body.status).toBe('published');
      expect(updateResponse.body.isFeatured).toBe(true);

      // Step 4: Verify project appears in public listings
      const listResponse = await request(app)
        .get('/api/v1/projects')
        .expect(200);

      const foundProject = listResponse.body.projects.find(p => p.id === testProject.id);
      expect(foundProject).toBeDefined();
      expect(foundProject.status).toBe('published');

      // Step 5: Check featured projects endpoint
      const featuredResponse = await request(app)
        .get('/api/v1/projects/featured')
        .expect(200);

      const featuredProject = featuredResponse.body.find(p => p.id === testProject.id);
      expect(featuredProject).toBeDefined();
      expect(featuredProject.isFeatured).toBe(true);
    });

    it('should handle blog creation and Hugo integration', async () => {
      // Create blog post via API
      const blogData = {
        title: 'Integration Test Blog Post',
        markdown: '# Integration Testing\n\nThis blog post was created during integration testing.\n\n## Features Tested\n\n- Blog creation\n- Markdown processing\n- SEO metadata\n- Category assignment',
        excerpt: 'A blog post created during integration testing',
        status: 'published',
        metaTitle: 'Integration Test Blog - SEO Title',
        metaDescription: 'This blog post demonstrates API integration testing',
        metaKeywords: ['integration', 'testing', 'api', 'blog'],
        language: 'en',
        commentsEnabled: true
      };

      const createResponse = await request(app)
        .post('/api/v1/blogs')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send(blogData)
        .expect(201);

      expect(createResponse.body).toHaveProperty('id');
      expect(createResponse.body.title).toBe(blogData.title);
      expect(createResponse.body.slug).toBe('integration-test-blog-post');
      expect(createResponse.body.content).toContain('<h1');
      expect(createResponse.body.content).toContain('Integration Testing');

      testBlog = createResponse.body;

      // Verify blog appears in public listings
      const listResponse = await request(app)
        .get('/api/v1/blogs')
        .expect(200);

      const foundBlog = listResponse.body.blogs.find(b => b.id === testBlog.id);
      expect(foundBlog).toBeDefined();
      expect(foundBlog.status).toBe('published');

      // Get individual blog post
      const getResponse = await request(app)
        .get(`/api/v1/blogs/${testBlog.slug}`)
        .expect(200);

      expect(getResponse.body.title).toBe(blogData.title);
      expect(getResponse.body.viewCount).toBeGreaterThan(0);
    });
  });

  describe('Media Upload and Management Workflow', () => {
    it('should handle complete media upload workflow', async () => {
      // Create test image buffer
      const testImageBuffer = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
        0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
        0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
        0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
        0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
        0x42, 0x60, 0x82
      ]);

      // Step 1: Upload image
      const uploadResponse = await request(app)
        .post('/api/v1/media/upload')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .attach('file', testImageBuffer, 'integration-test.png')
        .field('altText', 'Integration test image')
        .field('caption', 'An image uploaded during integration testing')
        .field('tags', JSON.stringify(['integration', 'testing']))
        .expect(201);

      expect(uploadResponse.body).toHaveProperty('id');
      expect(uploadResponse.body.originalName).toBe('integration-test.png');
      expect(uploadResponse.body.mimeType).toBe('image/png');
      expect(uploadResponse.body.category).toBe('image');

      uploadedMediaId = uploadResponse.body.id;

      // Step 2: Verify media appears in listings
      const listResponse = await request(app)
        .get('/api/v1/media')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .expect(200);

      const foundMedia = listResponse.body.media.find(m => m.id === uploadedMediaId);
      expect(foundMedia).toBeDefined();

      // Step 3: Update media metadata
      const updateResponse = await request(app)
        .put(`/api/v1/media/${uploadedMediaId}`)
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send({
          altText: 'Updated alt text for integration test',
          caption: 'Updated caption during integration testing',
          tags: ['updated', 'integration', 'api-test']
        })
        .expect(200);

      expect(updateResponse.body.altText).toBe('Updated alt text for integration test');
      expect(updateResponse.body.tags).toEqual(['updated', 'integration', 'api-test']);

      // Step 4: Associate media with project
      await request(app)
        .put(`/api/v1/projects/${testProject.id}`)
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send({
          featuredImage: uploadResponse.body.url,
          mediaIds: [uploadedMediaId]
        })
        .expect(200);
    });

    it('should handle multiple file uploads', async () => {
      const testImage1 = Buffer.from('test image 1 content');
      const testImage2 = Buffer.from('test image 2 content');

      const uploadResponse = await request(app)
        .post('/api/v1/media/upload/multiple')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .attach('files', testImage1, 'test1.txt')
        .attach('files', testImage2, 'test2.txt')
        .expect(201);

      expect(uploadResponse.body).toBeInstanceOf(Array);
      expect(uploadResponse.body.length).toBe(2);
    });
  });

  describe('Contact Form and Communication Workflow', () => {
    it('should handle contact form submission with spam detection', async () => {
      // Step 1: Valid contact form submission
      const validContact = {
        name: 'Integration Tester',
        email: 'tester@example.com',
        subject: 'Integration Test Contact',
        message: 'This is a test message sent during integration testing. It contains legitimate content and should pass spam detection.',
        honeypot: '' // Empty honeypot
      };

      const validResponse = await request(app)
        .post('/api/v1/contact')
        .send(validContact)
        .expect(200);

      expect(validResponse.body.message).toContain('successfully sent');
      expect(validResponse.body).toHaveProperty('messageId');

      // Step 2: Spam detection test
      const spamContact = {
        name: 'Spam Bot',
        email: 'spam@spam.com',
        subject: 'URGENT: You won the lottery! Click here for viagra casino deals!',
        message: 'This message contains multiple spam keywords like casino, lottery, viagra, and urgent offers.',
        honeypot: '' // Empty honeypot but content is spammy
      };

      const spamResponse = await request(app)
        .post('/api/v1/contact')
        .send(spamContact)
        .expect(400);

      expect(spamResponse.body.error).toContain('spam');

      // Step 3: Honeypot detection
      const honeypotSpam = {
        name: 'Bot Name',
        email: 'bot@example.com',
        subject: 'Bot Message',
        message: 'This is a bot message.',
        honeypot: 'bot-filled-this-field' // Honeypot trap
      };

      const honeypotResponse = await request(app)
        .post('/api/v1/contact')
        .send(honeypotSpam)
        .expect(400);

      expect(honeypotResponse.body.error).toContain('spam');
    });
  });

  describe('Search and Filtering Workflow', () => {
    it('should handle complex search and filtering across content types', async () => {
      // Step 1: Search projects
      const projectSearch = await request(app)
        .get('/api/v1/projects?search=integration&category=web')
        .expect(200);

      expect(projectSearch.body.projects.length).toBeGreaterThan(0);
      projectSearch.body.projects.forEach(project => {
        expect(project.category).toBe('web');
        const searchText = `${project.title} ${project.shortDescription}`.toLowerCase();
        expect(searchText).toContain('integration');
      });

      // Step 2: Search blogs
      const blogSearch = await request(app)
        .get('/api/v1/blogs?search=integration&language=en')
        .expect(200);

      blogSearch.body.blogs.forEach(blog => {
        expect(blog.language).toBe('en');
        const searchText = `${blog.title} ${blog.excerpt}`.toLowerCase();
        expect(searchText).toContain('integration');
      });

      // Step 3: Filter media
      const mediaSearch = await request(app)
        .get('/api/v1/media?category=image&search=integration')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .expect(200);

      mediaSearch.body.media.forEach(media => {
        expect(media.category).toBe('image');
      });

      // Step 4: Test pagination
      const paginatedSearch = await request(app)
        .get('/api/v1/projects?page=1&limit=1&sortBy=title&sortOrder=desc')
        .expect(200);

      expect(paginatedSearch.body.projects.length).toBe(1);
      expect(paginatedSearch.body.pagination.currentPage).toBe(1);
      expect(paginatedSearch.body.pagination.limit).toBe(1);
    });
  });

  describe('GraphQL Integration Workflow', () => {
    it('should handle complex GraphQL queries with relationships', async () => {
      const complexQuery = `
        query IntegrationTest {
          projects(first: 10) {
            id
            title
            slug
            category
            isFeatured
            author {
              id
              username
              projects {
                id
                title
              }
            }
            tags {
              id
              name
              slug
            }
          }
          
          blogs(first: 5) {
            id
            title
            slug
            excerpt
            status
            author {
              id
              username
            }
          }
          
          me {
            id
            username
            email
            role
          }
        }
      `;

      const response = await request(app)
        .post('/api/v1/graphql')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send({ query: complexQuery })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('projects');
      expect(response.body.data).toHaveProperty('blogs');
      expect(response.body.data).toHaveProperty('me');
      expect(response.body.data.me.username).toBe('integrationuser');
    });

    it('should handle GraphQL mutations', async () => {
      const mutation = `
        mutation CreateTestProject($input: ProjectInput!) {
          createProject(input: $input) {
            id
            title
            slug
            status
            author {
              username
            }
          }
        }
      `;

      const variables = {
        input: {
          title: 'GraphQL Integration Project',
          shortDescription: 'Created via GraphQL mutation',
          description: 'This project was created using GraphQL during integration testing.',
          category: 'api',
          status: 'draft'
        }
      };

      const response = await request(app)
        .post('/api/v1/graphql')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send({ query: mutation, variables })
        .expect(200);

      expect(response.body.data).toHaveProperty('createProject');
      expect(response.body.data.createProject.title).toBe('GraphQL Integration Project');
      expect(response.body.data.createProject.author.username).toBe('integrationuser');
    });
  });

  describe('Analytics and Statistics Workflow', () => {
    it('should track and report analytics correctly', async () => {
      // Step 1: Generate some activity
      await request(app)
        .get(`/api/v1/projects/${testProject.slug}`)
        .expect(200);

      await request(app)
        .get(`/api/v1/blogs/${testBlog.slug}`)
        .expect(200);

      // Step 2: Check project statistics
      const projectStats = await request(app)
        .get('/api/v1/projects/stats')
        .expect(200);

      expect(projectStats.body).toHaveProperty('totalProjects');
      expect(projectStats.body).toHaveProperty('statusCounts');
      expect(projectStats.body).toHaveProperty('categoryCounts');
      expect(projectStats.body.totalProjects).toBeGreaterThan(0);

      // Step 3: Check blog statistics
      const blogStats = await request(app)
        .get('/api/v1/blogs/stats')
        .expect(200);

      expect(blogStats.body).toHaveProperty('statusCounts');
      expect(blogStats.body).toHaveProperty('totalBlogs');
      expect(blogStats.body).toHaveProperty('totalViews');

      // Step 4: Check media statistics
      const mediaStats = await request(app)
        .get('/api/v1/media/stats')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .expect(200);

      expect(mediaStats.body).toHaveProperty('categoryCounts');
      expect(mediaStats.body).toHaveProperty('totalAssets');
      expect(mediaStats.body).toHaveProperty('totalSize');

      // Step 5: Admin analytics
      const adminAnalytics = await request(app)
        .get('/api/v1/admin/analytics?period=7d')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(adminAnalytics.body).toHaveProperty('summary');
      expect(adminAnalytics.body).toHaveProperty('trends');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle rate limiting gracefully', async () => {
      const promises = [];
      
      // Make rapid requests to trigger rate limiting
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app)
            .post('/api/v1/auth/login')
            .send({
              email: 'nonexistent@example.com',
              password: 'wrongpassword'
            })
        );
      }

      const responses = await Promise.all(promises);
      const rateLimitedResponse = responses.find(r => r.status === 429);
      
      if (rateLimitedResponse) {
        expect(rateLimitedResponse.body).toHaveProperty('error');
        expect(rateLimitedResponse.body.error).toContain('rate limit');
      }
    }, 15000);

    it('should handle invalid data gracefully', async () => {
      // Test malformed JSON
      await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);

      // Test SQL injection attempts
      await request(app)
        .get("/api/v1/projects?search='; DROP TABLE projects; --")
        .expect(200); // Should not crash, just return no results

      // Test XSS attempts
      const xssResponse = await request(app)
        .post('/api/v1/contact')
        .send({
          name: '<script>alert("xss")</script>',
          email: 'test@example.com',
          subject: 'Test',
          message: '<script>alert("xss")</script>',
          honeypot: ''
        })
        .expect(200);

      // Should sanitize the input
      expect(JSON.stringify(xssResponse.body)).not.toContain('<script>');
    });

    it('should handle concurrent operations safely', async () => {
      const promises = [];
      
      // Simulate concurrent project updates
      for (let i = 0; i < 5; i++) {
        promises.push(
          request(app)
            .put(`/api/v1/projects/${testProject.id}`)
            .set('Authorization', `Bearer ${userAccessToken}`)
            .send({
              shortDescription: `Updated description ${i}`,
              viewCount: i
            })
        );
      }

      const responses = await Promise.all(promises);
      
      // All should succeed or handle conflicts gracefully
      responses.forEach(response => {
        expect([200, 409]).toContain(response.status);
      });
    });
  });

  describe('Cleanup and Resource Management', () => {
    it('should handle user logout and token invalidation', async () => {
      // Logout user
      await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send({ refreshToken: userRefreshToken })
        .expect(200);

      // Token should no longer work
      await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .expect(401);

      // Refresh token should no longer work
      await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: userRefreshToken })
        .expect(401);
    });

    it('should clean up resources on deletion', async () => {
      // Delete uploaded media
      await request(app)
        .delete(`/api/v1/media/${uploadedMediaId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      // Verify media is gone
      await request(app)
        .get(`/api/v1/media/${uploadedMediaId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(404);

      // Delete project
      await request(app)
        .delete(`/api/v1/projects/${testProject.id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      // Verify project is gone from public listings
      const listResponse = await request(app)
        .get('/api/v1/projects')
        .expect(200);

      const foundProject = listResponse.body.projects.find(p => p.id === testProject.id);
      expect(foundProject).toBeUndefined();
    });
  });
});
