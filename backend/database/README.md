# Portfolio Site Database System

A comprehensive, production-ready database solution built with Prisma ORM, featuring advanced authentication, content management, analytics, and backup systems.

## 🚀 Features

### Core Features
- **Complete Schema Design**: Users, projects, blog posts, comments, media, analytics
- **Advanced Authentication**: JWT, OAuth, 2FA, session management
- **Role-Based Access Control**: Flexible permissions system
- **Content Management**: Versioning, workflow states, SEO optimization
- **Media Management**: File uploads, thumbnails, CDN support
- **Analytics Tracking**: Page views, user activities, performance metrics

### Production Features
- **Database Migrations**: Automated schema management
- **Backup & Restore**: Scheduled backups with encryption
- **Health Monitoring**: Comprehensive health checks and diagnostics
- **Connection Pooling**: Optimized database connections with SSL
- **Query Optimization**: Indexes, caching, performance monitoring
- **Audit Logging**: Track all data changes and user activities

### Development Features
- **Seed System**: Development data and sample content
- **Testing Support**: Isolated test databases and fixtures
- **Environment Configuration**: Development, staging, production configs
- **Logging**: Structured logging with file rotation
- **CLI Tools**: Database management commands

## 📁 Directory Structure

```
backend/database/
├── config/
│   └── database.config.js     # Database configuration
├── models/
│   └── schema.prisma          # Prisma schema definition
├── migrations/
│   └── 001_initial_schema.sql # SQL migration files
├── seeds/
│   ├── 001_default_roles.js   # Role seeding
│   ├── 002_default_settings.js# System settings
│   ├── 003_sample_data.js     # Sample content
│   └── seed.js                # Master seed orchestrator
├── utils/
│   ├── prisma.js              # Prisma client management
│   ├── logger.js              # Database logging
│   ├── backup.js              # Backup system
│   └── health-check.js        # Health monitoring
├── backup/                    # Backup storage directory
├── generated/                 # Generated Prisma client
├── index.js                   # Main database interface
├── package.json               # Dependencies
├── .env.example               # Environment template
└── README.md                  # This file
```

## 🛠 Setup and Installation

### Prerequisites
- Node.js 18+ 
- PostgreSQL 14+ (recommended) or SQLite (development)
- npm or yarn package manager

### 1. Install Dependencies

```bash
cd backend/database
npm install
```

### 2. Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit configuration
nano .env
```

### Key Configuration Options:

```bash
# Database Connection
DATABASE_URL=postgresql://user:password@localhost:5432/portfolio_db
NODE_ENV=development

# Features
BACKUP_ENABLED=true
ENABLE_AUDIT_LOGS=true
ENABLE_VERSIONING=true

# Security
JWT_SECRET=your-secret-key
DB_SSL_ENABLED=false
```

### 3. Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Seed with sample data (development)
npm run db:seed
```

### 4. Verify Installation

```bash
# Check database health
npm run db:health

# View database in browser
npm run db:studio
```

## 📊 Database Schema

### Core Tables

#### Users & Authentication
- `users` - User accounts with authentication
- `user_providers` - OAuth provider connections
- `user_sessions` - Active user sessions  
- `roles` - Role definitions
- `user_roles` - User role assignments

#### Content Management
- `projects` - Portfolio projects
- `blog_posts` - Blog articles
- `comments` - User comments
- `media_assets` - File uploads and media
- `tags` - Content taxonomy
- `categories` - Content categorization
- `skills` - Technical skills

#### Analytics & Tracking
- `project_analytics` - Project view tracking
- `blog_analytics` - Blog post analytics
- `user_activities` - User action logging
- `audit_logs` - System audit trail

#### System
- `settings` - System configuration
- `*_versions` - Content version history

### Key Features
- **Full-Text Search**: Optimized search indexes
- **Soft Deletes**: Recoverable record deletion
- **Audit Trail**: Complete change tracking
- **Versioning**: Content revision history
- **Multi-language**: i18n support ready

## 🔧 Usage Examples

### Basic Database Operations

```javascript
const database = require('./backend/database');

// Initialize database
await database.initialize({
  autoMigrate: true,
  autoSeed: process.env.NODE_ENV === 'development'
});

// Get database client
const client = database.getClient();

// Create a project
const project = await client.project.create({
  data: {
    title: 'My Project',
    description: 'Project description',
    status: 'PUBLISHED',
    createdBy: userId
  }
});

// Query with relations
const projectWithDetails = await client.project.findUnique({
  where: { id: project.id },
  include: {
    author: true,
    tags: { include: { tag: true } },
    skills: { include: { skill: true } }
  }
});
```

### Using Transactions

```javascript
const result = await database.transaction(async (tx) => {
  const user = await tx.user.create({
    data: { email: 'user@example.com' }
  });
  
  const project = await tx.project.create({
    data: {
      title: 'New Project',
      createdBy: user.id
    }
  });
  
  return { user, project };
});
```

### Health Monitoring

```javascript
// Get system status
const status = await database.getStatus();
console.log('Database health:', status.health.overall);

// Perform health check
const health = await database.performHealthCheck();
if (health.warnings.length > 0) {
  console.warn('Health warnings:', health.warnings);
}
```

