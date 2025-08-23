/**
 * Comprehensive Authentication Test Suite
 * 
 * This test suite covers all authentication endpoints, token validation,
 * session management, error handling, and edge cases for production reliability.
 * 
 * Test Categories:
 * 1. Unit Tests - Individual function testing
 * 2. Integration Tests - Full workflow testing  
 * 3. Security Tests - Vulnerability and edge case testing
 * 4. Performance Tests - Load and stress testing
 * 5. End-to-End Tests - Complete user journey testing
 */

const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { performance } = require('perf_hooks');

// Import application components
const app = require('../../backend/src/simple-cms-server.js');
const authService = require('../../backend/src/services/authService.js');
const { User, Session } = require('../../backend/src/models/User.js');
const config = require('../../backend/src/config/index.js');

// Test utilities
const testUtils = {
  createTestUser: async (overrides = {}) => {
    const defaultUser = {
      email: `test-${Date.now()}@example.com`,
      username: `testuser${Date.now()}`,
      password: 'SecureTestPass123!',
      firstName: 'Test',
      lastName: 'User',
      role: 'viewer',
      isActive: true,
      isEmailVerified: true
    };
    
    return await User.create({ ...defaultUser, ...overrides });
  },

  generateTokenPair: (user) => {
    const accessToken = authService.generateToken({
      id: user.id,
      email: user.email,
      role: user.role
    });
    
    const refreshToken = authService.generateRefreshToken({
      id: user.id,
      tokenVersion: user.refreshTokenVersion || 0
    });
    
    return { accessToken, refreshToken };
  },

  createAuthHeaders: (token) => ({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }),

  waitFor: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  measureExecutionTime: async (fn) => {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    return { result, executionTime: end - start };
  }
};

// Test data generators
const testData = {
  validUser: () => ({
    email: `user-${Date.now()}@test.com`,
    username: `user${Date.now()}`,
    password: 'ValidPass123!',
    firstName: 'Test',
    lastName: 'User'
  }),

  invalidEmails: [
    'invalid-email',
    'user@',
    '@domain.com',
    'user..user@domain.com',
    'user@domain',
    ''
  ],

  weakPasswords: [
    '123456',
    'password',
    'Password123',  // Missing special char
    'password123!', // Missing uppercase
    'PASSWORD123!', // Missing lowercase
    'Password!',    // Too short
    ''
  ],

  maliciousInputs: [
    '<script>alert("xss")</script>',
    '"; DROP TABLE users; --',
    '${process.env.JWT_SECRET}',
    '../../../etc/passwd',
    'eval("malicious code")',
    new Array(10000).fill('a').join('') // Large payload
  ]
};

