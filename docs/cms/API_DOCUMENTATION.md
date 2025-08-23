# Portfolio CMS API Documentation

## Overview

The Portfolio CMS API provides comprehensive content management functionality for blogs, projects, and media assets. Built with Node.js, Express, and Sequelize, it offers RESTful endpoints with authentication, authorization, and extensive features for content creation and management.

## Base URL

```
http://localhost:4000/api/cms
```

## Authentication

The API uses JWT (JSON Web Token) authentication. Include the token in the `Authorization` header:

```
Authorization: Bearer <your_jwt_token>
```

## Response Format

All API responses follow a consistent JSON format:

### Success Response
```json
{
  "data": { /* response data */ },
  "message": "Success message (optional)"
}
```

### Error Response
```json
{
  "error": "Error message",
  "details": [ /* validation errors (optional) */ ]
}
```

## Rate Limiting

- General API: 1000 requests per 15 minutes per IP
- Blog creation: 10 posts per hour
- Media uploads: 50 uploads per 15 minutes
- Comments: 5 comments per 15 minutes

## Blog Management

### Get All Blogs

```http
GET /api/cms/blogs
```

**Query Parameters:**
- `page` (integer): Page number (default: 1)
- `limit` (integer): Items per page (default: 10)
- `status` (string): Filter by status (`published`, `draft`, `archived`)
- `category` (string): Filter by category slug
- `tag` (string): Filter by tag slug
- `search` (string): Search in title, content, and excerpt
- `language` (string): Filter by language (`en`, `es`)
- `sortBy` (string): Sort field (`publishedAt`, `title`, `viewCount`)
- `sortOrder` (string): Sort direction (`ASC`, `DESC`)

