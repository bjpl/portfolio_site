# Backend Architecture Design Document

## Executive Summary

This document outlines the production-ready backend architecture for the Hugo Portfolio Site, implementing a scalable, secure, and maintainable system using Node.js/Express with PostgreSQL database and Redis caching layer.

## Architecture Overview

### Technology Stack Decision Matrix

| Component | Options Considered | Selected | Rationale |
|-----------|-------------------|----------|-----------|
| **Backend Framework** | Express.js, Fastify, Next.js API, Koa.js | **Express.js** | Mature ecosystem, extensive middleware, team familiarity, excellent documentation |
| **Database** | PostgreSQL, MongoDB, MySQL, Firebase | **PostgreSQL** | ACID compliance, complex queries, JSON support, performance, open source |
| **Authentication** | JWT, OAuth2, Passport, Auth0 | **JWT + OAuth2** | Stateless, scalable, flexible, support for multiple providers |
| **Caching** | Redis, Memcached, In-memory | **Redis** | Persistence, data structures, pub/sub, session storage |
| **ORM** | Sequelize, Prisma, TypeORM, Knex | **Sequelize** | Mature, existing codebase, PostgreSQL support, migration system |

## Database Schema Design

### Core Entities

#### Users & Authentication
```sql
-- Users table with comprehensive profile support
users (
  id: UUID PRIMARY KEY,
  email: VARCHAR(255) UNIQUE NOT NULL,
  username: VARCHAR(100) UNIQUE,
  password_hash: VARCHAR(255),
  first_name: VARCHAR(100),
  last_name: VARCHAR(100),
  avatar_url: TEXT,
  bio: TEXT,
  website: VARCHAR(255),
  location: VARCHAR(255),
  timezone: VARCHAR(50),
  language: VARCHAR(10) DEFAULT 'en',
  email_verified: BOOLEAN DEFAULT false,
  is_active: BOOLEAN DEFAULT true,
  last_login: TIMESTAMP,
  password_reset_token: VARCHAR(255),
  password_reset_expires: TIMESTAMP,
  two_factor_enabled: BOOLEAN DEFAULT false,
  two_factor_secret: VARCHAR(255),
  created_at: TIMESTAMP DEFAULT NOW(),
  updated_at: TIMESTAMP DEFAULT NOW()
)

-- Roles for RBAC
roles (
  id: UUID PRIMARY KEY,
  name: VARCHAR(50) UNIQUE NOT NULL,
  description: TEXT,
  permissions: JSONB,
  is_system: BOOLEAN DEFAULT false,
  created_at: TIMESTAMP DEFAULT NOW(),
  updated_at: TIMESTAMP DEFAULT NOW()
)

-- User-Role junction table
user_roles (
  id: UUID PRIMARY KEY,
  user_id: UUID REFERENCES users(id) ON DELETE CASCADE,
  role_id: UUID REFERENCES roles(id) ON DELETE CASCADE,
  granted_by: UUID REFERENCES users(id),
  granted_at: TIMESTAMP DEFAULT NOW(),
  expires_at: TIMESTAMP,
  UNIQUE(user_id, role_id)
)
```

