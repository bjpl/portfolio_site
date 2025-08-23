// Comprehensive test setup configuration
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.test') });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-12345';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-12345';
process.env.DATABASE_URL = 'sqlite::memory:';
process.env.REDIS_URL = 'redis://localhost:6379/15';
process.env.LOG_LEVEL = 'error';

// Mock external dependencies
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-123' }),
    verify: jest.fn().mockResolvedValue(true)
  }))
}));

jest.mock('sharp', () =>
  jest.fn(() => ({
    resize: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    png: jest.fn().mockReturnThis(),
    webp: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('fake-image')),
    metadata: jest.fn().mockResolvedValue({ 
      width: 100, 
      height: 100, 
      format: 'jpeg',
      size: 1024
    })
  }))
);

// Mock file system operations
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  promises: {
    ...jest.requireActual('fs').promises,
    writeFile: jest.fn().mockResolvedValue(),
    unlink: jest.fn().mockResolvedValue(),
    mkdir: jest.fn().mockResolvedValue(),
    access: jest.fn().mockResolvedValue()
  }
}));

// Mock Redis
const mockRedis = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue('OK'),
  setex: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
  flushdb: jest.fn().mockResolvedValue('OK'),
  disconnect: jest.fn().mockResolvedValue(undefined),
  ping: jest.fn().mockResolvedValue('PONG'),
  exists: jest.fn().mockResolvedValue(0),
  expire: jest.fn().mockResolvedValue(1)
};

jest.mock('ioredis', () => jest.fn(() => mockRedis));

// Mock node-cache
const NodeCache = require('node-cache');
const mockCache = new NodeCache();
jest.mock('node-cache', () => jest.fn(() => mockCache));

// Mock winston logger
jest.mock('winston', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  })),
  format: {
    combine: jest.fn(),
    timestamp: jest.fn(),
    errors: jest.fn(),
    json: jest.fn(),
    printf: jest.fn()
  },
  transports: {
    File: jest.fn(),
    Console: jest.fn()
  }
}));

// Global test utilities
global.testUtils = {
  // User creation helpers
  async createTestUser(overrides = {}) {
    const User = require('../src/models/User');
    const bcrypt = require('bcryptjs');
    
    return await User.create({
      email: 'test@example.com',
      username: 'testuser',
      password: await bcrypt.hash('password123', 10),
      firstName: 'Test',
      lastName: 'User',
      isEmailVerified: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    });
  },

  async createTestAdmin(overrides = {}) {
    const User = require('../src/models/User');
    const Role = require('../src/models/Role');
    const bcrypt = require('bcryptjs');
    
    const user = await User.create({
      email: 'admin@example.com',
      username: 'admin',
      password: await bcrypt.hash('admin123', 10),
      firstName: 'Admin',
      lastName: 'User',
      isEmailVerified: true,
      isActive: true,
      ...overrides
    });

    const adminRole = await Role.findOne({ where: { name: 'admin' } });
    if (adminRole) {
      await user.addRole(adminRole);
    }

    return user;
  },

  // JWT helpers
  generateJWT(payload = {}) {
    const jwt = require('jsonwebtoken');
    return jwt.sign(
      { id: 1, email: 'test@example.com', ...payload },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  },

  generateRefreshToken(payload = {}) {
    const jwt = require('jsonwebtoken');
    return jwt.sign(
      { id: 1, email: 'test@example.com', type: 'refresh', ...payload },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );
  },

  // Cache helpers
  clearCache() {
    mockCache.flushAll();
    Object.keys(mockRedis).forEach(key => {
      if (typeof mockRedis[key] === 'function') {
        mockRedis[key].mockClear();
      }
    });
  },

  // Database helpers
  async createTestProject(userId, overrides = {}) {
    const Project = require('../src/models/Project');
    return await Project.create({
      title: 'Test Project',
      description: 'A test project description',
      content: 'Test project content',
      status: 'published',
      userId: userId,
      slug: 'test-project',
      ...overrides
    });
  },

  async createTestSkill(overrides = {}) {
    const Skill = require('../src/models/Skill');
    return await Skill.create({
      name: 'Test Skill',
      category: 'technical',
      level: 'intermediate',
      ...overrides
    });
  },

  async createTestTag(overrides = {}) {
    const Tag = require('../src/models/Tag');
    return await Tag.create({
      name: 'test-tag',
      displayName: 'Test Tag',
      color: '#007bff',
      ...overrides
    });
  },

  // File upload mocks
  mockFileUpload(filename = 'test-image.jpg', mimetype = 'image/jpeg', size = 1024) {
    return {
      fieldname: 'file',
      originalname: filename,
      encoding: '7bit',
      mimetype,
      buffer: Buffer.from('fake-file-content'),
      size,
      destination: '/tmp/uploads',
      filename: `test-${Date.now()}-${filename}`,
      path: `/tmp/uploads/test-${Date.now()}-${filename}`
    };
  },

  mockMultipleFiles(count = 3) {
    return Array.from({ length: count }, (_, i) => 
      this.mockFileUpload(`test-${i}.jpg`)
    );
  },

  // HTTP mocks
  mockRequest(overrides = {}) {
    return {
      body: {},
      params: {},
      query: {},
      headers: {},
      user: null,
      file: null,
      files: [],
      cookies: {},
      session: {},
      ...overrides
    };
  },

  mockResponse() {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis(),
      redirect: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      type: jest.fn().mockReturnThis(),
      attachment: jest.fn().mockReturnThis()
    };
    return res;
  },

  mockNext: () => jest.fn(),

  // Validation helpers
  expectValidationError(error, field) {
    expect(error).toBeDefined();
    expect(error.errors).toBeDefined();
    if (field) {
      expect(error.errors.some(e => e.path === field)).toBe(true);
    }
  },

  expectSuccessResponse(response, expectedData = {}) {
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        ...expectedData
      })
    );
  },

  expectErrorResponse(response, status = 400, message) {
    expect(response.status).toHaveBeenCalledWith(status);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        ...(message && { message })
      })
    );
  },

  // Date helpers
  getDateMinutesAgo(minutes) {
    return new Date(Date.now() - minutes * 60 * 1000);
  },

  getDateHoursAgo(hours) {
    return new Date(Date.now() - hours * 60 * 60 * 1000);
  },

  // API helpers
  async makeAuthenticatedRequest(app, method, endpoint, data, token) {
    const request = require('supertest');
    const req = request(app)[method.toLowerCase()](endpoint);
    
    if (token) {
      req.set('Authorization', `Bearer ${token}`);
    }
    
    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      req.send(data);
    }
    
    return req;
  }
};

