# API Documentation - Portfolio Site

## Table of Contents
1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Base URL](#base-url)
4. [Rate Limiting](#rate-limiting)
5. [API Endpoints](#api-endpoints)
6. [Error Handling](#error-handling)
7. [Examples](#examples)

## Overview

The Portfolio Site API provides a comprehensive RESTful interface for managing portfolio content, media assets, user authentication, and content versioning. Built with Express.js and backed by a PostgreSQL database, the API supports full CRUD operations with role-based access control.

### Key Features
- JWT-based authentication with refresh tokens
- Content versioning and audit logging
- Media management with CDN integration
- Real-time updates via WebSocket
- Multi-language content support
- Workflow management for content approval

## Authentication

### Authentication Flow
The API uses JWT (JSON Web Token) authentication with refresh tokens for secure access.

```javascript
// Authentication Header
Authorization: Bearer <access_token>
```

### Login Endpoint
**POST** `/api/auth/login`

Request:
```json
{
  "email": "user@example.com",
  "password": "secure_password"
}
```

Response:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "refresh_token_here",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "admin",
    "name": "John Doe"
  }
}
```

### Refresh Token
**POST** `/api/auth/refresh`

Request:
```json
{
  "refreshToken": "refresh_token_here"
}
```

## Base URL

- **Development**: `http://localhost:3000/api`
- **Production**: `https://your-domain.com/api`
- **Staging**: `https://staging.your-domain.com/api`

## Rate Limiting

- **Anonymous users**: 100 requests per 15 minutes
- **Authenticated users**: 1000 requests per 15 minutes
- **Admin users**: 5000 requests per 15 minutes

Headers returned:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Time when limit resets (Unix timestamp)

## API Endpoints

### Content Management

#### Portfolio Items

**GET** `/api/portfolio`
- Retrieve all portfolio items
- Query parameters:
  - `limit` (number): Items per page (default: 10)
  - `offset` (number): Pagination offset
  - `category` (string): Filter by category
  - `status` (string): Filter by status (draft, published, archived)

**GET** `/api/portfolio/:id`
- Retrieve specific portfolio item
- Returns full details including versions

**POST** `/api/portfolio`
- Create new portfolio item
- Requires: Admin or Editor role

Request body:
```json
{
  "title": "Project Title",
  "description": "Project description",
  "category": "web-development",
  "technologies": ["React", "Node.js", "PostgreSQL"],
  "imageUrl": "https://cdn.example.com/image.jpg",
  "projectUrl": "https://project.example.com",
  "githubUrl": "https://github.com/user/project",
  "featured": true,
  "order": 1,
  "metadata": {
    "client": "Client Name",
    "duration": "3 months",
    "team_size": 5
  }
}
```

**PUT** `/api/portfolio/:id`
- Update portfolio item
- Creates new version automatically
- Requires: Admin or Editor role

**DELETE** `/api/portfolio/:id`
- Soft delete portfolio item
- Requires: Admin role

#### Blog Posts

**GET** `/api/blog`
- Retrieve blog posts
- Query parameters:
  - `limit` (number): Posts per page
  - `offset` (number): Pagination offset
  - `tag` (string): Filter by tag
  - `author` (string): Filter by author
  - `status` (string): Filter by status

**GET** `/api/blog/:slug`
- Retrieve specific blog post by slug

**POST** `/api/blog`
- Create new blog post
- Requires: Admin or Editor role

Request body:
```json
{
  "title": "Blog Post Title",
  "slug": "blog-post-title",
  "content": "Markdown content here",
  "excerpt": "Brief excerpt",
  "author": "Author Name",
  "tags": ["technology", "tutorial"],
  "featuredImage": "https://cdn.example.com/blog-image.jpg",
  "publishedAt": "2024-01-15T10:00:00Z",
  "status": "draft",
  "metadata": {
    "readTime": "5 min",
    "views": 0,
    "likes": 0
  }
}
```

**PUT** `/api/blog/:id`
- Update blog post
- Creates version history

**DELETE** `/api/blog/:id`
- Archive blog post

### Media Management

**POST** `/api/media/upload`
- Upload media file
- Supports: images, videos, documents
- Max file size: 50MB

Request (multipart/form-data):
```
file: [binary data]
type: "image" | "video" | "document"
alt: "Alternative text"
caption: "Media caption"
```

Response:
```json
{
  "success": true,
  "file": {
    "id": "media_123",
    "url": "https://cdn.example.com/media/file.jpg",
    "thumbnailUrl": "https://cdn.example.com/media/thumb_file.jpg",
    "type": "image",
    "size": 2048576,
    "dimensions": {
      "width": 1920,
      "height": 1080
    },
    "metadata": {
      "alt": "Alternative text",
      "caption": "Media caption"
    }
  }
}
```

**GET** `/api/media`
- List all media files
- Query parameters:
  - `type`: Filter by media type
  - `limit`: Items per page
  - `offset`: Pagination offset

**GET** `/api/media/:id`
- Get media file details

**DELETE** `/api/media/:id`
- Delete media file
- Requires: Admin role

### User Management

**GET** `/api/users`
- List all users
- Requires: Admin role

**GET** `/api/users/:id`
- Get user details
- Requires: Admin role or own user

**POST** `/api/users`
- Create new user
- Requires: Admin role

Request body:
```json
{
  "email": "newuser@example.com",
  "password": "secure_password",
  "name": "New User",
  "role": "editor",
  "active": true
}
```

**PUT** `/api/users/:id`
- Update user details
- Requires: Admin role or own user

**DELETE** `/api/users/:id`
- Deactivate user
- Requires: Admin role

### Content Versioning

**GET** `/api/versions/:contentType/:contentId`
- Get version history for content
- contentType: "portfolio", "blog", "page"

Response:
```json
{
  "versions": [
    {
      "id": 1,
      "version": "1.0.0",
      "changes": "Initial version",
      "createdBy": "John Doe",
      "createdAt": "2024-01-15T10:00:00Z",
      "content": { ... }
    }
  ]
}
```

**POST** `/api/versions/:contentType/:contentId/restore/:versionId`
- Restore specific version
- Requires: Admin or Editor role

### Workflow Management

**GET** `/api/workflow`
- Get workflow items
- Query parameters:
  - `status`: pending, approved, rejected
  - `assignedTo`: User ID

**POST** `/api/workflow`
- Create workflow item

Request body:
```json
{
  "contentType": "blog",
  "contentId": 123,
  "action": "publish",
  "assignedTo": 2,
  "dueDate": "2024-01-20T10:00:00Z",
  "priority": "high",
  "notes": "Please review for publication"
}
```

**PUT** `/api/workflow/:id`
- Update workflow item status

Request body:
```json
{
  "status": "approved",
  "comments": "Looks good, approved for publication"
}
```

### Search

**GET** `/api/search`
- Global search across content
- Query parameters:
  - `q`: Search query
  - `type`: Content type filter
  - `limit`: Results per page

Response:
```json
{
  "results": [
    {
      "type": "blog",
      "id": 123,
      "title": "Matching Blog Post",
      "excerpt": "...matched content...",
      "url": "/blog/matching-blog-post",
      "score": 0.95
    }
  ],
  "total": 42,
  "query": "search term"
}
```

### Analytics

**GET** `/api/analytics/overview`
- Get analytics overview
- Requires: Admin role

Response:
```json
{
  "pageViews": 10000,
  "uniqueVisitors": 3500,
  "averageSessionDuration": 180,
  "bounceRate": 0.35,
  "topPages": [
    {
      "url": "/blog/popular-post",
      "views": 1500
    }
  ],
  "trafficSources": {
    "organic": 0.45,
    "direct": 0.30,
    "social": 0.15,
    "referral": 0.10
  }
}
```

## Error Handling

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "Additional error details"
    }
  }
}
```

### Common Error Codes
- `AUTH_REQUIRED`: Authentication required
- `INVALID_TOKEN`: Invalid or expired token
- `PERMISSION_DENIED`: Insufficient permissions
- `VALIDATION_ERROR`: Request validation failed
- `NOT_FOUND`: Resource not found
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `SERVER_ERROR`: Internal server error

### HTTP Status Codes
- `200 OK`: Successful request
- `201 Created`: Resource created
- `204 No Content`: Successful deletion
- `400 Bad Request`: Invalid request
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Permission denied
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

## Examples

### Complete Authentication Flow
```javascript
// 1. Login
const loginResponse = await fetch('https://api.example.com/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123'
  })
});

