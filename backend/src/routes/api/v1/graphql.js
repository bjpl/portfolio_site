/**
 * GraphQL API Routes
 * GraphQL endpoint with comprehensive schema
 */

const express = require('express');
const { graphqlHTTP } = require('express-graphql');
const { 
  GraphQLSchema, 
  GraphQLObjectType, 
  GraphQLString, 
  GraphQLInt, 
  GraphQLBoolean, 
  GraphQLList, 
  GraphQLNonNull,
  GraphQLID,
  GraphQLFloat,
  GraphQLInputObjectType,
  GraphQLEnumType
} = require('graphql');
const { GraphQLDateTime } = require('graphql-iso-date');

const { 
  Project, 
  User, 
  Tag, 
  Skill, 
  MediaAsset,
  Experience,
  Education,
  Testimonial
} = require('../../../models');
const { optionalAuth, requireRole } = require('../../../middleware/auth');
const { logger } = require('../../../utils/logger');
const { Op } = require('sequelize');

const router = express.Router();

// Custom scalar types
const GraphQLJSON = new GraphQLObjectType({
  name: 'JSON',
  fields: {
    data: { type: GraphQLString }
  }
});

// Enums
const ProjectStatusEnum = new GraphQLEnumType({
  name: 'ProjectStatus',
  values: {
    DRAFT: { value: 'draft' },
    PUBLISHED: { value: 'published' },
    ARCHIVED: { value: 'archived' }
  }
});

const UserRoleEnum = new GraphQLEnumType({
  name: 'UserRole',
  values: {
    VIEWER: { value: 'viewer' },
    AUTHOR: { value: 'author' },
    EDITOR: { value: 'editor' },
    ADMIN: { value: 'admin' }
  }
});

const SortOrderEnum = new GraphQLEnumType({
  name: 'SortOrder',
  values: {
    ASC: { value: 'ASC' },
    DESC: { value: 'DESC' }
  }
});

// Base Types
const TagType = new GraphQLObjectType({
  name: 'Tag',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    name: { type: new GraphQLNonNull(GraphQLString) },
    slug: { type: GraphQLString },
    description: { type: GraphQLString },
    color: { type: GraphQLString },
    createdAt: { type: GraphQLDateTime },
    updatedAt: { type: GraphQLDateTime }
  })
});

const SkillType = new GraphQLObjectType({
  name: 'Skill',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    name: { type: new GraphQLNonNull(GraphQLString) },
    category: { type: GraphQLString },
    proficiency: { type: GraphQLString },
    icon: { type: GraphQLString },
    color: { type: GraphQLString },
    createdAt: { type: GraphQLDateTime },
    updatedAt: { type: GraphQLDateTime }
  })
});

const UserType = new GraphQLObjectType({
  name: 'User',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    email: { type: new GraphQLNonNull(GraphQLString) },
    firstName: { type: GraphQLString },
    lastName: { type: GraphQLString },
    username: { type: GraphQLString },
    role: { type: UserRoleEnum },
    bio: { type: GraphQLString },
    avatar: { type: GraphQLString },
    website: { type: GraphQLString },
    location: { type: GraphQLString },
    isActive: { type: GraphQLBoolean },
    isEmailVerified: { type: GraphQLBoolean },
    createdAt: { type: GraphQLDateTime },
    updatedAt: { type: GraphQLDateTime },
    lastLoginAt: { type: GraphQLDateTime }
  })
});

const MediaAssetType = new GraphQLObjectType({
  name: 'MediaAsset',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    filename: { type: new GraphQLNonNull(GraphQLString) },
    originalName: { type: GraphQLString },
    mimeType: { type: GraphQLString },
    size: { type: GraphQLInt },
    category: { type: GraphQLString },
    title: { type: GraphQLString },
    description: { type: GraphQLString },
    altText: { type: GraphQLString },
    publicUrl: { type: GraphQLString },
    thumbnailUrl: { type: GraphQLString },
    processedUrl: { type: GraphQLString },
    width: { type: GraphQLInt },
    height: { type: GraphQLInt },
    tags: { type: new GraphQLList(GraphQLString) },
    uploader: { 
      type: UserType,
      resolve: (parent) => parent.getUploader()
    },
    createdAt: { type: GraphQLDateTime },
    updatedAt: { type: GraphQLDateTime }
  })
});