// Extended Jest matchers
expect.extend({
  toBeValidDate(received) {
    const pass = received instanceof Date && !isNaN(received);
    return {
      message: () => 
        pass 
          ? `expected ${received} not to be a valid date`
          : `expected ${received} to be a valid date`,
      pass
    };
  },

  toHaveValidId(received) {
    const hasId = received && (typeof received.id === 'number' || typeof received.id === 'string');
    const validId = hasId && received.id > 0;
    return {
      message: () => 
        validId 
          ? `expected ${received} not to have a valid id`
          : `expected ${received} to have a valid id`,
      pass: validId
    };
  },

  toBeValidEmail(received) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pass = typeof received === 'string' && emailRegex.test(received);
    return {
      message: () => 
        pass 
          ? `expected ${received} not to be a valid email`
          : `expected ${received} to be a valid email`,
      pass
    };
  },

  toHaveValidJWT(received) {
    const jwtRegex = /^[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$/;
    const pass = typeof received === 'string' && jwtRegex.test(received);
    return {
      message: () => 
        pass 
          ? `expected ${received} not to be a valid JWT`
          : `expected ${received} to be a valid JWT`,
      pass
    };
  },

  toBeWithinRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling;
    return {
      message: () => 
        pass 
          ? `expected ${received} not to be within range ${floor} - ${ceiling}`
          : `expected ${received} to be within range ${floor} - ${ceiling}`,
      pass
    };
  }
});

// Global test setup
beforeAll(async () => {
  // Initialize database
  try {
    const { sequelize } = require('../src/models');
    await sequelize.sync({ force: true, logging: false });
    
    // Seed minimal required data
    const Role = require('../src/models/Role');
    await Role.bulkCreate([
      { 
        name: 'admin', 
        displayName: 'Administrator',
        permissions: JSON.stringify(['*']),
        description: 'Full system access'
      },
      { 
        name: 'editor', 
        displayName: 'Editor',
        permissions: JSON.stringify(['read', 'write', 'edit']),
        description: 'Content management access'
      },
      { 
        name: 'user', 
        displayName: 'User',
        permissions: JSON.stringify(['read']),
        description: 'Basic user access'
      }
    ]);

    const WorkflowState = require('../src/models/WorkflowState');
    await WorkflowState.bulkCreate([
      { name: 'draft', displayName: 'Draft', color: '#6c757d' },
      { name: 'review', displayName: 'Under Review', color: '#fd7e14' },
      { name: 'published', displayName: 'Published', color: '#28a745' },
      { name: 'archived', displayName: 'Archived', color: '#dc3545' }
    ]);
  } catch (error) {
    console.error('Database setup failed:', error);
    throw error;
  }
});

// Global test teardown
afterAll(async () => {
  try {
    const { sequelize } = require('../src/models');
    await sequelize.close();
    
    if (mockRedis.disconnect) {
      await mockRedis.disconnect();
    }
  } catch (error) {
    console.error('Database teardown failed:', error);
  }
});

// Clear data between tests
afterEach(async () => {
  // Clear cache
  global.testUtils.clearCache();
  
  try {
    const { sequelize } = require('../src/models');
    
    // Clear database (preserve lookup tables)
    const preservedTables = ['Role', 'WorkflowState'];
    const modelNames = Object.keys(sequelize.models)
      .filter(name => !preservedTables.includes(name));
    
    // Delete in reverse dependency order
    const deleteOrder = [
      'UserRole', 'ProjectTag', 'ProjectSkill', 'WorkflowComment',
      'ContentVersion', 'AuditLog', 'MediaAsset', 'WorkflowItem',
      'Testimonial', 'Education', 'Experience', 'Project', 
      'User', 'Tag', 'Skill'
    ].filter(name => modelNames.includes(name));
    
    for (const modelName of deleteOrder) {
      if (sequelize.models[modelName]) {
        await sequelize.models[modelName].destroy({ 
          where: {}, 
          truncate: true,
          cascade: false,
          force: true 
        });
      }
    }
  } catch (error) {
    console.error('Test cleanup failed:', error);
  }
  
  // Reset all mocks
  jest.clearAllMocks();
});

// Increase timeout for integration tests
jest.setTimeout(30000);

// Suppress console logs during tests unless DEBUG is set
if (!process.env.DEBUG) {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn()
  };
}

module.exports = {
  mockRedis,
  mockCache
};