const { token, refreshToken } = await loginResponse.json();

// 2. Make authenticated request
const portfolioResponse = await fetch('https://api.example.com/portfolio', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const portfolioData = await portfolioResponse.json();

// 3. Refresh token when expired
const refreshResponse = await fetch('https://api.example.com/auth/refresh', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ refreshToken })
});

const { token: newToken } = await refreshResponse.json();
```

### Creating Content with Media
```javascript
// 1. Upload image
const formData = new FormData();
formData.append('file', imageFile);
formData.append('type', 'image');
formData.append('alt', 'Project screenshot');

const uploadResponse = await fetch('https://api.example.com/media/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const { file } = await uploadResponse.json();

// 2. Create portfolio item with uploaded image
const portfolioResponse = await fetch('https://api.example.com/portfolio', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'New Project',
    description: 'Project description',
    imageUrl: file.url,
    category: 'web-development',
    technologies: ['React', 'Node.js']
  })
});

const newPortfolioItem = await portfolioResponse.json();
```

### Pagination Example
```javascript
async function fetchAllPortfolioItems() {
  const items = [];
  let offset = 0;
  const limit = 20;
  let hasMore = true;

  while (hasMore) {
    const response = await fetch(
      `https://api.example.com/portfolio?limit=${limit}&offset=${offset}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    const data = await response.json();
    items.push(...data.items);
    
    hasMore = data.items.length === limit;
    offset += limit;
  }

  return items;
}
```

### WebSocket Real-time Updates
```javascript
const ws = new WebSocket('wss://api.example.com/ws');

ws.on('open', () => {
  // Authenticate WebSocket connection
  ws.send(JSON.stringify({
    type: 'auth',
    token: token
  }));
});

ws.on('message', (data) => {
  const message = JSON.parse(data);
  
  switch(message.type) {
    case 'content_updated':
      console.log('Content updated:', message.data);
      break;
    case 'new_comment':
      console.log('New comment:', message.data);
      break;
  }
});
```

### Error Handling Example
```javascript
async function safeApiCall(url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      const error = await response.json();
      
      if (response.status === 401) {
        // Token expired, try refresh
        await refreshToken();
        // Retry request with new token
        return safeApiCall(url, options);
      }
      
      throw new Error(error.error.message);
    }

    return await response.json();
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}
```

## API Versioning

The API supports versioning through URL paths:
- Current version: `/api/v1/`
- Beta endpoints: `/api/v2/`

Version deprecation notices are provided via:
- `X-API-Deprecation-Date` header
- `deprecation` field in response

## Webhooks

Configure webhooks for real-time notifications:

**POST** `/api/webhooks`
```json
{
  "url": "https://your-app.com/webhook",
  "events": ["content.created", "content.updated", "user.login"],
  "secret": "webhook_secret"
}
```

Webhook payload:
```json
{
  "event": "content.created",
  "timestamp": "2024-01-15T10:00:00Z",
  "data": {
    "id": 123,
    "type": "portfolio",
    "title": "New Project"
  },
  "signature": "sha256=..."
}
```

## SDKs and Client Libraries

- **JavaScript/TypeScript**: `npm install @portfolio/api-client`
- **Python**: `pip install portfolio-api-client`
- **Go**: `go get github.com/portfolio/api-client-go`

## Support

For API support and questions:
- Email: api-support@portfolio.com
- Documentation: https://docs.portfolio.com/api
- Status Page: https://status.portfolio.com