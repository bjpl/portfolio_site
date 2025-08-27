# Migration Test Suite

Comprehensive testing suite for validating database migrations, schema integrity, and rollback procedures.

## Overview

This test suite validates:

1. **Database Connectivity** - Supabase and direct PostgreSQL connections
2. **Table Creation** - All required tables and column structures
3. **Foreign Key Constraints** - Referential integrity and constraint enforcement
4. **Index Performance** - Query optimization and full-text search
5. **Row Level Security** - RLS policies and access control
6. **Rollback Procedures** - Transaction safety and recovery mechanisms

## Quick Start

### Prerequisites

Set the required environment variables:

```bash
# Required
export SUPABASE_URL="your_supabase_project_url"
export SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"

# Optional (enables direct PostgreSQL testing)
export DATABASE_URL="postgresql://user:pass@host:port/db"
```

### Running Tests

**Option 1: Using the test runner script (recommended)**

```bash
# Linux/macOS
cd scripts
chmod +x run-migration-tests.sh
./run-migration-tests.sh

# Windows
cd scripts
run-migration-tests.bat
```

**Option 2: Direct execution**

```bash
cd scripts
npm install  # If dependencies not installed
node test-migrations.js
```

**Option 3: Using npm script**

```bash
cd scripts
npm run test:migrations
```

## Test Categories

### 1. Database Connectivity Tests

- ✅ Supabase client connection
- ✅ Direct PostgreSQL connection
- ✅ PostgreSQL extensions (uuid-ossp, pgcrypto, pg_trgm, unaccent, btree_gin)
- ✅ Authentication service

### 2. Table Creation Tests

- ✅ Core tables: profiles, blog_posts, projects, media_assets
- ✅ Enhanced tables: pages, categories, workflow_states, content_workflows
- ✅ System tables: roles, user_roles, menus, menu_items
- ✅ Advanced tables: analytics_sessions, form_definitions, seo_metadata
- ✅ Column structure validation for key tables

### 3. Foreign Key Constraint Tests

- ✅ Author relationships (blog_posts.author_id → profiles.id)
- ✅ Hierarchical relationships (pages.parent_id → pages.id)
- ✅ Workflow relationships (content_workflows.workflow_state_id → workflow_states.id)
- ✅ Media relationships (media_assets.uploaded_by → profiles.id)
- ✅ Constraint enforcement validation

### 4. Index Tests

- ✅ Primary indexes on key lookup columns (slug, author_id)
- ✅ Performance indexes on frequently queried fields
- ✅ Full-text search indexes for content search
- ✅ Query performance validation (EXPLAIN plans)

### 5. Row Level Security (RLS) Tests

- ✅ RLS enabled on sensitive tables
- ✅ Policy existence validation
- ✅ Public access to published content
- ✅ Access control for draft content
- ✅ Permission-based access patterns

### 6. Rollback and Recovery Tests

- ✅ Transaction rollback functionality
- ✅ Migration version tracking
- ✅ Schema backup information accessibility
- ✅ Function definition preservation

## Test Output

The test suite provides:

- **Real-time progress** with colored console output
- **Detailed error messages** for failed tests
- **Performance metrics** and timing information
- **Comprehensive summary** with pass rates
- **Actionable recommendations** for fixing issues

### Sample Output

```
🚀 Starting Migration Test Suite
=====================================

🔄 Initializing database connections...
✅ Supabase client initialized
✅ PostgreSQL client connected

🧪 Testing Database Connectivity...
  ✅ Supabase client connection
  ✅ Direct PostgreSQL connection
     PostgreSQL version: PostgreSQL 15.1
  ✅ Extension: uuid-ossp
  ✅ Extension: pgcrypto
  ⚠️  Extension: pg_trgm

📊 Test Results Summary
======================
✅ CONNECTIVITY: 8/9 (89%)
✅ TABLES: 25/25 (100%)
✅ CONSTRAINTS: 12/12 (100%)
✅ INDEXES: 18/20 (90%)
✅ POLICIES: 15/15 (100%)
✅ ROLLBACK: 6/6 (100%)

📈 Overall Results:
   Total Tests: 84
   Passed: 82
   Failed: 2
   Pass Rate: 98%
   Duration: 12s

🏁 Test suite completed with exit code: 0
```

## Environment Configuration

### Development Environment

```bash
# .env.local
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
DATABASE_URL=postgresql://postgres:[password]@db.your-project.supabase.co:5432/postgres
```

### CI/CD Environment

The test suite is designed to work in automated environments:

```yaml
# GitHub Actions example
- name: Test Database Migrations
  env:
    SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
  run: |
    cd scripts
    npm install
    node test-migrations.js
```

## Troubleshooting

### Common Issues

**Connection Timeout**
```
Error: connect ETIMEDOUT
```
- Check firewall settings
- Verify Supabase project is active
- Confirm URL and keys are correct

**Missing Tables**
```
❌ Table exists: blog_posts
```
- Run Supabase migrations: `supabase db push`
- Check migration files in `supabase/migrations/`

**RLS Policy Failures**
```
❌ RLS enabled: profiles
```
- Ensure RLS migration has been applied
- Check policy definitions in migration files

**Extension Missing**
```
❌ Extension: pg_trgm
```
- Enable extensions via Supabase dashboard
- Or run: `CREATE EXTENSION IF NOT EXISTS "pg_trgm";`

### Debug Mode

Enable verbose logging:

```bash
DEBUG=true node test-migrations.js
```

## Integration with Claude Flow

The test suite integrates with Claude Flow hooks for coordination:

- **Pre-task hooks**: Session initialization
- **Post-edit hooks**: Memory storage of test results
- **Post-task hooks**: Completion notification
- **Notify hooks**: Status updates

## Security Considerations

- Uses service role key for comprehensive testing
- Tests RLS policy enforcement
- Validates permission-based access
- Ensures secure constraint enforcement

## Performance Impact

The test suite is designed to be:

- **Non-destructive**: Read-only operations where possible
- **Isolated**: Uses transactions for test data
- **Efficient**: Parallel test execution
- **Clean**: Automatic cleanup of test artifacts

## Contributing

When adding new tests:

1. Follow the existing test patterns
2. Add tests to appropriate categories
3. Include both positive and negative test cases
4. Update expected results arrays
5. Document any new environment variables

## Migration Compatibility

This test suite is compatible with:

- ✅ Supabase hosted databases
- ✅ Self-hosted PostgreSQL with Supabase
- ✅ Local development environments
- ✅ CI/CD environments
- ✅ Multiple schema versions (backward compatible)