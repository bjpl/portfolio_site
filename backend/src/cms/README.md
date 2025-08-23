# Portfolio CMS Backend

A comprehensive Content Management System backend for portfolio websites, built with Node.js, Express, and Sequelize.

## Features

### 🎯 Core Features
- **Blog Management**: Full-featured blogging system with markdown support
- **Portfolio Management**: Project showcase with media galleries
- **Media Management**: File upload, optimization, and CDN integration
- **Comment System**: Moderated commenting with spam detection
- **User Management**: Role-based access control
- **Admin Dashboard**: Comprehensive analytics and content moderation

### 📝 Blog System
- Markdown editor with live preview
- Draft/publish workflow with scheduling
- SEO optimization (meta tags, canonical URLs)
- Categories and tags system
- Version control with rollback capability
- Multi-language support (English/Spanish)
- Reading time calculation
- View count tracking
- Social sharing integration

### 🎨 Portfolio Manager
- Project CRUD operations
- Image galleries and media attachments
- Technology stack tagging
- Featured projects system
- Client information tracking
- Project timeline management
- GitHub integration
- Live demo links

### 📁 Media Management
- Drag-and-drop file uploads
- Automatic image optimization
- Multiple format support (WebP, JPEG, PNG)
- Bulk operations
- CDN integration ready
- File organization and tagging
- Storage usage analytics

### 👥 Admin Dashboard
- Real-time statistics
- Content moderation queue
- User activity logs
- System health monitoring
- Performance analytics
- Bulk operations
- Export capabilities

### 🔒 Security Features
- JWT authentication
- Role-based permissions
- Rate limiting
- Input sanitization
- File type validation
- CORS configuration
- Helmet.js security headers

## Installation

### Prerequisites
- Node.js 16+ 
- npm or yarn
- SQLite (default) or PostgreSQL/MySQL

### Quick Start

1. **Clone the repository**
```bash
git clone https://github.com/your-username/portfolio-cms
cd portfolio-cms/backend/src/cms
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment setup**
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
NODE_ENV=development
PORT=4000
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# Database
DB_HOST=localhost
DB_NAME=portfolio_cms
DB_USER=your_db_user
DB_PASS=your_db_password
DB_DIALECT=sqlite

# File Storage
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=50000000
CDN_ENABLED=false
CDN_BASE_URL=

# Email (for notifications)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
FROM_EMAIL=noreply@yoursite.com

# Site Settings
SITE_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:1313
```

4. **Database setup**
```bash
npm run migrate
npm run seed
```

5. **Start development server**
```bash
npm run dev
```

The API will be available at `http://localhost:4000`

## Project Structure

```
backend/src/cms/
├── controllers/          # Route handlers
│   ├── AdminController.js
│   ├── BlogController.js
│   ├── CommentController.js
│   ├── MediaController.js
│   └── PortfolioController.js
├── models/              # Database models
│   ├── Blog.js
│   ├── BlogCategory.js
│   ├── BlogVersion.js
│   ├── Comment.js
│   ├── MediaAsset.js
│   └── index.js
├── routes/              # API routes
│   ├── adminRoutes.js
│   ├── blogRoutes.js
│   ├── categoryRoutes.js
│   ├── commentRoutes.js
│   ├── mediaRoutes.js
│   ├── portfolioRoutes.js
│   └── index.js
├── services/            # Business logic
│   ├── BlogService.js
│   ├── MediaService.js
│   └── SearchService.js
├── middleware/          # Custom middleware
│   └── validation.js
├── migrations/          # Database migrations
├── seeders/            # Database seeders
├── tests/              # Test files
├── uploads/            # File uploads
├── index.js            # Main server file
└── package.json
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh token

### Blogs
- `GET /api/cms/blogs` - List blogs
- `GET /api/cms/blogs/:slug` - Get blog by slug
- `POST /api/cms/blogs` - Create blog
- `PUT /api/cms/blogs/:id` - Update blog
- `DELETE /api/cms/blogs/:id` - Delete blog
- `GET /api/cms/blogs/:id/versions` - Get blog versions
- `POST /api/cms/blogs/:id/versions/:versionId/restore` - Restore version

### Portfolio
- `GET /api/cms/portfolio` - List projects
- `GET /api/cms/portfolio/featured` - Get featured projects
- `GET /api/cms/portfolio/:slug` - Get project by slug
- `POST /api/cms/portfolio` - Create project
- `PUT /api/cms/portfolio/:id` - Update project
- `DELETE /api/cms/portfolio/:id` - Delete project

### Media
- `POST /api/cms/media/upload` - Upload single file
- `POST /api/cms/media/upload/multiple` - Upload multiple files
- `GET /api/cms/media` - List media assets
- `GET /api/cms/media/:id` - Get media asset
- `PUT /api/cms/media/:id` - Update media metadata
- `DELETE /api/cms/media/:id` - Delete media asset

### Comments
- `GET /api/cms/comments/blog/:blogId` - Get blog comments
- `POST /api/cms/comments` - Create comment
- `PUT /api/cms/comments/:id` - Update comment (admin)
- `DELETE /api/cms/comments/:id` - Delete comment (admin)

### Admin
- `GET /api/cms/admin/dashboard` - Dashboard statistics
- `GET /api/cms/admin/pending` - Pending content
- `GET /api/cms/admin/users` - User management
- `GET /api/cms/admin/logs` - Activity logs
- `GET /api/cms/admin/health` - System health

## Development

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- --testPathPattern=blog.test.js

# Generate coverage report
npm run test:coverage
```