#### Portfolio Content
```sql
-- Projects/Portfolio items
projects (
  id: UUID PRIMARY KEY,
  user_id: UUID REFERENCES users(id) ON DELETE CASCADE,
  title: VARCHAR(255) NOT NULL,
  slug: VARCHAR(255) UNIQUE NOT NULL,
  description: TEXT,
  content: TEXT,
  featured_image: TEXT,
  gallery_images: JSONB,
  project_url: VARCHAR(255),
  repository_url: VARCHAR(255),
  demo_url: VARCHAR(255),
  client_name: VARCHAR(255),
  project_type: VARCHAR(100),
  status: VARCHAR(50) DEFAULT 'published',
  visibility: VARCHAR(20) DEFAULT 'public',
  start_date: DATE,
  end_date: DATE,
  featured: BOOLEAN DEFAULT false,
  sort_order: INTEGER DEFAULT 0,
  view_count: INTEGER DEFAULT 0,
  meta_title: VARCHAR(255),
  meta_description: TEXT,
  meta_keywords: TEXT,
  created_at: TIMESTAMP DEFAULT NOW(),
  updated_at: TIMESTAMP DEFAULT NOW(),
  published_at: TIMESTAMP
)

-- Blog posts
blog_posts (
  id: UUID PRIMARY KEY,
  user_id: UUID REFERENCES users(id) ON DELETE CASCADE,
  title: VARCHAR(255) NOT NULL,
  slug: VARCHAR(255) UNIQUE NOT NULL,
  excerpt: TEXT,
  content: TEXT NOT NULL,
  featured_image: TEXT,
  status: VARCHAR(50) DEFAULT 'draft',
  visibility: VARCHAR(20) DEFAULT 'public',
  featured: BOOLEAN DEFAULT false,
  allow_comments: BOOLEAN DEFAULT true,
  comment_count: INTEGER DEFAULT 0,
  view_count: INTEGER DEFAULT 0,
  reading_time: INTEGER,
  language: VARCHAR(10) DEFAULT 'en',
  meta_title: VARCHAR(255),
  meta_description: TEXT,
  meta_keywords: TEXT,
  created_at: TIMESTAMP DEFAULT NOW(),
  updated_at: TIMESTAMP DEFAULT NOW(),
  published_at: TIMESTAMP
)

-- Contact messages
contact_messages (
  id: UUID PRIMARY KEY,
  name: VARCHAR(255) NOT NULL,
  email: VARCHAR(255) NOT NULL,
  subject: VARCHAR(255),
  message: TEXT NOT NULL,
  phone: VARCHAR(50),
  company: VARCHAR(255),
  status: VARCHAR(50) DEFAULT 'new',
  priority: VARCHAR(20) DEFAULT 'normal',
  source: VARCHAR(100) DEFAULT 'website',
  user_agent: TEXT,
  ip_address: INET,
  referrer: TEXT,
  read_at: TIMESTAMP,
  replied_at: TIMESTAMP,
  created_at: TIMESTAMP DEFAULT NOW(),
  updated_at: TIMESTAMP DEFAULT NOW()
)

-- Media assets
media_assets (
  id: UUID PRIMARY KEY,
  user_id: UUID REFERENCES users(id) ON DELETE SET NULL,
  filename: VARCHAR(255) NOT NULL,
  original_filename: VARCHAR(255) NOT NULL,
  mime_type: VARCHAR(100) NOT NULL,
  file_size: BIGINT NOT NULL,
  width: INTEGER,
  height: INTEGER,
  alt_text: TEXT,
  caption: TEXT,
  storage_path: TEXT NOT NULL,
  storage_provider: VARCHAR(50) DEFAULT 'local',
  public_url: TEXT,
  thumbnail_url: TEXT,
  metadata: JSONB,
  usage_count: INTEGER DEFAULT 0,
  created_at: TIMESTAMP DEFAULT NOW(),
  updated_at: TIMESTAMP DEFAULT NOW()
)
```

#### Taxonomy & Organization
```sql
-- Tags for content organization
tags (
  id: UUID PRIMARY KEY,
  name: VARCHAR(100) UNIQUE NOT NULL,
  slug: VARCHAR(100) UNIQUE NOT NULL,
  description: TEXT,
  color: VARCHAR(7),
  usage_count: INTEGER DEFAULT 0,
  meta_title: VARCHAR(255),
  meta_description: TEXT,
  created_at: TIMESTAMP DEFAULT NOW(),
  updated_at: TIMESTAMP DEFAULT NOW()
)

-- Skills/Technologies
skills (
  id: UUID PRIMARY KEY,
  name: VARCHAR(100) UNIQUE NOT NULL,
  slug: VARCHAR(100) UNIQUE NOT NULL,
  category: VARCHAR(100),
  proficiency_level: INTEGER CHECK (proficiency_level >= 1 AND proficiency_level <= 10),
  years_experience: DECIMAL(3,1),
  description: TEXT,
  icon: VARCHAR(255),
  color: VARCHAR(7),
  usage_count: INTEGER DEFAULT 0,
  created_at: TIMESTAMP DEFAULT NOW(),
  updated_at: TIMESTAMP DEFAULT NOW()
)

-- Junction tables for many-to-many relationships
project_tags (
  project_id: UUID REFERENCES projects(id) ON DELETE CASCADE,
  tag_id: UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, tag_id)
)

project_skills (
  project_id: UUID REFERENCES projects(id) ON DELETE CASCADE,
  skill_id: UUID REFERENCES skills(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, skill_id)
)

blog_post_tags (
  blog_post_id: UUID REFERENCES blog_posts(id) ON DELETE CASCADE,
  tag_id: UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (blog_post_id, tag_id)
)
```