**Example Response:**
```json
{
  "blogs": [
    {
      "id": "uuid",
      "title": "Blog Title",
      "slug": "blog-title",
      "excerpt": "Blog excerpt...",
      "status": "published",
      "publishedAt": "2024-01-01T00:00:00Z",
      "viewCount": 100,
      "featuredImage": "https://example.com/image.jpg",
      "author": {
        "id": "uuid",
        "username": "author"
      },
      "tags": [
        {
          "id": "uuid",
          "name": "JavaScript",
          "slug": "javascript"
        }
      ],
      "categories": [
        {
          "id": "uuid",
          "name": "Technology",
          "slug": "technology",
          "color": "#007bff"
        }
      ]
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 50,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### Get Blog by Slug

```http
GET /api/cms/blogs/{slug}
```

**Query Parameters:**
- `includeComments` (boolean): Include approved comments

### Create Blog

```http
POST /api/cms/blogs
```

**Headers:**
- `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "title": "Blog Title",
  "markdown": "# Blog Content\n\nThis is markdown content...",
  "excerpt": "Blog excerpt (optional)",
  "status": "draft", // draft, published, scheduled, archived
  "featuredImage": "https://example.com/image.jpg",
  "metaTitle": "SEO Title",
  "metaDescription": "SEO description",
  "metaKeywords": ["keyword1", "keyword2"],
  "canonicalUrl": "https://example.com/canonical",
  "commentsEnabled": true,
  "language": "en",
  "categoryIds": ["uuid1", "uuid2"],
  "tagIds": ["uuid1", "uuid2"],
  "scheduledAt": "2024-12-25T00:00:00Z" // for scheduled posts
}
```

### Update Blog

```http
PUT /api/cms/blogs/{id}
```

**Headers:**
- `Authorization: Bearer <token>`

**Request Body:** Same as create, all fields optional

### Delete Blog

```http
DELETE /api/cms/blogs/{id}
```

**Headers:**
- `Authorization: Bearer <token>`

### Get Blog Versions

```http
GET /api/cms/blogs/{id}/versions
```

**Headers:**
- `Authorization: Bearer <token>`

### Restore Blog Version

```http
POST /api/cms/blogs/{id}/versions/{versionId}/restore
```

**Headers:**
- `Authorization: Bearer <token>`

### Get Blog Statistics

```http
GET /api/cms/blogs/stats
```

**Query Parameters:**
- `language` (string): Filter by language

**Example Response:**
```json
{
  "statusCounts": {
    "published": 25,
    "draft": 5,
    "archived": 2
  },
  "totalBlogs": 32,
  "totalViews": 15000
}
```

## Portfolio Management

### Get All Projects

```http
GET /api/cms/portfolio
```

**Query Parameters:**
- `page`, `limit`, `search`, `sortBy`, `sortOrder` (same as blogs)
- `status` (string): Filter by status
- `featured` (boolean): Filter featured projects
- `technology` (string): Filter by technology tag
- `category` (string): Filter by category

### Get Project by Slug

```http
GET /api/cms/portfolio/{slug}
```

### Create Project

```http
POST /api/cms/portfolio
```

**Request Body:**
```json
{
  "title": "Project Title",
  "shortDescription": "Brief description",
  "description": "Detailed project description",
  "category": "web",
  "status": "published",
  "isFeatured": false,
  "projectUrl": "https://project.com",
  "githubUrl": "https://github.com/user/repo",
  "demoUrl": "https://demo.com",
  "startDate": "2024-01-01",
  "endDate": "2024-02-01",
  "clientName": "Client Name",
  "teamSize": 3,
  "myRole": "Full Stack Developer",
  "challenges": "Technical challenges faced...",
  "solutions": "How challenges were solved...",
  "outcomes": "Project outcomes and results...",
  "metaTitle": "SEO Title",
  "metaDescription": "SEO description",
  "metaKeywords": ["keyword1", "keyword2"],
  "tagIds": ["uuid1", "uuid2"],
  "skillIds": ["uuid1", "uuid2"],
  "mediaIds": ["uuid1", "uuid2"]
}
```

### Update Project

```http
PUT /api/cms/portfolio/{id}
```

### Delete Project

```http
DELETE /api/cms/portfolio/{id}
```

### Toggle Featured Status

```http
POST /api/cms/portfolio/{id}/toggle-featured
```

### Get Featured Projects

```http
GET /api/cms/portfolio/featured
```

**Query Parameters:**
- `limit` (integer): Number of projects to return (default: 6)

## Media Management

### Upload Single File

```http
POST /api/cms/media/upload
```

**Headers:**
- `Authorization: Bearer <token>`
- `Content-Type: multipart/form-data`

**Form Data:**
- `file`: File to upload
- `altText`: Alternative text for images
- `caption`: Caption for the media
- `tags`: JSON array of tags

**Supported File Types:**
- Images: JPEG, PNG, GIF, WebP, SVG
- Videos: MP4, WebM, OGG, AVI, MOV
- Audio: MP3, WAV, OGG, AAC, FLAC
- Documents: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, CSV
- Archives: ZIP, RAR, 7Z

**File Size Limits:**
- Images: 10MB
- Videos: 100MB
- Audio: 50MB
- Documents: 25MB
- Archives: 50MB

### Upload Multiple Files

```http
POST /api/cms/media/upload/multiple
```

**Form Data:**
- `files`: Multiple files (max 10)

### Get All Media

```http
GET /api/cms/media
```

**Query Parameters:**
- `page`, `limit`, `search`, `sortBy`, `sortOrder`
- `category` (string): Filter by category
- `mimeType` (string): Filter by MIME type

### Get Media by ID

```http
GET /api/cms/media/{id}
```

### Update Media

```http
PUT /api/cms/media/{id}
```

**Request Body:**
```json
{
  "altText": "Updated alt text",
  "caption": "Updated caption",
  "tags": ["tag1", "tag2"]
}
```

### Delete Media

```http
DELETE /api/cms/media/{id}
```

### Bulk Delete Media

```http
DELETE /api/cms/media/bulk
```

**Request Body:**
```json
{
  "ids": ["uuid1", "uuid2", "uuid3"]
}
```

### Get Media Statistics

```http
GET /api/cms/media/stats
```

## Comment Management

### Get Blog Comments

```http
GET /api/cms/comments/blog/{blogId}
```

**Query Parameters:**
- `page`, `limit`
- `status` (string): Comment status (default: `approved`)

### Create Comment

```http
POST /api/cms/comments
```

**Request Body:**
```json
{
  "content": "Comment content",
  "authorName": "John Doe",
  "authorEmail": "john@example.com",
  "authorWebsite": "https://johndoe.com",
  "blogId": "uuid",
  "parentId": "uuid" // for replies
}
```

### Get All Comments (Admin)

```http
GET /api/cms/comments
```

**Headers:**
- `Authorization: Bearer <admin_token>`

### Moderate Comment

```http
PUT /api/cms/comments/{id}
```

### Delete Comment

```http
DELETE /api/cms/comments/{id}
```

### Approve Comment

```http
POST /api/cms/comments/{id}/approve
```

### Mark as Spam

```http
POST /api/cms/comments/{id}/spam
```

## Category Management

### Get All Categories

```http
GET /api/cms/categories
```

**Query Parameters:**
- `includeStats` (boolean): Include blog count statistics

### Get Category by Slug

```http
GET /api/cms/categories/{slug}
```

### Create Category (Admin)

```http
POST /api/cms/categories
```

**Request Body:**
```json
{
  "name": "Category Name",
  "description": "Category description",
  "color": "#007bff"
}
```

### Update Category (Admin)

```http
PUT /api/cms/categories/{id}
```

### Delete Category (Admin)

```http
DELETE /api/cms/categories/{id}
```

## Admin Dashboard

### Get Dashboard Statistics

```http
GET /api/cms/admin/dashboard
```

**Response:**
```json
{
  "content": {
    "blogs": { "published": 50, "draft": 10 },
    "projects": { "published": 20, "draft": 5 },
    "comments": { "approved": 100, "pending": 15 }
  },
  "media": {
    "image": { "count": 200, "totalSize": 50000000 },
    "document": { "count": 50, "totalSize": 25000000 }
  },
  "users": {
    "total": 25,
    "active": 20
  },
  "traffic": {
    "totalBlogViews": 10000,
    "totalProjectViews": 5000,
    "totalViews": 15000
  },
  "recent": {
    "blogs": [],
    "projects": [],
    "comments": []
  }
}
```

### Get Pending Content

```http
GET /api/cms/admin/pending
```

### Moderate Comment

```http
PUT /api/cms/admin/comments/{id}/moderate
```

**Request Body:**
```json
{
  "status": "approved", // approved, spam, rejected
  "reason": "Moderation reason"
}
```

### Bulk Moderate Comments

```http
PUT /api/cms/admin/comments/bulk-moderate
```

**Request Body:**
```json
{
  "commentIds": ["uuid1", "uuid2"],
  "status": "approved",
  "reason": "Bulk moderation"
}
```

### Get All Users

```http
GET /api/cms/admin/users
```

### Update User Status

```http
PUT /api/cms/admin/users/{id}/status
```

**Request Body:**
```json
{
  "isActive": false,
  "reason": "Account suspended"
}
```

### Get Activity Logs

```http
GET /api/cms/admin/logs
```

**Query Parameters:**
- `page`, `limit`
- `action` (string): Filter by action type
- `resource` (string): Filter by resource type
- `userId` (string): Filter by user
- `startDate`, `endDate` (ISO strings): Date range filter

### Get System Health

```http
GET /api/cms/admin/health
```

### Get Analytics

```http
GET /api/cms/admin/analytics
```

**Query Parameters:**
- `period` (string): Time period (`7d`, `30d`, `90d`)

## Error Codes

- `400` - Bad Request: Invalid input or validation errors
- `401` - Unauthorized: Missing or invalid authentication token
- `403` - Forbidden: Insufficient permissions
- `404` - Not Found: Requested resource doesn't exist
- `409` - Conflict: Resource already exists
- `413` - Payload Too Large: File upload exceeds size limit
- `422` - Unprocessable Entity: Request cannot be processed
- `429` - Too Many Requests: Rate limit exceeded
- `500` - Internal Server Error: Server-side error

## Validation Rules

### Blog Validation
- `title`: 1-500 characters, required
- `markdown`: Required, non-empty
- `excerpt`: Max 500 characters
- `metaTitle`: Max 70 characters
- `metaDescription`: Max 160 characters
- `status`: Must be one of: `draft`, `published`, `scheduled`, `archived`
- `language`: Must be `en` or `es`

### Project Validation
- `title`: 1-200 characters, required
- `shortDescription`: 1-300 characters, required
- `description`: Required, non-empty
- `category`: Required, non-empty
- `status`: Must be one of: `draft`, `published`, `archived`
- URLs: Must be valid HTTP/HTTPS URLs
- `teamSize`: Positive integer
- Dates: Must be valid ISO 8601 dates

### Comment Validation
- `content`: 1-2000 characters, required
- `authorName`: 1-100 characters, required
- `authorEmail`: Valid email address, required
- `authorWebsite`: Valid URL (optional)
- `blogId`: Valid UUID, required
- `parentId`: Valid UUID (optional)

### Media Validation
- File size limits based on category
- MIME type validation
- Filename sanitization
- Virus scanning (if enabled)

## Webhooks (Future Feature)

The CMS will support webhooks for real-time notifications:

- `blog.published` - When a blog is published
- `project.created` - When a project is created
- `comment.created` - When a comment is submitted
- `media.uploaded` - When media is uploaded

## SDKs and Libraries

### JavaScript/Node.js
```javascript
const CMSClient = require('@portfolio/cms-client');

