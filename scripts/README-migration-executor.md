# Migration Execution System

A comprehensive, production-ready database migration execution system with validation, rollback capabilities, and detailed logging.

## Features

- **Robust Migration Execution**: Sequential execution of SQL migrations with proper error handling
- **Supabase Integration**: Built specifically for Supabase with service role authentication
- **Validation System**: Syntax checking, reference validation, and post-execution verification
- **Rollback Capability**: Automatic rollback generation and execution
- **Backup System**: Automated backups before migration execution
- **Comprehensive Logging**: Detailed logs with multiple output formats
- **Claude Flow Integration**: Hooks for swarm coordination and memory management
- **Test Suite**: Complete test coverage with mock scenarios
- **Configuration Management**: Environment-specific configurations

## Files Overview

### Core Files
- **`execute-migrations.js`** - Main migration executor with full functionality
- **`migration-executor-config.js`** - Configuration management and validation
- **`migration-utils.js`** - Utility functions for file handling, SQL parsing, and validation

### Testing and Examples
- **`test-migration-executor.js`** - Comprehensive test suite
- **`migration-example-usage.js`** - Usage examples and demonstrations

## Quick Start

### 1. Environment Setup

```bash
# Required environment variables
export SUPABASE_URL="your-supabase-url"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

### 2. Basic Usage

```bash
# Execute all pending migrations
node scripts/execute-migrations.js execute

# Check migration status
node scripts/execute-migrations.js status

# Rollback last migration
node scripts/execute-migrations.js rollback 1

# Validate migration state
node scripts/execute-migrations.js validate
```

### 3. Programmatic Usage

```javascript
import { MigrationExecutor } from './scripts/execute-migrations.js';

const executor = new MigrationExecutor();

// Execute all pending migrations
const result = await executor.executeAll();
if (result.success) {
  console.log('Migrations completed successfully');
}

// Get migration status
const status = await executor.getStatus();
console.log(`Executed: ${status.executed.length}, Pending: ${status.pending.length}`);
```

## Command Line Interface

### Migration Commands

```bash
# Execute migrations
node execute-migrations.js execute
node execute-migrations.js run

# Check status
node execute-migrations.js status

# Rollback migrations
node execute-migrations.js rollback [steps]

# Validate database state
node execute-migrations.js validate
```

### Testing Commands

```bash
# Run all tests
node test-migration-executor.js

# Run specific test suites
node test-migration-executor.js utilities
node test-migration-executor.js config
node test-migration-executor.js executor
node test-migration-executor.js errors
```

### Example Usage

```bash
# Run all examples
node migration-example-usage.js

# Run specific examples
node migration-example-usage.js basic
node migration-example-usage.js config
node migration-example-usage.js validation
node migration-example-usage.js hooks
```

## Configuration

### Environment Configurations

The system supports different configurations for different environments:

```javascript
// Development (default)
{
  strictMode: false,
  allowDestructiveOperations: true,
  debugLevel: 'debug'
}

// Production
{
  strictMode: true,
  allowDestructiveOperations: false,
  debugLevel: 'warning',
  requireApproval: true
}
```

### Custom Configuration

```javascript
import { MigrationExecutor } from './execute-migrations.js';

const executor = new MigrationExecutor({
  supabaseUrl: 'your-url',
  serviceKey: 'your-key',
  logLevel: 'debug',
  dryRun: false
});
```

## Migration File Structure

### Naming Convention
```
YYYYMMDDHHMMSS_description.sql
```

Examples:
- `20241225000001_enhanced_portfolio_schema.sql`
- `20241225000002_enhanced_rls_policies.sql`
- `20241225000003_advanced_storage_config.sql`

### Migration Content
```sql
-- Migration: Description of changes
-- =====================================================

