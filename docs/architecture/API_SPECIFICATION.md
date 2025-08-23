# Portfolio Site API Specification

## Overview

This document provides a comprehensive overview of the Portfolio Site RESTful API, including all endpoints, request/response schemas, authentication requirements, and usage examples.

## Base URL

```
Production: https://api.your-domain.com
Development: http://localhost:3001
```

## API Versioning

All API endpoints are versioned with the `/api/v1` prefix:

```
https://api.your-domain.com/api/v1/
```

## Authentication

### JWT Bearer Token

Most endpoints require authentication via JWT Bearer tokens:

```http
Authorization: Bearer <your-jwt-token>
```

### API Key Authentication

Some endpoints support API key authentication for server-to-server communication:

```http
X-API-Key: <your-api-key>
```

## Response Format

All API responses follow a consistent structure:

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data
  },
  "pagination": {
    // Pagination info (for paginated responses)
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  },
  "message": "Operation completed successfully"
}
```

### Error Response
```json
{
  "success": false,
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

## Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Request data validation failed |
| `AUTHENTICATION_ERROR` | 401 | Authentication required or failed |
| `AUTHORIZATION_ERROR` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT_ERROR` | 409 | Resource already exists or conflicts |
| `RATE_LIMIT_ERROR` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Internal server error |

## Rate Limiting

API rate limits are applied per IP address and user:

- **Public endpoints**: 100 requests per 15 minutes
- **Authenticated users**: 1000 requests per 15 minutes
- **Admin users**: 5000 requests per 15 minutes

Rate limit headers are included in responses:

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1629825600
```

## Pagination

Paginated endpoints support the following query parameters:

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `sortBy`: Sort field (default varies by endpoint)
- `sortOrder`: Sort direction - `ASC` or `DESC` (default: `DESC`)

## API Endpoints

### Authentication Endpoints

#### POST /api/v1/auth/login
Login with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "roles": ["author"]
    },
    "tokens": {
      "accessToken": "jwt-access-token",
      "refreshToken": "jwt-refresh-token",
      "expiresIn": 3600
    }
  }
}
```

#### POST /api/v1/auth/refresh
Refresh access token using refresh token.

#### POST /api/v1/auth/logout
Logout and invalidate tokens.

#### GET /api/v1/auth/me
Get current user information (requires authentication).

### Projects Endpoints

#### GET /api/v1/projects
Get all projects with filtering and pagination.

**Query Parameters:**
- `page`: Page number
- `limit`: Items per page
- `status`: Filter by status (`draft`, `published`, `archived`)
- `featured`: Filter featured projects (`true`/`false`)
- `search`: Search in title and description
- `tags`: Comma-separated tag slugs
- `skills`: Comma-separated skill slugs

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "E-Commerce Platform",
      "slug": "ecommerce-platform",
      "description": "Full-featured e-commerce solution",
      "content": "Detailed project content...",
      "featuredImage": "https://example.com/image.jpg",
      "projectUrl": "https://demo.example.com",
      "repositoryUrl": "https://github.com/user/project",
      "status": "published",
      "featured": true,
      "tags": [
        {
          "id": "uuid",
          "name": "React",
          "slug": "react"
        }
      ],
      "skills": [
        {
          "id": "uuid",
          "name": "JavaScript",
          "slug": "javascript"
        }
      ],
      "createdAt": "2024-08-23T10:00:00Z",
      "updatedAt": "2024-08-23T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "pages": 1
  }
}
```

#### GET /api/v1/projects/featured
Get featured projects.

#### GET /api/v1/projects/{slug}
Get project by slug.

#### POST /api/v1/projects
Create a new project (requires authentication).

**Request:**
```json
{
  "title": "New Project",
  "description": "Project description",
  "content": "Detailed project content",
  "projectType": "web",
  "status": "draft",
  "tags": ["react", "nodejs"],
  "skills": ["javascript", "html", "css"]
}
```

#### PUT /api/v1/projects/{id}
Update a project (requires authentication and ownership).

#### DELETE /api/v1/projects/{id}
Delete a project (requires authentication and ownership).

#### POST /api/v1/projects/{id}/publish
Publish a project (requires authentication).

#### POST /api/v1/projects/{id}/feature
Feature a project (requires admin role).

