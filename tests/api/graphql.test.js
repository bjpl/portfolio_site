const request = require('supertest');
const app = require('../../backend/src/server');
const { sequelize, User, Project, Blog, Tag } = require('../../backend/src/models');
const jwt = require('jsonwebtoken');

describe('GraphQL API', () => {
  let testUser;
  let authToken;
  let testProject;
  let testBlog;
  let testTag;

  beforeAll(async () => {
    // Setup test database
    await sequelize.sync({ force: true });

    // Create test user
    testUser = await User.create({
      username: 'graphqluser',
      email: 'graphql@example.com',
      password: 'hashedpassword123',
      role: 'user',
      isActive: true
    });

    // Create auth token
    authToken = jwt.sign(
      { id: testUser.id, username: testUser.username, role: testUser.role },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Create test tag
    testTag = await Tag.create({
      name: 'GraphQL',
      slug: 'graphql'
    });

    // Create test project
    testProject = await Project.create({
      title: 'GraphQL Test Project',
      slug: 'graphql-test-project',
      shortDescription: 'A project for testing GraphQL queries',
      description: 'This project is used to test GraphQL API functionality.',
      category: 'api',
      status: 'published',
      visibility: 'public',
      isFeatured: true,
      projectUrl: 'https://graphql-project.com',
      githubUrl: 'https://github.com/user/graphql-project',
      technologies: ['GraphQL', 'Node.js'],
      authorId: testUser.id
    });

    // Create test blog
    testBlog = await Blog.create({
      title: 'GraphQL Blog Post',
      slug: 'graphql-blog-post',
      content: '<p>This is a test blog post about GraphQL.</p>',
      markdown: 'This is a test blog post about GraphQL.',
      excerpt: 'A test blog post',
      status: 'published',
      publishedAt: new Date(),
      language: 'en',
      authorId: testUser.id
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('Projects Queries', () => {
    it('should fetch all projects', async () => {
      const query = `
        query {
          projects {
            id
            title
            slug
            shortDescription
            category
            status
            isFeatured
            author {
              id
              username
            }
          }
        }
      `;

      const response = await request(app)
        .post('/api/v1/graphql')
        .send({ query })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('projects');
      expect(response.body.data.projects).toBeInstanceOf(Array);
      expect(response.body.data.projects.length).toBeGreaterThan(0);
      
      const project = response.body.data.projects[0];
      expect(project).toHaveProperty('id');
      expect(project).toHaveProperty('title');
      expect(project).toHaveProperty('author');
      expect(project.author).toHaveProperty('username');
    });

    it('should fetch project by slug', async () => {
      const query = `
        query GetProject($slug: String!) {
          project(slug: $slug) {
            id
            title
            slug
            shortDescription
            description
            category
            status
            isFeatured
            projectUrl
            githubUrl
            technologies
            author {
              id
              username
              email
            }
          }
        }
      `;

      const variables = {
        slug: 'graphql-test-project'
      };

      const response = await request(app)
        .post('/api/v1/graphql')
        .send({ query, variables })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('project');
      
      const project = response.body.data.project;
      expect(project.title).toBe('GraphQL Test Project');
      expect(project.slug).toBe('graphql-test-project');
      expect(project.technologies).toEqual(['GraphQL', 'Node.js']);
    });

    it('should return null for non-existent project', async () => {
      const query = `
        query GetProject($slug: String!) {
          project(slug: $slug) {
            id
            title
          }
        }
      `;

      const variables = {
        slug: 'non-existent-project'
      };

      const response = await request(app)
        .post('/api/v1/graphql')
        .send({ query, variables })
        .expect(200);

      expect(response.body.data.project).toBeNull();
    });

    it('should fetch featured projects', async () => {
      const query = `
        query {
          featuredProjects {
            id
            title
            isFeatured
            status
          }
        }
      `;

      const response = await request(app)
        .post('/api/v1/graphql')
        .send({ query })
        .expect(200);

      expect(response.body.data).toHaveProperty('featuredProjects');
      response.body.data.featuredProjects.forEach(project => {
        expect(project.isFeatured).toBe(true);
        expect(project.status).toBe('published');
      });
    });
  });

  describe('Blog Queries', () => {
    it('should fetch all blogs', async () => {
      const query = `
        query {
          blogs {
            id
            title
            slug
            excerpt
            status
            publishedAt
            author {
              id
              username
            }
          }
        }
      `;

      const response = await request(app)
        .post('/api/v1/graphql')
        .send({ query })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('blogs');
      expect(response.body.data.blogs).toBeInstanceOf(Array);
      expect(response.body.data.blogs.length).toBeGreaterThan(0);
    });

    it('should fetch blog by slug', async () => {
      const query = `
        query GetBlog($slug: String!) {
          blog(slug: $slug) {
            id
            title
            slug
            content
            markdown
            excerpt
            status
            publishedAt
            language
            author {
              id
              username
            }
          }
        }
      `;

      const variables = {
        slug: 'graphql-blog-post'
      };

      const response = await request(app)
        .post('/api/v1/graphql')
        .send({ query, variables })
        .expect(200);

      expect(response.body.data).toHaveProperty('blog');
      
      const blog = response.body.data.blog;
      expect(blog.title).toBe('GraphQL Blog Post');
      expect(blog.slug).toBe('graphql-blog-post');
      expect(blog.content).toContain('GraphQL');
    });
  });

  describe('User Queries', () => {
    it('should fetch current user when authenticated', async () => {
      const query = `
        query {
          me {
            id
            username
            email
            role
            isActive
          }
        }
      `;

      const response = await request(app)
        .post('/api/v1/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ query })
        .expect(200);

      expect(response.body.data).toHaveProperty('me');
      
      const user = response.body.data.me;
      expect(user.username).toBe('graphqluser');
      expect(user.email).toBe('graphql@example.com');
      expect(user.role).toBe('user');
    });

    it('should return null for unauthenticated user', async () => {
      const query = `
        query {
          me {
            id
            username
          }
        }
      `;

      const response = await request(app)
        .post('/api/v1/graphql')
        .send({ query })
        .expect(200);

      expect(response.body.data.me).toBeNull();
    });
  });

  describe('Mutations', () => {
    it('should create a new project when authenticated', async () => {
      const mutation = `
        mutation CreateProject($input: ProjectInput!) {
          createProject(input: $input) {
            id
            title
            slug
            shortDescription
            category
            status
            author {
              id
              username
            }
          }
        }
      `;

      const variables = {
        input: {
          title: 'GraphQL Created Project',
          shortDescription: 'A project created via GraphQL mutation',
          description: 'This project was created using a GraphQL mutation.',
          category: 'web',
          status: 'draft',
          technologies: ['GraphQL', 'React']
        }
      };

      const response = await request(app)
        .post('/api/v1/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ query: mutation, variables })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('createProject');
      
      const project = response.body.data.createProject;
      expect(project.title).toBe('GraphQL Created Project');
      expect(project.slug).toBe('graphql-created-project');
      expect(project.category).toBe('web');
      expect(project.status).toBe('draft');
    });

    it('should require authentication for mutations', async () => {
      const mutation = `
        mutation CreateProject($input: ProjectInput!) {
          createProject(input: $input) {
            id
            title
          }
        }
      `;

      const variables = {
        input: {
          title: 'Unauthorized Project',
          shortDescription: 'This should fail',
          description: 'This project creation should fail.',
          category: 'web'
        }
      };

      const response = await request(app)
        .post('/api/v1/graphql')
        .send({ query: mutation, variables })
        .expect(200);

      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors[0].message).toContain('Authentication required');
    });

    it('should update existing project', async () => {
      const mutation = `
        mutation UpdateProject($id: ID!, $input: ProjectUpdateInput!) {
          updateProject(id: $id, input: $input) {
            id
            title
            shortDescription
            isFeatured
          }
        }
      `;

      const variables = {
        id: testProject.id,
        input: {
          title: 'Updated GraphQL Project',
          shortDescription: 'Updated via GraphQL mutation',
          isFeatured: false
        }
      };

      const response = await request(app)
        .post('/api/v1/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ query: mutation, variables })
        .expect(200);

      expect(response.body.data).toHaveProperty('updateProject');
      
      const project = response.body.data.updateProject;
      expect(project.title).toBe('Updated GraphQL Project');
      expect(project.shortDescription).toBe('Updated via GraphQL mutation');
      expect(project.isFeatured).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid GraphQL syntax', async () => {
      const invalidQuery = `
        query {
          projects {
            id
            title
            invalidField // This field doesn't exist
          }
        }
      `;

      const response = await request(app)
        .post('/api/v1/graphql')
        .send({ query: invalidQuery })
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });

    it('should handle malformed queries', async () => {
      const malformedQuery = `
        query {
          projects {
            id
            title
          // Missing closing brace
        }
      `;

      const response = await request(app)
        .post('/api/v1/graphql')
        .send({ query: malformedQuery })
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });

    it('should handle missing required variables', async () => {
      const query = `
        query GetProject($slug: String!) {
          project(slug: $slug) {
            id
            title
          }
        }
      `;

      // Missing required $slug variable
      const response = await request(app)
        .post('/api/v1/graphql')
        .send({ query })
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('Complex Queries', () => {
    it('should handle nested queries with relationships', async () => {
      const query = `
        query {
          projects {
            id
            title
            author {
              id
              username
              projects {
                id
                title
              }
            }
          }
        }
      `;

      const response = await request(app)
        .post('/api/v1/graphql')
        .send({ query })
        .expect(200);

      expect(response.body.data).toHaveProperty('projects');
      
      const project = response.body.data.projects[0];
      expect(project).toHaveProperty('author');
      expect(project.author).toHaveProperty('projects');
      expect(project.author.projects).toBeInstanceOf(Array);
    });

    it('should handle query with fragments', async () => {
      const query = `
        fragment ProjectInfo on Project {
          id
          title
          slug
          category
          status
        }
        
        query {
          projects {
            ...ProjectInfo
            author {
              username
            }
          }
          featuredProjects {
            ...ProjectInfo
            isFeatured
          }
        }
      `;

      const response = await request(app)
        .post('/api/v1/graphql')
        .send({ query })
        .expect(200);

      expect(response.body.data).toHaveProperty('projects');
      expect(response.body.data).toHaveProperty('featuredProjects');
    });
  });

  describe('Performance', () => {
    it('should handle multiple concurrent queries', async () => {
      const query = `
        query {
          projects {
            id
            title
            category
          }
        }
      `;

      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          request(app)
            .post('/api/v1/graphql')
            .send({ query })
        );
      }

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.data).toHaveProperty('projects');
      });
    }, 10000);

    it('should optimize N+1 queries with DataLoader', async () => {
      const query = `
        query {
          projects {
            id
            title
            author {
              id
              username
            }
          }
        }
      `;

      const startTime = Date.now();
      
      const response = await request(app)
        .post('/api/v1/graphql')
        .send({ query })
        .expect(200);

      const duration = Date.now() - startTime;
      
      expect(response.body.data.projects.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    });
  });
});
