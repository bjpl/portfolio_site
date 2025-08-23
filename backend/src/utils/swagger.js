const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const config = require('../config');

// Swagger definition
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: config.api.documentation.title,
    version: config.api.documentation.version,
    description: config.api.documentation.description,
    contact: {
      name: 'API Support',
      url: 'https://portfolio-cms.com/support',
      email: 'support@portfolio-cms.com'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: `http://${config.server.host}:${config.server.port}${config.api.prefix}`,
      description: 'Development server'
    },
    {
      url: `https://api.portfolio-cms.com${config.api.prefix}`,
      description: 'Production server'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      },
      apiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key'
      }
    },
    schemas: {
      // Common schemas
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'string',
            description: 'Error message'
          },
          message: {
            type: 'string',
            description: 'Detailed error message'
          },
          code: {
            type: 'string',
            description: 'Error code'
          }
        }
      },
      Pagination: {
        type: 'object',
        properties: {
          page: {
            type: 'integer',
            description: 'Current page number'
          },
          limit: {
            type: 'integer',
            description: 'Items per page'
          },
          total: {
            type: 'integer',
            description: 'Total number of items'
          },
          totalPages: {
            type: 'integer',
            description: 'Total number of pages'
          }
        }
      },
      // User schemas
      User: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'User ID'
          },
          username: {
            type: 'string',
            description: 'Username'
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'Email address'
          },
          firstName: {
            type: 'string',
            description: 'First name'
          },
          lastName: {
            type: 'string',
            description: 'Last name'
          },
          role: {
            type: 'string',
            enum: ['admin', 'editor', 'author', 'viewer'],
            description: 'User role'
          },
          avatar: {
            type: 'string',
            format: 'uri',
            description: 'Avatar URL'
          },
          bio: {
            type: 'string',
            description: 'User biography'
          },
          website: {
            type: 'string',
            format: 'uri',
            description: 'User website'
          },
          social: {
            type: 'object',
            properties: {
              twitter: { type: 'string' },
              linkedin: { type: 'string' },
              github: { type: 'string' },
              instagram: { type: 'string' }
            }
          },
          isActive: {
            type: 'boolean',
            description: 'Account status'
          },
          isEmailVerified: {
            type: 'boolean',
            description: 'Email verification status'
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Creation timestamp'
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Last update timestamp'
          }
        }
      },
      // Portfolio schemas
      Portfolio: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Portfolio ID'
          },
          title: {
            type: 'string',
            description: 'Portfolio title'
          },
          subtitle: {
            type: 'string',
            description: 'Portfolio subtitle'
          },
          description: {
            type: 'string',
            description: 'Portfolio description'
          },
          bio: {
            type: 'string',
            description: 'Personal biography'
          },
          slug: {
            type: 'string',
            description: 'URL slug'
          },
          contact: {
            type: 'object',
            properties: {
              email: { type: 'string', format: 'email' },
              phone: { type: 'string' },
              address: { type: 'string' },
              website: { type: 'string', format: 'uri' }
            }
          },
          social: {
            type: 'object',
            properties: {
              linkedin: { type: 'string' },
              github: { type: 'string' },
              twitter: { type: 'string' },
              instagram: { type: 'string' },
              facebook: { type: 'string' },
              youtube: { type: 'string' },
              website: { type: 'string' }
            }
          },
          theme: {
            type: 'object',
            properties: {
              primaryColor: { type: 'string' },
              secondaryColor: { type: 'string' },
              accentColor: { type: 'string' },
              backgroundColor: { type: 'string' },
              textColor: { type: 'string' },
              fontFamily: { type: 'string' }
            }
          },
          layout: {
            type: 'object',
            properties: {
              template: { type: 'string' },
              sections: {
                type: 'array',
                items: { type: 'string' }
              },
              customCSS: { type: 'string' }
            }
          },
          isPublic: {
            type: 'boolean',
            description: 'Public visibility status'
          },
          status: {
            type: 'string',
            enum: ['draft', 'published', 'archived'],
            description: 'Portfolio status'
          },
          seoTitle: {
            type: 'string',
            description: 'SEO title'
          },
          seoDescription: {
            type: 'string',
            description: 'SEO description'
          },
          createdAt: {
            type: 'string',
            format: 'date-time'
          },
          updatedAt: {
            type: 'string',
            format: 'date-time'
          },
          publishedAt: {
            type: 'string',
            format: 'date-time'
          }
        }
      },
      CreatePortfolio: {
        type: 'object',
        required: ['title', 'description'],
        properties: {
          title: {
            type: 'string',
            minLength: 1,
            maxLength: 200
          },
          subtitle: {
            type: 'string',
            maxLength: 300
          },
          description: {
            type: 'string',
            minLength: 1
          },
          bio: {
            type: 'string'
          },
          contact: {
            type: 'object',
            properties: {
              email: { type: 'string', format: 'email' },
              phone: { type: 'string' },
              address: { type: 'string' },
              website: { type: 'string', format: 'uri' }
            }
          },
          social: {
            type: 'object',
            properties: {
              linkedin: { type: 'string', format: 'uri' },
              github: { type: 'string', format: 'uri' },
              twitter: { type: 'string', format: 'uri' },
              instagram: { type: 'string', format: 'uri' }
            }
          },
          theme: {
            type: 'object',
            properties: {
              primaryColor: {
                type: 'string',
                pattern: '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$'
              }
            }
          },
          isPublic: {
            type: 'boolean',
            default: false
          }
        }
      },
      UpdatePortfolio: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            minLength: 1,
            maxLength: 200
          },
          subtitle: {
            type: 'string',
            maxLength: 300
          },
          description: {
            type: 'string',
            minLength: 1
          },
          bio: {
            type: 'string'
          },
          isPublic: {
            type: 'boolean'
          }
        }
      },
      PortfolioDetail: {
        allOf: [
          { $ref: '#/components/schemas/Portfolio' },
          {
            type: 'object',
            properties: {
              projects: {
                type: 'array',
                items: { $ref: '#/components/schemas/Project' }
              },
              experiences: {
                type: 'array',
                items: { $ref: '#/components/schemas/Experience' }
              },
              education: {
                type: 'array',
                items: { $ref: '#/components/schemas/Education' }
              },
              skillsByCategory: {
                type: 'object',
                additionalProperties: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Skill' }
                }
              }
            }
          }
        ]
      },
      // Project schemas
      Project: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid'
          },
          title: {
            type: 'string'
          },
          slug: {
            type: 'string'
          },
          description: {
            type: 'string'
          },
          shortDescription: {
            type: 'string'
          },
          content: {
            type: 'string'
          },
          technologies: {
            type: 'array',
            items: { type: 'string' }
          },
          category: {
            type: 'string',
            enum: ['web', 'mobile', 'desktop', 'api', 'library', 'tool', 'other']
          },
          status: {
            type: 'string',
            enum: ['planning', 'in-progress', 'completed', 'on-hold', 'cancelled']
          },
          priority: {
            type: 'string',
            enum: ['low', 'medium', 'high', 'critical']
          },
          startDate: {
            type: 'string',
            format: 'date'
          },
          endDate: {
            type: 'string',
            format: 'date'
          },
          links: {
            type: 'object',
            properties: {
              live: { type: 'string', format: 'uri' },
              demo: { type: 'string', format: 'uri' },
              github: { type: 'string', format: 'uri' },
              documentation: { type: 'string', format: 'uri' }
            }
          },
          images: {
            type: 'object',
            properties: {
              thumbnail: { type: 'string', format: 'uri' },
              gallery: {
                type: 'array',
                items: { type: 'string', format: 'uri' }
              },
              featured: { type: 'string', format: 'uri' }
            }
          },
          featured: {
            type: 'boolean'
          },
          isPublic: {
            type: 'boolean'
          },
          createdAt: {
            type: 'string',
            format: 'date-time'
          },
          updatedAt: {
            type: 'string',
            format: 'date-time'
          }
        }
      },
      // Experience schemas
      Experience: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid'
          },
          title: {
            type: 'string'
          },
          company: {
            type: 'string'
          },
          location: {
            type: 'object',
            properties: {
              city: { type: 'string' },
              state: { type: 'string' },
              country: { type: 'string' },
              remote: { type: 'boolean' }
            }
          },
          type: {
            type: 'string',
            enum: ['full-time', 'part-time', 'contract', 'freelance', 'internship', 'volunteer']
          },
          startDate: {
            type: 'string',
            format: 'date'
          },
          endDate: {
            type: 'string',
            format: 'date'
          },
          current: {
            type: 'boolean'
          },
          description: {
            type: 'string'
          },
          achievements: {
            type: 'array',
            items: { type: 'string' }
          },
          responsibilities: {
            type: 'array',
            items: { type: 'string' }
          },
          featured: {
            type: 'boolean'
          },
          isPublic: {
            type: 'boolean'
          },
          createdAt: {
            type: 'string',
            format: 'date-time'
          },
          updatedAt: {
            type: 'string',
            format: 'date-time'
          }
        }
      },
      // Education schemas
      Education: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid'
          },
          institution: {
            type: 'string'
          },
          degree: {
            type: 'string'
          },
          field: {
            type: 'string'
          },
          level: {
            type: 'string',
            enum: ['certificate', 'associate', 'bachelor', 'master', 'doctorate', 'other']
          },
          startDate: {
            type: 'string',
            format: 'date'
          },
          endDate: {
            type: 'string',
            format: 'date'
          },
          current: {
            type: 'boolean'
          },
          description: {
            type: 'string'
          },
          achievements: {
            type: 'array',
            items: { type: 'string' }
          },
          featured: {
            type: 'boolean'
          },
          isPublic: {
            type: 'boolean'
          },
          createdAt: {
            type: 'string',
            format: 'date-time'
          },
          updatedAt: {
            type: 'string',
            format: 'date-time'
          }
        }
      },
      // Skill schemas
      Skill: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid'
          },
          name: {
            type: 'string'
          },
          slug: {
            type: 'string'
          },
          category: {
            type: 'string',
            enum: ['programming', 'framework', 'database', 'tool', 'language', 'soft-skill', 'certification', 'other']
          },
          type: {
            type: 'string',
            enum: ['technical', 'soft', 'language', 'certification']
          },
          proficiencyLevel: {
            type: 'string',
            enum: ['beginner', 'intermediate', 'advanced', 'expert']
          },
          description: {
            type: 'string'
          },
          icon: {
            type: 'string',
            format: 'uri'
          },
          color: {
            type: 'string',
            pattern: '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$'
          },
          website: {
            type: 'string',
            format: 'uri'
          },
          isActive: {
            type: 'boolean'
          },
          sortOrder: {
            type: 'integer'
          }
        }
      },
      // Workflow schemas
      WorkflowItem: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid'
          },
          title: {
            type: 'string'
          },
          description: {
            type: 'string'
          },
          type: {
            type: 'string',
            enum: ['approval', 'review', 'task', 'bug', 'feature']
          },
          entityType: {
            type: 'string',
            enum: ['portfolio', 'project', 'experience', 'education', 'content']
          },
          entityId: {
            type: 'string',
            format: 'uuid'
          },
          status: {
            type: 'string',
            enum: ['pending', 'in-progress', 'review', 'approved', 'rejected', 'completed', 'cancelled']
          },
          priority: {
            type: 'string',
            enum: ['low', 'medium', 'high', 'critical']
          },
          assignedTo: {
            type: 'string',
            format: 'uuid'
          },
          createdBy: {
            type: 'string',
            format: 'uuid'
          },
          dueDate: {
            type: 'string',
            format: 'date-time'
          },
          completedAt: {
            type: 'string',
            format: 'date-time'
          },
          createdAt: {
            type: 'string',
            format: 'date-time'
          },
          updatedAt: {
            type: 'string',
            format: 'date-time'
          }
        }
      },
      // Content Version schemas
      ContentVersion: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid'
          },
          entityType: {
            type: 'string',
            enum: ['portfolio', 'project', 'experience', 'education', 'skill']
          },
          entityId: {
            type: 'string',
            format: 'uuid'
          },
          version: {
            type: 'integer'
          },
          title: {
            type: 'string'
          },
          description: {
            type: 'string'
          },
          changeType: {
            type: 'string',
            enum: ['create', 'update', 'delete', 'restore', 'merge']
          },
          changes: {
            type: 'object'
          },
          diff: {
            type: 'string'
          },
          status: {
            type: 'string',
            enum: ['draft', 'pending', 'approved', 'rejected']
          },
          createdBy: {
            type: 'string',
            format: 'uuid'
          },
          approvedBy: {
            type: 'string',
            format: 'uuid'
          },
          approvedAt: {
            type: 'string',
            format: 'date-time'
          },
          createdAt: {
            type: 'string',
            format: 'date-time'
          }
        }
      }
    },
    responses: {
      NotFound: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' }
          }
        }
      },
      Unauthorized: {
        description: 'Unauthorized access',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' }
          }
        }
      },
      Forbidden: {
        description: 'Access forbidden',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' }
          }
        }
      },
      ValidationError: {
        description: 'Validation error',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                errors: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      field: { type: 'string' },
                      message: { type: 'string' },
                      value: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      InternalServerError: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' }
          }
        }
      }
    }
  },
  tags: [
    {
      name: 'Authentication',
      description: 'User authentication and authorization'
    },
    {
      name: 'Users',
      description: 'User management'
    },
    {
      name: 'Portfolios',
      description: 'Portfolio management'
    },
    {
      name: 'Projects',
      description: 'Project management'
    },
    {
      name: 'Experiences',
      description: 'Work experience management'
    },
    {
      name: 'Education',
      description: 'Education management'
    },
    {
      name: 'Skills',
      description: 'Skills management'
    },
    {
      name: 'Workflow',
      description: 'Workflow and approval system'
    },
    {
      name: 'Versions',
      description: 'Content versioning and revision control'
    },
    {
      name: 'Search',
      description: 'Search functionality'
    },
    {
      name: 'System',
      description: 'System health and monitoring'
    }
  ]
};

// Swagger options
const swaggerOptions = {
  definition: swaggerDefinition,
  apis: [
    './src/routes/api/*.js',
    './src/routes/auth/*.js',
    './src/routes/admin/*.js',
    './src/controllers/*.js'
  ]
};

// Generate swagger spec
const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Swagger UI options
const swaggerUiOptions = {
  customCss: `
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info { margin: 50px 0; }
    .swagger-ui .scheme-container { background: #fafafa; }
  `,
  customSiteTitle: config.api.documentation.title,
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    defaultModelsExpandDepth: 1,
    defaultModelExpandDepth: 1,
    docExpansion: 'none',
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    tryItOutEnabled: true
  }
};

module.exports = {
  swaggerSpec,
  swaggerUi,
  swaggerUiOptions,
  serve: swaggerUi.serve,
  setup: swaggerUi.setup(swaggerSpec, swaggerUiOptions)
};