const { sequelize } = require('../backend/src/models');
const path = require('path');
const fs = require('fs');

/**
 * Global test setup configuration
 * This file is run before each test file
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.JWT_ACCESS_TOKEN_EXPIRY = '1h';
process.env.JWT_REFRESH_TOKEN_EXPIRY = '7d';
process.env.BCRYPT_ROUNDS = '4'; // Lower rounds for faster tests
process.env.RATE_LIMIT_WINDOW_MS = '60000'; // 1 minute
process.env.RATE_LIMIT_MAX_REQUESTS = '100';
process.env.RATE_LIMIT_AUTH_MAX = '10';

// Database configuration for tests
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'portfolio_test';
process.env.DB_USER = 'test_user';
process.env.DB_PASS = 'test_password';
process.env.DB_DIALECT = 'sqlite'; // Use SQLite for tests
process.env.DB_STORAGE = ':memory:'; // In-memory database

// File upload configuration
process.env.UPLOAD_DIR = path.join(__dirname, '../uploads/test');
process.env.MAX_FILE_SIZE = '5242880'; // 5MB for tests
process.env.ALLOWED_FILE_TYPES = 'jpg,jpeg,png,gif,pdf,txt';

// Email configuration (mock)
process.env.SMTP_HOST = 'smtp.ethereal.email';
process.env.SMTP_PORT = '587';
process.env.SMTP_USER = 'test@ethereal.email';
process.env.SMTP_PASS = 'test-password';
process.env.FROM_EMAIL = 'test@example.com';
process.env.FROM_NAME = 'Test Portfolio';

// Redis configuration (mock)
process.env.REDIS_URL = 'redis://localhost:6379/1';
process.env.REDIS_SESSION_PREFIX = 'test:sess:';

// API configuration
process.env.API_BASE_URL = 'http://localhost:4000/api';
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.CORS_ORIGIN = 'http://localhost:3000,http://localhost:1313';

// Logging configuration
process.env.LOG_LEVEL = 'error'; // Minimal logging during tests
process.env.LOG_TO_FILE = 'false';
process.env.LOG_TO_CONSOLE = 'false';

// Security configuration
process.env.HELMET_ENABLED = 'false'; // Disable for easier testing
process.env.CSRF_ENABLED = 'false';
process.env.SESSION_SECRET = 'test-session-secret';

// Content configuration
process.env.CONTENT_DIR = path.join(__dirname, '../content/test');
process.env.HUGO_CONTENT_DIR = path.join(__dirname, '../content/test');

// GraphQL configuration
process.env.GRAPHQL_INTROSPECTION = 'true';
process.env.GRAPHQL_PLAYGROUND = 'true';

// Sentry configuration (disabled for tests)
process.env.SENTRY_DSN = '';
process.env.SENTRY_ENVIRONMENT = 'test';

// Extend Jest timeout for database operations
jest.setTimeout(30000);

// Global test utilities
global.testUtils = {
  /**
   * Create a test database connection
   */
  async createTestDatabase() {
    try {
      await sequelize.authenticate();
      console.log('✓ Test database connection established');
    } catch (error) {
      console.error('✗ Unable to connect to test database:', error.message);
      throw error;
    }
  },

  /**
   * Clean up test database
   */
  async cleanDatabase() {
    try {
      // Drop all tables and recreate
      await sequelize.sync({ force: true });
      console.log('✓ Test database cleaned');
    } catch (error) {
      console.error('✗ Error cleaning test database:', error.message);
      throw error;
    }
  },

  /**
   * Create test directories
   */
  async createTestDirectories() {
    const directories = [
      path.join(__dirname, '../uploads/test'),
      path.join(__dirname, '../uploads/test/images'),
      path.join(__dirname, '../uploads/test/documents'),
      path.join(__dirname, '../uploads/test/videos'),
      path.join(__dirname, '../content/test'),
      path.join(__dirname, '../logs/test')
    ];

    for (const dir of directories) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
    console.log('✓ Test directories created');
  },

  /**
   * Clean up test files
   */
  async cleanTestFiles() {
    const testDirs = [
      path.join(__dirname, '../uploads/test'),
      path.join(__dirname, '../content/test'),
      path.join(__dirname, '../logs/test')
    ];

    for (const dir of testDirs) {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    }
    console.log('✓ Test files cleaned');
  },

  /**
   * Generate test JWT token
   */
  generateTestToken(payload = {}) {
    const jwt = require('jsonwebtoken');
    const defaultPayload = {
      id: 'test-user-id',
      username: 'testuser',
      email: 'test@example.com',
      role: 'user',
      ...payload
    };
    
    return jwt.sign(defaultPayload, process.env.JWT_SECRET, { expiresIn: '1h' });
  },

  /**
   * Generate admin test token
   */
  generateAdminToken(payload = {}) {
    return this.generateTestToken({
      role: 'admin',
      username: 'admin',
      email: 'admin@example.com',
      ...payload
    });
  },

  /**
   * Create test image buffer
   */
  createTestImageBuffer() {
    // 1x1 PNG image
    return Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
      0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
      0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
      0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
      0x42, 0x60, 0x82
    ]);
  },

  /**
   * Wait for specified time
   */
  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * Mock console methods to reduce test output noise
   */
  mockConsole() {
    const originalConsole = { ...console };
    
    console.log = jest.fn();
    console.info = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
    
    return originalConsole;
  },

  /**
   * Restore console methods
   */
  restoreConsole(originalConsole) {
    Object.assign(console, originalConsole);
  }
};

