# Supabase Integration Testing Suite

This comprehensive testing suite validates the Supabase integration across all aspects of the portfolio website, including database operations, authentication, real-time features, storage, and API endpoints.

## Table of Contents

- [Overview](#overview)
- [Test Structure](#test-structure)
- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Running Tests](#running-tests)
- [Test Categories](#test-categories)
- [Configuration](#configuration)
- [Coverage Requirements](#coverage-requirements)
- [CI/CD Integration](#cicd-integration)
- [Troubleshooting](#troubleshooting)

## Overview

The Supabase testing suite consists of multiple test categories designed to ensure robust integration between the frontend, backend, and Supabase services:

- **Integration Tests**: Database operations, CRUD, authentication, RLS policies, storage
- **API Tests**: Netlify Functions with Supabase backend, error handling, security
- **Frontend Tests**: Client initialization, auth state management, real-time subscriptions, UI integration

## Test Structure

```
tests/supabase/
├── integration/
│   ├── database-connection.test.js    # Database connectivity and health
│   ├── crud-operations.test.js        # Create, Read, Update, Delete operations
│   ├── auth-flow.test.js              # Authentication workflows
│   ├── rls-policies.test.js           # Row Level Security validation
│   └── storage.test.js                # File upload and storage operations
├── api/
│   ├── netlify-functions.test.js      # API endpoint testing
│   ├── error-handling.test.js         # Error scenarios and edge cases
│   └── security-tests.test.js         # Security and rate limiting
├── frontend/
│   ├── supabase-client.test.js        # Client initialization and configuration
│   ├── auth-state.test.js             # Authentication state management
│   ├── realtime.test.js               # Real-time subscriptions and presence
│   └── ui-integration.test.js         # UI component integration
└── README.md                          # This documentation
```

## Prerequisites

Before running the tests, ensure you have the following:

### Required Software
- Node.js (v18 or higher)
- npm or yarn package manager
- Git

### Supabase Setup
1. **Supabase Project**: Create a project at [supabase.com](https://supabase.com)
2. **Local Development**: Install Supabase CLI for local development
   ```bash
   npm install -g supabase
   ```

### Database Schema
Ensure your Supabase database has the required schema by running:
```bash
supabase db push
```

## Environment Setup

### 1. Environment Variables

Create a `.env.test` file in the project root:

```env
# Supabase Configuration
SUPABASE_URL=your-supabase-project-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Netlify Functions (for API testing)
NETLIFY_FUNCTIONS_URL=http://localhost:8888/.netlify/functions

# Test Database (optional - for isolated testing)
SUPABASE_TEST_URL=your-test-supabase-url
SUPABASE_TEST_ANON_KEY=your-test-anon-key

# Testing Configuration
NODE_ENV=test
TEST_TIMEOUT=30000
```

### 2. Local Supabase Instance (Recommended)

For consistent testing, use a local Supabase instance:

```bash
# Start local Supabase
supabase start

# This will provide you with:
# - API URL: http://localhost:54321
# - GraphQL URL: http://localhost:54321/graphql/v1
# - DB URL: postgresql://postgres:postgres@localhost:54322/postgres
# - Studio URL: http://localhost:54323
# - Inbucket URL: http://localhost:54324
# - JWT secret: super-secret-jwt-token-with-at-least-32-characters-long
# - anon key: [generated-anon-key]
# - service_role key: [generated-service-role-key]
```

Update your `.env.test` with the local URLs and keys.

### 3. Database Migration

Apply the database schema:

```bash
# Apply migrations to local instance
supabase db push

# Or apply to remote instance
supabase db push --db-url "your-database-url"
```

### 4. Test Data Seeding

Optionally seed test data:

```bash
# Run seed script
npm run seed:test

# Or manually insert test data
supabase db seed
```

## Running Tests

### Full Test Suite

```bash
# Run all Supabase tests
npm run test:supabase

# Run with coverage
npm run test:supabase -- --coverage

# Run in watch mode
npm run test:supabase -- --watch
```

### Specific Test Categories

```bash
# Integration tests only
npm run test:supabase:integration

# API tests only
npm run test:supabase:api

# Frontend tests only
npm run test:supabase:frontend
```

### Individual Test Files

```bash
# Database connection tests
npx jest tests/supabase/integration/database-connection.test.js

# Authentication flow tests
npx jest tests/supabase/integration/auth-flow.test.js

# Real-time subscription tests
npx jest tests/supabase/frontend/realtime.test.js
```

### Test Configuration Options

```bash
# Run with specific timeout
npx jest --testTimeout=60000

# Run with verbose output
npx jest --verbose

# Run specific test pattern
npx jest --testNamePattern="should handle authentication"

# Run in parallel (default)
npx jest --maxWorkers=4

# Run serially (for debugging)
npx jest --runInBand
```

## Test Categories

### Integration Tests

#### Database Connection Tests (`database-connection.test.js`)
- ✅ Connection health and timeout handling
- ✅ Connection pool management
- ✅ Basic query operations
- ✅ Error handling for invalid queries
- ✅ Performance monitoring

#### CRUD Operations Tests (`crud-operations.test.js`)
- ✅ Create operations across all tables
- ✅ Read operations with filtering and pagination
- ✅ Update operations with validation
- ✅ Delete operations and cascading
- ✅ Complex relationships and joins
- ✅ Batch operations
- ✅ Data validation and constraints

#### Authentication Flow Tests (`auth-flow.test.js`)
- ✅ User registration with validation
- ✅ Login/logout flows
- ✅ Session management and persistence
- ✅ Token refresh mechanisms
- ✅ Password reset flows
- ✅ Profile updates
- ✅ Social authentication
- ✅ Multi-session handling

#### RLS Policies Tests (`rls-policies.test.js`)
- ✅ Public content access
- ✅ User profile isolation
- ✅ Content ownership validation
- ✅ Private data protection
- ✅ Role-based permissions
- ✅ Data isolation scenarios
- ✅ Security edge cases

#### Storage Tests (`storage.test.js`)
- ✅ Bucket management
- ✅ File upload/download operations
- ✅ File management (move, copy, remove)
- ✅ Storage policies and security
- ✅ Large file handling
- ✅ Concurrent operations

### API Tests

#### Netlify Functions Tests (`netlify-functions.test.js`)
- ✅ Health check endpoints
- ✅ Contact form processing
- ✅ Authentication endpoints
- ✅ Content retrieval (blog, projects)
- ✅ Error handling and CORS
- ✅ Performance and reliability

#### Error Handling Tests (`error-handling.test.js`)
- ✅ Network connectivity errors
- ✅ HTTP error responses
- ✅ Request validation errors
- ✅ Authentication failures
- ✅ Database connection issues
- ✅ Rate limiting responses

#### Security Tests (`security-tests.test.js`)
- ✅ Input sanitization (XSS, SQL injection)
- ✅ Authentication security
- ✅ Rate limiting implementation
- ✅ Data protection measures
- ✅ Cryptographic security
- ✅ API security headers

### Frontend Tests

#### Supabase Client Tests (`supabase-client.test.js`)
- ✅ Client initialization and configuration
- ✅ Authentication state management
- ✅ Database query building
- ✅ Real-time subscription setup
- ✅ Storage operations interface
- ✅ Error handling and resilience
- ✅ Memory management

#### Auth State Tests (`auth-state.test.js`)
- ✅ Initial state management
- ✅ Auth state transitions
- ✅ Session persistence
- ✅ Token refresh handling
- ✅ Multiple session management
- ✅ UI integration callbacks

#### Realtime Tests (`realtime.test.js`)
- ✅ Database change subscriptions
- ✅ Presence tracking
- ✅ Broadcast messaging
- ✅ Channel management
- ✅ Error handling and recovery
- ✅ Performance under load

#### UI Integration Tests (`ui-integration.test.js`)
- ✅ Authentication UI flows
- ✅ Data loading and display
- ✅ Real-time UI updates
- ✅ Form interactions
- ✅ File upload integration
- ✅ Error handling and feedback

## Configuration

### Jest Configuration

The tests use the main `jest.config.js` with specific Supabase settings:

```javascript
// jest.config.js (relevant sections)
module.exports = {
  testMatch: [
    '**/tests/supabase/**/*.test.js'
  ],
  setupFilesAfterEnv: [
    '<rootDir>/tests/supabase/setup.js'
  ],
  testEnvironment: 'node', // or 'jsdom' for frontend tests
  testTimeout: 30000,
  coverageThreshold: {
    './tests/supabase/': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

### Test Setup File

Create `tests/supabase/setup.js`:

```javascript
// Global test setup for Supabase tests
require('dotenv').config({ path: '.env.test' });

// Global test utilities
global.testUtils = {
  generateTestEmail: () => `test.${Date.now()}@example.com`,
  generateTestData: (type) => {
    // Generate test data based on type
  },
  cleanupTestData: async (supabase) => {
    // Cleanup function for test data
  }
};

// Increase timeout for integration tests
jest.setTimeout(30000);
```

## Coverage Requirements

### Minimum Coverage Thresholds

- **Statements**: 80%
- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%

### Critical Path Coverage

Ensure 100% coverage for:
- Authentication flows
- Data validation
- Security measures
- Error handling paths

### Coverage Reports

Generate coverage reports:

```bash
# HTML report
npm run test:supabase -- --coverage --coverageReporters=html

# JSON report for CI/CD
npm run test:supabase -- --coverage --coverageReporters=json

# Text summary
npm run test:supabase -- --coverage --coverageReporters=text-summary
```

## CI/CD Integration

### GitHub Actions Example

```yaml
# .github/workflows/supabase-tests.yml
name: Supabase Integration Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  supabase-tests:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1
      
      - name: Start Supabase local development setup
        run: supabase start
      
      - name: Run Supabase tests
        run: npm run test:supabase
        env:
          SUPABASE_URL: http://localhost:54321
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
      
      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
```

### Environment Secrets

Configure these secrets in your CI/CD:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NETLIFY_FUNCTIONS_URL`

## Troubleshooting

### Common Issues

#### 1. Connection Timeout Errors

```bash
Error: connect ECONNREFUSED 127.0.0.1:54321
```

**Solution**: Ensure Supabase is running locally:
```bash
supabase status
supabase start
```

#### 2. Authentication Errors

```bash
Error: Invalid API key
```

**Solutions**:
- Verify environment variables are set correctly
- Check API key format and permissions
- Ensure using the correct key for test environment

#### 3. Database Schema Issues

```bash
Error: relation "profiles" does not exist
```

**Solution**: Apply database migrations:
```bash
supabase db push
supabase db reset  # If needed
```

#### 4. Rate Limiting in Tests

```bash
Error: Too many requests
```

**Solutions**:
- Add delays between requests in tests
- Use different test accounts
- Implement backoff strategies

#### 5. Memory Issues with Large Test Suites

**Solutions**:
- Run tests with `--runInBand` flag
- Increase Node.js memory limit: `--max-old-space-size=4096`
- Cleanup test data between tests

### Debug Mode

Enable debug logging:

```bash
# Enable Supabase debug logs
DEBUG=supabase* npm run test:supabase

# Enable Jest debug mode
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Test Data Cleanup

If tests are failing due to stale data:

```bash
# Reset local database
supabase db reset

# Or manually cleanup
supabase sql --file cleanup-test-data.sql
```

### Performance Issues

Monitor test performance:

```bash
# Run with timing information
npm run test:supabase -- --verbose --detectOpenHandles

# Profile memory usage
node --inspect node_modules/.bin/jest --runInBand
```

## Best Practices

### 1. Test Isolation

- Each test should clean up after itself
- Use unique identifiers for test data
- Avoid dependencies between tests

### 2. Realistic Test Data

- Use representative data sizes
- Test with various data types
- Include edge cases and boundary conditions

### 3. Error Testing

- Test both happy path and error scenarios
- Verify error messages and codes
- Test error recovery mechanisms

### 4. Performance Considerations

- Set appropriate timeouts
- Monitor resource usage
- Test under load conditions

### 5. Security Testing

- Test authentication and authorization
- Validate input sanitization
- Test rate limiting and abuse protection

## Support and Resources

- **Supabase Documentation**: https://supabase.com/docs
- **Jest Documentation**: https://jestjs.io/docs/getting-started
- **Testing Best Practices**: https://kentcdodds.com/blog/common-mistakes-with-react-testing-library
- **Project Issues**: [GitHub Issues](../../issues)

## Contributing

When adding new tests:

1. Follow the existing test structure
2. Include both positive and negative test cases
3. Add appropriate documentation
4. Ensure tests are deterministic and isolated
5. Update this README with new test descriptions

---

**Note**: This testing suite is designed to be comprehensive and may take several minutes to complete. For faster feedback during development, run specific test files or use watch mode.