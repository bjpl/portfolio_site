# Backend Testing Suite

Comprehensive testing suite for the Portfolio Backend system with 90%+ code coverage and multiple testing layers.

## 📋 Test Structure

```
tests/
├── setup.js                    # Global test setup and utilities
├── global-setup.js             # Jest global setup
├── global-teardown.js          # Jest global teardown
├── fixtures/
│   └── testData.js             # Test data factories and fixtures
├── unit/                       # Unit tests
│   ├── models/                 # Model tests
│   │   ├── User.test.js
│   │   ├── Project.test.js
│   │   └── ...
│   ├── services/               # Service layer tests
│   │   ├── authService.test.js
│   │   ├── portfolioService.test.js
│   │   └── ...
│   ├── middleware/             # Middleware tests
│   │   ├── auth.test.js
│   │   └── ...
│   └── utils/                  # Utility tests
│       ├── logger.test.js
│       └── ...
├── integration/                # Integration tests
│   ├── api/                    # API endpoint tests
│   │   ├── auth.integration.test.js
│   │   └── ...
│   └── database/               # Database integration tests
├── e2e/                        # End-to-end tests
│   ├── auth.e2e.test.js       # Complete user flows
│   └── ...
└── performance/                # Performance tests
    └── load.test.js           # Load and stress tests
```

## 🚀 Quick Start

### Install Dependencies

```bash
cd backend
npm install
```

### Run All Tests

```bash
npm test
```

### Run Specific Test Types

```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# End-to-end tests only
npm run test:e2e

# Performance tests only
npm run test:performance

# Watch mode for development
npm run test:watch

# Generate coverage report
npm run test:coverage

# CI/CD mode
npm run test:ci
```

## 📊 Coverage Goals

- **Global Coverage**: 80%+ (branches, functions, lines, statements)
- **Services Layer**: 85%+ (critical business logic)
- **Models Layer**: 75%+ (data validation and business rules)
- **Middleware Layer**: 90%+ (security and authentication)

## 🧪 Test Categories

### Unit Tests

**Purpose**: Test individual components in isolation

**Coverage**:
- Model validation and business logic
- Service layer functionality
- Middleware behavior
- Utility functions
- Error handling

**Example**:
```javascript
describe('User Model', () => {
  it('should create a valid user with required fields', async () => {
    const userData = await factories.createUser();
    const user = await User.create(userData);
    
    expect(user).toHaveValidId();
    expect(user.email).toBe(userData.email);
    expect(user.isEmailVerified).toBe(false);
  });
});
```

### Integration Tests

**Purpose**: Test component interactions and API endpoints

**Coverage**:
- API endpoint functionality
- Authentication flows
- Database operations
- File upload handling
- External service integration

**Example**:
```javascript
describe('POST /api/auth/login', () => {
  it('should login user with valid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password123' })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.tokens).toHaveProperty('accessToken');
  });
});
```

### End-to-End Tests

**Purpose**: Test complete user journeys and workflows

**Coverage**:
- Complete registration flows
- Authentication processes
- Admin workflows
- Multi-step operations
- Error recovery scenarios

**Example**:
```javascript
describe('Complete User Registration Flow', () => {
  it('should complete full user registration and login flow', async () => {
    // 1. Register user
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(userData);
    
    // 2. Verify email
    // 3. Login
    // 4. Access protected resources
  });
});
```

### Performance Tests

**Purpose**: Validate system performance under load

**Coverage**:
- Concurrent request handling
- Memory usage monitoring
- Response time validation
- Database query performance
- Rate limiting behavior

**Example**:
```javascript
it('should handle multiple concurrent login requests', async () => {
  const promises = Array(50).fill(0).map(() => 
    request(app).post('/api/auth/login').send(credentials)
  );
  
  const responses = await Promise.all(promises);
  const successRate = responses.filter(r => r.status === 200).length / 50;
  expect(successRate).toBeGreaterThan(0.9); // 90% success rate
});
```

## 🛠 Test Utilities

### Global Test Utilities

Available via `global.testUtils`:

```javascript
// User creation
const user = await global.testUtils.createTestUser();
const admin = await global.testUtils.createTestAdmin();

// JWT tokens
const accessToken = global.testUtils.generateJWT({ id: 1 });
const refreshToken = global.testUtils.generateRefreshToken({ id: 1 });

// HTTP mocks
const req = global.testUtils.mockRequest({ body: { email: 'test@example.com' } });
const res = global.testUtils.mockResponse();
const next = global.testUtils.mockNext();

// File uploads
const file = global.testUtils.mockFileUpload('test.jpg', 'image/jpeg');

// Cache operations
global.testUtils.clearCache();

// Validation helpers
global.testUtils.expectSuccessResponse(response, { user: expectedUser });
global.testUtils.expectErrorResponse(response, 400, 'Validation failed');
```

