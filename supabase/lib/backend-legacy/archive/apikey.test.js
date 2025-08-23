const request = require('supertest');
const bcrypt = require('bcryptjs');
const { User } = require('../../models/User');
const ApiKey = require('../models/ApiKey');
const TokenService = require('../services/TokenService');
const EmailService = require('../services/EmailService');

// Mock the email service
jest.mock('../services/EmailService');

describe('API Key Management', () => {
  let app;
  let testUser;
  let adminUser;
  let authToken;
  let adminToken;
  let testApiKey;

  beforeAll(async () => {
    app = require('../../server');

    // Create test users
    testUser = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: await bcrypt.hash('TestPassword123!', 12),
      firstName: 'Test',
      lastName: 'User',
      isEmailVerified: true,
      role: 'editor'
    });

    adminUser = await User.create({
      username: 'admin',
      email: 'admin@example.com',
      password: await bcrypt.hash('AdminPassword123!', 12),
      firstName: 'Admin',
      lastName: 'User',
      isEmailVerified: true,
      role: 'admin'
    });

    // Generate auth tokens
    authToken = TokenService.generateAccessToken({
      id: testUser.id,
      email: testUser.email,
      role: testUser.role,
      username: testUser.username
    });

    adminToken = TokenService.generateAccessToken({
      id: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
      username: adminUser.username
    });
  });

  afterAll(async () => {
    // Clean up
    await ApiKey.destroy({ where: {} });
    await User.destroy({ where: {} });
  });

  beforeEach(async () => {
    // Clean up API keys before each test
    await ApiKey.destroy({ where: {} });
  });

  describe('API Key Creation', () => {
    test('should create API key successfully', async () => {
      const keyData = {
        name: 'Test API Key',
        permissions: {
          read: true,
          write: true,
          admin: false
        },
        allowedIPs: ['192.168.1.1'],
        rateLimit: 1000
      };

      const response = await request(app)
        .post('/auth/api-keys')
        .set('Authorization', `Bearer ${authToken}`)
        .send(keyData)
        .expect(201);

      expect(response.body.message).toBe('API key created successfully');
      expect(response.body.apiKey).toMatch(/^ak_/);
      expect(response.body.keyInfo.name).toBe(keyData.name);
      expect(response.body.keyInfo.permissions).toEqual(keyData.permissions);
      expect(EmailService.sendSecurityAlert).toHaveBeenCalled();

      testApiKey = response.body.apiKey;
    });

    test('should reject API key creation without name', async () => {
      const response = await request(app)
        .post('/auth/api-keys')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          permissions: { read: true }
        })
        .expect(400);

      expect(response.body.error).toBe('Name is required');
    });

    test('should reject admin permissions for non-admin users', async () => {
      const keyData = {
        name: 'Admin Key',
        permissions: {
          read: true,
          write: true,
          admin: true
        }
      };

      const response = await request(app)
        .post('/auth/api-keys')
        .set('Authorization', `Bearer ${authToken}`)
        .send(keyData)
        .expect(403);

      expect(response.body.error).toBe('Insufficient permissions');
    });

    test('should allow admin permissions for admin users', async () => {
      const keyData = {
        name: 'Admin API Key',
        permissions: {
          read: true,
          write: true,
          admin: true
        }
      };

      const response = await request(app)
        .post('/auth/api-keys')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(keyData)
        .expect(201);

      expect(response.body.keyInfo.permissions.admin).toBe(true);
    });

    test('should validate IP addresses', async () => {
      const keyData = {
        name: 'Invalid IP Key',
        permissions: { read: true },
        allowedIPs: ['invalid-ip', '999.999.999.999']
      };

      const response = await request(app)
        .post('/auth/api-keys')
        .set('Authorization', `Bearer ${authToken}`)
        .send(keyData)
        .expect(400);

      expect(response.body.error).toBe('Invalid IP addresses');
    });

    test('should validate expiration date', async () => {
      const keyData = {
        name: 'Expired Key',
        permissions: { read: true },
        expiresAt: '2020-01-01T00:00:00Z' // Past date
      };

      const response = await request(app)
        .post('/auth/api-keys')
        .set('Authorization', `Bearer ${authToken}`)
        .send(keyData)
        .expect(400);

      expect(response.body.error).toBe('Invalid expiration date');
    });
  });

  describe('API Key Listing', () => {
    beforeEach(async () => {
      // Create test API keys
      await ApiKey.create({
        userId: testUser.id,
        name: 'Test Key 1',
        keyHash: ApiKey.hashApiKey('ak_test1'),
        prefix: 'ak_te',
        permissions: { read: true, write: false },
        isActive: true
      });

      await ApiKey.create({
        userId: testUser.id,
        name: 'Test Key 2',
        keyHash: ApiKey.hashApiKey('ak_test2'),
        prefix: 'ak_ts',
        permissions: { read: true, write: true },
        isActive: false
      });
    });

    test('should list user API keys', async () => {
      const response = await request(app)
        .get('/auth/api-keys')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.apiKeys).toHaveLength(1); // Only active by default
      expect(response.body.apiKeys[0].name).toBe('Test Key 1');
      expect(response.body.apiKeys[0].maskedKey).toMatch(/ak_.*\*\*\*/);
    });

    test('should include inactive keys when requested', async () => {
      const response = await request(app)
        .get('/auth/api-keys?includeInactive=true')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.apiKeys).toHaveLength(2);
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .get('/auth/api-keys')
        .expect(401);

      expect(response.body.error).toBe('Authentication required');
    });
  });

  describe('API Key Details', () => {
    let apiKeyId;

    beforeEach(async () => {
      const apiKey = await ApiKey.create({
        userId: testUser.id,
        name: 'Detail Test Key',
        keyHash: ApiKey.hashApiKey('ak_detail'),
        prefix: 'ak_de',
        permissions: { read: true, write: true },
        currentUsage: 50,
        totalUsage: 1000,
        rateLimit: 100
      });
      apiKeyId = apiKey.id;
    });

    test('should get API key details', async () => {
      const response = await request(app)
        .get(`/auth/api-keys/${apiKeyId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.apiKey.name).toBe('Detail Test Key');
      expect(response.body.apiKey.usagePercentage).toBe(50); // 50/100
    });

    test('should return 404 for non-existent API key', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440000';
      
      const response = await request(app)
        .get(`/auth/api-keys/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error).toBe('API key not found');
    });
  });

  describe('API Key Updates', () => {
    let apiKeyId;

    beforeEach(async () => {
      const apiKey = await ApiKey.create({
        userId: testUser.id,
        name: 'Update Test Key',
        keyHash: ApiKey.hashApiKey('ak_update'),
        prefix: 'ak_up',
        permissions: { read: true, write: false },
        rateLimit: 100
      });
      apiKeyId = apiKey.id;
    });

    test('should update API key', async () => {
      const updates = {
        name: 'Updated Key Name',
        permissions: { read: true, write: true },
        rateLimit: 200
      };

      const response = await request(app)
        .patch(`/auth/api-keys/${apiKeyId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates)
        .expect(200);

      expect(response.body.message).toBe('API key updated successfully');
      expect(response.body.apiKey.name).toBe(updates.name);
    });

    test('should reject unauthorized permission updates', async () => {
      const updates = {
        permissions: { read: true, write: true, admin: true }
      };

      const response = await request(app)
        .patch(`/auth/api-keys/${apiKeyId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates)
        .expect(403);

      expect(response.body.error).toBe('Insufficient permissions');
    });
  });

  describe('API Key Revocation', () => {
    let apiKeyId;

    beforeEach(async () => {
      const apiKey = await ApiKey.create({
        userId: testUser.id,
        name: 'Revoke Test Key',
        keyHash: ApiKey.hashApiKey('ak_revoke'),
        prefix: 'ak_rv',
        permissions: { read: true }
      });
      apiKeyId = apiKey.id;
    });

    test('should revoke API key', async () => {
      const response = await request(app)
        .delete(`/auth/api-keys/${apiKeyId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('API key revoked successfully');
      expect(EmailService.sendSecurityAlert).toHaveBeenCalled();

      // Verify key was deleted
      const deletedKey = await ApiKey.findByPk(apiKeyId);
      expect(deletedKey).toBeNull();
    });

    test('should revoke all API keys', async () => {
      // Create another key
      await ApiKey.create({
        userId: testUser.id,
        name: 'Another Key',
        keyHash: ApiKey.hashApiKey('ak_another'),
        prefix: 'ak_an',
        permissions: { read: true }
      });

      const response = await request(app)
        .delete('/auth/api-keys')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.revokedCount).toBeGreaterThan(0);

      // Verify all keys were deleted
      const remainingKeys = await ApiKey.findAll({
        where: { userId: testUser.id }
      });
      expect(remainingKeys).toHaveLength(0);
    });
  });

  describe('API Key Rotation', () => {
    let apiKeyId;

    beforeEach(async () => {
      const apiKey = await ApiKey.create({
        userId: testUser.id,
        name: 'Rotate Test Key',
        keyHash: ApiKey.hashApiKey('ak_rotate'),
        prefix: 'ak_rt',
        permissions: { read: true, write: true }
      });
      apiKeyId = apiKey.id;
    });

    test('should rotate API key', async () => {
      const response = await request(app)
        .post(`/auth/api-keys/${apiKeyId}/rotate`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('API key rotated successfully');
      expect(response.body.newKey.apiKey).toMatch(/^ak_/);

      // Verify old key was deleted
      const oldKey = await ApiKey.findByPk(apiKeyId);
      expect(oldKey).toBeNull();
    });
  });

  describe('API Key Usage Statistics', () => {
    let apiKeyId;

    beforeEach(async () => {
      const apiKey = await ApiKey.create({
        userId: testUser.id,
        name: 'Usage Test Key',
        keyHash: ApiKey.hashApiKey('ak_usage'),
        prefix: 'ak_us',
        permissions: { read: true },
        currentUsage: 75,
        totalUsage: 500,
        rateLimit: 100,
        lastUsedAt: new Date()
      });
      apiKeyId = apiKey.id;
    });

    test('should get usage statistics', async () => {
      const response = await request(app)
        .get(`/auth/api-keys/${apiKeyId}/usage`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.stats.currentUsage).toBe(75);
      expect(response.body.stats.totalUsage).toBe(500);
      expect(response.body.stats.usagePercentage).toBe(75);
    });

    test('should generate usage report', async () => {
      const response = await request(app)
        .get('/auth/api-keys-report')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.report).toHaveProperty('summary');
      expect(response.body.report).toHaveProperty('keys');
      expect(response.body.report.summary.totalKeys).toBe(1);
    });
  });

  describe('Admin Operations', () => {
    test('should get system statistics (admin only)', async () => {
      const response = await request(app)
        .get('/auth/admin/api-keys/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.stats).toHaveProperty('totalKeys');
      expect(response.body.stats).toHaveProperty('activeKeys');
    });

    test('should reject system stats for non-admin', async () => {
      const response = await request(app)
        .get('/auth/admin/api-keys/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body.error).toBe('Insufficient permissions');
    });

    test('should clean expired keys (admin only)', async () => {
      // Create expired key
      await ApiKey.create({
        userId: testUser.id,
        name: 'Expired Key',
        keyHash: ApiKey.hashApiKey('ak_expired'),
        prefix: 'ak_ex',
        permissions: { read: true },
        expiresAt: new Date('2020-01-01')
      });

      const response = await request(app)
        .post('/auth/admin/api-keys/clean-expired')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.message).toBe('Expired keys cleaned successfully');
    });

    test('should reset usage counters (admin only)', async () => {
      const response = await request(app)
        .post('/auth/admin/api-keys/reset-counters')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.message).toBe('Usage counters reset successfully');
    });
  });

  describe('API Key Authentication', () => {
    let apiKeyString;

    beforeEach(async () => {
      apiKeyString = ApiKey.generateApiKey();
      await ApiKey.create({
        userId: testUser.id,
        name: 'Auth Test Key',
        keyHash: ApiKey.hashApiKey(apiKeyString),
        prefix: apiKeyString.substring(0, 5),
        permissions: { read: true, write: true },
        isActive: true
      });
    });

    test('should authenticate with valid API key', async () => {
      const response = await request(app)
        .get('/auth/profile')
        .set('X-API-Key', apiKeyString)
        .expect(200);

      expect(response.body.user.id).toBe(testUser.id);
    });

    test('should reject invalid API key', async () => {
      const response = await request(app)
        .get('/auth/profile')
        .set('X-API-Key', 'ak_invalid_key')
        .expect(401);

      expect(response.body.error).toBe('Invalid API key');
    });

    test('should apply rate limiting to API keys', async () => {
      // Create a key with low rate limit
      const limitedKeyString = ApiKey.generateApiKey();
      await ApiKey.create({
        userId: testUser.id,
        name: 'Limited Key',
        keyHash: ApiKey.hashApiKey(limitedKeyString),
        prefix: limitedKeyString.substring(0, 5),
        permissions: { read: true },
        rateLimit: 1,
        currentUsage: 1, // Already at limit
        isActive: true
      });

      const response = await request(app)
        .get('/auth/profile')
        .set('X-API-Key', limitedKeyString)
        .expect(401);

      expect(response.body.message).toBe('API key is expired, inactive, or rate limited');
    });
  });
});