### Blog Posts Endpoints

#### GET /api/v1/blog
Get all blog posts with filtering and pagination.

**Query Parameters:**
- `page`: Page number
- `limit`: Items per page
- `status`: Filter by status (`draft`, `published`, `archived`)
- `featured`: Filter featured posts
- `search`: Search in title, excerpt, and content
- `tags`: Filter by tags
- `author`: Filter by author ID

#### GET /api/v1/blog/{slug}
Get blog post by slug.

#### POST /api/v1/blog
Create a new blog post (requires authentication).

**Request:**
```json
{
  "title": "Understanding Modern Web Development",
  "excerpt": "A comprehensive guide to modern web development",
  "content": "Blog post content in Markdown format...",
  "status": "draft",
  "tags": ["web-development", "javascript"],
  "metaTitle": "SEO optimized title",
  "metaDescription": "SEO description",
  "featuredImage": "https://example.com/featured-image.jpg"
}
```

#### PUT /api/v1/blog/{id}
Update a blog post (requires authentication and ownership).

#### DELETE /api/v1/blog/{id}
Delete a blog post (requires authentication and ownership).

#### POST /api/v1/blog/{id}/publish
Publish a blog post.

### Contact Messages Endpoints

#### POST /api/v1/contact/messages
Submit a contact form message.

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "subject": "Project Inquiry",
  "message": "I'd like to discuss a potential project...",
  "phone": "+1234567890",
  "company": "Acme Corp"
}
```

#### GET /api/v1/contact/messages
Get contact messages (requires admin authentication).

**Query Parameters:**
- `page`: Page number
- `limit`: Items per page
- `status`: Filter by status (`new`, `read`, `replied`)
- `dateFrom`: Filter from date
- `dateTo`: Filter to date

#### GET /api/v1/contact/messages/{id}
Get specific contact message (requires admin authentication).

#### PUT /api/v1/contact/messages/{id}
Update contact message status (requires admin authentication).

### Media Management Endpoints

#### POST /api/v1/media/upload
Upload media files (requires authentication).

**Request:** Multipart form data
- `files`: File(s) to upload
- `altText`: Alt text for images
- `caption`: Caption for media

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "filename": "image-123.jpg",
      "originalFilename": "my-image.jpg",
      "mimeType": "image/jpeg",
      "fileSize": 1024000,
      "width": 1920,
      "height": 1080,
      "publicUrl": "https://example.com/uploads/images/image-123.jpg",
      "thumbnailUrl": [
        {
          "name": "thumb",
          "width": 150,
          "height": 150,
          "url": "https://example.com/uploads/thumbnails/image-123-thumb.webp"
        }
      ]
    }
  ]
}
```

#### GET /api/v1/media
Get media assets (requires authentication).

**Query Parameters:**
- `page`: Page number
- `limit`: Items per page
- `fileType`: Filter by file type (`image`, `document`, `video`)
- `search`: Search in filename and alt text

#### PUT /api/v1/media/{id}
Update media asset metadata (requires authentication).

#### DELETE /api/v1/media/{id}
Delete media asset (requires authentication).

### Tags Endpoints

#### GET /api/v1/tags
Get all tags.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "React",
      "slug": "react",
      "description": "React JavaScript library",
      "color": "#61DAFB",
      "usageCount": 15
    }
  ]
}
```

#### POST /api/v1/tags
Create a new tag (requires authentication).

#### PUT /api/v1/tags/{id}
Update a tag (requires admin authentication).

#### DELETE /api/v1/tags/{id}
Delete a tag (requires admin authentication).

### Skills Endpoints

#### GET /api/v1/skills
Get all skills.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "JavaScript",
      "slug": "javascript",
      "category": "Programming Languages",
      "proficiencyLevel": 9,
      "yearsExperience": 5.5,
      "description": "Modern JavaScript and ES6+",
      "icon": "javascript-icon.svg"
    }
  ]
}
```

#### POST /api/v1/skills
Create a new skill (requires authentication).

#### PUT /api/v1/skills/{id}
Update a skill (requires admin authentication).

#### DELETE /api/v1/skills/{id}
Delete a skill (requires admin authentication).

### Search Endpoints