### Test Factories

Data factories in `tests/fixtures/testData.js`:

```javascript
const { factories } = require('../fixtures/testData');

// Create test data
const userData = await factories.createUser({ email: 'custom@test.com' });
const projectData = factories.createProject(userId, { title: 'Custom Project' });
const skillData = factories.createSkill({ name: 'React', level: 'expert' });

// Bulk creation
const users = await factories.createMultipleUsers(10, 'user');
const projects = factories.createMultipleProjects(userId, 5);
```

### Custom Jest Matchers

Extended matchers for better assertions:

```javascript
// Date validation
expect(user.createdAt).toBeValidDate();

// ID validation
expect(user).toHaveValidId();

// Email validation
expect('test@example.com').toBeValidEmail();

// JWT validation
expect(token).toHaveValidJWT();

// Range validation
expect(responseTime).toBeWithinRange(0, 1000);
```

## 🔧 Configuration

### Jest Configuration

Key settings in `jest.config.js`:

- **Test Environment**: Node.js
- **Setup Files**: Global setup and utilities
- **Coverage Thresholds**: 80%+ global, 85%+ services
- **Reporters**: HTML, JUnit, and default console
- **Timeout**: 30s default, 5min for performance tests

### Environment Variables

Test-specific environment variables:

```bash
NODE_ENV=test
DATABASE_URL=sqlite::memory:
JWT_SECRET=test-jwt-secret-key-12345
JWT_REFRESH_SECRET=test-refresh-secret-12345
REDIS_URL=redis://localhost:6379/15
LOG_LEVEL=error
DISABLE_EMAIL=true
DISABLE_EXTERNAL_APIS=true
```

## 🚨 Mocking Strategy

### External Dependencies

All external services are mocked:

- **Email Service**: `nodemailer` mocked to prevent actual emails
- **File Processing**: `sharp` mocked for image processing
- **Redis**: In-memory mock implementation
- **File System**: Mocked for file operations
- **Logger**: Mocked to prevent log noise

### Database

- **Unit Tests**: In-memory SQLite database
- **Integration Tests**: Isolated test database
- **Data Cleanup**: Automatic cleanup between tests
- **Seeding**: Minimal required seed data

## 📈 Performance Benchmarks

### Expected Performance Metrics

- **Login Requests**: <200ms average response time
- **Registration**: <500ms average response time  
- **Protected Endpoints**: <50ms average response time
- **Database Queries**: <100ms average query time
- **Memory Usage**: <50MB increase during test suite

### Load Testing Scenarios

- **Concurrent Logins**: 50 simultaneous requests
- **Mixed Workload**: Various endpoint combinations
- **Extreme Load**: 200+ concurrent operations
- **Memory Leak Detection**: Repeated operations monitoring

## 🔍 Debugging Tests

### Debug Mode

```bash
# Debug specific test
npm run test:debug -- --testNamePattern="User Model"

# Debug with breakpoints
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Verbose Output

```bash
# Enable debug logging
DEBUG=true npm test

# Verbose Jest output
npm test -- --verbose
```

### Common Issues

1. **Database Locks**: Ensure proper cleanup in `afterEach`
2. **Memory Leaks**: Use `global.gc()` for garbage collection
3. **Timing Issues**: Increase timeouts for slow operations
4. **Mock Persistence**: Clear mocks between tests

## 📋 Test Checklist

### Before Adding New Features

- [ ] Write unit tests for new functions/methods
- [ ] Add integration tests for new API endpoints
- [ ] Include error case testing
- [ ] Test edge cases and boundary conditions
- [ ] Update performance tests if needed

### Test Quality Standards

- [ ] Tests are deterministic and repeatable
- [ ] Tests are isolated and independent
- [ ] Tests have descriptive names
- [ ] Tests follow AAA pattern (Arrange, Act, Assert)
- [ ] Error cases are tested
- [ ] Performance impact is considered

## 🤝 Contributing

### Adding New Tests

1. Follow existing naming conventions
2. Use appropriate test utilities and factories
3. Include both positive and negative test cases
4. Maintain or improve coverage percentages
5. Update documentation as needed

### Test Maintenance

- Regularly review and update test data
- Remove obsolete tests for deprecated features
- Optimize slow-running tests
- Update mocks when external APIs change

## 📚 Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Guide](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [Node.js Testing](https://nodejs.dev/learn/nodejs-testing)

---

**Test Coverage Target**: 90%+ | **Performance**: Sub-200ms API responses | **Reliability**: Zero flaky tests