// Global before and after hooks
beforeAll(async () => {
  console.log('🚀 Setting up test environment...');
  
  // Create test directories
  await global.testUtils.createTestDirectories();
  
  // Setup test database
  await global.testUtils.createTestDatabase();
  
  console.log('✅ Test environment ready');
});

afterAll(async () => {
  console.log('🧹 Cleaning up test environment...');
  
  try {
    // Close database connection
    if (sequelize) {
      await sequelize.close();
      console.log('✓ Database connection closed');
    }
    
    // Clean up test files
    await global.testUtils.cleanTestFiles();
    
    console.log('✅ Test cleanup complete');
  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
  }
});

// Handle unhandled promise rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process in tests, just log the error
});

// Handle uncaught exceptions in tests
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit the process in tests, just log the error
});

// Mock external services for testing
const mockServices = {
  /**
   * Mock email service
   */
  mockEmailService() {
    const nodemailer = require('nodemailer');
    
    // Create mock transporter
    const mockTransporter = {
      sendMail: jest.fn().mockResolvedValue({
        messageId: 'test-message-id',
        envelope: {
          from: 'test@example.com',
          to: ['recipient@example.com']
        }
      })
    };
    
    // Mock createTransporter
    nodemailer.createTransporter = jest.fn().mockReturnValue(mockTransporter);
    
    return mockTransporter;
  },

  /**
   * Mock Redis service
   */
  mockRedisService() {
    const mockRedis = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
      expire: jest.fn(),
      flushall: jest.fn(),
      quit: jest.fn()
    };
    
    return mockRedis;
  },

  /**
   * Mock file system operations
   */
  mockFileSystem() {
    const originalFs = { ...fs };
    
    // Override specific fs methods for testing
    fs.writeFile = jest.fn().mockImplementation((path, data, callback) => {
      if (callback) callback(null);
    });
    
    fs.unlink = jest.fn().mockImplementation((path, callback) => {
      if (callback) callback(null);
    });
    
    return originalFs;
  }
};

// Make mock services available globally
global.mockServices = mockServices;

// Jest custom matchers
expect.extend({
  /**
   * Check if a value is a valid UUID
   */
  toBeValidUuid(received) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid UUID`,
        pass: true
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid UUID`,
        pass: false
      };
    }
  },

  /**
   * Check if a value is a valid email
   */
  toBeValidEmail(received) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pass = emailRegex.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid email`,
        pass: true
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid email`,
        pass: false
      };
    }
  },

  /**
   * Check if a value is a valid URL
   */
  toBeValidUrl(received) {
    try {
      new URL(received);
      return {
        message: () => `expected ${received} not to be a valid URL`,
        pass: true
      };
    } catch (error) {
      return {
        message: () => `expected ${received} to be a valid URL`,
        pass: false
      };
    }
  },

  /**
   * Check if a value is a valid JWT token
   */
  toBeValidJwt(received) {
    const jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
    const pass = jwtRegex.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid JWT token`,
        pass: true
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid JWT token`,
        pass: false
      };
    }
  }
});

console.log('📋 Test setup configuration loaded');