const ProjectType = new GraphQLObjectType({
  name: 'Project',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    title: { type: new GraphQLNonNull(GraphQLString) },
    slug: { type: GraphQLString },
    description: { type: GraphQLString },
    shortDescription: { type: GraphQLString },
    content: { type: GraphQLString },
    status: { type: ProjectStatusEnum },
    featured: { type: GraphQLBoolean },
    isPublic: { type: GraphQLBoolean },
    imageUrl: { type: GraphQLString },
    thumbnailUrl: { type: GraphQLString },
    galleryUrls: { type: new GraphQLList(GraphQLString) },
    demoUrl: { type: GraphQLString },
    githubUrl: { type: GraphQLString },
    documentationUrl: { type: GraphQLString },
    viewCount: { type: GraphQLInt },
    startDate: { type: GraphQLDateTime },
    endDate: { type: GraphQLDateTime },
    client: { type: GraphQLString },
    role: { type: GraphQLString },
    teamSize: { type: GraphQLInt },
    budget: { type: GraphQLFloat },
    duration: { type: GraphQLString },
    challenges: { type: GraphQLString },
    solutions: { type: GraphQLString },
    lessons: { type: GraphQLString },
    technologies: { type: new GraphQLList(GraphQLString) },
    features: { type: new GraphQLList(GraphQLString) },
    metrics: { type: GraphQLString }, // JSON string
    testimonials: { type: GraphQLString }, // JSON string
    tags: { 
      type: new GraphQLList(TagType),
      resolve: (parent) => parent.getTags()
    },
    skills: { 
      type: new GraphQLList(SkillType),
      resolve: (parent) => parent.getSkills()
    },
    author: { 
      type: UserType,
      resolve: (parent) => parent.getAuthor()
    },
    createdAt: { type: GraphQLDateTime },
    updatedAt: { type: GraphQLDateTime }
  })
});

const ExperienceType = new GraphQLObjectType({
  name: 'Experience',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    title: { type: new GraphQLNonNull(GraphQLString) },
    company: { type: new GraphQLNonNull(GraphQLString) },
    location: { type: GraphQLString },
    startDate: { type: GraphQLDateTime },
    endDate: { type: GraphQLDateTime },
    current: { type: GraphQLBoolean },
    description: { type: GraphQLString },
    responsibilities: { type: new GraphQLList(GraphQLString) },
    achievements: { type: new GraphQLList(GraphQLString) },
    technologies: { type: new GraphQLList(GraphQLString) },
    companyUrl: { type: GraphQLString },
    logo: { type: GraphQLString },
    createdAt: { type: GraphQLDateTime },
    updatedAt: { type: GraphQLDateTime }
  })
});

const EducationType = new GraphQLObjectType({
  name: 'Education',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    institution: { type: new GraphQLNonNull(GraphQLString) },
    degree: { type: GraphQLString },
    field: { type: GraphQLString },
    startDate: { type: GraphQLDateTime },
    endDate: { type: GraphQLDateTime },
    current: { type: GraphQLBoolean },
    gpa: { type: GraphQLFloat },
    description: { type: GraphQLString },
    achievements: { type: new GraphQLList(GraphQLString) },
    coursework: { type: new GraphQLList(GraphQLString) },
    institutionUrl: { type: GraphQLString },
    logo: { type: GraphQLString },
    createdAt: { type: GraphQLDateTime },
    updatedAt: { type: GraphQLDateTime }
  })
});