#### Content Management & Workflow
```sql
-- Content versions for draft/revision management
content_versions (
  id: UUID PRIMARY KEY,
  content_type: VARCHAR(50) NOT NULL, -- 'project', 'blog_post', etc.
  content_id: UUID NOT NULL,
  version_number: INTEGER NOT NULL,
  title: VARCHAR(255),
  content: TEXT,
  metadata: JSONB,
  status: VARCHAR(50) DEFAULT 'draft',
  created_by: UUID REFERENCES users(id),
  created_at: TIMESTAMP DEFAULT NOW(),
  UNIQUE(content_type, content_id, version_number)
)

-- Workflow states for content approval
workflow_states (
  id: UUID PRIMARY KEY,
  content_type: VARCHAR(50) NOT NULL,
  content_id: UUID NOT NULL,
  state: VARCHAR(50) NOT NULL,
  assigned_to: UUID REFERENCES users(id),
  notes: TEXT,
  due_date: TIMESTAMP,
  created_by: UUID REFERENCES users(id),
  created_at: TIMESTAMP DEFAULT NOW(),
  updated_at: TIMESTAMP DEFAULT NOW()
)

-- Audit logs
audit_logs (
  id: UUID PRIMARY KEY,
  user_id: UUID REFERENCES users(id),
  action: VARCHAR(100) NOT NULL,
  resource_type: VARCHAR(50),
  resource_id: UUID,
  old_values: JSONB,
  new_values: JSONB,
  ip_address: INET,
  user_agent: TEXT,
  created_at: TIMESTAMP DEFAULT NOW()
)
```

## API Architecture

### RESTful Endpoint Design

```
/api/v1/
├── auth/
│   ├── POST   /login
│   ├── POST   /logout
│   ├── POST   /refresh
│   ├── POST   /register
│   ├── POST   /forgot-password
│   ├── POST   /reset-password
│   ├── GET    /me
│   ├── PUT    /me
│   └── POST   /verify-2fa
├── users/
│   ├── GET    /
│   ├── GET    /:id
│   ├── PUT    /:id
│   ├── DELETE /:id
│   └── POST   /:id/roles
├── projects/
│   ├── GET    /           (public)
│   ├── GET    /:slug      (public)
│   ├── POST   /           (auth)
│   ├── PUT    /:id        (auth)
│   ├── DELETE /:id        (auth)
│   ├── POST   /:id/publish (auth)
│   └── POST   /:id/clone   (auth)
├── blog/
│   ├── GET    /           (public)
│   ├── GET    /:slug      (public)
│   ├── POST   /           (auth)
│   ├── PUT    /:id        (auth)
│   ├── DELETE /:id        (auth)
│   └── POST   /:id/publish (auth)
├── contact/
│   ├── POST   /messages   (public)
│   ├── GET    /messages   (auth)
│   ├── GET    /messages/:id (auth)
│   ├── PUT    /messages/:id (auth)
│   └── DELETE /messages/:id (auth)
├── media/
│   ├── POST   /upload     (auth)
│   ├── GET    /           (auth)
│   ├── GET    /:id        (auth)
│   ├── PUT    /:id        (auth)
│   ├── DELETE /:id        (auth)
│   └── POST   /optimize   (auth)
├── tags/
│   ├── GET    /           (public)
│   ├── POST   /           (auth)
│   ├── PUT    /:id        (auth)
│   └── DELETE /:id        (auth)
├── skills/
│   ├── GET    /           (public)
│   ├── POST   /           (auth)
│   ├── PUT    /:id        (auth)
│   └── DELETE /:id        (auth)
└── search/
    ├── GET    /           (public)
    └── POST   /reindex    (auth)
```

## Security Architecture

