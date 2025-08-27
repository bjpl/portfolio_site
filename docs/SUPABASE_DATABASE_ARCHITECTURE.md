# Supabase Database Architecture Documentation

## Overview

This document provides comprehensive documentation for the Supabase database architecture implemented for the portfolio site. The database is designed to support a full-featured content management system with advanced capabilities including real-time collaboration, content versioning, media management, and analytics.

## Migration Files

The database schema is implemented through a series of migration files:

1. **20241225000001_enhanced_portfolio_schema.sql** - Core tables and schema
2. **20241225000002_enhanced_rls_policies.sql** - Row Level Security policies
3. **20241225000003_advanced_storage_config.sql** - Storage buckets and file management
4. **20241225000004_realtime_subscriptions.sql** - Real-time collaboration features
5. **20241225000005_api_helpers_procedures.sql** - API helper functions
6. **20241225000006_backup_migration_utilities.sql** - Backup and maintenance utilities

## Core Tables

### User Management

#### `profiles`
Extends Supabase auth.users with additional profile information
- **Primary Key**: `id` (UUID)
- **Foreign Key**: `user_id` → `auth.users(id)`
- **Key Fields**: email, full_name, avatar_url, role, bio, social_links
- **Features**: Multi-role support, profile metadata, social links

#### `roles`
Role definitions with permissions
- **Primary Key**: `id` (UUID)
- **Key Fields**: name, description, permissions (JSONB)
- **System Roles**: admin, editor, author, viewer

#### `user_roles`
Junction table for user-role assignments
- **Composite Key**: (user_id, role_id)
- **Features**: Expiration dates, audit trail

### Content Management

#### `blog_posts`
Blog post content with full CMS features
- **Primary Key**: `id` (UUID)
- **Key Fields**: title, slug, content, status, author_id, featured_image
- **Features**: Multi-language support, SEO metadata, versioning
- **Status Values**: draft, published, scheduled, archived

#### `projects`
Portfolio projects showcase
- **Primary Key**: `id` (UUID)
- **Key Fields**: title, slug, description, tech_stack, github_url, live_url
- **Features**: Image galleries, technology tags, status tracking

#### `pages`
Static pages with flexible content management
- **Primary Key**: `id` (UUID)
- **Key Fields**: title, slug, content, template, visibility
- **Features**: Hierarchical structure, custom templates, password protection

#### `comments`
User comments with moderation
- **Primary Key**: `id` (UUID)
- **Foreign Keys**: post_id, parent_id (threaded), author_id
- **Features**: Nested comments, moderation workflow, spam detection

### Content Organization

#### `categories`
Hierarchical content categories
- **Primary Key**: `id` (UUID)
- **Features**: Parent-child relationships, usage counters, SEO metadata

#### `tags`
Content tagging system
- **Primary Key**: `id` (UUID)
- **Features**: Usage counting, color coding, automated cleanup

### Media Management

#### `media_assets`
Comprehensive file management
- **Primary Key**: `id` (UUID)
- **Key Fields**: filename, url, type, size_bytes, dimensions
- **Features**: Metadata storage, usage tracking, optimization flags

#### `media_collections`
Media galleries and albums
- **Primary Key**: `id` (UUID)
- **Features**: Collection types (gallery, album, slideshow)

#### `storage_versions`
File version control system
- **Primary Key**: `id` (UUID)
- **Features**: Version tracking, processing status, checksums

### Advanced Features

#### `content_versions`
Content change tracking and versioning
- **Primary Key**: `id` (UUID)
- **Features**: Full content snapshots, change summaries

#### `workflow_states` & `content_workflows`
Editorial workflow management
- **Features**: Custom workflows per content type, assignment tracking

#### `content_blocks`
Flexible page building blocks
- **Primary Key**: `id` (UUID)
- **Features**: Multiple block types, settings storage, ordering

#### `seo_metadata`
SEO and social media optimization
- **Primary Key**: `id` (UUID)
- **Features**: OpenGraph, Twitter Cards, schema markup

### Real-time Collaboration

#### `editing_sessions`
Active editing session tracking
- **Primary Key**: `id` (UUID)
- **Features**: Cursor positions, activity tracking, conflict detection

#### `content_operations`
Operational transforms for collaborative editing
- **Primary Key**: `id` (UUID)
- **Features**: Insert/delete/format operations, sequence numbers

#### `content_locks`
Content locking mechanism
- **Primary Key**: `id` (UUID)
- **Features**: Lock types, expiration, conflict prevention

### Forms and Communication

#### `form_definitions`
Dynamic form builder
- **Primary Key**: `id` (UUID)
- **Features**: JSON field definitions, validation rules, notifications

#### `form_submissions`
Form submission data
- **Primary Key**: `id` (UUID)
- **Features**: JSON data storage, processing workflow

#### `contact_messages`
Contact form submissions
- **Primary Key**: `id` (UUID)
- **Features**: Priority levels, assignment, follow-up tracking

### Analytics and Performance

#### `analytics_events`
Comprehensive event tracking
- **Primary Key**: `id` (UUID)
- **Features**: Page views, user actions, UTM tracking

#### `analytics_sessions`
User session analytics
- **Primary Key**: `id` (UUID)
- **Features**: Session duration, bounce tracking, device info

#### `page_performance`
Web performance metrics
- **Primary Key**: `id` (UUID)
- **Features**: Core Web Vitals, load times, performance budgets

### System Management

#### `site_settings`
Application configuration
- **Primary Key**: `id` (UUID)
- **Features**: Key-value storage, type validation, public/private flags