### Code Quality
```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Type checking
npm run typecheck
```

### Database Operations
```bash
# Run migrations
npm run migrate

# Rollback migration
npm run migrate:rollback

# Seed database
npm run seed

# Reset database
npm run db:reset
```

## Configuration

### Database Configuration
The CMS supports multiple database systems:

**SQLite (default)**
```javascript
{
  dialect: 'sqlite',
  storage: 'database.sqlite'
}
```

**PostgreSQL**
```javascript
{
  dialect: 'postgres',
  host: 'localhost',
  database: 'portfolio_cms',
  username: 'user',
  password: 'password'
}
```

**MySQL**
```javascript
{
  dialect: 'mysql',
  host: 'localhost',
  database: 'portfolio_cms',
  username: 'user',
  password: 'password'
}
```

### File Storage Options

**Local Storage (default)**
```env
STORAGE_TYPE=local
UPLOAD_PATH=./uploads
```

**AWS S3**
```env
STORAGE_TYPE=s3
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_BUCKET=your-bucket-name
AWS_REGION=us-east-1
```

**Cloudinary**
```env
STORAGE_TYPE=cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## Security

### Best Practices Implemented
1. **JWT Authentication**: Secure token-based authentication
2. **Password Hashing**: bcrypt with salt rounds
3. **Input Sanitization**: HTML sanitization for user content
4. **File Validation**: MIME type and file extension validation
5. **Rate Limiting**: Per-IP request limiting
6. **CORS Configuration**: Proper cross-origin resource sharing
7. **Helmet.js**: Security headers middleware
8. **SQL Injection Prevention**: Sequelize ORM parameterized queries

### Security Headers
```javascript
{
  'Content-Security-Policy': "default-src 'self'",
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=()'
}
```

## Performance

### Optimization Features
- **Database Indexing**: Optimized queries with proper indexes
- **Image Optimization**: Automatic WebP conversion and resizing
- **Compression**: Gzip compression for responses
- **Caching Headers**: Appropriate cache-control headers
- **Lazy Loading**: Pagination for large datasets
- **Query Optimization**: Efficient database queries with includes

### Monitoring
- **Health Checks**: System health monitoring endpoints
- **Error Logging**: Comprehensive error logging
- **Performance Metrics**: Request timing and memory usage
- **Database Monitoring**: Query performance tracking

## Deployment

### Docker
```dockerfile
FROM node:16-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
EXPOSE 4000
CMD ["npm", "start"]
```

### Docker Compose
```yaml
version: '3.8'
services:
  cms-api:
    build: .
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=production
      - DB_HOST=postgres
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:13
    environment:
      - POSTGRES_DB=portfolio_cms
      - POSTGRES_USER=cms_user
      - POSTGRES_PASSWORD=secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:6-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### Production Environment
```bash
# Install PM2 for process management
npm install -g pm2

# Start with PM2
pm2 start ecosystem.config.js

# Monitor processes
pm2 monit

# View logs
pm2 logs
```

## API Documentation

Complete API documentation is available in the [API Documentation](./docs/API_DOCUMENTATION.md) file.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow ESLint configuration
- Write tests for new features
- Update documentation
- Use conventional commits
- Ensure all tests pass

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- 📧 Email: support@portfolio-cms.com
- 🐛 Issues: [GitHub Issues](https://github.com/portfolio/cms/issues)
- 📖 Documentation: [Full Documentation](https://docs.portfolio-cms.com)
- 💬 Discussions: [GitHub Discussions](https://github.com/portfolio/cms/discussions)

## Roadmap

### Upcoming Features
- [ ] GraphQL API support
- [ ] Real-time collaborative editing
- [ ] Advanced analytics dashboard
- [ ] Plugin system
- [ ] Theme customization
- [ ] Multi-site management
- [ ] Advanced SEO tools
- [ ] Content scheduling automation
- [ ] Webhook system
- [ ] API rate limiting per user
- [ ] Advanced search with Elasticsearch
- [ ] Content versioning UI
- [ ] Mobile app API
- [ ] Advanced media editing
- [ ] Content templates