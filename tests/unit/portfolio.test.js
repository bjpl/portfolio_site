const request = require('supertest');
const app = require('../src/server');
const { Project, Skill, Experience } = require('../src/models');
const authService = require('../src/services/auth');

describe('Portfolio API', () => {
  let authToken;
  let adminToken;
  let testProject;

  beforeAll(async () => {
    // Create test users
    const user = await global.createTestUser();
    const admin = await global.createTestAdmin();
    
    authToken = authService.generateToken(user);
    adminToken = authService.generateToken(admin);

    // Create test data
    testProject = await Project.create({
      title: 'Test Project',
      slug: 'test-project',
      description: 'A test project for unit tests',
      image: '/images/test.jpg',
      link: 'https://test.com',
      github: 'https://github.com/test/test',
      published: true,
      featured: false,
    });

    await Skill.bulkCreate([
      { name: 'JavaScript', category: 'Frontend', level: 90 },
      { name: 'Node.js', category: 'Backend', level: 85 },
      { name: 'React', category: 'Frontend', level: 80 },
    ]);

    await Experience.create({
      company: 'Test Company',
      position: 'Senior Developer',
      description: 'Test experience',
      startDate: new Date('2020-01-01'),
      endDate: new Date('2023-12-31'),
      current: false,
    });
  });

  describe('GET /api/portfolio/projects', () => {
    it('should get all published projects', async () => {
      const response = await request(app)
        .get('/api/portfolio/projects')
        .expect(200);

      expect(response.body).toHaveProperty('projects');
      expect(Array.isArray(response.body.projects)).toBe(true);
      expect(response.body.projects.length).toBeGreaterThan(0);
      expect(response.body.projects[0]).toHaveProperty('title');
    });

    it('should filter by featured projects', async () => {
      await Project.create({
        title: 'Featured Project',
        slug: 'featured-project',
        description: 'A featured project',
        published: true,
        featured: true,
      });

      const response = await request(app)
        .get('/api/portfolio/projects?featured=true')
        .expect(200);

      expect(response.body.projects.every(p => p.featured)).toBe(true);
    });

    it('should paginate results', async () => {
      const response = await request(app)
        .get('/api/portfolio/projects?page=1&limit=2')
        .expect(200);

      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('page', 1);
      expect(response.body.pagination).toHaveProperty('limit', 2);
      expect(response.body.projects.length).toBeLessThanOrEqual(2);
    });
  });

  describe('GET /api/portfolio/projects/:slug', () => {
    it('should get project by slug', async () => {
      const response = await request(app)
        .get(`/api/portfolio/projects/${testProject.slug}`)
        .expect(200);

      expect(response.body).toHaveProperty('project');
      expect(response.body.project.slug).toBe(testProject.slug);
      expect(response.body.project.title).toBe(testProject.title);
    });

    it('should return 404 for non-existent project', async () => {
      const response = await request(app)
        .get('/api/portfolio/projects/non-existent')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/portfolio/projects', () => {
    it('should create project as admin', async () => {
      const projectData = {
        title: 'New Admin Project',
        slug: 'new-admin-project',
        description: 'Created by admin',
        technologies: ['Node.js', 'React'],
        published: true,
      };

      const response = await request(app)
        .post('/api/portfolio/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(projectData)
        .expect(201);

      expect(response.body).toHaveProperty('project');
      expect(response.body.project.title).toBe(projectData.title);
    });

    it('should not create project as regular user', async () => {
      const projectData = {
        title: 'Unauthorized Project',
        slug: 'unauthorized-project',
        description: 'Should fail',
      };

      const response = await request(app)
        .post('/api/portfolio/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(projectData)
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/portfolio/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ description: 'Missing title' })
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('PUT /api/portfolio/projects/:id', () => {
    it('should update project as admin', async () => {
      const updateData = {
        title: 'Updated Project Title',
        description: 'Updated description',
      };

      const response = await request(app)
        .put(`/api/portfolio/projects/${testProject.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('project');
      expect(response.body.project.title).toBe(updateData.title);
    });

    it('should not update project as regular user', async () => {
      const response = await request(app)
        .put(`/api/portfolio/projects/${testProject.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Unauthorized Update' })
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/portfolio/projects/:id', () => {
    it('should delete project as admin', async () => {
      const projectToDelete = await Project.create({
        title: 'Delete Me',
        slug: 'delete-me',
        description: 'To be deleted',
      });

      const response = await request(app)
        .delete(`/api/portfolio/projects/${projectToDelete.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');

      // Verify deletion
      const deleted = await Project.findByPk(projectToDelete.id);
      expect(deleted).toBeNull();
    });
  });

  describe('GET /api/portfolio/skills', () => {
    it('should get all skills', async () => {
      const response = await request(app)
        .get('/api/portfolio/skills')
        .expect(200);

      expect(response.body).toHaveProperty('skills');
      expect(Array.isArray(response.body.skills)).toBe(true);
      expect(response.body.skills.length).toBeGreaterThan(0);
    });

    it('should filter skills by category', async () => {
      const response = await request(app)
        .get('/api/portfolio/skills?category=Frontend')
        .expect(200);

      expect(response.body.skills.every(s => s.category === 'Frontend')).toBe(true);
    });
  });

  describe('GET /api/portfolio/experience', () => {
    it('should get all experience', async () => {
      const response = await request(app)
        .get('/api/portfolio/experience')
        .expect(200);

      expect(response.body).toHaveProperty('experience');
      expect(Array.isArray(response.body.experience)).toBe(true);
      expect(response.body.experience[0]).toHaveProperty('company');
      expect(response.body.experience[0]).toHaveProperty('position');
    });
  });

  describe('POST /api/portfolio/contact', () => {
    it('should submit contact form', async () => {
      const contactData = {
        name: 'Test User',
        email: 'test@example.com',
        subject: 'Test Message',
        message: 'This is a test message from the unit tests',
      };

      const response = await request(app)
        .post('/api/portfolio/contact')
        .send(contactData)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('successfully');
    });

    it('should validate email format', async () => {
      const contactData = {
        name: 'Test User',
        email: 'invalid-email',
        message: 'Test message',
      };

      const response = await request(app)
        .post('/api/portfolio/contact')
        .send(contactData)
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });

    it('should require message', async () => {
      const contactData = {
        name: 'Test User',
        email: 'test@example.com',
      };

      const response = await request(app)
        .post('/api/portfolio/contact')
        .send(contactData)
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });
  });
});