#### `backup_operations`
Backup tracking and management
- **Primary Key**: `id` (UUID)
- **Features**: Backup types, status tracking, metadata storage

#### `data_integrity_checks`
Database health monitoring
- **Primary Key**: `id` (UUID)
- **Features**: Automated checks, issue detection, auto-repair

## Storage Buckets

### Public Buckets
- **avatars**: User profile images (2MB limit)
- **project-images**: Project screenshots and media (10MB limit)
- **blog-images**: Blog post images (10MB limit)
- **page-assets**: General page assets (10MB limit)
- **media**: General media files (100MB limit)
- **thumbnails**: Auto-generated thumbnails (2MB limit)
- **system-assets**: System logos and icons (5MB limit)
- **user-content**: User-generated content (20MB limit)

### Private Buckets
- **documents**: Private documents (50MB limit)
- **media-versions**: File version backups (10MB limit)
- **temp-uploads**: Temporary upload processing (50MB limit)
- **backups**: Database backups (100MB limit)

## Row Level Security (RLS)

### Security Principles
1. **Public Content**: Published content is accessible to everyone
2. **Owner Access**: Users can manage their own content
3. **Role-Based**: Admin and editor roles have elevated permissions
4. **Service Role**: Backend services have full access

### Key Policies
- Content authors can CRUD their own content
- Admins can access and manage all content
- Public users can read published content only
- Media access tied to content visibility
- Analytics data restricted to admins

## API Helper Functions

### Content Management
- `get_content_paginated()` - Paginated content retrieval with filters
- `get_content_with_relationships()` - Full content with related data
- `batch_content_operation()` - Bulk content operations
- `get_content_recommendations()` - AI-powered content suggestions

### User Management
- `get_user_profile_complete()` - Full profile with roles and permissions
- `update_user_profile()` - Profile updates with validation
- `has_permission()` - Permission checking helper

### Analytics
- `get_analytics_dashboard()` - Comprehensive analytics data
- `get_storage_analytics()` - Storage usage statistics

### Search
- `advanced_search()` - Full-text search across content types
- `search_content()` - Intelligent content discovery

## Real-time Features

### Collaborative Editing
- Live cursor positions and selections
- Operational transforms for conflict resolution
- Content locking to prevent conflicts
- Real-time user presence indicators

### Notifications
- In-app notifications system
- Real-time updates for content changes
- User mention notifications
- Workflow state change notifications

### Broadcasting
- Content change broadcasts
- User activity notifications
- System-wide announcements

## Performance Optimizations

### Indexing Strategy
- Full-text search indexes on content
- GIN indexes for JSONB and array fields
- Composite indexes for common queries
- Partial indexes for filtered queries

### Caching
- Content statistics caching
- Computed fields for expensive calculations
- Materialized views for complex aggregations

### Query Optimization
- Efficient pagination with cursors
- Optimized joins for related data
- Batch operations for bulk updates

## Backup and Recovery

### Backup Types
- **Full Backup**: Complete database snapshot
- **Incremental**: Changes since last backup
- **Content Only**: Content tables without system data
- **Media Only**: Storage bucket backups

### Recovery Features
- Point-in-time recovery
- Selective table restoration
- Data integrity verification
- Automated rollback capabilities

## Security Features

### Authentication
- Supabase Auth integration
- Multi-factor authentication support
- Session management
- Token refresh handling

### Authorization
- Row Level Security on all tables
- Role-based access control
- Content ownership validation
- API endpoint protection

### Data Protection
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CSRF token validation

## Monitoring and Maintenance

### Health Checks
- Automated data integrity checks
- Orphaned record detection
- Constraint validation
- Performance monitoring

### Maintenance Tasks
- Automated cleanup procedures
- Statistics updates
- Index maintenance
- Cache invalidation

### Alerting
- Failed backup notifications
- Data integrity issues
- Performance degradation alerts
- Storage quota warnings

## Migration Strategy

### Schema Evolution
- Version-controlled migrations
- Backward compatibility checks
- Rollback procedures
- Data transformation utilities

### Data Migration
- Legacy system import tools
- Bulk data processing
- Validation and cleanup
- Progress tracking

## Best Practices

### Development
1. Always use migrations for schema changes
2. Test RLS policies thoroughly
3. Validate data integrity after changes
4. Monitor query performance
5. Document all custom functions

### Production
1. Regular backup schedules
2. Monitor storage usage
3. Review security policies
4. Performance optimization
5. Capacity planning

## Deployment Checklist

- [ ] Run all migrations in sequence
- [ ] Verify RLS policies are active
- [ ] Test storage bucket configurations
- [ ] Validate real-time subscriptions
- [ ] Check function permissions
- [ ] Run integrity checks
- [ ] Create initial backup
- [ ] Test authentication flows
- [ ] Verify API endpoints
- [ ] Monitor performance metrics

## Connection Information

### Environment Variables Required
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Database Connection
- Host: db.your-project.supabase.co
- Port: 5432
- Database: postgres
- SSL: required

## Support and Maintenance

### Regular Tasks
- Weekly integrity checks
- Monthly performance reviews
- Quarterly backup testing
- Annual security audits

### Troubleshooting
- Check RLS policies for access issues
- Verify migration sequence for schema errors
- Monitor real-time subscriptions for connection issues
- Review storage policies for upload problems

This architecture provides a robust, scalable foundation for the portfolio site with enterprise-level features including collaboration, versioning, analytics, and comprehensive content management capabilities.