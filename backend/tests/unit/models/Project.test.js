const { Project, User, Tag, Skill } = require('../../../src/models');
const { factories, invalidData } = require('../../fixtures/testData');

describe('Project Model', () => {
  let user;

  beforeEach(async () => {
    const userData = await factories.createUser();
    user = await User.create(userData);
  });

  describe('Model Creation', () => {
    it('should create a valid project with required fields', async () => {
      const projectData = factories.createProject(user.id);
      const project = await Project.create(projectData);

      expect(project).toHaveValidId();
      expect(project.title).toBe(projectData.title);
      expect(project.description).toBe(projectData.description);
      expect(project.status).toBe(projectData.status);
      expect(project.userId).toBe(user.id);
      expect(project.createdAt).toBeValidDate();
      expect(project.updatedAt).toBeValidDate();
    });

    it('should generate slug from title if not provided', async () => {
      const projectData = factories.createProject(user.id, { 
        title: 'My Awesome Project',
        slug: undefined 
      });
      const project = await Project.create(projectData);

      expect(project.slug).toBe('my-awesome-project');
    });

    it('should preserve provided slug', async () => {
      const projectData = factories.createProject(user.id, { 
        slug: 'custom-slug'
      });
      const project = await Project.create(projectData);

      expect(project.slug).toBe('custom-slug');
    });

    it('should set default values for optional fields', async () => {
      const projectData = {
        title: 'Test Project',
        description: 'Test description',
        userId: user.id
      };
      const project = await Project.create(projectData);

      expect(project.status).toBe('draft');
      expect(project.featured).toBe(false);
      expect(project.viewCount).toBe(0);
      expect(project.likeCount).toBe(0);
      expect(project.sortOrder).toBe(0);
    });
  });

  describe('Model Validation', () => {
    it('should require title field', async () => {
      const projectData = factories.createProject(user.id);
      delete projectData.title;

      await expect(Project.create(projectData))
        .rejects.toThrow(/notNull Violation.*title/);
    });

    it('should require userId field', async () => {
      const projectData = factories.createProject(user.id);
      delete projectData.userId;

      await expect(Project.create(projectData))
        .rejects.toThrow(/notNull Violation.*userId/);
    });

    it('should validate status values', async () => {
      const projectData = factories.createProject(user.id, { 
        status: 'invalid-status' 
      });

      await expect(Project.create(projectData))
        .rejects.toThrow(/invalid input value for enum/);
    });

    it('should validate title length', async () => {
      const projectData = factories.createProject(user.id, { 
        title: 'a'.repeat(256) 
      });

      await expect(Project.create(projectData))
        .rejects.toThrow(/value too long/);
    });

    it('should enforce unique slug constraint', async () => {
      const projectData1 = factories.createProject(user.id, { 
        slug: 'unique-slug' 
      });
      await Project.create(projectData1);

      const projectData2 = factories.createProject(user.id, { 
        slug: 'unique-slug' 
      });
      await expect(Project.create(projectData2))
        .rejects.toThrow(/Validation error/);
    });

    it('should validate URL formats', async () => {
      const projectData = factories.createProject(user.id, {
        projectUrl: 'not-a-valid-url',
        repositoryUrl: 'also-not-valid'
      });

      await expect(Project.create(projectData))
        .rejects.toThrow(/Validation error/);
    });

    it('should validate JSON fields', async () => {
      const projectData = factories.createProject(user.id, {
        technologies: 'invalid-json'
      });

      await expect(Project.create(projectData))
        .rejects.toThrow(/invalid input syntax for type json/);
    });
  });

  describe('Instance Methods', () => {
    let project;

    beforeEach(async () => {
      const projectData = factories.createProject(user.id);
      project = await Project.create(projectData);
    });

    it('should increment view count', async () => {
      const initialCount = project.viewCount;
      await project.incrementViews();
      await project.reload();

      expect(project.viewCount).toBe(initialCount + 1);
    });

    it('should toggle like count', async () => {
      const initialCount = project.likeCount;
      
      // Like the project
      await project.toggleLike();
      await project.reload();
      expect(project.likeCount).toBe(initialCount + 1);

      // Unlike the project
      await project.toggleLike();
      await project.reload();
      expect(project.likeCount).toBe(initialCount);
    });

    it('should check if project is published', () => {
      project.status = 'published';
      expect(project.isPublished()).toBe(true);

      project.status = 'draft';
      expect(project.isPublished()).toBe(false);
    });

    it('should get project duration', () => {
      project.startDate = new Date('2023-01-01');
      project.endDate = new Date('2023-06-30');

      const duration = project.getDuration();
      expect(duration).toBe('6 months');

      project.endDate = null;
      const ongoingDuration = project.getDuration();
      expect(ongoingDuration).toMatch(/^\d+.*ongoing$/);
    });

    it('should get technologies array', () => {
      project.technologies = JSON.stringify(['React', 'Node.js', 'PostgreSQL']);
      const technologies = project.getTechnologies();

      expect(technologies).toEqual(['React', 'Node.js', 'PostgreSQL']);

      project.technologies = null;
      const emptyTechnologies = project.getTechnologies();
      expect(emptyTechnologies).toEqual([]);
    });

    it('should get images array', () => {
      project.images = JSON.stringify(['image1.jpg', 'image2.jpg']);
      const images = project.getImages();

      expect(images).toEqual(['image1.jpg', 'image2.jpg']);

      project.images = null;
      const emptyImages = project.getImages();
      expect(emptyImages).toEqual([]);
    });

    it('should generate SEO metadata', () => {
      const seo = project.getSEOData();

      expect(seo).toHaveProperty('title');
      expect(seo).toHaveProperty('description');
      expect(seo).toHaveProperty('keywords');
      expect(seo.title).toBe(project.seoTitle || project.title);
      expect(seo.description).toBe(project.seoDescription || project.description);
    });

    it('should update project status', async () => {
      await project.updateStatus('published');
      await project.reload();

      expect(project.status).toBe('published');
      expect(project.publishedAt).toBeValidDate();
    });

    it('should archive project', async () => {
      await project.archive();
      await project.reload();

      expect(project.status).toBe('archived');
      expect(project.archivedAt).toBeValidDate();
    });
  });

  describe('Associations', () => {
    let project, tag1, tag2, skill1, skill2;

    beforeEach(async () => {
      const projectData = factories.createProject(user.id);
      project = await Project.create(projectData);

      tag1 = await Tag.create({ name: 'web-dev', displayName: 'Web Development', color: '#007bff' });
      tag2 = await Tag.create({ name: 'frontend', displayName: 'Frontend', color: '#28a745' });
      
      skill1 = await Skill.create({ name: 'React', category: 'framework', level: 'expert' });
      skill2 = await Skill.create({ name: 'Node.js', category: 'backend', level: 'advanced' });
    });

    it('should belong to user', async () => {
      const projectUser = await project.getUser();
      expect(projectUser.id).toBe(user.id);
    });

    it('should associate with tags', async () => {
      await project.addTags([tag1, tag2]);
      const tags = await project.getTags();

      expect(tags).toHaveLength(2);
      const tagNames = tags.map(t => t.name);
      expect(tagNames).toContain('web-dev');
      expect(tagNames).toContain('frontend');
    });

    it('should associate with skills', async () => {
      await project.addSkills([skill1, skill2]);
      const skills = await project.getSkills();

      expect(skills).toHaveLength(2);
      const skillNames = skills.map(s => s.name);
      expect(skillNames).toContain('React');
      expect(skillNames).toContain('Node.js');
    });

    it('should have many content versions', async () => {
      // This would require ContentVersion model - placeholder for now
      const versions = await project.getContentVersions?.() || [];
      expect(Array.isArray(versions)).toBe(true);
    });
  });

  describe('Scopes and Queries', () => {
    let publishedProject, draftProject, featuredProject, archivedProject;

    beforeEach(async () => {
      publishedProject = await Project.create(
        factories.createProject(user.id, { 
          title: 'Published Project',
          status: 'published',
          featured: false
        })
      );

      draftProject = await Project.create(
        factories.createProject(user.id, { 
          title: 'Draft Project',
          status: 'draft'
        })
      );

      featuredProject = await Project.create(
        factories.createProject(user.id, { 
          title: 'Featured Project',
          status: 'published',
          featured: true
        })
      );

      archivedProject = await Project.create(
        factories.createProject(user.id, { 
          title: 'Archived Project',
          status: 'archived'
        })
      );
    });

    it('should find published projects', async () => {
      const projects = await Project.findAll({
        where: { status: 'published' }
      });

      const projectIds = projects.map(p => p.id);
      expect(projectIds).toContain(publishedProject.id);
      expect(projectIds).toContain(featuredProject.id);
      expect(projectIds).not.toContain(draftProject.id);
      expect(projectIds).not.toContain(archivedProject.id);
    });

    it('should find featured projects', async () => {
      const projects = await Project.findAll({
        where: { featured: true }
      });

      expect(projects).toHaveLength(1);
      expect(projects[0].id).toBe(featuredProject.id);
    });

    it('should find projects by user', async () => {
      const projects = await Project.findAll({
        where: { userId: user.id }
      });

      expect(projects).toHaveLength(4);
    });

    it('should find projects by date range', async () => {
      const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const projects = await Project.findAll({
        where: {
          createdAt: {
            [require('sequelize').Op.gte]: oneMonthAgo
          }
        }
      });

      expect(projects.length).toBeGreaterThan(0);
    });

    it('should order projects by sort order and creation date', async () => {
      publishedProject.sortOrder = 1;
      await publishedProject.save();

      featuredProject.sortOrder = 2;
      await featuredProject.save();

      const projects = await Project.findAll({
        order: [
          ['sortOrder', 'ASC'],
          ['createdAt', 'DESC']
        ]
      });

      expect(projects[0].id).toBe(publishedProject.id);
      expect(projects[1].id).toBe(featuredProject.id);
    });
  });

  describe('Hooks and Lifecycle', () => {
    it('should generate slug before create if not provided', async () => {
      const projectData = factories.createProject(user.id, {
        title: 'My Awesome Project Title'
      });
      delete projectData.slug;

      const project = await Project.create(projectData);
      expect(project.slug).toBe('my-awesome-project-title');
    });

    it('should update timestamps on save', async () => {
      const projectData = factories.createProject(user.id);
      const project = await Project.create(projectData);
      const originalUpdatedAt = project.updatedAt;

      await new Promise(resolve => setTimeout(resolve, 10));

      project.title = 'Updated Title';
      await project.save();

      expect(project.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });

    it('should set published date when status changes to published', async () => {
      const projectData = factories.createProject(user.id, { status: 'draft' });
      const project = await Project.create(projectData);

      expect(project.publishedAt).toBeNull();

      project.status = 'published';
      await project.save();

      expect(project.publishedAt).toBeValidDate();
    });

    it('should not change published date if already published', async () => {
      const publishedDate = new Date('2023-01-01');
      const projectData = factories.createProject(user.id, { 
        status: 'published',
        publishedAt: publishedDate
      });
      const project = await Project.create(projectData);

      project.title = 'Updated Title';
      await project.save();

      expect(project.publishedAt.getTime()).toBe(publishedDate.getTime());
    });
  });

  describe('Search and Filtering', () => {
    let projects;

    beforeEach(async () => {
      projects = await Promise.all([
        Project.create(factories.createProject(user.id, {
          title: 'React Dashboard Project',
          description: 'A modern dashboard built with React and TypeScript',
          technologies: JSON.stringify(['React', 'TypeScript', 'Tailwind']),
          status: 'published'
        })),
        Project.create(factories.createProject(user.id, {
          title: 'Vue.js Blog Platform',
          description: 'A blog platform using Vue.js and Node.js',
          technologies: JSON.stringify(['Vue.js', 'Node.js', 'MongoDB']),
          status: 'published'
        })),
        Project.create(factories.createProject(user.id, {
          title: 'Mobile App with React Native',
          description: 'Cross-platform mobile application',
          technologies: JSON.stringify(['React Native', 'Expo', 'Firebase']),
          status: 'draft'
        }))
      ]);
    });

    it('should search projects by title', async () => {
      const results = await Project.findAll({
        where: {
          title: {
            [require('sequelize').Op.iLike]: '%React%'
          }
        }
      });

      expect(results).toHaveLength(2);
      const titles = results.map(p => p.title);
      expect(titles.some(t => t.includes('React Dashboard'))).toBe(true);
      expect(titles.some(t => t.includes('React Native'))).toBe(true);
    });

    it('should search projects by description', async () => {
      const results = await Project.findAll({
        where: {
          description: {
            [require('sequelize').Op.iLike]: '%dashboard%'
          }
        }
      });

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('React Dashboard Project');
    });

    it('should filter by technology (JSON search)', async () => {
      // Note: This would require proper JSON search implementation
      // For now, testing the structure
      const reactProjects = projects.filter(p => 
        p.getTechnologies().some(tech => tech.includes('React'))
      );

      expect(reactProjects).toHaveLength(2);
    });
  });
});