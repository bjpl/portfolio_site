# Supabase Backend Architecture

Complete backend implementation for the Brandon Hancock Portfolio Site using Supabase as the primary database and backend service.

## Architecture Overview

This Supabase implementation provides:

- **PostgreSQL Database**: Comprehensive schema for portfolio content
- **Row Level Security**: Fine-grained access control
- **Edge Functions**: Custom API endpoints and business logic
- **Authentication**: JWT-based auth with admin controls
- **Real-time Features**: Live updates and subscriptions
- **Full-text Search**: Built-in search across all content

## Quick Start

### 1. Prerequisites

```bash
# Install Supabase CLI
npm install -g supabase

# Verify installation
supabase --version
```

### 2. Local Development Setup

```bash
# Navigate to project root
cd portfolio_site

# Initialize Supabase (if not already done)
supabase init

# Start local Supabase instance
supabase start

# Run database migrations
supabase db reset

# Generate TypeScript types
supabase gen types typescript --local > supabase/types/database.types.ts
```

### 3. Environment Configuration

```bash
# Copy environment template
cp supabase/.env.example .env.local

# Edit .env.local with your Supabase credentials
# NEXT_PUBLIC_SUPABASE_URL=your-project-url
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Deploy Edge Functions

```bash
# Deploy portfolio API function
supabase functions deploy portfolio-api

# Test the deployment
curl https://your-project.supabase.co/functions/v1/portfolio-api/projects
```

## Database Schema

### Core Tables

#### Content Management
- **projects**: Portfolio projects with metadata, technologies, and links
- **blog_posts**: Blog articles with full content and SEO fields
- **skills**: Technical and professional skills with proficiency levels
- **tags**: Categorization system for content organization

#### User Management  
- **profiles**: Extended user information beyond Supabase auth
- **system_settings**: Configurable site settings and preferences

#### Communication
- **contact_messages**: Contact form submissions with spam filtering
- **comments**: Blog post comments (ready for future implementation)

#### Media & Analytics
- **media_assets**: File and image management with metadata
- **analytics_events**: Usage tracking and visitor analytics
- **page_views_summary**: Aggregated page view statistics

### Relationships

```
profiles ──┬─── blog_posts ──┬─── comments
           │                 │
           │                 └─── blog_post_tags ─── tags
           │
           ├─── media_assets
           │
           └─── contact_messages

projects ──┬─── project_skills ─── skills
           │
           └─── project_tags ─── tags
```

## API Endpoints

### Portfolio API (`/functions/v1/portfolio-api/`)

#### Projects
- `GET /projects` - List projects with filtering
- `GET /projects/:id` - Get specific project
- `POST /projects` - Create project (admin only)
- `PUT /projects/:id` - Update project (admin only)

#### Blog
- `GET /blog` - List blog posts with pagination  
- `GET /blog/:slug` - Get specific blog post
- `POST /blog` - Create blog post (admin only)
- `PUT /blog/:id` - Update blog post (admin only)

#### Utilities
- `GET /skills` - List technical skills
- `POST /contact` - Submit contact form
- `GET /search?q=term` - Search across content
- `POST /analytics` - Track user events

### Response Format

```typescript
interface APIResponse<T> {
  data?: T
  error?: string
  message?: string
  pagination?: {
    page: number
    limit: number
    total: number
    hasNext: boolean
    hasPrev: boolean
  }
}
```

## Security Model

### Row Level Security (RLS)

#### Public Access
- Published projects and blog posts
- Skills and tags for portfolio display
- Public system settings

#### Admin Access
- Full CRUD operations on all content
- User management and system configuration
- Analytics data and contact messages
- Media asset management

### Authentication Flow

```
1. Admin logs in via Supabase Auth
2. JWT token issued with user claims
3. RLS policies enforce access control
4. API responses filtered by permissions
```

## Data Migration

### Current State
- Mock data in Netlify Functions
- Static files and configuration
- No persistent user data

### Migration Process

1. **Extract**: Export existing mock data
2. **Transform**: Convert to database schema format
3. **Validate**: Ensure data integrity
4. **Load**: Import into Supabase tables
5. **Verify**: Confirm migration success

### Migration Script

```bash
# Run the migration script
node scripts/migrate-to-supabase.js