### Backup Operations

```javascript
// Create manual backup
const backup = await database.createBackup({
  name: 'before-migration',
  includeMedia: true,
  compress: true
});

// List backups
const backups = await database.listBackups();

// Restore from backup
await database.restoreBackup(backup.path);
```

## 🔒 Security Features

### Authentication & Authorization
- **JWT Tokens**: Secure authentication with refresh tokens
- **OAuth Integration**: Google, GitHub, LinkedIn support
- **Two-Factor Auth**: TOTP-based 2FA with backup codes
- **Session Management**: Secure session handling with expiration

### Data Security
- **Password Hashing**: bcrypt with configurable rounds
- **SQL Injection Protection**: Parameterized queries via Prisma
- **Input Validation**: Comprehensive data validation
- **Audit Logging**: Complete activity tracking

### Infrastructure Security
- **SSL/TLS**: Database connection encryption
- **Backup Encryption**: AES-256 encrypted backups
- **Connection Pooling**: Secure connection management
- **Rate Limiting**: API rate limiting configuration

## 📈 Performance Optimization

### Database Optimization
- **Indexes**: Strategic indexing for common queries
- **Connection Pooling**: Optimized connection management
- **Query Optimization**: Efficient queries with Prisma
- **Caching**: Built-in query result caching

### Monitoring & Maintenance
- **Health Checks**: Automated system health monitoring
- **Performance Metrics**: Query performance tracking
- **Maintenance Tasks**: Automated cleanup and optimization
- **Backup Management**: Automated backup with retention policies

## 🧪 Testing

### Test Database Setup

```bash
# Set test environment
export NODE_ENV=test

# Create test database
npm run db:migrate
npm run db:seed -- --sample-data

# Run tests
npm test
```

### Test Configuration

```javascript
// Test setup
const database = require('./backend/database');

beforeAll(async () => {
  await database.initialize({ 
    autoMigrate: true,
    autoSeed: true 
  });
});

afterAll(async () => {
  await database.rollback();
  await database.shutdown();
});
```

## 📋 Available Scripts

### Database Management
```bash
npm run db:generate     # Generate Prisma client
npm run db:push         # Push schema changes
npm run db:migrate      # Run migrations
npm run db:migrate:prod # Production migrations
npm run db:seed         # Seed database
npm run db:reset        # Reset database
npm run db:studio       # Open Prisma Studio
```

### Maintenance
```bash
npm run db:backup       # Create manual backup
npm run db:restore      # Restore from backup
npm run db:health       # Health check
npm run db:stats        # Database statistics
npm run db:validate     # Validate schema
```

### Development
```bash
npm run test           # Run tests
npm run test:watch     # Watch mode testing
npm run test:coverage  # Coverage report
```

## 🚀 Deployment

### Production Setup

1. **Environment Variables**:
```bash
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/db
DB_SSL_ENABLED=true
BACKUP_ENABLED=true
```

2. **SSL Configuration**:
```bash
DB_SSL_REQUIRE=true
DB_SSL_CA=/path/to/ca-cert.pem
```

3. **Run Migrations**:
```bash
npm run db:migrate:prod
```

4. **Initialize System**:
```bash
node -e "require('./index').initialize({ autoMigrate: false })"
```

### Docker Support

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
CMD ["node", "index.js"]
```

### Monitoring Setup

Configure health check endpoints for monitoring systems:

```javascript
// Health check endpoint
app.get('/health/database', async (req, res) => {
  const health = await database.performHealthCheck();
  res.status(health.overall === 'healthy' ? 200 : 503)
     .json(health);
});
```

## 🔧 Configuration Reference

### Database Providers
- **PostgreSQL** (Recommended): Full features, production-ready
- **MySQL**: Good compatibility, most features supported  
- **SQLite**: Development only, limited features

### Environment Variables
See `.env.example` for complete configuration options.

### Performance Tuning
- **Connection Pool Size**: Adjust based on concurrent users
- **Query Timeout**: Set appropriate timeouts for operations
- **Cache TTL**: Configure caching for optimal performance
- **Backup Schedule**: Set backup frequency for your needs

## 🆘 Troubleshooting

### Common Issues

**Connection Errors**:
```bash
# Check database connectivity
npm run db:health

# Verify environment variables
node -e "console.log(require('./config/database.config'))"
```

**Migration Issues**:
```bash
# Reset and remigrate
npm run db:reset
npm run db:migrate
```

**Permission Errors**:
```bash
# Check database user permissions
# Ensure user has CREATE, DROP, ALTER privileges
```

**Performance Issues**:
```bash
# Check slow queries
npm run db:stats

# Analyze query performance
npm run db:studio
```

### Debug Mode
Enable detailed logging:
```bash
DEBUG_SQL=true
DB_LOG_LEVEL=debug
npm run db:health
```

## 📝 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new features
4. Ensure all tests pass
5. Submit a pull request

## 📞 Support

For issues and questions:
- Check the troubleshooting section
- Review configuration examples
- Submit GitHub issues for bugs
- Contact the development team for support