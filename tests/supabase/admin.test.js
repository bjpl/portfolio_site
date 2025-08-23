const request = require('supertest');
const app = require('../../backend/src/cms');
const { sequelize, User, Blog, Project, MediaAsset, Comment } = require('../../backend/src/models');

describe('Admin API', () => {
  let adminToken;
  let adminUserId;

  beforeAll(async () => {
    // Setup test database
    await sequelize.sync({ force: true });

    // Create admin user with role
    const adminUser = await User.create({
      username: 'admin',
      email: 'admin@example.com',
      password: 'hashedpassword123',
      isActive: true
    });
    adminUserId = adminUser.id;

    // Create admin token (simplified for testing)
    adminToken = 'Bearer admin-token';

    // Create test data
    await Blog.create({
      title: 'Test Blog',
      slug: 'test-blog',
      content: '<p>Test content</p>',
      markdown: 'Test content',
      status: 'published',
      publishedAt: new Date(),
      language: 'en',
      authorId: adminUserId,
      viewCount: 100
    });

    await Project.create({
      title: 'Test Project',
      slug: 'test-project',
      description: 'Test project description',
      shortDescription: 'Test project',
      category: 'web',
      status: 'published',
      publishedAt: new Date(),
      authorId: adminUserId,
      viewCount: 50
    });

    await MediaAsset.create({
      filename: 'test.jpg',
      originalName: 'test.jpg',
      path: '/uploads/images/test.jpg',
      url: '/uploads/images/test.jpg',
      mimeType: 'image/jpeg',
      fileSize: 1024,
      category: 'image',
      uploaderId: adminUserId
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('GET /api/cms/admin/dashboard', () => {
    it('should return dashboard statistics', async () => {
      const response = await request(app)
        .get('/api/cms/admin/dashboard')
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body).toHaveProperty('content');
      expect(response.body).toHaveProperty('media');
      expect(response.body).toHaveProperty('users');
      expect(response.body).toHaveProperty('traffic');
      expect(response.body).toHaveProperty('recent');

      // Content stats
      expect(response.body.content).toHaveProperty('blogs');
      expect(response.body.content).toHaveProperty('projects');
      expect(response.body.content).toHaveProperty('comments');

      // Media stats
      expect(typeof response.body.media).toBe('object');

      // User stats
      expect(response.body.users).toHaveProperty('total');
      expect(response.body.users).toHaveProperty('active');
      expect(typeof response.body.users.total).toBe('number');

      // Traffic stats
      expect(response.body.traffic).toHaveProperty('totalBlogViews');
      expect(response.body.traffic).toHaveProperty('totalProjectViews');
      expect(response.body.traffic).toHaveProperty('totalViews');

      // Recent activity
      expect(response.body.recent).toHaveProperty('blogs');
      expect(response.body.recent).toHaveProperty('projects');
      expect(response.body.recent).toHaveProperty('comments');
    });

    it('should require admin authorization', async () => {
      const response = await request(app)
        .get('/api/cms/admin/dashboard')
        .set('Authorization', 'Bearer user-token')
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject requests without token', async () => {
      const response = await request(app)
        .get('/api/cms/admin/dashboard')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/cms/admin/pending', () => {
    beforeEach(async () => {
      // Create pending content
      await Comment.create({
        content: 'This is a pending comment',
        authorName: 'Test User',
        authorEmail: 'test@example.com',
        status: 'pending',
        ipAddress: '127.0.0.1',
        blogId: (await Blog.findOne()).id
      });

      await Blog.create({
        title: 'Draft Blog',
        slug: 'draft-blog',
        content: '<p>Draft content</p>',
        markdown: 'Draft content',
        status: 'draft',
        language: 'en',
        authorId: adminUserId
      });

      await Project.create({
        title: 'Draft Project',
        slug: 'draft-project',
        description: 'Draft project',
        shortDescription: 'Draft',
        category: 'web',
        status: 'draft',
        authorId: adminUserId
      });
    });

    it('should return pending content for moderation', async () => {
      const response = await request(app)
        .get('/api/cms/admin/pending')
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body).toHaveProperty('pendingComments');
      expect(response.body).toHaveProperty('draftBlogs');
      expect(response.body).toHaveProperty('draftProjects');

      expect(response.body.pendingComments).toBeInstanceOf(Array);
      expect(response.body.draftBlogs).toBeInstanceOf(Array);
      expect(response.body.draftProjects).toBeInstanceOf(Array);

      expect(response.body.pendingComments.length).toBeGreaterThan(0);
      expect(response.body.draftBlogs.length).toBeGreaterThan(0);
      expect(response.body.draftProjects.length).toBeGreaterThan(0);
    });
  });

  describe('PUT /api/cms/admin/comments/:id/moderate', () => {
    let commentId;

    beforeEach(async () => {
      const comment = await Comment.create({
        content: 'Comment to moderate',
        authorName: 'Test User',
        authorEmail: 'test@example.com',
        status: 'pending',
        ipAddress: '127.0.0.1',
        blogId: (await Blog.findOne()).id
      });
      commentId = comment.id;
    });

    it('should moderate comment status', async () => {
      const response = await request(app)
        .put(`/api/cms/admin/comments/${commentId}/moderate`)
        .set('Authorization', adminToken)
        .send({ 
          status: 'approved',
          reason: 'Comment looks legitimate'
        })
        .expect(200);

      expect(response.body.message).toBe('Comment moderation updated');
      expect(response.body.comment).toHaveProperty('id');

      // Verify status change
      const updatedComment = await Comment.findByPk(commentId);
      expect(updatedComment.status).toBe('approved');
    });

    it('should reject invalid status', async () => {
      const response = await request(app)
        .put(`/api/cms/admin/comments/${commentId}/moderate`)
        .set('Authorization', adminToken)
        .send({ status: 'invalid_status' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/cms/admin/comments/bulk-moderate', () => {
    let commentIds;

    beforeEach(async () => {
      const blogId = (await Blog.findOne()).id;
      
      const comments = await Comment.bulkCreate([
        {
          content: 'Comment 1',
          authorName: 'User 1',
          authorEmail: 'user1@example.com',
          status: 'pending',
          ipAddress: '127.0.0.1',
          blogId
        },
        {
          content: 'Comment 2',
          authorName: 'User 2',
          authorEmail: 'user2@example.com',
          status: 'pending',
          ipAddress: '127.0.0.1',
          blogId
        }
      ]);

      commentIds = comments.map(c => c.id);
    });

    it('should bulk moderate comments', async () => {
      const response = await request(app)
        .put('/api/cms/admin/comments/bulk-moderate')
        .set('Authorization', adminToken)
        .send({
          commentIds,
          status: 'approved',
          reason: 'Bulk approval'
        })
        .expect(200);

      expect(response.body.message).toContain('comments moderated successfully');

      // Verify all comments were updated
      const updatedComments = await Comment.findAll({
        where: { id: commentIds }
      });

      updatedComments.forEach(comment => {
        expect(comment.status).toBe('approved');
      });
    });

    it('should validate comment IDs array', async () => {
      const response = await request(app)
        .put('/api/cms/admin/comments/bulk-moderate')
        .set('Authorization', adminToken)
        .send({
          commentIds: [],
          status: 'approved'
        })
        .expect(400);

      expect(response.body.error).toBe('No comment IDs provided');
    });
  });

  describe('GET /api/cms/admin/users', () => {
    beforeEach(async () => {
      // Create additional test users
      await User.bulkCreate([
        {
          username: 'user1',
          email: 'user1@example.com',
          password: 'password123',
          isActive: true,
          firstName: 'John',
          lastName: 'Doe'
        },
        {
          username: 'user2',
          email: 'user2@example.com',
          password: 'password123',
          isActive: false,
          firstName: 'Jane',
          lastName: 'Smith'
        }
      ]);
    });

    it('should return paginated user list', async () => {
      const response = await request(app)
        .get('/api/cms/admin/users')
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body).toHaveProperty('users');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.users).toBeInstanceOf(Array);
      expect(response.body.users.length).toBeGreaterThan(0);

      // Check that password is excluded
      response.body.users.forEach(user => {
        expect(user).not.toHaveProperty('password');
        expect(user).not.toHaveProperty('twoFactorSecret');
      });
    });

    it('should support search functionality', async () => {
      const response = await request(app)
        .get('/api/cms/admin/users?search=John')
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.users.length).toBeGreaterThan(0);
      response.body.users.forEach(user => {
        const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
        expect(fullName).toContain('john');
      });
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/cms/admin/users?status=active')
        .set('Authorization', adminToken)
        .expect(200);

      response.body.users.forEach(user => {
        expect(user.isActive).toBe(true);
      });
    });
  });

  describe('PUT /api/cms/admin/users/:id/status', () => {
    let testUserId;

    beforeEach(async () => {
      const user = await User.create({
        username: 'statustest',
        email: 'statustest@example.com',
        password: 'password123',
        isActive: true
      });
      testUserId = user.id;
    });

    it('should update user status', async () => {
      const response = await request(app)
        .put(`/api/cms/admin/users/${testUserId}/status`)
        .set('Authorization', adminToken)
        .send({
          isActive: false,
          reason: 'Account suspended for policy violation'
        })
        .expect(200);

      expect(response.body.message).toBe('User status updated');

      // Verify status change
      const user = await User.findByPk(testUserId);
      expect(user.isActive).toBe(false);
    });

    it('should prevent self-deactivation', async () => {
      const response = await request(app)
        .put(`/api/cms/admin/users/${adminUserId}/status`)
        .set('Authorization', adminToken)
        .send({ isActive: false })
        .expect(400);

      expect(response.body.error).toBe('Cannot deactivate your own account');
    });
  });

  describe('GET /api/cms/admin/logs', () => {
    it('should return activity logs', async () => {
      const response = await request(app)
        .get('/api/cms/admin/logs')
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body).toHaveProperty('logs');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.logs).toBeInstanceOf(Array);
    });

    it('should support filtering by action', async () => {
      const response = await request(app)
        .get('/api/cms/admin/logs?action=user_status_change')
        .set('Authorization', adminToken)
        .expect(200);

      response.body.logs.forEach(log => {
        expect(log.action).toBe('user_status_change');
      });
    });

    it('should support date range filtering', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      const endDate = new Date();

      const response = await request(app)
        .get(`/api/cms/admin/logs?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.logs).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/cms/admin/health', () => {
    it('should return system health status', async () => {
      const response = await request(app)
        .get('/api/cms/admin/health')
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('checks');
      expect(response.body).toHaveProperty('metrics');
      expect(response.body).toHaveProperty('timestamp');

      expect(response.body.checks).toHaveProperty('database');
      expect(response.body.checks).toHaveProperty('storage');
      expect(response.body.checks).toHaveProperty('memory');

      expect(response.body.metrics).toHaveProperty('memoryUsage');
      expect(response.body.metrics).toHaveProperty('uptime');
      expect(response.body.metrics).toHaveProperty('nodeVersion');
    });
  });

  describe('GET /api/cms/admin/analytics', () => {
    it('should return analytics data', async () => {
      const response = await request(app)
        .get('/api/cms/admin/analytics')
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body).toHaveProperty('trends');
      expect(response.body).toHaveProperty('popular');
      expect(response.body).toHaveProperty('period');

      expect(response.body.trends).toHaveProperty('blogs');
      expect(response.body.trends).toHaveProperty('projects');

      expect(response.body.popular).toHaveProperty('blogs');
      expect(response.body.popular).toHaveProperty('projects');
    });

    it('should support different time periods', async () => {
      const response = await request(app)
        .get('/api/cms/admin/analytics?period=7d')
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.period).toBe('7d');
    });
  });
});