const request = require('supertest');
const app = require('../../backend/src/server');
const { sequelize, Project, User, Tag, ProjectTag } = require('../../backend/src/models');
const jwt = require('jsonwebtoken');

describe('Projects API', () => {
  let testUser;
  let adminUser;
  let authToken;
  let adminToken;
  let testProject;
  let testTag;

  beforeAll(async () => {
    // Setup test database
    await sequelize.sync({ force: true });

    // Create test users
    testUser = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'hashedpassword123',
      role: 'user',
      isActive: true
    });

    adminUser = await User.create({
      username: 'admin',
      email: 'admin@example.com',
      password: 'hashedpassword123',
      role: 'admin',
      isActive: true
    });

    // Create auth tokens
    authToken = jwt.sign(
      { id: testUser.id, username: testUser.username, role: testUser.role },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    adminToken = jwt.sign(
      { id: adminUser.id, username: adminUser.username, role: adminUser.role },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Create test tag
    testTag = await Tag.create({
      name: 'JavaScript',
      slug: 'javascript'
    });

    // Create test project
    testProject = await Project.create({
      title: 'Test Project',
      slug: 'test-project',
      shortDescription: 'A test project for API testing',
      description: 'This is a comprehensive test project used for API endpoint testing.',
      category: 'web',
      status: 'published',
      visibility: 'public',
      isFeatured: false,
      projectUrl: 'https://test-project.com',
      githubUrl: 'https://github.com/user/test-project',
      demoUrl: 'https://demo.test-project.com',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-02-01'),
      teamSize: 2,
      myRole: 'Full Stack Developer',
      technologies: ['JavaScript', 'Node.js', 'React'],
      challenges: 'Testing API endpoints thoroughly',
      solutions: 'Comprehensive test suite implementation',
      outcomes: 'Robust API with full test coverage',
      authorId: testUser.id
    });

    // Associate project with tag
    await ProjectTag.create({
      projectId: testProject.id,
      tagId: testTag.id
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('GET /api/v1/projects', () => {
    beforeEach(async () => {
      // Create additional test projects for pagination/filtering tests
      await Project.bulkCreate([
        {
          title: 'Featured Project',
          slug: 'featured-project',
          shortDescription: 'A featured project',
          description: 'This project is featured on the homepage',
          category: 'mobile',
          status: 'published',
          visibility: 'public',
          isFeatured: true,
          authorId: testUser.id
        },
        {
          title: 'Draft Project',
          slug: 'draft-project',
          shortDescription: 'A draft project',
          description: 'This project is still in draft',
          category: 'web',
          status: 'draft',
          visibility: 'private',
          isFeatured: false,
          authorId: testUser.id
        }
      ]);
    });

    it('should return published projects', async () => {
      const response = await request(app)
        .get('/api/v1/projects')
        .expect(200);

      expect(response.body).toHaveProperty('projects');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.projects).toBeInstanceOf(Array);
      expect(response.body.projects.length).toBeGreaterThan(0);
      
      // All returned projects should be published
      response.body.projects.forEach(project => {
        expect(project.status).toBe('published');
        expect(project.visibility).toBe('public');
      });
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/v1/projects?page=1&limit=1')
        .expect(200);

      expect(response.body.projects).toHaveLength(1);
      expect(response.body.pagination.currentPage).toBe(1);
      expect(response.body.pagination.limit).toBe(1);
      expect(response.body.pagination.totalItems).toBeGreaterThan(1);
    });

    it('should filter by category', async () => {
      const response = await request(app)
        .get('/api/v1/projects?category=web')
        .expect(200);

      response.body.projects.forEach(project => {
        expect(project.category).toBe('web');
      });
    });

    it('should filter by featured status', async () => {
      const response = await request(app)
        .get('/api/v1/projects?featured=true')
        .expect(200);

      response.body.projects.forEach(project => {
        expect(project.isFeatured).toBe(true);
      });
    });

    it('should search projects', async () => {
      const response = await request(app)
        .get('/api/v1/projects?search=test')
        .expect(200);

      expect(response.body.projects.length).toBeGreaterThan(0);
      response.body.projects.forEach(project => {
        const searchText = `${project.title} ${project.shortDescription} ${project.description}`.toLowerCase();
        expect(searchText).toContain('test');
      });
    });

    it('should sort projects', async () => {
      const response = await request(app)
        .get('/api/v1/projects?sortBy=title&sortOrder=desc')
        .expect(200);

      expect(response.body.projects.length).toBeGreaterThan(1);
      
      for (let i = 0; i < response.body.projects.length - 1; i++) {
        expect(response.body.projects[i].title >= response.body.projects[i + 1].title).toBe(true);
      }
    });

    it('should include project statistics', async () => {
      const response = await request(app)
        .get('/api/v1/projects?includeStats=true')
        .expect(200);

      expect(response.body).toHaveProperty('stats');
      expect(response.body.stats).toHaveProperty('totalProjects');
      expect(response.body.stats).toHaveProperty('featuredCount');
      expect(response.body.stats).toHaveProperty('categoryCounts');
    });
  });

  describe('GET /api/v1/projects/:slug', () => {
    it('should return a specific project', async () => {
      const response = await request(app)
        .get('/api/v1/projects/test-project')
        .expect(200);

      expect(response.body.id).toBe(testProject.id);
      expect(response.body.title).toBe('Test Project');
      expect(response.body.slug).toBe('test-project');
      expect(response.body).toHaveProperty('author');
      expect(response.body).toHaveProperty('tags');
      expect(response.body.tags).toHaveLength(1);
      expect(response.body.tags[0].name).toBe('JavaScript');
    });

    it('should return 404 for non-existent project', async () => {
      const response = await request(app)
        .get('/api/v1/projects/non-existent-project')
        .expect(404);

      expect(response.body.error).toBe('Project not found');
    });

    it('should increment view count', async () => {
      const initialResponse = await request(app)
        .get('/api/v1/projects/test-project')
        .expect(200);

      const initialViews = initialResponse.body.viewCount || 0;

      await request(app)
        .get('/api/v1/projects/test-project')
        .expect(200);

      const updatedResponse = await request(app)
        .get('/api/v1/projects/test-project')
        .expect(200);

      expect(updatedResponse.body.viewCount).toBe(initialViews + 1);
    });

    it('should not show private projects to unauthorized users', async () => {
      const privateProject = await Project.create({
        title: 'Private Project',
        slug: 'private-project',
        shortDescription: 'A private project',
        description: 'This is a private project',
        category: 'web',
        status: 'published',
        visibility: 'private',
        authorId: testUser.id
      });

      await request(app)
        .get('/api/v1/projects/private-project')
        .expect(404);
    });
  });

  describe('POST /api/v1/projects', () => {
    it('should create a new project', async () => {
      const projectData = {
        title: 'New Test Project',
        shortDescription: 'A new project for testing',
        description: 'This is a comprehensive new project for testing API creation',
        category: 'web',
        status: 'draft',
        projectUrl: 'https://new-project.com',
        githubUrl: 'https://github.com/user/new-project',
        technologies: ['Vue.js', 'Python', 'PostgreSQL'],
        teamSize: 3,
        myRole: 'Lead Developer'
      };

      const response = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(projectData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe(projectData.title);
      expect(response.body.slug).toBe('new-test-project');
      expect(response.body.status).toBe('draft');
      expect(response.body.authorId).toBe(testUser.id);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/v1/projects')
        .send({ title: 'Unauthorized Project' })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Validation failed');
    });

    it('should prevent duplicate slugs', async () => {
      const response = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Project', // Same title as existing project
          shortDescription: 'Duplicate test',
          description: 'This should fail',
          category: 'web'
        })
        .expect(400);

      expect(response.body.error).toBe('A project with this title already exists');
    });
  });

  describe('PUT /api/v1/projects/:id', () => {
    it('should update project', async () => {
      const updateData = {
        title: 'Updated Test Project',
        shortDescription: 'Updated description',
        isFeatured: true
      };

      const response = await request(app)
        .put(`/api/v1/projects/${testProject.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.title).toBe(updateData.title);
      expect(response.body.shortDescription).toBe(updateData.shortDescription);
      expect(response.body.isFeatured).toBe(true);
    });

    it('should require authentication', async () => {
      await request(app)
        .put(`/api/v1/projects/${testProject.id}`)
        .send({ title: 'Unauthorized Update' })
        .expect(401);
    });

    it('should prevent unauthorized updates', async () => {
      const otherUser = await User.create({
        username: 'otheruser',
        email: 'other@example.com',
        password: 'hashedpassword123',
        role: 'user',
        isActive: true
      });

      const otherToken = jwt.sign(
        { id: otherUser.id, username: otherUser.username, role: otherUser.role },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      await request(app)
        .put(`/api/v1/projects/${testProject.id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ title: 'Unauthorized Update' })
        .expect(403);
    });

    it('should allow admin to update any project', async () => {
      const response = await request(app)
        .put(`/api/v1/projects/${testProject.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Admin Updated Project' })
        .expect(200);

      expect(response.body.title).toBe('Admin Updated Project');
    });
  });

  describe('DELETE /api/v1/projects/:id', () => {
    let projectToDelete;

    beforeEach(async () => {
      projectToDelete = await Project.create({
        title: 'Project to Delete',
        slug: 'project-to-delete',
        shortDescription: 'This project will be deleted',
        description: 'Test deletion functionality',
        category: 'web',
        status: 'draft',
        authorId: testUser.id
      });
    });

    it('should delete project', async () => {
      const response = await request(app)
        .delete(`/api/v1/projects/${projectToDelete.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.message).toBe('Project deleted successfully');

      // Verify deletion
      const deletedProject = await Project.findByPk(projectToDelete.id);
      expect(deletedProject).toBeNull();
    });

    it('should require authentication', async () => {
      await request(app)
        .delete(`/api/v1/projects/${projectToDelete.id}`)
        .expect(401);
    });

    it('should prevent unauthorized deletion', async () => {
      const otherUser = await User.create({
        username: 'deleteuser',
        email: 'delete@example.com',
        password: 'hashedpassword123',
        role: 'user',
        isActive: true
      });

      const otherToken = jwt.sign(
        { id: otherUser.id, username: otherUser.username, role: otherUser.role },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      await request(app)
        .delete(`/api/v1/projects/${projectToDelete.id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);
    });
  });

  describe('GET /api/v1/projects/featured', () => {
    it('should return featured projects', async () => {
      const response = await request(app)
        .get('/api/v1/projects/featured')
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      response.body.forEach(project => {
        expect(project.isFeatured).toBe(true);
        expect(project.status).toBe('published');
        expect(project.visibility).toBe('public');
      });
    });

    it('should limit featured projects', async () => {
      const response = await request(app)
        .get('/api/v1/projects/featured?limit=2')
        .expect(200);

      expect(response.body.length).toBeLessThanOrEqual(2);
    });
  });

  describe('GET /api/v1/projects/stats', () => {
    it('should return project statistics', async () => {
      const response = await request(app)
        .get('/api/v1/projects/stats')
        .expect(200);

      expect(response.body).toHaveProperty('totalProjects');
      expect(response.body).toHaveProperty('statusCounts');
      expect(response.body).toHaveProperty('categoryCounts');
      expect(response.body).toHaveProperty('featuredCount');
      expect(typeof response.body.totalProjects).toBe('number');
    });
  });
});