const TestimonialType = new GraphQLObjectType({
  name: 'Testimonial',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    name: { type: new GraphQLNonNull(GraphQLString) },
    title: { type: GraphQLString },
    company: { type: GraphQLString },
    content: { type: new GraphQLNonNull(GraphQLString) },
    rating: { type: GraphQLInt },
    featured: { type: GraphQLBoolean },
    avatar: { type: GraphQLString },
    companyLogo: { type: GraphQLString },
    projectId: { type: GraphQLID },
    project: { 
      type: ProjectType,
      resolve: (parent) => parent.getProject()
    },
    createdAt: { type: GraphQLDateTime },
    updatedAt: { type: GraphQLDateTime }
  })
});

// Pagination and filtering types
const PaginationInfoType = new GraphQLObjectType({
  name: 'PaginationInfo',
  fields: {
    page: { type: GraphQLInt },
    limit: { type: GraphQLInt },
    total: { type: GraphQLInt },
    pages: { type: GraphQLInt },
    hasNext: { type: GraphQLBoolean },
    hasPrev: { type: GraphQLBoolean }
  }
});

const ProjectsConnectionType = new GraphQLObjectType({
  name: 'ProjectsConnection',
  fields: {
    projects: { type: new GraphQLList(ProjectType) },
    pagination: { type: PaginationInfoType },
    totalCount: { type: GraphQLInt }
  }
});

// Input types for mutations
const ProjectInputType = new GraphQLInputObjectType({
  name: 'ProjectInput',
  fields: {
    title: { type: new GraphQLNonNull(GraphQLString) },
    slug: { type: GraphQLString },
    description: { type: GraphQLString },
    shortDescription: { type: GraphQLString },
    content: { type: GraphQLString },
    status: { type: ProjectStatusEnum },
    featured: { type: GraphQLBoolean },
    isPublic: { type: GraphQLBoolean },
    imageUrl: { type: GraphQLString },
    thumbnailUrl: { type: GraphQLString },
    demoUrl: { type: GraphQLString },
    githubUrl: { type: GraphQLString },
    documentationUrl: { type: GraphQLString },
    startDate: { type: GraphQLDateTime },
    endDate: { type: GraphQLDateTime },
    client: { type: GraphQLString },
    role: { type: GraphQLString },
    teamSize: { type: GraphQLInt },
    budget: { type: GraphQLFloat },
    duration: { type: GraphQLString },
    challenges: { type: GraphQLString },
    solutions: { type: GraphQLString },
    lessons: { type: GraphQLString },
    technologies: { type: new GraphQLList(GraphQLString) },
    features: { type: new GraphQLList(GraphQLString) },
    tags: { type: new GraphQLList(GraphQLString) },
    skills: { type: new GraphQLList(GraphQLString) }
  }
});

const UserInputType = new GraphQLInputObjectType({
  name: 'UserInput',
  fields: {
    email: { type: GraphQLString },
    firstName: { type: GraphQLString },
    lastName: { type: GraphQLString },
    username: { type: GraphQLString },
    bio: { type: GraphQLString },
    website: { type: GraphQLString },
    location: { type: GraphQLString }
  }
});

