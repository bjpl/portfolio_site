// Test environment setup
process.env.NODE_ENV = 'test';

// Mock environment variables for testing
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key';
process.env.DB_NAME = 'portfolio_test_db';
process.env.LOG_LEVEL = 'error'; // Reduce log noise in tests

// Global test utilities
global.mockUser = {
  id: 1,
  email: 'test@example.com',
  password: 'hashedpassword',
  role: 'user',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

global.mockAdmin = {
  id: 2,
  email: 'admin@example.com',
  password: 'hashedpassword',
  role: 'admin',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Test database configuration
const testConfig = {
  database: {
    type: 'sqlite',
    storage: ':memory:', // In-memory SQLite for testing
    logging: false,
    sync: { force: true },
  },
  redis: {
    host: 'localhost',
    port: 6380, // Different port for test Redis instance
  },
};

// Mock Redis for tests if not available
const mockRedis = {
  isConnected: false,
  async connect() {
    return true;
  },
  async disconnect() {
    return true;
  },
  async get() {
    return null;
  },
  async set() {
    return true;
  },
  async delete() {
    return true;
  },
  async exists() {
    return false;
  },
  async ping() {
    return 'PONG';
  },
};

// Global test setup
beforeAll(async () => {
  // Setup test database
  const { sequelize } = require('../src/models/User');
  await sequelize.sync({ force: true });
});

// Global test cleanup
afterAll(async () => {
  const { sequelize } = require('../src/models/User');
  await sequelize.close();
});

// Clean up after each test
afterEach(async () => {
  // Clear Redis cache if available
  try {
    const cache = require('../src/services/cache');
    if (cache.isConnected) {
      await cache.flush();
    }
  } catch (error) {
    // Ignore cache errors in tests
  }
});

// Extend Jest matchers
expect.extend({
  toBeValidDate(received) {
    const pass = received instanceof Date && !isNaN(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid date`,
        pass: true,
      };
    }
    return {
      message: () => `expected ${received} to be a valid date`,
      pass: false,
    };
  },

  toHaveValidId(received) {
    const pass = typeof received.id === 'number' && received.id > 0;
    if (pass) {
      return {
        message: () => `expected ${received} not to have a valid id`,
        pass: true,
      };
    }
    return {
      message: () => `expected ${received} to have a valid id`,
      pass: false,
    };
  },
});

// Helper functions
global.createTestUser = async (overrides = {}) => {
  const User = require('../src/models/User');
  return await User.create({
    ...global.mockUser,
    ...overrides,
  });
};

global.createTestAdmin = async (overrides = {}) => {
  const User = require('../src/models/User');
  return await User.create({
    ...global.mockAdmin,
    ...overrides,
  });
};

global.generateJWT = user => {
  const jwt = require('jsonwebtoken');
  const config = require('../src/config');
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, config.security.jwtSecret, {
    expiresIn: config.security.jwtExpiresIn,
  });
};

global.mockRequest = (overrides = {}) => {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    user: null,
    ...overrides,
  };
};

global.mockResponse = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
  };
  return res;
};

global.mockNext = () => jest.fn();

// Suppress console.log in tests unless DEBUG is set
if (!process.env.DEBUG) {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}

module.exports = {
  testConfig,
  mockRedis,
};