-- Enable extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tables
CREATE TABLE IF NOT EXISTS public.example_table (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_example_name ON public.example_table(name);

-- Set up RLS policies
ALTER TABLE public.example_table ENABLE ROW LEVEL SECURITY;
```

## Features in Detail

### 1. Migration Execution

- **Sequential Processing**: Migrations execute in chronological order
- **Transaction Safety**: Each migration runs in its own transaction
- **Error Recovery**: Detailed error reporting and recovery options
- **Progress Tracking**: Real-time progress updates with spinners

### 2. Validation System

- **Syntax Validation**: SQL syntax checking before execution
- **Reference Validation**: Check for table and column references
- **Post-Execution Validation**: Verify successful migration completion
- **Checksum Verification**: Ensure migration file integrity

### 3. Rollback System

- **Automatic Generation**: Generate rollback SQL from migration content
- **Manual Rollback**: Support for custom rollback scripts
- **Partial Rollback**: Roll back specific number of migrations
- **Backup Integration**: Create backups before rollback operations

### 4. Backup System

- **Pre-Migration Backup**: Automatic backup before migration execution
- **Schema Backup**: Backup database schema information
- **Retention Management**: Automatic cleanup of old backups
- **Restoration Support**: Tools for backup restoration

### 5. Logging System

- **Multiple Levels**: Debug, info, warning, error logging levels
- **File Logging**: Persistent logs with rotation
- **Console Output**: Colored console output for better readability
- **Structured Logging**: JSON-formatted logs for analysis

### 6. Claude Flow Integration

The system includes hooks for Claude Flow integration:

```bash
# Pre-task hook
npx claude-flow@alpha hooks pre-task --description "Migration execution"

# Post-edit hook
npx claude-flow@alpha hooks post-edit --file "migration.sql" --memory-key "swarm/migration/status"

# Notification hook
npx claude-flow@alpha hooks notify --message "Migration completed successfully"
```

## Error Handling

### Common Error Scenarios

1. **Missing Configuration**
   ```
   Error: Missing required Supabase configuration
   ```
   Solution: Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY

2. **Connection Failure**
   ```
   Error: Database connection failed
   ```
   Solution: Check network connectivity and credentials

3. **SQL Syntax Errors**
   ```
   Error: Migration execution failed: syntax error at or near "..."
   ```
   Solution: Review and fix SQL syntax in migration file

4. **Permission Errors**
   ```
   Error: permission denied for table ...
   ```
   Solution: Ensure service role key has sufficient permissions

### Error Recovery

- **Automatic Rollback**: Failed migrations trigger automatic rollback
- **Manual Recovery**: Tools for manual error recovery
- **Backup Restoration**: Restore from backup if needed
- **Partial Recovery**: Skip failed migrations and continue

## Best Practices

### 1. Migration File Guidelines

- **One Concept Per Migration**: Keep migrations focused on single changes
- **Idempotent Operations**: Use IF NOT EXISTS and similar constructs
- **Clear Documentation**: Include comments explaining the changes
- **Test Locally**: Always test migrations in development first

### 2. Deployment Practices

- **Backup First**: Always create backups before production migrations
- **Staged Deployment**: Test in staging before production
- **Monitor Execution**: Watch logs and metrics during migration
- **Have Rollback Plan**: Prepare rollback procedures

### 3. Performance Considerations

- **Index Creation**: Create indexes during low-traffic periods
- **Batch Operations**: Use batching for large data migrations
- **Connection Pooling**: Configure appropriate connection limits
- **Resource Monitoring**: Monitor CPU and memory usage

## Troubleshooting

### Common Issues

1. **Migration Already Executed**
   - Check migration status before execution
   - Use force flag if re-execution is needed

2. **Rollback Failures**
   - Check rollback SQL syntax
   - Verify dependencies before rollback

3. **Performance Issues**
   - Monitor query execution times
   - Consider breaking large migrations into smaller chunks

4. **Permission Problems**
   - Verify service role permissions
   - Check RLS policies

### Debug Mode

Enable debug mode for detailed information:

```bash
NODE_ENV=development node execute-migrations.js execute
```

## Contributing

### Adding New Features

1. Update the main executor class
2. Add corresponding tests
3. Update configuration if needed
4. Document the new feature

### Running Tests

```bash
# Run all tests
npm run test:migration

# Run specific test suites
node test-migration-executor.js utilities
node test-migration-executor.js executor
```

## Support

For issues and questions:

1. Check the logs in the `logs/` directory
2. Run the test suite to verify functionality
3. Review configuration settings
4. Check Supabase connectivity and permissions

## License

This migration system is part of the portfolio site project and follows the same license terms.