# Verify data integrity
node scripts/verify-migration.js
```

## Performance Optimization

### Database Indexing
- B-tree indexes on frequently queried columns
- GIN indexes for full-text search
- Composite indexes for complex queries
- Array indexes for technology and tag filtering

### Caching Strategy
- **Browser**: Static assets cached for 1 year
- **CDN**: API responses cached 5-15 minutes
- **Database**: Query result caching in PostgreSQL
- **Application**: Edge function result caching

### Query Optimization
```sql
-- Example optimized query
SELECT p.*, array_agg(s.name) as skills
FROM projects p
LEFT JOIN project_skills ps ON p.id = ps.project_id  
LEFT JOIN skills s ON ps.skill_id = s.id
WHERE p.featured = true
GROUP BY p.id
ORDER BY p.created_at DESC;
```

## Development Workflow

### Local Development
```bash
# Start local stack
supabase start

# Make schema changes
# Edit supabase/migrations/*.sql

# Apply changes
supabase db reset

# Generate new types
supabase gen types typescript --local
```

### Deployment
```bash
# Deploy database changes
supabase db push

# Deploy edge functions  
supabase functions deploy portfolio-api

# Update production types
supabase gen types typescript > supabase/types/database.types.ts
```

## Monitoring & Observability

### Health Checks
- Database connectivity monitoring
- API endpoint availability
- Edge function performance
- Error rate tracking

### Analytics Collection
- Page view tracking
- User interaction events
- Performance metrics
- Contact form submissions

### Logging
- Structured logging with context
- Error tracking and alerting
- Performance monitoring
- Security audit logs

## Backup & Recovery

### Automated Backups
- Daily full database snapshots
- Point-in-time recovery capability
- Cross-region replication
- 30-day retention policy

### Recovery Procedures
- Database restore from backup
- Partial data recovery options
- Disaster recovery protocols
- System state restoration

## Cost Management

### Usage Monitoring
- Database storage and bandwidth
- Edge function invocations
- Authentication requests
- Real-time connections

### Optimization Strategies
- Efficient query design
- Appropriate data types
- Index optimization
- Connection pooling

## Future Enhancements

### Planned Features
- Real-time admin collaboration
- Advanced search with filters
- Multi-language content support
- Enhanced analytics dashboard
- Comment system for blog
- Newsletter subscription management

### Technical Improvements
- GraphQL API implementation
- Advanced caching strategies
- Machine learning recommendations
- Progressive Web App features
- Offline-first capabilities

## Troubleshooting

### Common Issues

#### Connection Errors
```bash
# Check Supabase status
supabase status

# Verify credentials
echo $SUPABASE_URL
echo $SUPABASE_ANON_KEY
```

#### Migration Failures
```bash
# Reset database to clean state
supabase db reset

# Check migration logs
supabase logs
```

#### Performance Issues
```sql
-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM projects WHERE featured = true;

-- Check index usage
SELECT * FROM pg_stat_user_indexes;
```

### Getting Help

- **Documentation**: [Supabase Docs](https://supabase.com/docs)
- **Community**: [Supabase Discord](https://discord.supabase.com)
- **Issues**: [GitHub Issues](https://github.com/supabase/supabase/issues)
- **Support**: [Supabase Support](https://supabase.com/support)

## Contributing

### Making Changes
1. Create feature branch
2. Update migrations if needed
3. Add/update tests
4. Update documentation
5. Submit pull request

### Testing
```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Test database migrations
supabase db reset
```

## License

This backend implementation is part of the Brandon Hancock Portfolio Site and follows the same licensing terms as the main project.

---

For detailed architectural decisions and design rationale, see:
- [Architecture Design Document](../docs/architecture/SUPABASE_ARCHITECTURE_DESIGN.md)
- [Migration Strategy](../docs/architecture/MIGRATION_STRATEGY.md)
- [Architecture Decision Records](../docs/architecture/ARCHITECTURE_DECISION_RECORDS.md)