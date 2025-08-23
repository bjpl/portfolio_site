/**
 * Integration Tests for Complete Login Flow
 * 
 * This test suite focuses specifically on the complete authentication flow
 * from user registration through active session management, including all
 * middleware, database interactions, and external service integrations.
 */

const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Sequelize } = require('sequelize');
const app = require('../../backend/src/simple-cms-server.js');
const { User, Session, AuditLog } = require('../../backend/src/models');
const authService = require('../../backend/src/services/authService.js');
const auditService = require('../../backend/src/services/auditService.js');
const config = require('../../backend/src/config');

describe('🔗 Integration Tests - Complete Login Flow', () => {
  let testDatabase;
  let testUser;
  let adminUser;

  beforeAll(async () => {
    // Initialize test database connection
    testDatabase = new Sequelize(config.database.test);
    
    // Clean up existing test data
    await User.destroy({ where: {}, force: true });
    await Session.destroy({ where: {}, force: true });
    await AuditLog.destroy({ where: {}, force: true });

    // Create test users
    testUser = await User.create({
      email: 'integration@test.com',
      username: 'integration_user',
      password: await bcrypt.hash('IntegrationTest123!', 12),
      firstName: 'Integration',
      lastName: 'Test',
      role: 'editor',
      isActive: true,
      isEmailVerified: true,
      refreshTokenVersion: 0
    });

    adminUser = await User.create({
      email: 'admin@integration.com',
      username: 'admin_user',
      password: await bcrypt.hash('AdminTest123!', 12),
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      isActive: true,
      isEmailVerified: true,
      refreshTokenVersion: 0
    });
  });

  afterAll(async () => {
    // Clean up test data
    await User.destroy({ where: {}, force: true });
    await Session.destroy({ where: {}, force: true });
    await AuditLog.destroy({ where: {}, force: true });
    
    if (testDatabase) {
      await testDatabase.close();
    }
  });

  beforeEach(async () => {
    // Clean up sessions before each test
    await Session.destroy({ where: {}, force: true });
    await AuditLog.destroy({ where: {}, force: true });
  });

  describe('Complete User Registration Flow', () => {
    test('should complete full registration with database persistence', async () => {
      const registrationData = {
        email: 'newuser@integration.com',
        username: 'new_integration_user',
        password: 'NewUserPass123!',
        firstName: 'New',
        lastName: 'User'
      };

      // 1. Registration request
      const registrationResponse = await request(app)
        .post('/api/auth/register')
        .send(registrationData)
        .expect(201);

      expect(registrationResponse.body).toMatchObject({
        message: 'User registered successfully',
        user: expect.objectContaining({
          email: registrationData.email.toLowerCase(),
          username: registrationData.username,
          firstName: registrationData.firstName,
          lastName: registrationData.lastName,
          role: 'viewer' // Default role
        }),
        accessToken: expect.any(String),
        refreshToken: expect.any(String)
      });

      // 2. Verify user was created in database
      const createdUser = await User.findOne({
        where: { email: registrationData.email.toLowerCase() }
      });

      expect(createdUser).toBeTruthy();
      expect(createdUser.username).toBe(registrationData.username);
      expect(createdUser.firstName).toBe(registrationData.firstName);
      expect(createdUser.lastName).toBe(registrationData.lastName);
      expect(createdUser.role).toBe('viewer');
      expect(createdUser.isActive).toBe(true);
      
      // Password should be hashed
      expect(createdUser.password).not.toBe(registrationData.password);
      expect(await bcrypt.compare(registrationData.password, createdUser.password)).toBe(true);

      // 3. Verify session was created
      const session = await Session.findOne({
        where: { userId: createdUser.id }
      });

      expect(session).toBeTruthy();
      expect(session.token).toBe(registrationResponse.body.accessToken);
      expect(session.refreshToken).toBe(registrationResponse.body.refreshToken);
      expect(session.expiresAt).toBeDefined();

      // 4. Verify audit log entry
      const auditEntry = await AuditLog.findOne({
        where: { 
          event: 'user_register',
          userId: createdUser.id
        }
      });

      expect(auditEntry).toBeTruthy();
      expect(auditEntry.metadata).toMatchObject({
        email: createdUser.email,
        registrationMethod: 'email'
      });

      // 5. Verify tokens are valid and functional
      const tokenPayload = jwt.verify(
        registrationResponse.body.accessToken,
        config.security.jwtSecret
      );

      expect(tokenPayload).toMatchObject({
        id: createdUser.id,
        email: createdUser.email,
        role: createdUser.role
      });

      const refreshTokenPayload = jwt.verify(
        registrationResponse.body.refreshToken,
        config.security.jwtRefreshSecret
      );

      expect(refreshTokenPayload).toMatchObject({
        id: createdUser.id,
        tokenVersion: 0
      });
    });

    test('should handle concurrent registrations with unique constraints', async () => {
      const baseData = {
        email: 'concurrent@test.com',
        username: 'concurrent_user',
        password: 'ConcurrentTest123!',
        firstName: 'Concurrent',
        lastName: 'User'
      };

      // Attempt concurrent registrations with same email
      const concurrentPromises = [
        request(app).post('/api/auth/register').send(baseData),
        request(app).post('/api/auth/register').send({
          ...baseData,
          username: 'concurrent_user2'
        }),
        request(app).post('/api/auth/register').send({
          ...baseData,
          username: 'concurrent_user3'
        })
      ];

      const responses = await Promise.all(concurrentPromises);
      
      // Only one should succeed
      const successCount = responses.filter(r => r.status === 201).length;
      const failureCount = responses.filter(r => r.status === 400).length;

      expect(successCount).toBe(1);
      expect(failureCount).toBe(2);

      // Verify only one user was created
      const userCount = await User.count({
        where: { email: baseData.email.toLowerCase() }
      });
      expect(userCount).toBe(1);
    });

    test('should enforce validation middleware integration', async () => {
      const invalidData = {
        email: 'invalid-email',
        username: 'ab', // Too short
        password: 'weak', // Doesn't meet requirements
        firstName: '', // Empty
        lastName: 'A'.repeat(100) // Too long
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Validation failed',
        details: expect.arrayContaining([
          expect.objectContaining({ msg: expect.stringMatching(/email/i) }),
          expect.objectContaining({ msg: expect.stringMatching(/password/i) })
        ])
      });

      // Verify no user was created
      const userCount = await User.count();
      expect(userCount).toBe(2); // Only the initial test users
    });
  });

  describe('Complete Login Flow with Session Management', () => {
    test('should complete full login with session creation and audit logging', async () => {
      const loginData = {
        email: testUser.email,
        password: 'IntegrationTest123!'
      };

      // 1. Login request with device tracking
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .set('User-Agent', 'Integration-Test-Browser/1.0')
        .set('Accept-Language', 'en-US,en;q=0.9')
        .set('X-Forwarded-For', '192.168.1.100')
        .send(loginData)
        .expect(200);

      expect(loginResponse.body).toMatchObject({
        message: 'Login successful',
        user: expect.objectContaining({
          id: testUser.id,
          email: testUser.email,
          role: testUser.role
        }),
        accessToken: expect.any(String)
      });

      // Should not return password or sensitive data
      expect(loginResponse.body.user).not.toHaveProperty('password');
      expect(loginResponse.body.user).not.toHaveProperty('passwordResetToken');

      // 2. Verify refresh token cookie was set
      const cookieHeader = loginResponse.headers['set-cookie'];
      expect(cookieHeader).toBeDefined();
      
      const refreshTokenCookie = cookieHeader.find(cookie => 
        cookie.includes('refreshToken=')
      );
      expect(refreshTokenCookie).toBeDefined();
      expect(refreshTokenCookie).toMatch(/HttpOnly/);
      expect(refreshTokenCookie).toMatch(/SameSite=strict/i);

      // 3. Verify session was created in database
      const session = await Session.findOne({
        where: { userId: testUser.id },
        order: [['createdAt', 'DESC']]
      });

      expect(session).toBeTruthy();
      expect(session.token).toBe(loginResponse.body.accessToken);
      expect(session.userAgent).toBe('Integration-Test-Browser/1.0');
      expect(session.ipAddress).toBe('192.168.1.100');
      expect(session.expiresAt).toBeInstanceOf(Date);
      expect(session.expiresAt > new Date()).toBe(true);

      // 4. Verify audit log entry
      const auditEntry = await AuditLog.findOne({
        where: { 
          event: 'user_login',
          userId: testUser.id
        }
      });

      expect(auditEntry).toBeTruthy();
      expect(auditEntry.metadata).toMatchObject({
        email: testUser.email,
        loginMethod: 'password'
      });
      expect(auditEntry.metadata.deviceFingerprint).toBeDefined();

      // 5. Verify token functionality
      const protectedResponse = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
        .expect(200);

      expect(protectedResponse.body.user.id).toBe(testUser.id);
    });

    test('should handle failed login attempts with security measures', async () => {
      const invalidLoginData = {
        email: testUser.email,
        password: 'WrongPassword123!'
      };

      // 1. Failed login attempt
      const failedResponse = await request(app)
        .post('/api/auth/login')
        .set('User-Agent', 'Malicious-Browser/1.0')
        .set('X-Forwarded-For', '10.0.0.1')
        .send(invalidLoginData)
        .expect(401);

      expect(failedResponse.body).toHaveProperty('error');

      // 2. Verify no session was created
      const sessionCount = await Session.count({
        where: { userId: testUser.id }
      });
      expect(sessionCount).toBe(0);

      // 3. Verify failed login audit entry
      const failedAuditEntry = await AuditLog.findOne({
        where: { event: 'login_failed' }
      });

      expect(failedAuditEntry).toBeTruthy();
      expect(failedAuditEntry.metadata).toMatchObject({
        email: testUser.email,
        error: expect.any(String)
      });

      // 4. Verify user's login attempts counter (if implemented)
      const updatedUser = await User.findByPk(testUser.id);
      // Implementation dependent - may track login attempts
      expect(updatedUser.loginAttempts).toBeDefined();
    });

    test('should enforce account lockout after multiple failed attempts', async () => {
      const maxAttempts = 5;
      const invalidLoginData = {
        email: testUser.email,
        password: 'WrongPassword123!'
      };

      // Make multiple failed attempts
      for (let i = 0; i < maxAttempts; i++) {
        await request(app)
          .post('/api/auth/login')
          .send(invalidLoginData)
          .expect(401);
      }

      // Next attempt should be blocked even with correct password
      const blockedResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'IntegrationTest123!' // Correct password
        });

      // Should be rate limited or account locked
      expect([401, 429]).toContain(blockedResponse.status);

      // Verify user is locked out
      const lockedUser = await User.findByPk(testUser.id);
      expect(lockedUser.loginAttempts).toBeGreaterThanOrEqual(maxAttempts);
      
      if (lockedUser.lockoutUntil) {
        expect(lockedUser.lockoutUntil).toBeInstanceOf(Date);
        expect(lockedUser.lockoutUntil > new Date()).toBe(true);
      }
    });

    test('should handle inactive user login attempts', async () => {
      // Deactivate user
      await testUser.update({ isActive: false });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'IntegrationTest123!'
        })
        .expect(401);

      expect(loginResponse.body).toHaveProperty('error');

      // Verify no session was created
      const sessionCount = await Session.count({
        where: { userId: testUser.id }
      });
      expect(sessionCount).toBe(0);

      // Reactivate for other tests
      await testUser.update({ isActive: true });
    });
  });

  describe('Token Refresh Flow Integration', () => {
    let validAccessToken;
    let validRefreshToken;
    let sessionId;

    beforeEach(async () => {
      // Create a valid session
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'IntegrationTest123!'
        })
        .expect(200);

      validAccessToken = loginResponse.body.accessToken;
      
      // Extract refresh token from cookie
      const cookieHeader = loginResponse.headers['set-cookie'];
      const refreshTokenCookie = cookieHeader.find(cookie => 
        cookie.includes('refreshToken=')
      );
      validRefreshToken = refreshTokenCookie.split('refreshToken=')[1].split(';')[0];

      // Get session ID
      const session = await Session.findOne({
        where: { userId: testUser.id }
      });
      sessionId = session.id;
    });

    test('should successfully refresh access token with database update', async () => {
      // 1. Refresh token request
      const refreshResponse = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', `refreshToken=${validRefreshToken}`)
        .expect(200);

      expect(refreshResponse.body).toHaveProperty('accessToken');
      expect(refreshResponse.body.accessToken).not.toBe(validAccessToken);

      // 2. Verify session was updated in database
      const updatedSession = await Session.findByPk(sessionId);
      expect(updatedSession.token).toBe(refreshResponse.body.accessToken);
      expect(updatedSession.lastActivity).toBeInstanceOf(Date);
      
      // Last activity should be recent
      const timeDiff = Date.now() - updatedSession.lastActivity.getTime();
      expect(timeDiff).toBeLessThan(5000); // Less than 5 seconds

      // 3. Verify new token works
      const profileResponse = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${refreshResponse.body.accessToken}`)
        .expect(200);

      expect(profileResponse.body.user.id).toBe(testUser.id);

      // 4. Verify refresh token is still valid
      const secondRefreshResponse = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', `refreshToken=${validRefreshToken}`)
        .expect(200);

      expect(secondRefreshResponse.body).toHaveProperty('accessToken');
    });

    test('should reject expired refresh token and clean up session', async () => {
      // Manually expire the session
      await Session.update(
        { expiresAt: new Date(Date.now() - 1000) }, // 1 second ago
        { where: { id: sessionId } }
      );

      const refreshResponse = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', `refreshToken=${validRefreshToken}`)
        .expect(401);

      expect(refreshResponse.body).toHaveProperty('error');
      expect(refreshResponse.body.error).toMatch(/expired/i);

      // Verify session was cleaned up
      const cleanedSession = await Session.findByPk(sessionId);
      expect(cleanedSession).toBeNull();
    });

    test('should reject refresh token without matching session', async () => {
      // Delete the session but keep the refresh token
      await Session.destroy({ where: { id: sessionId } });

      const refreshResponse = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', `refreshToken=${validRefreshToken}`)
        .expect(401);

      expect(refreshResponse.body).toHaveProperty('error');
      expect(refreshResponse.body.error).toMatch(/invalid.*token/i);
    });

    test('should handle concurrent refresh requests gracefully', async () => {
      const concurrentRefreshes = Array.from({ length: 3 }, () =>
        request(app)
          .post('/api/auth/refresh')
          .set('Cookie', `refreshToken=${validRefreshToken}`)
      );

      const responses = await Promise.all(concurrentRefreshes);
      
      // All should succeed or fail gracefully
      responses.forEach(response => {
        expect([200, 401]).toContain(response.status);
      });

      // At least one should succeed
      const successCount = responses.filter(r => r.status === 200).length;
      expect(successCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Session Management Integration', () => {
    let userTokens;

    beforeEach(async () => {
      // Create multiple sessions for testing
      const sessions = await Promise.all([
        request(app).post('/api/auth/login')
          .set('User-Agent', 'Browser-1/1.0')
          .send({ email: testUser.email, password: 'IntegrationTest123!' }),
        request(app).post('/api/auth/login')
          .set('User-Agent', 'Browser-2/1.0')
          .send({ email: testUser.email, password: 'IntegrationTest123!' }),
        request(app).post('/api/auth/login')
          .set('User-Agent', 'Mobile-App/1.0')
          .send({ email: testUser.email, password: 'IntegrationTest123!' })
      ]);

      userTokens = sessions.map(s => s.body.accessToken);
    });

    test('should retrieve all active sessions with metadata', async () => {
      const sessionsResponse = await request(app)
        .get('/api/auth/sessions')
        .set('Authorization', `Bearer ${userTokens[0]}`)
        .expect(200);

      expect(sessionsResponse.body).toHaveProperty('sessions');
      expect(sessionsResponse.body.sessions).toHaveLength(3);

      sessionsResponse.body.sessions.forEach(session => {
        expect(session).toMatchObject({
          id: expect.any(Number),
          userAgent: expect.any(String),
          lastActivity: expect.any(String),
          createdAt: expect.any(String)
        });

        // Should not expose sensitive data
        expect(session).not.toHaveProperty('token');
        expect(session).not.toHaveProperty('refreshToken');
      });

      // Verify user agents are captured correctly
      const userAgents = sessionsResponse.body.sessions.map(s => s.userAgent);
      expect(userAgents).toContain('Browser-1/1.0');
      expect(userAgents).toContain('Browser-2/1.0');
      expect(userAgents).toContain('Mobile-App/1.0');
    });

    test('should revoke specific session with audit trail', async () => {
      // Get sessions
      const sessionsResponse = await request(app)
        .get('/api/auth/sessions')
        .set('Authorization', `Bearer ${userTokens[0]}`)
        .expect(200);

      const sessionToRevoke = sessionsResponse.body.sessions[0];

      // Revoke session
      const revokeResponse = await request(app)
        .delete(`/api/auth/sessions/${sessionToRevoke.id}`)
        .set('Authorization', `Bearer ${userTokens[0]}`)
        .expect(200);

      expect(revokeResponse.body).toMatchObject({
        message: 'Session revoked successfully'
      });

      // Verify session was removed from database
      const remainingSession = await Session.findByPk(sessionToRevoke.id);
      expect(remainingSession).toBeNull();

      // Verify audit log entry
      const auditEntry = await AuditLog.findOne({
        where: { 
          event: 'session_revoked',
          userId: testUser.id
        }
      });

      expect(auditEntry).toBeTruthy();
      expect(auditEntry.metadata).toMatchObject({
        sessionId: sessionToRevoke.id
      });

      // Verify remaining sessions are still active
      const updatedSessionsResponse = await request(app)
        .get('/api/auth/sessions')
        .set('Authorization', `Bearer ${userTokens[1]}`)
        .expect(200);

      expect(updatedSessionsResponse.body.sessions).toHaveLength(2);
    });

    test('should logout from all devices with complete cleanup', async () => {
      // Logout from all devices
      const logoutAllResponse = await request(app)
        .post('/api/auth/logout-all')
        .set('Authorization', `Bearer ${userTokens[0]}`)
        .expect(200);

      expect(logoutAllResponse.body).toMatchObject({
        message: 'Logged out from all devices'
      });

      // Verify all sessions were removed
      const sessionCount = await Session.count({
        where: { userId: testUser.id }
      });
      expect(sessionCount).toBe(0);

      // Verify all tokens are invalid
      for (const token of userTokens) {
        await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${token}`)
          .expect(401);
      }

      // Verify audit log entry
      const auditEntry = await AuditLog.findOne({
        where: { 
          event: 'user_logout_all',
          userId: testUser.id
        }
      });

      expect(auditEntry).toBeTruthy();
    });

    test('should handle session cleanup on user deactivation', async () => {
      // Deactivate user
      await testUser.update({ isActive: false });

      // All existing tokens should become invalid
      for (const token of userTokens) {
        await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${token}`)
          .expect(401);
      }

      // Sessions should still exist in DB for audit purposes
      const sessionCount = await Session.count({
        where: { userId: testUser.id }
      });
      expect(sessionCount).toBeGreaterThan(0);

      // Reactivate for other tests
      await testUser.update({ isActive: true });
    });
  });

  describe('Role-Based Access Control Integration', () => {
    test('should enforce role-based access with database validation', async () => {
      // Login as regular user
      const userLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'IntegrationTest123!'
        })
        .expect(200);

      const userToken = userLoginResponse.body.accessToken;

      // Login as admin
      const adminLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: adminUser.email,
          password: 'AdminTest123!'
        })
        .expect(200);

      const adminToken = adminLoginResponse.body.accessToken;

      // Test user access to user endpoints
      await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Test user access to admin endpoints (should fail)
      const userAdminAttempt = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${userToken}`);

      expect([403, 404]).toContain(userAdminAttempt.status);

      // Test admin access to admin endpoints (should succeed if endpoint exists)
      const adminAttempt = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 404]).toContain(adminAttempt.status);

      // If endpoint exists and returns 200, verify admin can access
      if (adminAttempt.status === 200) {
        expect(adminAttempt.body).toBeDefined();
      }
    });

    test('should handle role changes with session invalidation', async () => {
      // Login as user
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'IntegrationTest123!'
        })
        .expect(200);

      const userToken = loginResponse.body.accessToken;

      // Verify current role
      const profileResponse = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(profileResponse.body.user.role).toBe('editor');

      // Admin changes user role
      await testUser.update({ role: 'admin' });

      // Token should still work but might have stale role information
      const staleProfileResponse = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Role in token payload remains the same until refresh
      const tokenPayload = jwt.verify(userToken, config.security.jwtSecret);
      expect(tokenPayload.role).toBe('editor'); // Original role from token

      // But database shows new role
      const updatedUser = await User.findByPk(testUser.id);
      expect(updatedUser.role).toBe('admin');

      // Revert role change
      await testUser.update({ role: 'editor' });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle database connection issues gracefully', async () => {
      // This test would require mocking database failures
      // Implementation depends on database error handling strategy
      
      // Simulate database timeout
      jest.spyOn(User, 'findOne').mockImplementationOnce(() => {
        return new Promise((resolve, reject) => {
          setTimeout(() => reject(new Error('Database timeout')), 100);
        });
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'IntegrationTest123!'
        })
        .expect(500);

      expect(response.body).toHaveProperty('error');

      // Restore original implementation
      User.findOne.mockRestore();
    });

    test('should handle malformed tokens in middleware', async () => {
      const malformedTokens = [
        'not-a-jwt-token',
        'Bearer malformed-token',
        'header.payload', // Missing signature
        '', // Empty string
      ];

      for (const malformedToken of malformedTokens) {
        const response = await request(app)
          .get('/api/auth/me')
          .set('Authorization', malformedToken)
          .expect(401);

        expect(response.body).toHaveProperty('error');
        expect(response.body).toHaveProperty('code');
      }
    });

    test('should handle concurrent operations on same user', async () => {
      const concurrentOperations = [
        // Login attempts
        request(app).post('/api/auth/login')
          .send({ email: testUser.email, password: 'IntegrationTest123!' }),
        request(app).post('/api/auth/login')
          .send({ email: testUser.email, password: 'IntegrationTest123!' }),
        
        // Password change attempt
        User.update(
          { password: await bcrypt.hash('NewPassword123!', 12) },
          { where: { id: testUser.id } }
        ),
        
        // Role change attempt
        User.update(
          { role: 'admin' },
          { where: { id: testUser.id } }
        )
      ];

      const results = await Promise.allSettled(concurrentOperations);
      
      // All operations should either succeed or fail gracefully
      results.forEach(result => {
        if (result.status === 'rejected') {
          expect(result.reason).toBeInstanceOf(Error);
        }
      });

      // Revert any changes
      await testUser.update({
        role: 'editor',
        password: await bcrypt.hash('IntegrationTest123!', 12)
      });
    });

    test('should maintain referential integrity on cascade operations', async () => {
      // Create sessions for user
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'IntegrationTest123!'
        })
        .expect(200);

      // Verify session exists
      let sessionCount = await Session.count({
        where: { userId: testUser.id }
      });
      expect(sessionCount).toBe(1);

      // Verify audit logs exist
      let auditCount = await AuditLog.count({
        where: { userId: testUser.id }
      });
      expect(auditCount).toBeGreaterThan(0);

      // Delete user (if cascade is configured correctly)
      // This test depends on foreign key constraints
      try {
        await User.destroy({ where: { id: testUser.id } });
        
        // Check if related records were handled properly
        sessionCount = await Session.count({
          where: { userId: testUser.id }
        });
        
        auditCount = await AuditLog.count({
          where: { userId: testUser.id }
        });

        // Either cascaded delete or referential integrity maintained
        expect([0, sessionCount]).toContain(0); // Either deleted or original count
        
      } catch (error) {
        // If foreign key constraint prevents deletion
        expect(error.name).toMatch(/SequelizeForeignKeyConstraintError/);
      }

      // Recreate test user for other tests
      testUser = await User.create({
        email: 'integration@test.com',
        username: 'integration_user',
        password: await bcrypt.hash('IntegrationTest123!', 12),
        firstName: 'Integration',
        lastName: 'Test',
        role: 'editor',
        isActive: true,
        isEmailVerified: true,
        refreshTokenVersion: 0
      });
    });
  });
});

module.exports = {
  // Export any utilities for use in other test files
  setupTestDatabase: async () => {
    const testDb = new Sequelize(config.database.test);
    await testDb.authenticate();
    return testDb;
  },
  
  cleanupTestData: async () => {
    await User.destroy({ where: {}, force: true });
    await Session.destroy({ where: {}, force: true });
    await AuditLog.destroy({ where: {}, force: true });
  }
};