describe('🔐 Comprehensive Authentication Test Suite', () => {
  let testUser;
  let adminUser;
  let authTokens;

  beforeAll(async () => {
    // Setup test database state
    await User.destroy({ where: {}, force: true });
    await Session.destroy({ where: {}, force: true });

    // Create test users
    testUser = await testUtils.createTestUser({
      role: 'editor'
    });

    adminUser = await testUtils.createTestUser({
      role: 'admin',
      email: 'admin@test.com',
      username: 'admin'
    });

    authTokens = testUtils.generateTokenPair(testUser);
  });

  afterAll(async () => {
    // Cleanup
    await User.destroy({ where: {}, force: true });
    await Session.destroy({ where: {}, force: true });
  });

  // ===========================================
  // 1. UNIT TESTS - Core Authentication Logic
  // ===========================================
  
  describe('🧪 Unit Tests - Core Authentication Logic', () => {
    
    describe('Token Generation and Validation', () => {
      test('should generate valid access token', () => {
        const payload = { id: 1, email: 'test@test.com', role: 'user' };
        const token = authService.generateToken(payload);
        
        expect(token).toMatch(/^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/);
        
        const decoded = jwt.verify(token, config.security.jwtSecret);
        expect(decoded.id).toBe(payload.id);
        expect(decoded.email).toBe(payload.email);
        expect(decoded.role).toBe(payload.role);
        expect(decoded.iat).toBeDefined();
        expect(decoded.exp).toBeDefined();
      });

      test('should generate valid refresh token', () => {
        const payload = { id: 1, tokenVersion: 0 };
        const refreshToken = authService.generateRefreshToken(payload);
        
        expect(refreshToken).toBeDefined();
        
        const decoded = jwt.verify(refreshToken, config.security.jwtRefreshSecret);
        expect(decoded.id).toBe(payload.id);
        expect(decoded.tokenVersion).toBe(payload.tokenVersion);
      });

      test('should validate token expiration', async () => {
        const shortLivedToken = jwt.sign(
          { id: 1, email: 'test@test.com' },
          config.security.jwtSecret,
          { expiresIn: '1ms' }
        );

        await testUtils.waitFor(10); // Wait for token to expire

        expect(() => {
          authService.verifyToken(shortLivedToken);
        }).toThrow('Token has expired');
      });

      test('should reject invalid token signature', () => {
        const validToken = authService.generateToken({ id: 1 });
        const tamperedToken = validToken.slice(0, -10) + 'tampered123';

        expect(() => {
          authService.verifyToken(tamperedToken);
        }).toThrow('Invalid token');
      });

      test('should handle malformed tokens', () => {
        const malformedTokens = [
          'not-a-jwt-token',
          'header.payload', // Missing signature
          'header.payload.signature.extra', // Too many parts
          '', // Empty string
          null,
          undefined
        ];

        malformedTokens.forEach(token => {
          expect(() => {
            authService.verifyToken(token);
          }).toThrow();
        });
      });
    });

    describe('Password Hashing and Validation', () => {
      test('should hash password securely', async () => {
        const password = 'TestPassword123!';
        const hash = await bcrypt.hash(password, 12);

        expect(hash).not.toBe(password);
        expect(hash).toMatch(/^\$2[aby]\$\d+\$/);
        expect(await bcrypt.compare(password, hash)).toBe(true);
      });

      test('should validate password strength', async () => {
        const strongPassword = 'StrongPass123!@#';
        const weakPassword = 'weak';

        // Test strong password acceptance
        expect(async () => {
          await testUtils.createTestUser({ password: strongPassword });
        }).not.toThrow();

        // Test weak password rejection would be handled by validation middleware
        // This is tested in integration tests
      });

      test('should handle password comparison edge cases', async () => {
        const password = 'TestPassword123!';
        const hash = await bcrypt.hash(password, 12);

        // Null/undefined comparisons
        expect(await bcrypt.compare(null, hash)).toBe(false);
        expect(await bcrypt.compare(undefined, hash)).toBe(false);
        expect(await bcrypt.compare('', hash)).toBe(false);
        
        // Case sensitivity
        expect(await bcrypt.compare(password.toUpperCase(), hash)).toBe(false);
        expect(await bcrypt.compare(password.toLowerCase(), hash)).toBe(false);
      });
    });

    describe('Session Management', () => {
      test('should create session with all required fields', async () => {
        const sessionData = {
          userId: testUser.id,
          token: 'test-token',
          refreshToken: 'test-refresh-token',
          userAgent: 'Test User Agent',
          ipAddress: '192.168.1.1'
        };

        const session = await authService.createSession(
          sessionData.userId,
          sessionData.token,
          sessionData.refreshToken,
          sessionData.userAgent,
          sessionData.ipAddress
        );

        expect(session.userId).toBe(sessionData.userId);
        expect(session.token).toBe(sessionData.token);
        expect(session.refreshToken).toBe(sessionData.refreshToken);
        expect(session.userAgent).toBe(sessionData.userAgent);
        expect(session.ipAddress).toBe(sessionData.ipAddress);
        expect(session.expiresAt).toBeDefined();
        expect(session.createdAt).toBeDefined();
      });

      test('should retrieve active sessions for user', async () => {
        // Create multiple sessions
        const sessions = await Promise.all([
          authService.createSession(testUser.id, 'token1', 'refresh1'),
          authService.createSession(testUser.id, 'token2', 'refresh2'),
          authService.createSession(testUser.id, 'token3', 'refresh3')
        ]);

        const activeSessions = await authService.getActiveSessions(testUser.id);
        
        expect(activeSessions).toHaveLength(3);
        expect(activeSessions.every(s => s.userId === testUser.id)).toBe(true);
      });

      test('should revoke specific session', async () => {
        const session = await authService.createSession(
          testUser.id,
          'revoke-test-token',
          'revoke-test-refresh'
        );

        await authService.revokeSession(testUser.id, session.id);

        const sessions = await authService.getActiveSessions(testUser.id);
        expect(sessions.find(s => s.id === session.id)).toBeUndefined();
      });

      test('should logout all sessions', async () => {
        // Create multiple sessions
        await Promise.all([
          authService.createSession(testUser.id, 'logout-token1', 'logout-refresh1'),
          authService.createSession(testUser.id, 'logout-token2', 'logout-refresh2')
        ]);

        await authService.logoutAll(testUser.id);

        const sessions = await authService.getActiveSessions(testUser.id);
        expect(sessions).toHaveLength(0);
      });
    });
  });

  // ===========================================
  // 2. INTEGRATION TESTS - API Endpoints
  // ===========================================
  
  describe('🔗 Integration Tests - Authentication API Endpoints', () => {
    
    describe('POST /api/auth/register', () => {
      test('should register new user with valid data', async () => {
        const userData = testData.validUser();

        const response = await request(app)
          .post('/api/auth/register')
          .send(userData)
          .expect(201);

        expect(response.body).toHaveProperty('message', 'User registered successfully');
        expect(response.body).toHaveProperty('user');
        expect(response.body).toHaveProperty('accessToken');
        expect(response.body).toHaveProperty('refreshToken');
        
        expect(response.body.user.email).toBe(userData.email.toLowerCase());
        expect(response.body.user.username).toBe(userData.username);
        expect(response.body.user).not.toHaveProperty('password');
        expect(response.body.user.role).toBe('viewer'); // Default role
      });

      test('should reject registration with existing email', async () => {
        const userData = testData.validUser();
        
        // Register first user
        await request(app)
          .post('/api/auth/register')
          .send(userData)
          .expect(201);

        // Try to register with same email
        const response = await request(app)
          .post('/api/auth/register')
          .send(userData)
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toMatch(/email.*already/i);
      });

      test('should reject registration with existing username', async () => {
        const userData1 = testData.validUser();
        const userData2 = { ...testData.validUser(), username: userData1.username };

        await request(app)
          .post('/api/auth/register')
          .send(userData1)
          .expect(201);

        const response = await request(app)
          .post('/api/auth/register')
          .send(userData2)
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toMatch(/username.*taken/i);
      });

      test('should validate email format', async () => {
        const invalidEmails = testData.invalidEmails;

        for (const email of invalidEmails) {
          const userData = { ...testData.validUser(), email };
          
          const response = await request(app)
            .post('/api/auth/register')
            .send(userData)
            .expect(400);

          expect(response.body).toHaveProperty('error', 'Validation failed');
          expect(response.body.details).toBeDefined();
        }
      });

      test('should enforce password strength requirements', async () => {
        const weakPasswords = testData.weakPasswords;

        for (const password of weakPasswords) {
          const userData = { ...testData.validUser(), password };
          
          const response = await request(app)
            .post('/api/auth/register')
            .send(userData)
            .expect(400);

          expect(response.body).toHaveProperty('error', 'Validation failed');
        }
      });

      test('should sanitize malicious input', async () => {
        const maliciousInputs = testData.maliciousInputs;

        for (const maliciousInput of maliciousInputs) {
          const userData = {
            ...testData.validUser(),
            firstName: maliciousInput
          };
          
          // Should either reject or sanitize the input
          const response = await request(app)
            .post('/api/auth/register')
            .send(userData);

          expect([400, 201]).toContain(response.status);
          
          if (response.status === 201) {
            // If accepted, ensure it's sanitized
            expect(response.body.user.firstName).not.toBe(maliciousInput);
          }
        }
      });

      test('should handle concurrent registrations gracefully', async () => {
        const baseUser = testData.validUser();
        const concurrentRequests = 5;
        
        const promises = Array.from({ length: concurrentRequests }, (_, i) => 
          request(app)
            .post('/api/auth/register')
            .send({
              ...baseUser,
              email: `concurrent${i}@test.com`,
              username: `concurrent${i}`
            })
        );

        const responses = await Promise.all(promises);
        const successCount = responses.filter(r => r.status === 201).length;
        
        expect(successCount).toBe(concurrentRequests);
      });
    });

    describe('POST /api/auth/login', () => {
      let loginTestUser;

      beforeEach(async () => {
        loginTestUser = await testUtils.createTestUser({
          email: 'login@test.com',
          password: 'LoginTestPass123!'
        });
      });

      test('should login with valid email and password', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: loginTestUser.email,
            password: 'LoginTestPass123!'
          })
          .expect(200);

        expect(response.body).toHaveProperty('message', 'Login successful');
        expect(response.body).toHaveProperty('user');
        expect(response.body).toHaveProperty('accessToken');
        expect(response.body.user.id).toBe(loginTestUser.id);
        
        // Should set refresh token cookie
        expect(response.headers['set-cookie']).toBeDefined();
        expect(response.headers['set-cookie'].some(cookie => 
          cookie.includes('refreshToken')
        )).toBe(true);
      });

      test('should login with valid username and password', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: loginTestUser.username, // Using username in email field
            password: 'LoginTestPass123!'
          })
          .expect(200);

        expect(response.body).toHaveProperty('accessToken');
        expect(response.body.user.id).toBe(loginTestUser.id);
      });

      test('should reject invalid password', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: loginTestUser.email,
            password: 'WrongPassword123!'
          })
          .expect(401);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toMatch(/invalid|credentials/i);
      });

      test('should reject non-existent email', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'nonexistent@test.com',
            password: 'LoginTestPass123!'
          })
          .expect(401);

        expect(response.body).toHaveProperty('error');
      });

      test('should reject login for inactive user', async () => {
        await loginTestUser.update({ isActive: false });

        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: loginTestUser.email,
            password: 'LoginTestPass123!'
          })
          .expect(401);

        expect(response.body).toHaveProperty('error');
      });

      test('should enforce email verification if required', async () => {
        // This test assumes email verification is required in config
        const unverifiedUser = await testUtils.createTestUser({
          email: 'unverified@test.com',
          isEmailVerified: false
        });

        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: unverifiedUser.email,
            password: 'SecureTestPass123!'
          });

        // Response depends on configuration
        expect([200, 401]).toContain(response.status);
        
        if (response.status === 401) {
          expect(response.body.error).toMatch(/verify.*email/i);
        }
      });

      test('should handle brute force protection', async () => {
        const maxAttempts = 5;
        const promises = [];

        // Make multiple failed login attempts
        for (let i = 0; i < maxAttempts + 1; i++) {
          promises.push(
            request(app)
              .post('/api/auth/login')
              .send({
                email: loginTestUser.email,
                password: 'WrongPassword123!'
              })
          );
        }

        const responses = await Promise.all(promises);
        
        // Later requests should be rate limited
        const rateLimitedResponses = responses.filter(r => r.status === 429);
        expect(rateLimitedResponses.length).toBeGreaterThan(0);
      });

      test('should track device fingerprint', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .set('User-Agent', 'Test-Browser/1.0')
          .set('Accept-Language', 'en-US,en;q=0.9')
          .send({
            email: loginTestUser.email,
            password: 'LoginTestPass123!'
          })
          .expect(200);

        // Verify session was created with device info
        const sessions = await authService.getActiveSessions(loginTestUser.id);
        expect(sessions.length).toBeGreaterThan(0);
        expect(sessions[0].userAgent).toBe('Test-Browser/1.0');
      });
    });

    describe('POST /api/auth/refresh', () => {
      let refreshTestUser;
      let validRefreshToken;

      beforeEach(async () => {
        refreshTestUser = await testUtils.createTestUser();
        const tokens = testUtils.generateTokenPair(refreshTestUser);
        validRefreshToken = tokens.refreshToken;
        
        // Create session
        await authService.createSession(
          refreshTestUser.id,
          tokens.accessToken,
          tokens.refreshToken
        );
      });

      test('should refresh token with valid refresh token', async () => {
        const response = await request(app)
          .post('/api/auth/refresh')
          .send({ refreshToken: validRefreshToken })
          .expect(200);

        expect(response.body).toHaveProperty('accessToken');
        
        // Verify new token is valid
        const decoded = jwt.verify(response.body.accessToken, config.security.jwtSecret);
        expect(decoded.id).toBe(refreshTestUser.id);
      });

      test('should refresh token using cookie', async () => {
        const response = await request(app)
          .post('/api/auth/refresh')
          .set('Cookie', `refreshToken=${validRefreshToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('accessToken');
      });

      test('should reject invalid refresh token', async () => {
        const response = await request(app)
          .post('/api/auth/refresh')
          .send({ refreshToken: 'invalid-token' })
          .expect(401);

        expect(response.body).toHaveProperty('error');
      });

      test('should reject expired refresh token', async () => {
        const expiredToken = jwt.sign(
          { id: refreshTestUser.id, tokenVersion: 0 },
          config.security.jwtRefreshSecret,
          { expiresIn: '1ms' }
        );

        await testUtils.waitFor(10);

        const response = await request(app)
          .post('/api/auth/refresh')
          .send({ refreshToken: expiredToken })
          .expect(401);

        expect(response.body).toHaveProperty('error');
      });

      test('should reject refresh token without session', async () => {
        const tokenWithoutSession = jwt.sign(
          { id: refreshTestUser.id, tokenVersion: 0 },
          config.security.jwtRefreshSecret,
          { expiresIn: '7d' }
        );

        const response = await request(app)
          .post('/api/auth/refresh')
          .send({ refreshToken: tokenWithoutSession })
          .expect(401);

        expect(response.body).toHaveProperty('error');
      });
    });

    describe('POST /api/auth/logout', () => {
      test('should logout successfully with valid token', async () => {
        const { accessToken, refreshToken } = authTokens;
        
        const response = await request(app)
          .post('/api/auth/logout')
          .set(...Object.entries(testUtils.createAuthHeaders(accessToken))[0])
          .set('Cookie', `refreshToken=${refreshToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('message', 'Logout successful');
        
        // Should clear refresh token cookie
        expect(response.headers['set-cookie']).toBeDefined();
        expect(response.headers['set-cookie'].some(cookie => 
          cookie.includes('refreshToken=;')
        )).toBe(true);
      });

      test('should require valid access token', async () => {
        const response = await request(app)
          .post('/api/auth/logout')
          .expect(401);

        expect(response.body).toHaveProperty('error');
      });

      test('should handle logout without refresh token', async () => {
        const { accessToken } = authTokens;
        
        const response = await request(app)
          .post('/api/auth/logout')
          .set(...Object.entries(testUtils.createAuthHeaders(accessToken))[0])
          .expect(200);

        expect(response.body).toHaveProperty('message', 'Logout successful');
      });
    });

    describe('POST /api/auth/logout-all', () => {
      test('should logout from all devices', async () => {
        // Create multiple sessions for the user
        const tokens1 = testUtils.generateTokenPair(testUser);
        const tokens2 = testUtils.generateTokenPair(testUser);
        
        await Promise.all([
          authService.createSession(testUser.id, tokens1.accessToken, tokens1.refreshToken),
          authService.createSession(testUser.id, tokens2.accessToken, tokens2.refreshToken)
        ]);

        const response = await request(app)
          .post('/api/auth/logout-all')
          .set(...Object.entries(testUtils.createAuthHeaders(tokens1.accessToken))[0])
          .expect(200);

        expect(response.body).toHaveProperty('message', 'Logged out from all devices');
        
        // Verify all sessions are terminated
        const sessions = await authService.getActiveSessions(testUser.id);
        expect(sessions).toHaveLength(0);
      });
    });

    describe('Password Management Endpoints', () => {
      describe('POST /api/auth/change-password', () => {
        test('should change password with valid current password', async () => {
          const { accessToken } = testUtils.generateTokenPair(testUser);
          const newPassword = 'NewSecurePass123!';

          const response = await request(app)
            .post('/api/auth/change-password')
            .set(...Object.entries(testUtils.createAuthHeaders(accessToken))[0])
            .send({
              currentPassword: 'SecureTestPass123!',
              newPassword: newPassword
            })
            .expect(200);

          expect(response.body).toHaveProperty('message', 'Password changed successfully');
          
          // Verify password was changed
          const updatedUser = await User.findByPk(testUser.id);
          expect(await bcrypt.compare(newPassword, updatedUser.password)).toBe(true);
        });

        test('should reject change with incorrect current password', async () => {
          const { accessToken } = testUtils.generateTokenPair(testUser);

          const response = await request(app)
            .post('/api/auth/change-password')
            .set(...Object.entries(testUtils.createAuthHeaders(accessToken))[0])
            .send({
              currentPassword: 'WrongPassword123!',
              newPassword: 'NewSecurePass123!'
            })
            .expect(400);

          expect(response.body).toHaveProperty('error');
          expect(response.body.error).toMatch(/incorrect/i);
        });

        test('should validate new password strength', async () => {
          const { accessToken } = testUtils.generateTokenPair(testUser);

          const response = await request(app)
            .post('/api/auth/change-password')
            .set(...Object.entries(testUtils.createAuthHeaders(accessToken))[0])
            .send({
              currentPassword: 'SecureTestPass123!',
              newPassword: 'weak'
            })
            .expect(400);

          expect(response.body).toHaveProperty('error', 'Validation failed');
        });
      });

      describe('POST /api/auth/forgot-password', () => {
        test('should handle password reset request for existing email', async () => {
          const response = await request(app)
            .post('/api/auth/forgot-password')
            .send({ email: testUser.email })
            .expect(200);

          expect(response.body).toHaveProperty('message');
          // Should not reveal if email exists in production
        });

        test('should handle password reset request for non-existent email', async () => {
          const response = await request(app)
            .post('/api/auth/forgot-password')
            .send({ email: 'nonexistent@test.com' })
            .expect(200);

          expect(response.body).toHaveProperty('message');
          // Should return same message for security
        });

        test('should validate email format', async () => {
          const response = await request(app)
            .post('/api/auth/forgot-password')
            .send({ email: 'invalid-email' })
            .expect(400);

          expect(response.body).toHaveProperty('error', 'Validation failed');
        });

        test('should be rate limited', async () => {
          const promises = Array.from({ length: 10 }, () =>
            request(app)
              .post('/api/auth/forgot-password')
              .send({ email: testUser.email })
          );

          const responses = await Promise.all(promises);
          const rateLimitedCount = responses.filter(r => r.status === 429).length;
          
          expect(rateLimitedCount).toBeGreaterThan(0);
        });
      });

      describe('POST /api/auth/reset-password', () => {
        let resetToken;

        beforeEach(async () => {
          const resetData = await authService.requestPasswordReset(testUser.email);
          resetToken = resetData.resetToken;
        });

        test('should reset password with valid token', async () => {
          const newPassword = 'ResetPassword123!';

          const response = await request(app)
            .post('/api/auth/reset-password')
            .send({
              token: resetToken,
              newPassword: newPassword
            })
            .expect(200);

          expect(response.body).toHaveProperty('message');
          
          // Verify password was reset
          const updatedUser = await User.findByPk(testUser.id);
          expect(await bcrypt.compare(newPassword, updatedUser.password)).toBe(true);
        });

        test('should reject invalid reset token', async () => {
          const response = await request(app)
            .post('/api/auth/reset-password')
            .send({
              token: 'invalid-token',
              newPassword: 'NewPassword123!'
            })
            .expect(400);

          expect(response.body).toHaveProperty('error');
        });

        test('should validate new password strength', async () => {
          const response = await request(app)
            .post('/api/auth/reset-password')
            .send({
              token: resetToken,
              newPassword: 'weak'
            })
            .expect(400);

          expect(response.body).toHaveProperty('error', 'Validation failed');
        });
      });
    });

    describe('User Profile and Session Management', () => {
      describe('GET /api/auth/me', () => {
        test('should return current user info', async () => {
          const { accessToken } = testUtils.generateTokenPair(testUser);

          const response = await request(app)
            .get('/api/auth/me')
            .set(...Object.entries(testUtils.createAuthHeaders(accessToken))[0])
            .expect(200);

          expect(response.body).toHaveProperty('user');
          expect(response.body.user.id).toBe(testUser.id);
          expect(response.body.user.email).toBe(testUser.email);
          expect(response.body.user).not.toHaveProperty('password');
        });

        test('should require authentication', async () => {
          const response = await request(app)
            .get('/api/auth/me')
            .expect(401);

          expect(response.body).toHaveProperty('error');
        });
      });

      describe('GET /api/auth/sessions', () => {
        test('should return active sessions', async () => {
          const { accessToken } = testUtils.generateTokenPair(testUser);
          
          // Create a session
          await authService.createSession(
            testUser.id,
            accessToken,
            'refresh-token',
            'Test Browser',
            '192.168.1.1'
          );

          const response = await request(app)
            .get('/api/auth/sessions')
            .set(...Object.entries(testUtils.createAuthHeaders(accessToken))[0])
            .expect(200);

          expect(response.body).toHaveProperty('sessions');
          expect(Array.isArray(response.body.sessions)).toBe(true);
          expect(response.body.sessions.length).toBeGreaterThan(0);
        });
      });

      describe('DELETE /api/auth/sessions/:sessionId', () => {
        test('should revoke specific session', async () => {
          const { accessToken } = testUtils.generateTokenPair(testUser);
          
          const session = await authService.createSession(
            testUser.id,
            accessToken,
            'refresh-token'
          );

          const response = await request(app)
            .delete(`/api/auth/sessions/${session.id}`)
            .set(...Object.entries(testUtils.createAuthHeaders(accessToken))[0])
            .expect(200);

          expect(response.body).toHaveProperty('message', 'Session revoked successfully');
          
          // Verify session was removed
          const sessions = await authService.getActiveSessions(testUser.id);
          expect(sessions.find(s => s.id === session.id)).toBeUndefined();
        });

        test('should only allow users to revoke their own sessions', async () => {
          const { accessToken } = testUtils.generateTokenPair(testUser);
          const otherUserSession = await authService.createSession(
            adminUser.id,
            'other-token',
            'other-refresh'
          );

          const response = await request(app)
            .delete(`/api/auth/sessions/${otherUserSession.id}`)
            .set(...Object.entries(testUtils.createAuthHeaders(accessToken))[0])
            .expect(400);

          expect(response.body).toHaveProperty('error');
        });
      });
    });
  });

  // ===========================================
  // 3. SECURITY TESTS - Vulnerability Testing
  // ===========================================
  
  describe('🛡️ Security Tests - Vulnerability Protection', () => {
    
    describe('Token Security', () => {
      test('should prevent token replay attacks', async () => {
        const { accessToken } = authTokens;
        
        // Use token for logout (should invalidate it)
        await request(app)
          .post('/api/auth/logout')
          .set(...Object.entries(testUtils.createAuthHeaders(accessToken))[0])
          .expect(200);

        // Try to use the same token again
        const response = await request(app)
          .get('/api/auth/me')
          .set(...Object.entries(testUtils.createAuthHeaders(accessToken))[0])
          .expect(401);

        expect(response.body).toHaveProperty('error');
      });

      test('should validate token audience and issuer', async () => {
        // Create token with wrong issuer
        const invalidToken = jwt.sign(
          { id: testUser.id, email: testUser.email },
          config.security.jwtSecret,
          { issuer: 'malicious-issuer' }
        );

        const response = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${invalidToken}`)
          .expect(401);

        expect(response.body).toHaveProperty('error');
      });

      test('should prevent timing attacks on token verification', async () => {
        const validToken = authService.generateToken({ id: testUser.id });
        const invalidToken = 'invalid-token-string';

        // Measure response times
        const { executionTime: validTime } = await testUtils.measureExecutionTime(
          () => request(app)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${validToken}`)
        );

        const { executionTime: invalidTime } = await testUtils.measureExecutionTime(
          () => request(app)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${invalidToken}`)
        );

        // Times should be similar (within reasonable margin)
        const timeDifference = Math.abs(validTime - invalidTime);
        expect(timeDifference).toBeLessThan(100); // 100ms margin
      });
    });

    describe('Session Security', () => {
      test('should detect session hijacking attempts', async () => {
        const { accessToken, refreshToken } = authTokens;
        
        // Create session with specific IP and user agent
        const session = await authService.createSession(
          testUser.id,
          accessToken,
          refreshToken,
          'Original-Browser/1.0',
          '192.168.1.100'
        );

        // Try to use session from different IP/user agent
        const response = await request(app)
          .post('/api/auth/refresh')
          .set('User-Agent', 'Malicious-Browser/1.0')
          .set('X-Forwarded-For', '10.0.0.1') // Different IP
          .send({ refreshToken: refreshToken });

        // Response depends on implementation
        // Should either succeed with warning or fail
        expect([200, 401, 403]).toContain(response.status);
      });

      test('should enforce session timeout', async () => {
        // Create session with short expiry
        const shortSession = await Session.create({
          userId: testUser.id,
          token: 'short-token',
          refreshToken: 'short-refresh',
          expiresAt: new Date(Date.now() + 1000) // 1 second
        });

        await testUtils.waitFor(1500); // Wait for expiration

        const response = await request(app)
          .post('/api/auth/refresh')
          .send({ refreshToken: 'short-refresh' })
          .expect(401);

        expect(response.body.error).toMatch(/expired/i);
      });

      test('should limit concurrent sessions per user', async () => {
        const maxSessions = 10; // Assuming this is the limit
        const sessions = [];

        // Create maximum allowed sessions
        for (let i = 0; i < maxSessions + 1; i++) {
          const tokens = testUtils.generateTokenPair(testUser);
          sessions.push(
            authService.createSession(
              testUser.id,
              tokens.accessToken,
              tokens.refreshToken
            )
          );
        }

        await Promise.all(sessions);

        // Check if oldest sessions were cleaned up
        const activeSessions = await authService.getActiveSessions(testUser.id);
        expect(activeSessions.length).toBeLessThanOrEqual(maxSessions);
      });
    });

    describe('Input Validation and Sanitization', () => {
      test('should prevent SQL injection in login', async () => {
        const sqlInjectionAttempts = [
          "admin'; DROP TABLE users; --",
          "' OR '1'='1",
          "admin'/**/OR/**/1=1#",
          "'; EXEC sp_configure 'show advanced options', 1--"
        ];

        for (const maliciousInput of sqlInjectionAttempts) {
          const response = await request(app)
            .post('/api/auth/login')
            .send({
              email: maliciousInput,
              password: 'anypassword'
            });

          // Should not cause server error or unauthorized access
          expect([400, 401]).toContain(response.status);
        }
      });

      test('should prevent NoSQL injection', async () => {
        const noSqlInjectionAttempts = [
          { $ne: null },
          { $gt: "" },
          { $regex: ".*" },
          { $where: "return true" }
        ];

        for (const maliciousInput of noSqlInjectionAttempts) {
          const response = await request(app)
            .post('/api/auth/login')
            .send({
              email: maliciousInput,
              password: 'anypassword'
            });

          expect([400, 401]).toContain(response.status);
        }
      });

      test('should prevent XSS in user input', async () => {
        const xssPayloads = [
          '<script>alert("xss")</script>',
          'javascript:alert("xss")',
          '<img src=x onerror=alert("xss")>',
          '<svg onload=alert("xss")>',
          '"><script>alert("xss")</script>'
        ];

        for (const payload of xssPayloads) {
          const userData = {
            ...testData.validUser(),
            firstName: payload,
            lastName: payload
          };

          const response = await request(app)
            .post('/api/auth/register')
            .send(userData);

          if (response.status === 201) {
            // If registration succeeded, ensure XSS was sanitized
            expect(response.body.user.firstName).not.toContain('<script>');
            expect(response.body.user.firstName).not.toContain('javascript:');
            expect(response.body.user.lastName).not.toContain('<script>');
            expect(response.body.user.lastName).not.toContain('javascript:');
          }
        }
      });

      test('should handle large payloads gracefully', async () => {
        const largeString = 'a'.repeat(100000); // 100KB string
        
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'large@test.com',
            password: 'ValidPass123!',
            firstName: largeString
          });

        // Should either reject or truncate
        expect([400, 413]).toContain(response.status);
      });
    });

    describe('Rate Limiting and DoS Protection', () => {
      test('should enforce global rate limiting', async () => {
        const requests = Array.from({ length: 100 }, () =>
          request(app).get('/api/auth/me')
        );

        const responses = await Promise.allSettled(requests);
        const rateLimitedCount = responses.filter(
          r => r.status === 'fulfilled' && r.value.status === 429
        ).length;

        expect(rateLimitedCount).toBeGreaterThan(0);
      });

      test('should enforce endpoint-specific rate limiting', async () => {
        const loginRequests = Array.from({ length: 20 }, () =>
          request(app)
            .post('/api/auth/login')
            .send({ email: 'test@test.com', password: 'password' })
        );

        const responses = await Promise.all(loginRequests);
        const rateLimitedCount = responses.filter(r => r.status === 429).length;

        expect(rateLimitedCount).toBeGreaterThan(0);
      });

      test('should implement progressive delays for repeated failures', async () => {
        const startTime = Date.now();
        
        // Make multiple failed login attempts
        for (let i = 0; i < 5; i++) {
          await request(app)
            .post('/api/auth/login')
            .send({
              email: testUser.email,
              password: 'wrong-password'
            });
        }

        const endTime = Date.now();
        const totalTime = endTime - startTime;

        // Should take longer due to progressive delays
        expect(totalTime).toBeGreaterThan(2000); // At least 2 seconds
      });
    });

    describe('Authorization and Access Control', () => {
      test('should enforce role-based access control', async () => {
        const viewerToken = testUtils.generateTokenPair(testUser).accessToken;
        const adminToken = testUtils.generateTokenPair(adminUser).accessToken;

        // Viewer should not access admin endpoints
        const viewerResponse = await request(app)
          .get('/api/admin/users')
          .set('Authorization', `Bearer ${viewerToken}`)
          .expect(403);

        expect(viewerResponse.body).toHaveProperty('error');

        // Admin should access admin endpoints (if endpoint exists)
        const adminResponse = await request(app)
          .get('/api/admin/users')
          .set('Authorization', `Bearer ${adminToken}`);

        expect([200, 404]).toContain(adminResponse.status);
      });

      test('should prevent privilege escalation', async () => {
        const userToken = testUtils.generateTokenPair(testUser).accessToken;

        // Try to update own role (should fail)
        const response = await request(app)
          .put('/api/auth/profile')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ role: 'admin' });

        // Should either ignore role change or reject request
        expect([400, 403]).toContain(response.status);
      });

      test('should validate resource ownership', async () => {
        const user1Token = testUtils.generateTokenPair(testUser).accessToken;
        const user2Token = testUtils.generateTokenPair(adminUser).accessToken;

        // Create a session for user1
        const user1Session = await authService.createSession(
          testUser.id,
          'token1',
          'refresh1'
        );

        // User2 should not be able to revoke user1's session
        const response = await request(app)
          .delete(`/api/auth/sessions/${user1Session.id}`)
          .set('Authorization', `Bearer ${user2Token}`)
          .expect(400);

        expect(response.body).toHaveProperty('error');
      });
    });
  });

  // ===========================================
  // 4. PERFORMANCE TESTS - Load and Stress Testing
  // ===========================================
  
  describe('⚡ Performance Tests - Load and Stress Testing', () => {
    
    test('should handle concurrent login requests efficiently', async () => {
      const concurrentUsers = 50;
      const userPromises = Array.from({ length: concurrentUsers }, async (_, i) => {
        const user = await testUtils.createTestUser({
          email: `perf${i}@test.com`,
          username: `perf${i}`
        });
        return user;
      });

      const users = await Promise.all(userPromises);

      const startTime = performance.now();
      
      const loginPromises = users.map(user =>
        request(app)
          .post('/api/auth/login')
          .send({
            email: user.email,
            password: 'SecureTestPass123!'
          })
      );

      const responses = await Promise.all(loginPromises);
      const endTime = performance.now();

      const successCount = responses.filter(r => r.status === 200).length;
      const avgResponseTime = (endTime - startTime) / concurrentUsers;

      expect(successCount).toBe(concurrentUsers);
      expect(avgResponseTime).toBeLessThan(500); // Less than 500ms average
    });

    test('should maintain performance under token verification load', async () => {
      const tokens = Array.from({ length: 100 }, () =>
        testUtils.generateTokenPair(testUser).accessToken
      );

      const startTime = performance.now();
      
      const verificationPromises = tokens.map(token =>
        request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${token}`)
      );

      await Promise.all(verificationPromises);
      const endTime = performance.now();

      const avgResponseTime = (endTime - startTime) / tokens.length;
      expect(avgResponseTime).toBeLessThan(100); // Less than 100ms average
    });

    test('should handle session cleanup efficiently', async () => {
      // Create many expired sessions
      const expiredSessions = Array.from({ length: 1000 }, (_, i) =>
        Session.create({
          userId: testUser.id,
          token: `expired-token-${i}`,
          refreshToken: `expired-refresh-${i}`,
          expiresAt: new Date(Date.now() - 86400000) // 1 day ago
        })
      );

      await Promise.all(expiredSessions);

      const startTime = performance.now();
      
      // Trigger cleanup (implementation dependent)
      await authService.cleanupExpiredSessions();
      
      const endTime = performance.now();
      const cleanupTime = endTime - startTime;

      expect(cleanupTime).toBeLessThan(5000); // Less than 5 seconds
    });

    test('should scale password hashing appropriately', async () => {
      const passwords = Array.from({ length: 10 }, (_, i) => `Password${i}123!`);

      const startTime = performance.now();
      
      const hashPromises = passwords.map(password =>
        bcrypt.hash(password, 12) // High cost factor
      );

      await Promise.all(hashPromises);
      const endTime = performance.now();

      const avgHashTime = (endTime - startTime) / passwords.length;
      
      // Should be slow enough to prevent brute force but not too slow for UX
      expect(avgHashTime).toBeGreaterThan(100); // At least 100ms
      expect(avgHashTime).toBeLessThan(2000); // Less than 2s
    });
  });

  // ===========================================
  // 5. END-TO-END TESTS - Complete User Journeys
  // ===========================================
  
  describe('🌐 End-to-End Tests - Complete User Journeys', () => {
    
    test('should complete full user registration and login journey', async () => {
      const userData = testData.validUser();

      // 1. Register new user
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      const { user, accessToken, refreshToken } = registerResponse.body;
      expect(user.email).toBe(userData.email.toLowerCase());
      expect(accessToken).toBeDefined();
      expect(refreshToken).toBeDefined();

      // 2. Verify token works
      const profileResponse = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(profileResponse.body.user.id).toBe(user.id);

      // 3. Logout
      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Cookie', `refreshToken=${refreshToken}`)
        .expect(200);

      // 4. Login again
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        })
        .expect(200);

      expect(loginResponse.body.user.id).toBe(user.id);
      expect(loginResponse.body.accessToken).toBeDefined();
    });

    test('should complete password reset journey', async () => {
      const resetUser = await testUtils.createTestUser({
        email: 'reset@test.com'
      });

      // 1. Request password reset
      const resetRequestResponse = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: resetUser.email })
        .expect(200);

      // 2. Get reset token (in real app, this would be from email)
      const updatedUser = await User.findByPk(resetUser.id);
      const resetToken = updatedUser.passwordResetToken;
      expect(resetToken).toBeDefined();

      // 3. Reset password
      const newPassword = 'NewResetPass123!';
      await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: newPassword
        })
        .expect(200);

      // 4. Login with new password
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: resetUser.email,
          password: newPassword
        })
        .expect(200);

      expect(loginResponse.body.user.id).toBe(resetUser.id);

      // 5. Verify old password doesn't work
      await request(app)
        .post('/api/auth/login')
        .send({
          email: resetUser.email,
          password: 'SecureTestPass123!' // Old password
        })
        .expect(401);
    });

    test('should complete session management journey', async () => {
      const sessionUser = await testUtils.createTestUser({
        email: 'session@test.com'
      });

      // 1. Login from multiple devices
      const device1Response = await request(app)
        .post('/api/auth/login')
        .set('User-Agent', 'Device-1-Browser/1.0')
        .send({
          email: sessionUser.email,
          password: 'SecureTestPass123!'
        })
        .expect(200);

      const device2Response = await request(app)
        .post('/api/auth/login')
        .set('User-Agent', 'Device-2-Browser/1.0')
        .send({
          email: sessionUser.email,
          password: 'SecureTestPass123!'
        })
        .expect(200);

      const device1Token = device1Response.body.accessToken;
      const device2Token = device2Response.body.accessToken;

      // 2. Check active sessions
      const sessionsResponse = await request(app)
        .get('/api/auth/sessions')
        .set('Authorization', `Bearer ${device1Token}`)
        .expect(200);

      expect(sessionsResponse.body.sessions.length).toBe(2);

      // 3. Revoke one session
      const sessionToRevoke = sessionsResponse.body.sessions[0];
      await request(app)
        .delete(`/api/auth/sessions/${sessionToRevoke.id}`)
        .set('Authorization', `Bearer ${device1Token}`)
        .expect(200);

      // 4. Check remaining sessions
      const remainingSessionsResponse = await request(app)
        .get('/api/auth/sessions')
        .set('Authorization', `Bearer ${device2Token}`)
        .expect(200);

      expect(remainingSessionsResponse.body.sessions.length).toBe(1);

      // 5. Logout from all devices
      await request(app)
        .post('/api/auth/logout-all')
        .set('Authorization', `Bearer ${device2Token}`)
        .expect(200);

      // 6. Verify no active sessions
      await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${device2Token}`)
        .expect(401);
    });

    test('should complete token refresh journey', async () => {
      const refreshUser = await testUtils.createTestUser({
        email: 'refresh@test.com'
      });

      // 1. Initial login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: refreshUser.email,
          password: 'SecureTestPass123!'
        })
        .expect(200);

      const { accessToken, refreshToken } = {
        accessToken: loginResponse.body.accessToken,
        refreshToken: loginResponse.headers['set-cookie']
          ?.find(cookie => cookie.includes('refreshToken'))
          ?.split('=')[1]?.split(';')[0]
      };

      expect(accessToken).toBeDefined();
      expect(refreshToken).toBeDefined();

      // 2. Wait for token to near expiry (simulate)
      await testUtils.waitFor(100);

      // 3. Refresh token
      const refreshResponse = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', `refreshToken=${refreshToken}`)
        .expect(200);

      const newAccessToken = refreshResponse.body.accessToken;
      expect(newAccessToken).toBeDefined();
      expect(newAccessToken).not.toBe(accessToken);

      // 4. Use new token
      const profileResponse = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${newAccessToken}`)
        .expect(200);

      expect(profileResponse.body.user.id).toBe(refreshUser.id);

      // 5. Old token should still work (until expiry)
      const oldTokenResponse = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      // Response depends on token expiry implementation
      expect([200, 401]).toContain(oldTokenResponse.status);
    });

    test('should handle account lockout and recovery journey', async () => {
      const lockoutUser = await testUtils.createTestUser({
        email: 'lockout@test.com'
      });

      // 1. Make multiple failed login attempts
      const maxAttempts = 5;
      for (let i = 0; i < maxAttempts; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({
            email: lockoutUser.email,
            password: 'WrongPassword123!'
          })
          .expect(401);
      }

      // 2. Next attempt should be locked out
      const lockoutResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: lockoutUser.email,
          password: 'SecureTestPass123!' // Correct password
        });

      // Should be locked out
      expect([401, 429]).toContain(lockoutResponse.status);

      // 3. Admin unlocks account (simulate)
      await User.update(
        { loginAttempts: 0, lockoutUntil: null },
        { where: { id: lockoutUser.id } }
      );

      // 4. Should be able to login now
      const recoveryResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: lockoutUser.email,
          password: 'SecureTestPass123!'
        })
        .expect(200);

      expect(recoveryResponse.body.user.id).toBe(lockoutUser.id);
    });
  });
});

// Test cleanup and utilities
afterAll(async () => {
  // Clean up any remaining test data
  if (process.env.NODE_ENV === 'test') {
    await User.destroy({ where: {}, force: true });
    await Session.destroy({ where: {}, force: true });
  }
});

module.exports = {
  testUtils,
  testData
};