// Query resolvers
const RootQuery = new GraphQLObjectType({
  name: 'RootQueryType',
  fields: {
    // Projects
    projects: {
      type: ProjectsConnectionType,
      args: {
        page: { type: GraphQLInt, defaultValue: 1 },
        limit: { type: GraphQLInt, defaultValue: 10 },
        search: { type: GraphQLString },
        category: { type: GraphQLString },
        technology: { type: GraphQLString },
        featured: { type: GraphQLBoolean },
        status: { type: ProjectStatusEnum },
        sortBy: { type: GraphQLString, defaultValue: 'createdAt' },
        sortOrder: { type: SortOrderEnum, defaultValue: 'DESC' }
      },
      resolve: async (parent, args, context) => {
        const { page, limit, search, category, technology, featured, status, sortBy, sortOrder } = args;
        const { user } = context;
        
        const where = {};
        const offset = (page - 1) * limit;
        const include = [
          {
            model: Tag,
            through: { attributes: [] },
            required: false
          },
          {
            model: Skill,
            through: { attributes: [] },
            required: false
          },
          {
            model: User,
            as: 'author',
            attributes: ['id', 'firstName', 'lastName', 'email']
          }
        ];

        // Apply visibility filters
        if (!user || user.role !== 'admin') {
          where.status = 'published';
          where.isPublic = true;
        } else if (status) {
          where.status = status;
        }

        // Apply search filters
        if (search) {
          where[Op.or] = [
            { title: { [Op.iLike]: `%${search}%` } },
            { description: { [Op.iLike]: `%${search}%` } }
          ];
        }

        if (category) {
          include[0].where = { name: { [Op.iLike]: `%${category}%` } };
          include[0].required = true;
        }

        if (technology) {
          include[1].where = { name: { [Op.iLike]: `%${technology}%` } };
          include[1].required = true;
        }

        if (featured !== undefined) {
          where.featured = featured;
        }

        try {
          const { count, rows: projects } = await Project.findAndCountAll({
            where,
            include,
            limit,
            offset,
            order: [[sortBy, sortOrder]],
            distinct: true
          });

          return {
            projects,
            pagination: {
              page,
              limit,
              total: count,
              pages: Math.ceil(count / limit),
              hasNext: page * limit < count,
              hasPrev: page > 1
            },
            totalCount: count
          };
        } catch (error) {
          logger.error('GraphQL projects query failed', { error: error.message });
          throw new Error('Failed to fetch projects');
        }
      }
    },
    
    project: {
      type: ProjectType,
      args: { 
        id: { type: GraphQLID },
        slug: { type: GraphQLString }
      },
      resolve: async (parent, args, context) => {
        const { id, slug } = args;
        const { user } = context;
        
        if (!id && !slug) {
          throw new Error('Either id or slug must be provided');
        }

        const where = id ? { id } : { slug };

        // Apply visibility filters
        if (!user || user.role !== 'admin') {
          where.status = 'published';
          where.isPublic = true;
        }

        try {
          const project = await Project.findOne({
            where,
            include: [
              {
                model: Tag,
                through: { attributes: [] }
              },
              {
                model: Skill,
                through: { attributes: [] }
              },
              {
                model: User,
                as: 'author',
                attributes: ['id', 'firstName', 'lastName', 'email']
              }
            ]
          });

          if (!project) {
            throw new Error('Project not found');
          }

          // Increment view count asynchronously
          project.increment('viewCount').catch(err => {
            logger.warn('Failed to increment view count', { projectId: project.id });
          });

          return project;
        } catch (error) {
          logger.error('GraphQL project query failed', { error: error.message });
          throw new Error('Failed to fetch project');
        }
      }
    },

    // Users
    users: {
      type: new GraphQLList(UserType),
      args: {
        limit: { type: GraphQLInt, defaultValue: 10 },
        role: { type: UserRoleEnum }
      },
      resolve: async (parent, args, context) => {
        const { user } = context;
        
        if (!user || user.role !== 'admin') {
          throw new Error('Access denied');
        }

        const { limit, role } = args;
        const where = {};
        
        if (role) {
          where.role = role;
        }

        try {
          return await User.findAll({
            where,
            limit,
            attributes: { exclude: ['password', 'refreshToken'] },
            order: [['createdAt', 'DESC']]
          });
        } catch (error) {
          logger.error('GraphQL users query failed', { error: error.message });
          throw new Error('Failed to fetch users');
        }
      }
    },

    me: {
      type: UserType,
      resolve: async (parent, args, context) => {
        const { user } = context;
        
        if (!user) {
          throw new Error('Not authenticated');
        }

        try {
          return await User.findByPk(user.id, {
            attributes: { exclude: ['password', 'refreshToken'] }
          });
        } catch (error) {
          logger.error('GraphQL me query failed', { error: error.message });
          throw new Error('Failed to fetch user profile');
        }
      }
    },

    // Skills and Tags
    skills: {
      type: new GraphQLList(SkillType),
      args: {
        category: { type: GraphQLString },
        limit: { type: GraphQLInt }
      },
      resolve: async (parent, args) => {
        const { category, limit } = args;
        const where = {};
        
        if (category) {
          where.category = category;
        }

        try {
          return await Skill.findAll({
            where,
            limit,
            order: [['name', 'ASC']]
          });
        } catch (error) {
          logger.error('GraphQL skills query failed', { error: error.message });
          throw new Error('Failed to fetch skills');
        }
      }
    },

    tags: {
      type: new GraphQLList(TagType),
      args: {
        limit: { type: GraphQLInt }
      },
      resolve: async (parent, args) => {
        const { limit } = args;

        try {
          return await Tag.findAll({
            limit,
            order: [['name', 'ASC']]
          });
        } catch (error) {
          logger.error('GraphQL tags query failed', { error: error.message });
          throw new Error('Failed to fetch tags');
        }
      }
    },

    // Resume data
    experience: {
      type: new GraphQLList(ExperienceType),
      resolve: async () => {
        try {
          return await Experience.findAll({
            order: [['startDate', 'DESC']]
          });
        } catch (error) {
          logger.error('GraphQL experience query failed', { error: error.message });
          throw new Error('Failed to fetch experience');
        }
      }
    },

    education: {
      type: new GraphQLList(EducationType),
      resolve: async () => {
        try {
          return await Education.findAll({
            order: [['startDate', 'DESC']]
          });
        } catch (error) {
          logger.error('GraphQL education query failed', { error: error.message });
          throw new Error('Failed to fetch education');
        }
      }
    },

    testimonials: {
      type: new GraphQLList(TestimonialType),
      args: {
        featured: { type: GraphQLBoolean },
        limit: { type: GraphQLInt }
      },
      resolve: async (parent, args) => {
        const { featured, limit } = args;
        const where = {};
        
        if (featured !== undefined) {
          where.featured = featured;
        }

        try {
          return await Testimonial.findAll({
            where,
            limit,
            include: [
              {
                model: Project,
                attributes: ['id', 'title', 'slug']
              }
            ],
            order: [['createdAt', 'DESC']]
          });
        } catch (error) {
          logger.error('GraphQL testimonials query failed', { error: error.message });
          throw new Error('Failed to fetch testimonials');
        }
      }
    }
  }
});

