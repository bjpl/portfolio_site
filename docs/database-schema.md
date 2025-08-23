# Portfolio Database Schema Documentation

## Overview

This document describes the comprehensive database architecture for the Portfolio Site, designed to support content management, user authentication, versioning, workflow management, and media handling.

## Database Design Principles

- **Scalability**: Designed to handle growing content and user base
- **Flexibility**: Supports multiple content types with versioning
- **Security**: Role-based access control with comprehensive permissions
- **Performance**: Optimized indexes and efficient queries
- **Maintainability**: Clear relationships and well-documented structure

## Core Tables

### User Management

#### users
Primary table for user accounts with authentication and profile information.

**Key Features:**
- UUID primary keys for security
- Comprehensive profile management
- Account security (login attempts, lockouts)
- Customizable preferences and metadata
- Multi-language support

**Important Fields:**
- `password_hash`: Bcrypt hashed passwords
- `email_verified`: Email verification status
- `account_locked_until`: Temporary account locks
- `preferences`: JSONB for user settings
- `metadata`: Extensible data storage

#### roles
Role definitions with hierarchical permissions system.

**Key Features:**
- Flexible permission system using JSONB
- Hierarchy levels for role precedence
- System vs. custom roles
- Granular permission control

#### user_roles
Many-to-many relationship between users and roles.

**Key Features:**
- Time-based role assignments
- Role expiration support
- Assignment tracking and audit trail

### Content Management

#### projects
Core portfolio projects with comprehensive metadata.

**Key Features:**
- Rich project descriptions and case studies
- Technology stack tracking
- Client information and budget ranges
- SEO optimization fields
- Performance metrics and analytics
- Multi-media support (images, videos, demos)

#### experiences
Professional work history and career progression.

**Key Features:**
- Detailed employment information
- Achievement tracking
- Skills development over time
- Reference management
- Company and role details

#### education
Educational background, certifications, and continuous learning.

**Key Features:**
- Multiple degree types support
- Certification management with expiration
- Skills acquired tracking
- Academic projects and coursework
- Credential verification

#### testimonials
Client and colleague recommendations.

**Key Features:**
- Multi-source testimonial collection
- Verification system
- Usage permission management
- Rating and feedback systems
- Rich metadata for context

#### skills
Technical and soft skills with proficiency tracking.

**Key Features:**
- Proficiency level and scoring
- Experience timeline tracking
- Learning resource management
- Industry categorization
- Visual representation (colors, icons)

#### tags
Flexible tagging system for content organization.

**Key Features:**
- Hierarchical tag structure
- Usage analytics and trending
- Auto-suggestion capability
- SEO optimization
- Related tag relationships

### Content Versioning & Workflow

#### content_versions
Comprehensive version control for all content types.

**Key Features:**
- Polymorphic content relationship
- Change tracking and diff generation
- Publishing workflow integration
- Content quality metrics
- Scheduled publishing
- Multi-language support

#### workflow_states
State management for content approval processes.

**Key Features:**
- Flexible workflow definitions
- Task assignment and tracking
- Progress monitoring
- Escalation management
- Checklist and feedback systems
- Automation rules support

### Media Management

#### media_assets
Comprehensive media file management.

**Key Features:**
- Multi-format support (images, videos, audio, documents)
- Metadata extraction and storage
- Optimization tracking
- CDN integration
- Access control and permissions
- Virus scanning integration
- Duplicate detection via content hashing

### Association Tables

#### project_skills
Links projects to skills with usage context.

**Key Features:**
- Skill proficiency in project context
- Learning outcomes tracking
- Usage intensity measurement
- Importance scoring
- Alternative technology consideration

#### project_tags
Associates projects with tags for organization.

**Key Features:**
- Relevance scoring
- AI-generated tag support
- Primary tag designation
- Source attribution

## Relationships

### Primary Relationships

1. **User → Roles**: Many-to-many through user_roles
2. **Projects → Skills**: Many-to-many through project_skills
3. **Projects → Tags**: Many-to-many through project_tags
4. **Content → Versions**: One-to-many (polymorphic)
5. **Content → Workflows**: One-to-many (polymorphic)
6. **Users → Media**: One-to-many (uploaded_by)

### Polymorphic Relationships

The system uses polymorphic relationships for:
- Content versioning (content_id + content_type)
- Workflow management (content_id + content_type)
- Media associations (associated_id + associated_type)

## Indexes Strategy

### Performance Indexes
- Primary key indexes on all UUID fields
- Foreign key indexes on all relationship fields
- Composite indexes on frequently queried combinations

### Search Indexes
- Text search indexes on titles and descriptions
- Tag and category indexes for filtering
- Date range indexes for timeline queries

### Analytics Indexes
- Usage count and popularity score indexes
- Status and publication state indexes
- User activity tracking indexes

## Data Types

### PostgreSQL Specific Features

#### JSONB Fields
Used extensively for:
- User preferences and metadata
- Role permissions
- Content data storage
- Workflow configurations
- Media metadata
- Quality metrics

#### Arrays
Used for:
- String arrays (tags, technologies, skills)
- UUID arrays (dependencies, relationships)

#### ENUMs
Defined for:
- User status types
- Content types and states
- Media file types
- Workflow states
- Employment types

## Security Considerations

### Access Control
- Role-based permissions system
- Field-level access control capability
- User isolation through proper foreign keys
- Audit trail maintenance

### Data Protection
- Password hashing with bcrypt
- Sensitive data encryption support
- GDPR compliance considerations
- Data retention policies

## Scalability Features

### Horizontal Scaling Support
- UUID primary keys prevent ID conflicts
- Partitioning-ready table structures
- CDN integration for media files
- Caching strategy integration points

### Performance Optimization
- Efficient indexing strategy
- Query optimization considerations
- Background job integration points
- Analytics data separation

## Migration Strategy

### Database Migrations
- Sequelize-based migration system
- Version-controlled schema changes
- Rollback capability
- Data migration support

### Seeding System
- Development data seeding
- Production-safe seed scripts
- Demo content generation
- Test data management

## Monitoring & Maintenance

### Health Checks
- Database connection monitoring
- Performance metrics tracking
- Storage usage monitoring
- Query performance analysis

### Backup Strategy
- Point-in-time recovery support
- Automated backup scheduling
- Cross-region backup replication
- Data integrity verification

## Usage Examples

### Content Management Flow
1. User creates project → projects table
2. System creates initial version → content_versions table
3. Content enters workflow → workflow_states table
4. Skills and tags associated → project_skills, project_tags tables
5. Media uploaded and linked → media_assets table

### Version Control Flow
1. Content modified → new content_versions entry
2. Changes tracked → diff_from_previous field
3. Workflow initiated → workflow_states updated
4. Approval process → workflow progression
5. Publication → is_published flag updated

### User Permission Flow
1. User assigned role → user_roles table
2. Permission checked → roles.permissions JSONB
3. Access granted/denied based on role hierarchy
4. Activity logged → audit trail capability

## Future Enhancements

### Planned Features
- Multi-tenant support
- Advanced analytics tables
- Real-time collaboration features
- API rate limiting tables
- Advanced search indexing

### Scalability Improvements
- Read replica support
- Sharding strategy preparation
- Archive table implementation
- Performance monitoring tables

This schema provides a solid foundation for a professional portfolio system with enterprise-level features including content versioning, workflow management, comprehensive user management, and media handling capabilities.