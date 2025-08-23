const portfolioService = require('../../../src/services/portfolioService');
const { Project, Skill, Experience, Education, Testimonial, Contact } = require('../../../src/models/Portfolio');
const cacheService = require('../../../src/services/cache');
const emailService = require('../../../src/services/emailService');

// Mock dependencies
jest.mock('../../../src/models/Portfolio');
jest.mock('../../../src/services/cache');
jest.mock('../../../src/services/emailService');
jest.mock('../../../src/utils/logger');

describe('PortfolioService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    it('should return cached profile if available', async () => {
      const cachedProfile = {
        name: 'John Doe',
        title: 'Full Stack Developer',
        bio: 'Experienced developer',
      };

      cacheService.get.mockResolvedValue(cachedProfile);

      const result = await portfolioService.getProfile();

      expect(result).toBe(cachedProfile);
      expect(cacheService.get).toHaveBeenCalledWith('portfolio:profile');
    });

    it('should generate profile from config if not cached', async () => {
      cacheService.get.mockResolvedValue(null);
      cacheService.set.mockResolvedValue();

      const result = await portfolioService.getProfile();

      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('bio');
      expect(cacheService.set).toHaveBeenCalled();
    });
  });

  describe('getFeaturedProjects', () => {
    it('should return featured projects from cache', async () => {
      const cachedProjects = [
        { id: 1, title: 'Project 1', featured: true },
        { id: 2, title: 'Project 2', featured: true },
      ];

      cacheService.get.mockResolvedValue(cachedProjects);

      const result = await portfolioService.getFeaturedProjects();

      expect(result).toBe(cachedProjects);
      expect(cacheService.get).toHaveBeenCalledWith('portfolio:projects:featured');
    });

    it('should fetch featured projects from database if not cached', async () => {
      const mockProjects = [
        { id: 1, title: 'Project 1', featured: true, published: true },
        { id: 2, title: 'Project 2', featured: true, published: true },
      ];

      cacheService.get.mockResolvedValue(null);
      cacheService.set.mockResolvedValue();
      Project.findAll.mockResolvedValue(mockProjects);

      const result = await portfolioService.getFeaturedProjects();

      expect(result).toBe(mockProjects);
      expect(Project.findAll).toHaveBeenCalledWith({
        where: {
          featured: true,
          published: true,
        },
        order: [
          ['order', 'ASC'],
          ['createdAt', 'DESC'],
        ],
        limit: 6,
      });
      expect(cacheService.set).toHaveBeenCalled();
    });
  });

  describe('getProjects', () => {
    it('should return paginated projects with filtering', async () => {
      const mockResult = {
        count: 10,
        rows: [
          { id: 1, title: 'Project 1', category: 'web' },
          { id: 2, title: 'Project 2', category: 'mobile' },
        ],
      };

      Project.findAndCountAll.mockResolvedValue(mockResult);

      const result = await portfolioService.getProjects({
        page: 1,
        limit: 2,
        category: 'web',
        sortBy: 'date',
        sortOrder: 'desc',
      });

      expect(result.projects).toBe(mockResult.rows);
      expect(result.pagination).toEqual({
        total: 10,
        page: 1,
        limit: 2,
        totalPages: 5,
      });
    });

    it('should filter by technology', async () => {
      const mockResult = {
        count: 5,
        rows: [{ id: 1, title: 'React Project', technologies: ['react', 'javascript'] }],
      };

      Project.findAndCountAll.mockResolvedValue(mockResult);

      await portfolioService.getProjects({
        technology: 'react',
      });

      expect(Project.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            technologies: {
              [require('sequelize').Op.contains]: ['react'],
            },
          }),
        })
      );
    });
  });

  describe('getProjectBySlug', () => {
    it('should return cached project if available', async () => {
      const cachedProject = { id: 1, slug: 'test-project', title: 'Test Project' };

      cacheService.get.mockResolvedValue(cachedProject);

      const result = await portfolioService.getProjectBySlug('test-project');

      expect(result).toBe(cachedProject);
      expect(cacheService.get).toHaveBeenCalledWith('portfolio:project:test-project');
    });

    it('should fetch project from database if not cached', async () => {
      const mockProject = { id: 1, slug: 'test-project', title: 'Test Project', published: true };

      cacheService.get.mockResolvedValue(null);
      cacheService.set.mockResolvedValue();
      Project.findOne.mockResolvedValue(mockProject);

      const result = await portfolioService.getProjectBySlug('test-project');

      expect(result).toBe(mockProject);
      expect(Project.findOne).toHaveBeenCalledWith({
        where: {
          slug: 'test-project',
          published: true,
        },
      });
      expect(cacheService.set).toHaveBeenCalled();
    });
  });

  describe('trackProjectView', () => {
    it('should increment view count for new views', async () => {
      cacheService.get.mockResolvedValue(null); // No recent view
      cacheService.set.mockResolvedValue();
      Project.increment.mockResolvedValue();

      await portfolioService.trackProjectView('test-project', '127.0.0.1');

      expect(Project.increment).toHaveBeenCalledWith('viewCount', {
        where: { slug: 'test-project' },
      });
      expect(cacheService.set).toHaveBeenCalledWith('view:test-project:127.0.0.1', true, 3600);
    });

    it('should not increment view count for recent views', async () => {
      cacheService.get.mockResolvedValue(true); // Recent view exists

      await portfolioService.trackProjectView('test-project', '127.0.0.1');

      expect(Project.increment).not.toHaveBeenCalled();
    });
  });

  describe('createProject', () => {
    it('should create new project with generated slug', async () => {
      const projectData = {
        title: 'New Project',
        description: 'A new project',
        technologies: ['javascript', 'react'],
      };

      const mockProject = { id: 1, ...projectData, slug: 'new-project', viewCount: 0 };

      Project.create.mockResolvedValue(mockProject);
      cacheService.del.mockResolvedValue();
      jest.spyOn(portfolioService, 'generateSlug').mockReturnValue('new-project');

      const result = await portfolioService.createProject(projectData);

      expect(result).toBe(mockProject);
      expect(Project.create).toHaveBeenCalledWith({
        ...projectData,
        slug: 'new-project',
        viewCount: 0,
      });
      expect(cacheService.del).toHaveBeenCalledWith('portfolio:projects:*');
    });
  });

  describe('updateProject', () => {
    it('should update existing project', async () => {
      const mockProject = {
        id: 1,
        title: 'Old Title',
        slug: 'old-title',
        update: jest.fn().mockResolvedValue(),
      };

      const updateData = {
        title: 'New Title',
        description: 'Updated description',
      };

      Project.findByPk.mockResolvedValue(mockProject);
      cacheService.del.mockResolvedValue();
      jest.spyOn(portfolioService, 'generateSlug').mockReturnValue('new-title');

      const result = await portfolioService.updateProject(1, updateData);

      expect(result).toBe(mockProject);
      expect(mockProject.update).toHaveBeenCalledWith({
        ...updateData,
        slug: 'new-title',
      });
      expect(cacheService.del).toHaveBeenCalledTimes(2);
    });

    it('should return null for non-existent project', async () => {
      Project.findByPk.mockResolvedValue(null);

      const result = await portfolioService.updateProject(999, {});

      expect(result).toBeNull();
    });
  });

  describe('deleteProject', () => {
    it('should delete project and clear cache', async () => {
      const mockProject = {
        id: 1,
        slug: 'test-project',
        destroy: jest.fn().mockResolvedValue(),
      };

      Project.findByPk.mockResolvedValue(mockProject);
      cacheService.del.mockResolvedValue();

      await portfolioService.deleteProject(1);

      expect(mockProject.destroy).toHaveBeenCalled();
      expect(cacheService.del).toHaveBeenCalledTimes(2);
    });

    it('should handle non-existent project gracefully', async () => {
      Project.findByPk.mockResolvedValue(null);

      await expect(portfolioService.deleteProject(999)).resolves.not.toThrow();
    });
  });

  describe('getSkills', () => {
    it('should return grouped skills from cache', async () => {
      const cachedSkills = {
        frontend: [{ name: 'React', level: 90 }],
        backend: [{ name: 'Node.js', level: 85 }],
      };

      cacheService.get.mockResolvedValue(cachedSkills);

      const result = await portfolioService.getSkills();

      expect(result).toBe(cachedSkills);
    });

    it('should fetch and group skills from database', async () => {
      const mockSkills = [
        { name: 'React', category: 'frontend', level: 90 },
        { name: 'Vue.js', category: 'frontend', level: 80 },
        { name: 'Node.js', category: 'backend', level: 85 },
      ];

      cacheService.get.mockResolvedValue(null);
      cacheService.set.mockResolvedValue();
      Skill.findAll.mockResolvedValue(mockSkills);

      const result = await portfolioService.getSkills();

      expect(result).toEqual({
        frontend: [mockSkills[0], mockSkills[1]],
        backend: [mockSkills[2]],
      });
      expect(cacheService.set).toHaveBeenCalled();
    });
  });

  describe('submitContactForm', () => {
    it('should save contact and send email notification', async () => {
      const contactData = {
        name: 'John Doe',
        email: 'john@example.com',
        subject: 'Test Subject',
        message: 'Test message',
        ip: '127.0.0.1',
        userAgent: 'Test Agent',
      };

      const mockContact = { id: 1, ...contactData };

      Contact.create.mockResolvedValue(mockContact);
      emailService.sendEmail.mockResolvedValue();

      const result = await portfolioService.submitContactForm(contactData);

      expect(result).toBe(mockContact);
      expect(Contact.create).toHaveBeenCalledWith(contactData);
      expect(emailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Portfolio Contact: Test Subject',
        })
      );
    });

    it('should handle email service errors gracefully', async () => {
      const contactData = {
        name: 'John Doe',
        email: 'john@example.com',
        subject: 'Test',
        message: 'Test',
      };

      const mockContact = { id: 1, ...contactData };

      Contact.create.mockResolvedValue(mockContact);
      emailService.sendEmail.mockRejectedValue(new Error('Email error'));

      const result = await portfolioService.submitContactForm(contactData);

      expect(result).toBe(mockContact);
      // Should not throw even if email fails
    });
  });

  describe('getStatistics', () => {
    it('should return public statistics', async () => {
      cacheService.get.mockResolvedValue(null);
      cacheService.set.mockResolvedValue();
      
      Project.count.mockResolvedValue(5);
      Skill.count.mockResolvedValue(10);
      Experience.count.mockResolvedValue(3);
      Testimonial.count.mockResolvedValue(2);

      const result = await portfolioService.getStatistics(false);

      expect(result).toEqual({
        projects: 5,
        skills: 10,
        experience: 3,
        testimonials: 2,
      });
    });

    it('should return admin statistics with additional data', async () => {
      cacheService.get.mockResolvedValue(null);
      cacheService.set.mockResolvedValue();
      
      Project.count
        .mockResolvedValueOnce(5) // published projects
        .mockResolvedValueOnce(2); // drafts
      Project.sum.mockResolvedValue(150); // total views
      Skill.count.mockResolvedValue(10);
      Experience.count.mockResolvedValue(3);
      Testimonial.count.mockResolvedValue(2);
      Contact.count.mockResolvedValue(8);

      const result = await portfolioService.getStatistics(true);

      expect(result).toEqual({
        projects: 5,
        skills: 10,
        experience: 3,
        testimonials: 2,
        totalViews: 150,
        contacts: 8,
        drafts: 2,
      });
    });
  });

  describe('utility methods', () => {
    describe('generateSlug', () => {
      it('should generate valid slugs', () => {
        expect(portfolioService.generateSlug('Hello World!')).toBe('hello-world');
        expect(portfolioService.generateSlug('React & Vue.js')).toBe('react-vuejs');
        expect(portfolioService.generateSlug('  Multiple   Spaces  ')).toBe('multiple-spaces');
      });
    });

    describe('parseFrontmatter', () => {
      it('should parse frontmatter correctly', () => {
        const content = `---
title: Test Post
date: 2023-01-01
tags: react, javascript
---

Content here`;

        const result = portfolioService.parseFrontmatter(content);

        expect(result).toEqual({
          title: 'Test Post',
          date: '2023-01-01',
          tags: 'react, javascript',
        });
      });

      it('should handle malformed frontmatter', () => {
        const content = `---
invalid line without colon
title: Valid Title
---

Content`;

        const result = portfolioService.parseFrontmatter(content);

        expect(result).toEqual({
          title: 'Valid Title',
        });
      });
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      Project.findAll.mockRejectedValue(new Error('Database error'));
      cacheService.get.mockResolvedValue(null);

      await expect(portfolioService.getFeaturedProjects()).rejects.toThrow('Database error');
    });

    it('should handle cache errors gracefully', async () => {
      cacheService.get.mockRejectedValue(new Error('Cache error'));
      cacheService.set.mockRejectedValue(new Error('Cache error'));
      
      Project.findAll.mockResolvedValue([]);

      const result = await portfolioService.getFeaturedProjects();

      expect(result).toEqual([]);
    });
  });

  describe('performance tests', () => {
    it('should handle large datasets efficiently', async () => {
      const mockProjects = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        title: `Project ${i + 1}`,
        published: true,
      }));

      Project.findAndCountAll.mockResolvedValue({
        count: 1000,
        rows: mockProjects.slice(0, 10),
      });

      const startTime = Date.now();
      const result = await portfolioService.getProjects({ limit: 10 });
      const endTime = Date.now();

      expect(result.projects).toHaveLength(10);
      expect(result.pagination.total).toBe(1000);
      expect(endTime - startTime).toBeLessThan(100); // Should be very fast
    });
  });
});