const request = require('supertest');
const app = require('../../backend/src/cms');
const { sequelize, Blog, User, Tag, BlogCategory } = require('../../backend/src/models');

describe('Blog API', () => {
  let authToken;
  let userId;
  let blogId;

  beforeAll(async () => {
    // Setup test database
    await sequelize.sync({ force: true });

    // Create test user
    const user = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'hashedpassword123',
      isActive: true
    });
    userId = user.id;

    // Create auth token (simplified for testing)
    authToken = 'Bearer test-token';

    // Create test category
    await BlogCategory.create({
      name: 'Technology',
      slug: 'technology',
      description: 'Tech posts'
    });

    // Create test tag
    await Tag.create({
      name: 'JavaScript',
      slug: 'javascript'
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('POST /api/cms/blogs', () => {
    it('should create a new blog post', async () => {
      const blogData = {
        title: 'Test Blog Post',
        markdown: '# Hello World\n\nThis is a test blog post.',
        excerpt: 'A test blog post',
        status: 'draft',
        metaTitle: 'Test Blog Meta Title',
        metaDescription: 'Test blog meta description',
        metaKeywords: ['test', 'blog'],
        categoryIds: [],
        tagIds: []
      };

      const response = await request(app)
        .post('/api/cms/blogs')
        .set('Authorization', authToken)
        .send(blogData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe(blogData.title);
      expect(response.body.slug).toBe('test-blog-post');
      expect(response.body.status).toBe('draft');
      expect(response.body.content).toContain('<h1 id="heading-hello-world">Hello World</h1>');

      blogId = response.body.id;
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/cms/blogs')
        .set('Authorization', authToken)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Validation failed');
    });

    it('should prevent duplicate slugs', async () => {
      const blogData = {
        title: 'Test Blog Post', // Same title as previous test
        markdown: '# Duplicate Title\n\nThis should fail.',
        excerpt: 'Duplicate test'
      };

      const response = await request(app)
        .post('/api/cms/blogs')
        .set('Authorization', authToken)
        .send(blogData)
        .expect(400);

      expect(response.body.error).toBe('A blog with this title already exists');
    });
  });

  describe('GET /api/cms/blogs', () => {
    beforeEach(async () => {
      // Create additional test blogs
      await Blog.bulkCreate([
        {
          title: 'Published Blog 1',
          slug: 'published-blog-1',
          content: '<p>Published content</p>',
          markdown: 'Published content',
          status: 'published',
          publishedAt: new Date(),
          language: 'en',
          authorId: userId
        },
        {
          title: 'Published Blog 2',
          slug: 'published-blog-2',
          content: '<p>Another published post</p>',
          markdown: 'Another published post',
          status: 'published',
          publishedAt: new Date(),
          language: 'en',
          authorId: userId
        }
      ]);
    });

    it('should return published blogs', async () => {
      const response = await request(app)
        .get('/api/cms/blogs')
        .expect(200);

      expect(response.body).toHaveProperty('blogs');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.blogs).toBeInstanceOf(Array);
      expect(response.body.blogs.length).toBeGreaterThan(0);
      
      // All returned blogs should be published
      response.body.blogs.forEach(blog => {
        expect(blog.status).toBe('published');
      });
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/cms/blogs?page=1&limit=1')
        .expect(200);

      expect(response.body.blogs).toHaveLength(1);
      expect(response.body.pagination.currentPage).toBe(1);
      expect(response.body.pagination.totalItems).toBeGreaterThan(1);
    });

    it('should support search functionality', async () => {
      const response = await request(app)
        .get('/api/cms/blogs?search=Published')
        .expect(200);

      expect(response.body.blogs.length).toBeGreaterThan(0);
      response.body.blogs.forEach(blog => {
        expect(blog.title.toLowerCase()).toContain('published');
      });
    });

    it('should filter by language', async () => {
      const response = await request(app)
        .get('/api/cms/blogs?language=en')
        .expect(200);

      response.body.blogs.forEach(blog => {
        expect(blog.language).toBe('en');
      });
    });
  });

  describe('GET /api/cms/blogs/:slug', () => {
    it('should return a specific blog by slug', async () => {
      const response = await request(app)
        .get('/api/cms/blogs/published-blog-1')
        .expect(200);

      expect(response.body.title).toBe('Published Blog 1');
      expect(response.body.slug).toBe('published-blog-1');
      expect(response.body).toHaveProperty('author');
      expect(response.body).toHaveProperty('tags');
      expect(response.body).toHaveProperty('categories');
    });

    it('should return 404 for non-existent blog', async () => {
      const response = await request(app)
        .get('/api/cms/blogs/non-existent-slug')
        .expect(404);

      expect(response.body.error).toBe('Blog not found');
    });

    it('should increment view count', async () => {
      // Get initial view count
      const initialResponse = await request(app)
        .get('/api/cms/blogs/published-blog-1')
        .expect(200);

      const initialViews = initialResponse.body.viewCount;

      // View again
      await request(app)
        .get('/api/cms/blogs/published-blog-1')
        .expect(200);

      // Check updated view count
      const updatedResponse = await request(app)
        .get('/api/cms/blogs/published-blog-1')
        .expect(200);

      expect(updatedResponse.body.viewCount).toBe(initialViews + 1);
    });
  });

  describe('PUT /api/cms/blogs/:id', () => {
    it('should update blog content', async () => {
      const updateData = {
        title: 'Updated Test Blog Post',
        markdown: '# Updated Content\n\nThis blog has been updated.',
        excerpt: 'Updated excerpt',
        changeNote: 'Updated content and title'
      };

      const response = await request(app)
        .put(`/api/cms/blogs/${blogId}`)
        .set('Authorization', authToken)
        .send(updateData)
        .expect(200);

      expect(response.body.blog.title).toBe(updateData.title);
      expect(response.body.blog.slug).toBe('updated-test-blog-post');
      expect(response.body.blog.content).toContain('Updated Content');
      expect(response.body.versionCreated).toBe(true);
    });

    it('should prevent unauthorized updates', async () => {
      const response = await request(app)
        .put(`/api/cms/blogs/${blogId}`)
        .send({ title: 'Unauthorized Update' })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 404 for non-existent blog', async () => {
      const response = await request(app)
        .put('/api/cms/blogs/00000000-0000-0000-0000-000000000000')
        .set('Authorization', authToken)
        .send({ title: 'Update' })
        .expect(404);

      expect(response.body.error).toBe('Blog not found');
    });
  });

  describe('DELETE /api/cms/blogs/:id', () => {
    it('should delete a blog', async () => {
      const response = await request(app)
        .delete(`/api/cms/blogs/${blogId}`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.message).toBe('Blog deleted successfully');

      // Verify deletion
      const blog = await Blog.findByPk(blogId);
      expect(blog).toBeNull();
    });

    it('should prevent unauthorized deletion', async () => {
      // Create another blog
      const blog = await Blog.create({
        title: 'Another Test Blog',
        slug: 'another-test-blog',
        content: '<p>Content</p>',
        markdown: 'Content',
        status: 'draft',
        language: 'en',
        authorId: userId
      });

      const response = await request(app)
        .delete(`/api/cms/blogs/${blog.id}`)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/cms/blogs/stats', () => {
    it('should return blog statistics', async () => {
      const response = await request(app)
        .get('/api/cms/blogs/stats')
        .expect(200);

      expect(response.body).toHaveProperty('statusCounts');
      expect(response.body).toHaveProperty('totalBlogs');
      expect(response.body).toHaveProperty('totalViews');
      expect(typeof response.body.totalBlogs).toBe('number');
      expect(typeof response.body.totalViews).toBe('number');
    });
  });

  describe('Blog Versions', () => {
    let versionTestBlogId;

    beforeEach(async () => {
      const blog = await Blog.create({
        title: 'Version Test Blog',
        slug: 'version-test-blog',
        content: '<p>Original content</p>',
        markdown: 'Original content',
        status: 'draft',
        language: 'en',
        authorId: userId
      });
      versionTestBlogId = blog.id;
    });

    it('should get blog versions', async () => {
      const response = await request(app)
        .get(`/api/cms/blogs/${versionTestBlogId}/versions`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('version');
      expect(response.body[0]).toHaveProperty('title');
      expect(response.body[0]).toHaveProperty('creator');
    });

    it('should restore blog version', async () => {
      // First, get the version ID
      const versionsResponse = await request(app)
        .get(`/api/cms/blogs/${versionTestBlogId}/versions`)
        .set('Authorization', authToken)
        .expect(200);

      const versionId = versionsResponse.body[0].id;

      const response = await request(app)
        .post(`/api/cms/blogs/${versionTestBlogId}/versions/${versionId}/restore`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.message).toBe('Version restored successfully');
    });
  });
});