// Mutation resolvers
const RootMutation = new GraphQLObjectType({
  name: 'Mutation',
  fields: {
    createProject: {
      type: ProjectType,
      args: {
        input: { type: new GraphQLNonNull(ProjectInputType) }
      },
      resolve: async (parent, args, context) => {
        const { user } = context;
        
        if (!user || !['admin', 'editor'].includes(user.role)) {
          throw new Error('Access denied');
        }

        const { input } = args;

        try {
          // Generate slug if not provided
          const slug = input.slug || input.title.toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .substring(0, 100);

          // Check if slug is unique
          const existingProject = await Project.findOne({ where: { slug } });
          if (existingProject) {
            throw new Error('A project with this slug already exists');
          }

          const project = await Project.create({
            ...input,
            slug,
            authorId: user.id
          });

          // Associate tags and skills if provided
          if (input.tags && input.tags.length > 0) {
            const tagInstances = await Promise.all(
              input.tags.map(async (tagName) => {
                const [tag] = await Tag.findOrCreate({
                  where: { name: tagName.trim() },
                  defaults: { 
                    name: tagName.trim(),
                    slug: tagName.trim().toLowerCase().replace(/\s+/g, '-')
                  }
                });
                return tag;
              })
            );
            await project.setTags(tagInstances);
          }

          if (input.skills && input.skills.length > 0) {
            const skillInstances = await Promise.all(
              input.skills.map(async (skillName) => {
                const [skill] = await Skill.findOrCreate({
                  where: { name: skillName.trim() },
                  defaults: {
                    name: skillName.trim(),
                    category: 'development'
                  }
                });
                return skill;
              })
            );
            await project.setSkills(skillInstances);
          }

          return await Project.findByPk(project.id, {
            include: [
              { model: Tag, through: { attributes: [] } },
              { model: Skill, through: { attributes: [] } },
              { model: User, as: 'author', attributes: ['id', 'firstName', 'lastName'] }
            ]
          });
        } catch (error) {
          logger.error('GraphQL create project failed', { error: error.message });
          throw new Error('Failed to create project');
        }
      }
    },

    updateProject: {
      type: ProjectType,
      args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        input: { type: new GraphQLNonNull(ProjectInputType) }
      },
      resolve: async (parent, args, context) => {
        const { user } = context;
        
        if (!user || !['admin', 'editor'].includes(user.role)) {
          throw new Error('Access denied');
        }

        const { id, input } = args;

        try {
          const project = await Project.findByPk(id);
          if (!project) {
            throw new Error('Project not found');
          }

          await project.update(input);

          // Update associations if provided
          if (input.tags) {
            const tagInstances = await Promise.all(
              input.tags.map(async (tagName) => {
                const [tag] = await Tag.findOrCreate({
                  where: { name: tagName.trim() },
                  defaults: { 
                    name: tagName.trim(),
                    slug: tagName.trim().toLowerCase().replace(/\s+/g, '-')
                  }
                });
                return tag;
              })
            );
            await project.setTags(tagInstances);
          }

          if (input.skills) {
            const skillInstances = await Promise.all(
              input.skills.map(async (skillName) => {
                const [skill] = await Skill.findOrCreate({
                  where: { name: skillName.trim() },
                  defaults: {
                    name: skillName.trim(),
                    category: 'development'
                  }
                });
                return skill;
              })
            );
            await project.setSkills(skillInstances);
          }

          return await Project.findByPk(id, {
            include: [
              { model: Tag, through: { attributes: [] } },
              { model: Skill, through: { attributes: [] } },
              { model: User, as: 'author', attributes: ['id', 'firstName', 'lastName'] }
            ]
          });
        } catch (error) {
          logger.error('GraphQL update project failed', { error: error.message });
          throw new Error('Failed to update project');
        }
      }
    },

    deleteProject: {
      type: GraphQLBoolean,
      args: {
        id: { type: new GraphQLNonNull(GraphQLID) }
      },
      resolve: async (parent, args, context) => {
        const { user } = context;
        
        if (!user || user.role !== 'admin') {
          throw new Error('Access denied');
        }

        const { id } = args;

        try {
          const project = await Project.findByPk(id);
          if (!project) {
            throw new Error('Project not found');
          }

          await project.destroy();
          return true;
        } catch (error) {
          logger.error('GraphQL delete project failed', { error: error.message });
          throw new Error('Failed to delete project');
        }
      }
    },

    updateProfile: {
      type: UserType,
      args: {
        input: { type: new GraphQLNonNull(UserInputType) }
      },
      resolve: async (parent, args, context) => {
        const { user } = context;
        
        if (!user) {
          throw new Error('Not authenticated');
        }

        const { input } = args;

        try {
          const userRecord = await User.findByPk(user.id);
          if (!userRecord) {
            throw new Error('User not found');
          }

          await userRecord.update(input);

          return await User.findByPk(user.id, {
            attributes: { exclude: ['password', 'refreshToken'] }
          });
        } catch (error) {
          logger.error('GraphQL update profile failed', { error: error.message });
          throw new Error('Failed to update profile');
        }
      }
    }
  }
});

// Create GraphQL schema
const schema = new GraphQLSchema({
  query: RootQuery,
  mutation: RootMutation
});

// GraphQL endpoint with authentication context
router.use('/graphql', 
  optionalAuth, // Optional authentication
  graphqlHTTP((req) => ({
    schema: schema,
    context: {
      user: req.user, // Pass authenticated user to context
      req: req
    },
    graphiql: process.env.NODE_ENV !== 'production', // Enable GraphiQL in development
    customFormatErrorFn: (error) => {
      logger.error('GraphQL error', {
        error: error.message,
        stack: error.stack,
        path: error.path,
        source: error.source?.body
      });

      return {
        message: error.message,
        locations: error.locations,
        path: error.path,
        ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
      };
    }
  }))
);

module.exports = router;