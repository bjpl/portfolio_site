// Global test setup - runs once before all test suites
const path = require('path');

module.exports = async () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = 'sqlite::memory:';
  process.env.JWT_SECRET = 'test-jwt-secret-key-12345';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-12345';
  process.env.REDIS_URL = 'redis://localhost:6379/15';
  process.env.LOG_LEVEL = 'error';
  process.env.EMAIL_SERVICE = 'mock';
  
  // Disable external services in tests
  process.env.DISABLE_EMAIL = 'true';
  process.env.DISABLE_EXTERNAL_APIS = 'true';
  
  console.log('🧪 Global test setup completed');
  console.log('Environment: TEST');
  console.log('Database: In-Memory SQLite');
  console.log('External services: Mocked');
};