### Authentication & Authorization
- **JWT Tokens**: Access (15min) + Refresh (7 days)
- **Role-Based Access Control (RBAC)**: Admin, Editor, Author, Viewer
- **OAuth2 Integration**: Google, GitHub, LinkedIn
- **Two-Factor Authentication**: TOTP support
- **Password Policy**: bcrypt hashing, complexity requirements

### Security Middleware Stack
1. Helmet.js - Security headers
2. CORS - Cross-origin resource sharing
3. Rate limiting - API throttling
4. Input validation - Joi schemas
5. SQL injection prevention - Parameterized queries
6. XSS protection - Content sanitization
7. CSRF protection - Double submit cookies

## Performance & Scalability

### Caching Strategy
```
├── Redis Layers
│   ├── Session Store (TTL: 7 days)
│   ├── API Response Cache (TTL: 5-60 minutes)
│   ├── Database Query Cache (TTL: 15 minutes)
│   ├── Static Content Cache (TTL: 24 hours)
│   └── Search Index Cache (TTL: 1 hour)
└── Application-Level Caching
    ├── In-memory LRU cache for hot data
    └── CDN integration for media assets
```

### Database Optimization
- **Indexing Strategy**: Composite indexes for common queries
- **Connection Pooling**: Max 20 connections per instance
- **Query Optimization**: Eager loading, pagination, filtering
- **Backup Strategy**: Daily automated backups with 30-day retention

## Monitoring & Observability

### Health Checks
```javascript
/health - System health endpoint
├── Database connectivity
├── Redis connectivity  
├── Memory usage
├── Disk space
├── API response times
└── Error rates
```

### Logging Strategy
- **Application Logs**: Winston with daily rotation
- **Access Logs**: Morgan middleware
- **Error Tracking**: Sentry integration
- **Performance Metrics**: Custom metrics collection
- **Audit Trail**: All CRUD operations logged

## Deployment Architecture

### Environment Configuration
```
├── Development
│   ├── Local PostgreSQL
│   ├── Local Redis
│   └── Hot reloading
├── Staging
│   ├── Docker containers
│   ├── Managed database
│   └── Performance profiling
└── Production
    ├── Kubernetes deployment
    ├── Load balancer
    ├── Auto-scaling
    ├── SSL termination
    └── Monitoring stack
```

### CI/CD Pipeline
1. **Code Quality**: ESLint, Prettier, Jest tests
2. **Security Scanning**: npm audit, dependency check
3. **Database Migration**: Automated schema updates
4. **Docker Build**: Multi-stage container builds
5. **Deployment**: Blue-green deployment strategy
6. **Health Checks**: Post-deployment verification

## API Documentation

### OpenAPI 3.0 Specification
- **Interactive Documentation**: Swagger UI
- **Schema Validation**: Request/response validation
- **Code Generation**: Client SDK generation
- **Testing**: Automated API testing

## Error Handling Strategy

### Error Response Format
```javascript
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "field": "email",
      "message": "Invalid email format"
    },
    "timestamp": "2024-08-23T10:00:00Z",
    "requestId": "req-123-456-789"
  }
}
```

### Error Categories
- **4xx Client Errors**: Validation, authentication, authorization
- **5xx Server Errors**: Database, external service, internal logic
- **Custom Error Codes**: Business logic specific errors
- **Error Tracking**: All errors logged and monitored

## Future Considerations

### Scalability Improvements
- **Microservices Architecture**: Service decomposition
- **Event-Driven Architecture**: Message queues, event streaming
- **API Gateway**: Request routing, rate limiting, authentication
- **Database Sharding**: Horizontal partitioning for large datasets

### Feature Enhancements
- **Real-time Features**: WebSocket support for live updates
- **Search Enhancement**: Elasticsearch integration
- **Analytics**: User behavior tracking and reporting
- **Multi-tenancy**: Support for multiple portfolio sites
- **Internationalization**: Full i18n support for multiple languages

## Conclusion

This backend architecture provides a solid foundation for a production-ready portfolio site with:
- **Scalability**: Horizontal scaling support with caching and optimization
- **Security**: Comprehensive security measures and best practices
- **Maintainability**: Clean code structure and comprehensive documentation
- **Performance**: Optimized queries, caching, and monitoring
- **Reliability**: Error handling, logging, and health monitoring

The architecture supports current requirements while providing flexibility for future enhancements and scaling needs.