#### GET /api/v1/search
Global search across projects, blog posts, and other content.

**Query Parameters:**
- `q`: Search query (required)
- `type`: Content type filter (`project`, `blog_post`, `all`)
- `limit`: Number of results (default: 20)

**Response:**
```json
{
  "success": true,
  "data": {
    "query": "javascript react",
    "results": [
      {
        "type": "project",
        "id": "uuid",
        "title": "React E-Commerce App",
        "excerpt": "Modern e-commerce built with React and JavaScript",
        "url": "/projects/react-ecommerce-app",
        "score": 0.95
      }
    ],
    "total": 1,
    "executionTime": "12ms"
  }
}
```

#### POST /api/v1/search/reindex
Reindex search data (requires admin authentication).

### Health Check Endpoints

#### GET /api/v1/health
Get system health status.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-08-23T10:00:00Z",
    "uptime": 3600,
    "version": "1.0.0",
    "services": {
      "database": {
        "status": "healthy",
        "connection": "active",
        "responseTime": "5ms"
      },
      "cache": {
        "status": "healthy",
        "redis": true,
        "memory": true
      },
      "search": {
        "status": "healthy",
        "indexed": true
      }
    },
    "system": {
      "node": "v18.17.0",
      "platform": "linux",
      "memory": {
        "used": 268435456,
        "total": 1073741824
      },
      "cpu": {
        "user": 1000000,
        "system": 500000
      }
    }
  }
}
```

### User Management Endpoints (Admin Only)

#### GET /api/v1/users
Get all users (requires admin role).

#### GET /api/v1/users/{id}
Get user by ID (requires admin role or ownership).

#### PUT /api/v1/users/{id}
Update user (requires admin role or ownership).

#### DELETE /api/v1/users/{id}
Delete user (requires admin role).

#### POST /api/v1/users/{id}/roles
Assign roles to user (requires admin role).

## Webhook Support

### Webhook Events

The API can send webhooks for various events:

- `project.created`
- `project.published`
- `blog_post.published`
- `contact.message_received`
- `user.registered`

### Webhook Payload

```json
{
  "event": "project.published",
  "timestamp": "2024-08-23T10:00:00Z",
  "data": {
    // Event-specific data
  }
}
```

## SDK Examples

### JavaScript/Node.js

```javascript
const PortfolioAPI = require('@portfolio/api-client');

const api = new PortfolioAPI({
  baseURL: 'https://api.your-domain.com',
  apiKey: 'your-api-key'
});

// Get all projects
const projects = await api.projects.getAll({
  status: 'published',
  featured: true
});

// Create a new project
const newProject = await api.projects.create({
  title: 'My New Project',
  description: 'Project description',
  tags: ['react', 'nodejs']
});
```

### cURL Examples

```bash
# Get all projects
curl -X GET "https://api.your-domain.com/api/v1/projects" \
  -H "Accept: application/json"

# Create a new project
curl -X POST "https://api.your-domain.com/api/v1/projects" \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My New Project",
    "description": "Project description"
  }'

# Upload an image
curl -X POST "https://api.your-domain.com/api/v1/media/upload" \
  -H "Authorization: Bearer your-jwt-token" \
  -F "files=@image.jpg" \
  -F "altText=Project screenshot"
```

## OpenAPI Specification

The complete OpenAPI 3.0 specification is available at:

```
https://api.your-domain.com/api-docs.json
```

Interactive API documentation:

```
https://api.your-domain.com/api-docs
```

## Testing

### Test Environment

A test environment is available for API testing:

```
Base URL: https://api-test.your-domain.com
```

### Test Data

The test environment includes sample data:
- Test user accounts
- Sample projects and blog posts
- Demo media assets

### API Keys

Test API keys can be generated through the admin panel in the test environment.

## Support

For API support, please:

1. Check this documentation
2. Review the interactive API docs
3. Search existing issues on GitHub
4. Contact support at api-support@your-domain.com

## Changelog

### Version 1.0.0 (2024-08-23)
- Initial API release
- Projects, blog posts, and media management
- Authentication and authorization
- Search functionality
- Admin panel endpoints

This specification provides a comprehensive overview of the Portfolio Site API. For the most up-to-date information, always refer to the interactive API documentation.