const client = new CMSClient({
  baseURL: 'http://localhost:4000/api/cms',
  token: 'your_jwt_token'
});

// Get blogs
const blogs = await client.blogs.list({ status: 'published' });

// Create blog
const blog = await client.blogs.create({
  title: 'New Blog Post',
  markdown: '# Hello World'
});
```

### Python
```python
from portfolio_cms import CMSClient

client = CMSClient(
    base_url='http://localhost:4000/api/cms',
    token='your_jwt_token'
)

# Get blogs
blogs = client.blogs.list(status='published')

# Create blog
blog = client.blogs.create({
    'title': 'New Blog Post',
    'markdown': '# Hello World'
})
```

## Best Practices

1. **Authentication**: Always include authentication tokens for protected endpoints
2. **Rate Limiting**: Implement client-side rate limiting to avoid hitting limits
3. **Error Handling**: Handle all possible HTTP status codes gracefully
4. **Pagination**: Use pagination for list endpoints to improve performance
5. **Caching**: Cache responses where appropriate to reduce API calls
6. **File Uploads**: Validate files on client-side before upload
7. **SEO**: Always provide meta titles and descriptions for content
8. **Security**: Sanitize user input and validate file uploads
9. **Performance**: Use appropriate query parameters to limit response size
10. **Monitoring**: Monitor API usage and performance metrics

## Support

For API support and questions:
- Email: support@portfolio-cms.com
- Documentation: https://docs.portfolio-cms.com
- GitHub Issues: https://github.com/portfolio/cms/issues