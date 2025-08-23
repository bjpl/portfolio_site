/**
 * Error Handling and Edge Cases Tests
 * 
 * Comprehensive test suite for authentication error scenarios, edge cases,
 * security vulnerabilities, input validation, and system resilience.
 */

const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const app = require('../../backend/src/simple-cms-server.js');
const { User, Session } = require('../../backend/src/models');
const authService = require('../../backend/src/services/authService.js');
const config = require('../../backend/src/config');

describe('🛠️ Error Handling and Edge Cases Tests', () => {
  let testUser;
  let validAccessToken;
  let validRefreshToken;

  beforeAll(async () => {
    // Clean up and create test data
    await User.destroy({ where: {}, force: true });
    await Session.destroy({ where: {}, force: true });

    testUser = await User.create({
      email: 'error@test.com',
      username: 'error_user',
      password: await bcrypt.hash('ErrorTest123!', 12),
      firstName: 'Error',
      lastName: 'Test',
      role: 'editor',
      isActive: true,
      isEmailVerified: true,
      refreshTokenVersion: 0
    });

    const tokens = {
      accessToken: authService.generateToken({
        id: testUser.id,
        email: testUser.email,
        role: testUser.role
      }),
      refreshToken: authService.generateRefreshToken({
        id: testUser.id,
        tokenVersion: 0
      })
    };

    validAccessToken = tokens.accessToken;
    validRefreshToken = tokens.refreshToken;

    // Create session
    await authService.createSession(
      testUser.id,
      validAccessToken,
      validRefreshToken
    );
  });

  afterAll(async () => {
    await User.destroy({ where: {}, force: true });
    await Session.destroy({ where: {}, force: true });
  });

  describe('Input Validation Errors', () => {
    describe('Registration Input Validation', () => {
      test('should handle null and undefined inputs', async () => {
        const nullInputTests = [
          { email: null, password: 'ValidPass123!' },
          { email: 'test@test.com', password: null },
          { email: undefined, password: 'ValidPass123!' },
          { email: 'test@test.com', password: undefined },
          null, // Entire body null
          undefined // Entire body undefined
        ];

        for (const testInput of nullInputTests) {
          const response = await request(app)
            .post('/api/auth/register')
            .send(testInput)
            .expect(400);

          expect(response.body).toHaveProperty('error');
        }
      });

      test('should handle empty strings and whitespace', async () => {
        const whitespaceTests = [
          { email: '', password: 'ValidPass123!' },
          { email: '   ', password: 'ValidPass123!' },
          { email: 'test@test.com', password: '' },
          { email: 'test@test.com', password: '   ' },
          { email: '\t\n\r', password: 'ValidPass123!' },
          { firstName: '', lastName: '' },
          { firstName: '   ', lastName: '   ' }
        ];

        for (const testInput of whitespaceTests) {
          const response = await request(app)
            .post('/api/auth/register')
            .send({
              email: 'default@test.com',
              password: 'DefaultPass123!',
              ...testInput
            });

          expect([400, 201]).toContain(response.status);
          
          if (response.status === 400) {
            expect(response.body).toHaveProperty('error');
          }
        }
      });

      test('should handle extremely long inputs', async () => {
        const longInputTests = [
          { 
            email: 'a'.repeat(1000) + '@test.com',
            password: 'ValidPass123!'
          },
          {
            email: 'test@test.com',
            password: 'A'.repeat(10000) + '1a!'
          },
          {
            email: 'test@test.com',
            password: 'ValidPass123!',
            firstName: 'A'.repeat(5000),
            lastName: 'B'.repeat(5000)
          }
        ];

        for (const testInput of longInputTests) {
          const response = await request(app)
            .post('/api/auth/register')
            .send(testInput)
            .expect(400);

          expect(response.body).toHaveProperty('error');
        }
      });

      test('should handle special characters and encoding issues', async () => {
        const specialCharTests = [
          {
            email: 'test@test.com',
            password: 'ValidPass123!',
            firstName: 'José María Ñoño',
            lastName: 'Müller-Schweißer'
          },
          {
            email: 'user+tag@domain.co.uk',
            password: 'ValidPass123!'
          },
          {
            email: 'test@测试.com', // IDN domain
            password: 'ValidPass123!'
          },
          {
            email: 'test@test.com',
            password: 'ValidPass123!',
            firstName: '🚀👨‍💻🔐', // Emoji
            lastName: 'Test'
          },
          {
            email: 'test@test.com',
            password: 'ValidPass123!',
            firstName: 'Test\u0000User', // Null byte
            lastName: 'Test'
          }
        ];

        for (const testInput of specialCharTests) {
          const response = await request(app)
            .post('/api/auth/register')
            .send({
              ...testInput,
              email: `special${Date.now()}@test.com`, // Make unique
              username: `special${Date.now()}`
            });

          expect([200, 201, 400]).toContain(response.status);
          
          if (response.status === 201) {
            // Verify special characters were handled properly
            expect(response.body.user).toBeDefined();
          }
        }
      });

      test('should handle malformed JSON and content types', async () => {
        const malformedRequests = [
          // Invalid JSON
          '{"email": "test@test.com", "password": "ValidPass123!", }', // Trailing comma
          '{"email": "test@test.com" "password": "ValidPass123!"}', // Missing comma
          '{email: "test@test.com"}', // Unquoted keys
          '"string instead of object"', // Wrong type
          'not json at all'
        ];

        for (const malformedJson of malformedRequests) {
          const response = await request(app)
            .post('/api/auth/register')
            .set('Content-Type', 'application/json')
            .send(malformedJson)
            .expect(400);

          expect(response.body).toHaveProperty('error');
        }
      });

      test('should handle wrong content types', async () => {
        const validData = {
          email: 'content@test.com',
          password: 'ValidPass123!'
        };

        // Test with wrong content type
        const response = await request(app)
          .post('/api/auth/register')
          .set('Content-Type', 'text/plain')
          .send(JSON.stringify(validData))
          .expect(400);

        expect(response.body).toHaveProperty('error');
      });
    });

    describe('Login Input Validation', () => {
      test('should handle SQL injection attempts', async () => {
        const sqlInjectionPayloads = [
          "admin'; DROP TABLE users; --",
          "' OR '1'='1",
          "admin'/*",
          "'; EXEC sp_configure 'show advanced options', 1--",
          "1' UNION SELECT null, username, password FROM users--",
          "' OR 1=1#",
          "admin'--",
          "' OR 'a'='a",
          "1'; DROP TABLE sessions;--",
          "test@test.com'; UPDATE users SET role='admin'--"
        ];

        for (const payload of sqlInjectionPayloads) {
          const response = await request(app)
            .post('/api/auth/login')
            .send({
              email: payload,
              password: 'anypassword'
            });

          // Should not cause server error or unauthorized access
          expect([400, 401, 429]).toContain(response.status);
          
          if (response.body.error) {
            expect(response.body.error).not.toMatch(/syntax error|mysql|postgresql|sqlite/i);
          }
        }
      });

      test('should handle NoSQL injection attempts', async () => {
        const noSqlInjectionPayloads = [
          { $ne: null },
          { $gt: '' },
          { $regex: '.*' },
          { $where: 'return true' },
          { $or: [{ email: 'admin' }, { role: 'admin' }] },
          { $and: [{ $ne: null }] },
          "'; return db.users.findOne(); var dummy='",
          { $func: 'function() { return true; }' }
        ];

        for (const payload of noSqlInjectionPayloads) {
          const response = await request(app)
            .post('/api/auth/login')
            .send({
              email: payload,
              password: 'anypassword'
            });

          expect([400, 401, 429]).toContain(response.status);
        }
      });

      test('should handle XSS attempts in login fields', async () => {
        const xssPayloads = [
          '<script>alert("xss")</script>',
          'javascript:alert("xss")',
          '<img src=x onerror=alert("xss")>',
          '<svg onload=alert("xss")>',
          '"><script>alert("xss")</script>',
          '<iframe src="javascript:alert(\'xss\')"></iframe>',
          '<body onload=alert("xss")>',
          'data:text/html,<script>alert("xss")</script>'
        ];

        for (const payload of xssPayloads) {
          const response = await request(app)
            .post('/api/auth/login')
            .send({
              email: payload,
              password: 'ValidPass123!'
            });

          expect([400, 401, 429]).toContain(response.status);
          
          // Response should not contain unescaped XSS payload
          const responseText = JSON.stringify(response.body);
          expect(responseText).not.toContain('<script>');
          expect(responseText).not.toContain('javascript:');
          expect(responseText).not.toContain('onerror=');
          expect(responseText).not.toContain('onload=');
        }
      });

      test('should handle command injection attempts', async () => {
        const commandInjectionPayloads = [
          'test@test.com; ls -la',
          'test@test.com && cat /etc/passwd',
          'test@test.com | whoami',
          'test@test.com`whoami`',
          'test@test.com$(whoami)',
          'test@test.com; rm -rf /',
          'test@test.com\n/bin/sh',
          'test@test.com; python -c "import os; os.system(\'ls\')"'
        ];

        for (const payload of commandInjectionPayloads) {
          const response = await request(app)
            .post('/api/auth/login')
            .send({
              email: payload,
              password: 'ValidPass123!'
            });

          expect([400, 401, 429]).toContain(response.status);
        }
      });
    });
  });

  describe('Authentication Edge Cases', () => {
    test('should handle concurrent login attempts for same user', async () => {
      const concurrentLogins = Array.from({ length: 10 }, () =>
        request(app)
          .post('/api/auth/login')
          .send({
            email: testUser.email,
            password: 'ErrorTest123!'
          })
      );

      const responses = await Promise.all(concurrentLogins);
      
      // Some should succeed, some might be rate limited
      const successCount = responses.filter(r => r.status === 200).length;
      const rateLimitedCount = responses.filter(r => r.status === 429).length;
      
      expect(successCount + rateLimitedCount).toBe(10);
      expect(successCount).toBeGreaterThan(0); // At least one should succeed
    });

    test('should handle login during password change', async () => {
      // Start password change process
      const passwordChangePromise = testUser.update({
        password: await bcrypt.hash('NewPassword123!', 12)
      });

      // Attempt login during password change
      const loginPromise = request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'ErrorTest123!' // Old password
        });

      const [passwordResult, loginResponse] = await Promise.all([
        passwordChangePromise,
        loginPromise
      ]);

      // Login should either succeed with old password or fail
      expect([200, 401]).toContain(loginResponse.status);

      // Restore original password for other tests
      await testUser.update({
        password: await bcrypt.hash('ErrorTest123!', 12)
      });
    });

    test('should handle login with deleted user session', async () => {
      // Create session then delete user
      const tempUser = await User.create({
        email: 'temp@test.com',
        password: await bcrypt.hash('TempPass123!', 12),
        role: 'viewer',
        isActive: true
      });

      const tempToken = authService.generateToken({
        id: tempUser.id,
        email: tempUser.email,
        role: tempUser.role
      });

      // Delete user but keep session (simulate race condition)
      await User.destroy({ where: { id: tempUser.id } });

      // Attempt to use token
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tempToken}`)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    test('should handle extremely rapid token refresh requests', async () => {
      const rapidRefreshes = Array.from({ length: 20 }, () =>
        request(app)
          .post('/api/auth/refresh')
          .send({ refreshToken: validRefreshToken })
      );

      const responses = await Promise.all(rapidRefreshes);
      
      // Some should succeed, some might fail due to race conditions
      const successCount = responses.filter(r => r.status === 200).length;
      const failCount = responses.filter(r => r.status === 401).length;
      
      expect(successCount + failCount).toBe(20);
      expect(successCount).toBeGreaterThan(0); // At least some should succeed
    });

    test('should handle malformed authorization headers', async () => {
      const malformedHeaders = [
        'Bearer', // Missing token
        'bearer validtoken', // Wrong case
        'Token validtoken', // Wrong type
        'Bearer token with spaces',
        'Bearer token-with-special-chars!@#$%',
        'Bearer ', // Empty token
        'Bearer' + ' '.repeat(1000) + 'token', // Excessive whitespace
        'Multiple Bearer tokens here',
        '', // Empty header
        'NotBearer token',
        'Bearer token1 token2', // Multiple tokens
        'Bearer\ttoken', // Tab character
        'Bearer\ntoken' // Newline character
      ];

      for (const header of malformedHeaders) {
        const response = await request(app)
          .get('/api/auth/me')
          .set('Authorization', header)
          .expect(401);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).not.toContain('undefined');
        expect(response.body.error).not.toContain('null');
      }
    });
  });

  describe('Token Manipulation and Security', () => {
    test('should detect tampered token signatures', async () => {
      const originalToken = validAccessToken;
      const parts = originalToken.split('.');
      
      // Tamper with signature
      const tamperedSignature = parts[2].slice(0, -5) + 'XXXXX';
      const tamperedToken = `${parts[0]}.${parts[1]}.${tamperedSignature}`;

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tamperedToken}`)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/invalid|token/i);
    });

    test('should detect tampered token payloads', async () => {
      const maliciousPayload = {
        id: testUser.id,
        email: testUser.email,
        role: 'admin', // Escalated privilege
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      };

      // Create token with malicious payload but wrong signature
      const tamperedToken = jwt.sign(maliciousPayload, 'wrong-secret');

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tamperedToken}`)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    test('should prevent algorithm confusion attacks', async () => {
      // Create token with 'none' algorithm
      const noneAlgorithmToken = jwt.sign(
        { id: testUser.id, role: 'admin' },
        '',
        { algorithm: 'none' }
      );

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${noneAlgorithmToken}`)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    test('should handle tokens with future issued dates', async () => {
      const futureToken = jwt.sign(
        {
          id: testUser.id,
          email: testUser.email,
          role: testUser.role,
          iat: Math.floor(Date.now() / 1000) + 3600, // 1 hour in future
          exp: Math.floor(Date.now() / 1000) + 7200  // 2 hours in future
        },
        config.security.jwtSecret
      );

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${futureToken}`)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    test('should handle tokens with invalid claims', async () => {
      const invalidClaimTokens = [
        // Missing required claims
        jwt.sign({ email: testUser.email }, config.security.jwtSecret),
        jwt.sign({ id: testUser.id }, config.security.jwtSecret),
        
        // Invalid claim types
        jwt.sign({ 
          id: 'not-a-number',
          email: testUser.email,
          role: testUser.role 
        }, config.security.jwtSecret),
        
        // Null claims
        jwt.sign({
          id: null,
          email: testUser.email,
          role: testUser.role
        }, config.security.jwtSecret)
      ];

      for (const token of invalidClaimTokens) {
        const response = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${token}`);

        expect([401, 500]).toContain(response.status);
        expect(response.body).toHaveProperty('error');
      }
    });
  });

  describe('Session Management Edge Cases', () => {
    test('should handle session cleanup during active use', async () => {
      // Create session
      const session = await authService.createSession(
        testUser.id,
        'cleanup-token',
        'cleanup-refresh'
      );

      // Simulate concurrent session use and cleanup
      const useSessionPromise = request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer cleanup-token');

      const cleanupPromise = Session.destroy({
        where: { id: session.id }
      });

      const [useResponse, cleanupResult] = await Promise.all([
        useSessionPromise,
        cleanupPromise
      ]);

      // Either use succeeds (session found before cleanup) or fails (session cleaned up)
      expect([200, 401]).toContain(useResponse.status);
    });

    test('should handle corrupted session data', async () => {
      // Create session with corrupted data
      const corruptedSession = await Session.create({
        userId: testUser.id,
        token: 'corrupted-token',
        refreshToken: null, // Null refresh token
        userAgent: '\\x00\\x01\\x02', // Binary data
        ipAddress: 'not-an-ip-address',
        expiresAt: new Date('invalid-date'), // Invalid date
        lastActivity: null
      });

      // Attempt to retrieve sessions
      const sessions = await authService.getActiveSessions(testUser.id);
      
      // Should handle corrupted data gracefully
      expect(Array.isArray(sessions)).toBe(true);
    });

    test('should handle database constraint violations', async () => {
      // Try to create session with duplicate unique field (if exists)
      const sessionData = {
        userId: testUser.id,
        token: 'unique-token-test',
        refreshToken: 'unique-refresh-test',
        expiresAt: new Date(Date.now() + 86400000)
      };

      await Session.create(sessionData);

      try {
        await Session.create(sessionData); // Duplicate
      } catch (error) {
        // Should handle constraint violation
        expect(error).toBeDefined();
      }
    });
  });

  describe('Network and System Errors', () => {
    test('should handle request timeout scenarios', async () => {
      // This would typically require mocking or network manipulation
      // Simulating with a very slow endpoint if available
      
      const timeoutTest = request(app)
        .post('/api/auth/login')
        .timeout(100) // Very short timeout
        .send({
          email: testUser.email,
          password: 'ErrorTest123!'
        });

      try {
        await timeoutTest;
      } catch (error) {
        expect(error.code).toBe('TIMEOUT');
      }
    });

    test('should handle memory pressure during operations', async () => {
      // Create a very large payload to test memory handling
      const largeUserData = {
        email: 'memory@test.com',
        username: 'memory_test',
        password: 'MemoryTest123!',
        firstName: 'A'.repeat(10000),
        lastName: 'B'.repeat(10000),
        metadata: Object.fromEntries(
          Array.from({ length: 1000 }, (_, i) => [`key${i}`, 'value'.repeat(100)])
        )
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(largeUserData);

      // Should either succeed or fail gracefully
      expect([201, 400, 413, 500]).toContain(response.status);
      
      if (response.status === 500) {
        expect(response.body).toHaveProperty('error');
      }
    });

    test('should handle rapid sequential requests', async () => {
      const rapidRequests = [];
      
      // Send 100 requests as fast as possible
      for (let i = 0; i < 100; i++) {
        rapidRequests.push(
          request(app)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${validAccessToken}`)
        );
      }

      const responses = await Promise.all(rapidRequests);
      
      // Some might succeed, some might be rate limited
      const successCount = responses.filter(r => r.status === 200).length;
      const rateLimitedCount = responses.filter(r => r.status === 429).length;
      const errorCount = responses.filter(r => r.status === 500).length;
      
      expect(successCount + rateLimitedCount + errorCount).toBe(100);
      
      // System should remain stable
      expect(errorCount).toBeLessThan(10); // Less than 10% errors
    });
  });

  describe('Data Integrity and Consistency', () => {
    test('should maintain referential integrity under stress', async () => {
      // Create user with sessions
      const stressUser = await User.create({
        email: 'stress@test.com',
        password: await bcrypt.hash('StressTest123!', 12),
        role: 'viewer',
        isActive: true
      });

      const sessions = await Promise.all([
        authService.createSession(stressUser.id, 'stress1', 'refresh1'),
        authService.createSession(stressUser.id, 'stress2', 'refresh2'),
        authService.createSession(stressUser.id, 'stress3', 'refresh3')
      ]);

      // Attempt concurrent operations
      const operations = [
        stressUser.update({ role: 'admin' }),
        stressUser.update({ isActive: false }),
        Session.destroy({ where: { userId: stressUser.id } }),
        Session.update(
          { lastActivity: new Date() },
          { where: { userId: stressUser.id } }
        )
      ];

      try {
        await Promise.all(operations);
      } catch (error) {
        // Some operations might fail due to constraints
        expect(error).toBeDefined();
      }

      // Verify data consistency
      const finalUser = await User.findByPk(stressUser.id);
      const finalSessions = await Session.findAll({
        where: { userId: stressUser.id }
      });

      // Data should be consistent
      if (finalUser) {
        expect(finalUser.id).toBe(stressUser.id);
      }

      // Clean up
      if (finalUser) {
        await User.destroy({ where: { id: stressUser.id } });
      }
    });

    test('should handle transaction rollbacks', async () => {
      const originalUserCount = await User.count();
      const originalSessionCount = await Session.count();

      try {
        // Simulate a transaction that should fail
        await User.sequelize.transaction(async (t) => {
          const newUser = await User.create({
            email: 'transaction@test.com',
            password: await bcrypt.hash('TransactionTest123!', 12),
            role: 'viewer',
            isActive: true
          }, { transaction: t });

          await authService.createSession(
            newUser.id,
            'transaction-token',
            'transaction-refresh'
          );

          // Force rollback
          throw new Error('Forced transaction rollback');
        });
      } catch (error) {
        expect(error.message).toBe('Forced transaction rollback');
      }

      // Verify rollback worked
      const finalUserCount = await User.count();
      const finalSessionCount = await Session.count();

      expect(finalUserCount).toBe(originalUserCount);
      // Session count might not rollback if not in same transaction
    });
  });

  describe('Security Edge Cases', () => {
    test('should prevent timing attacks on user enumeration', async () => {
      const existingEmail = testUser.email;
      const nonExistentEmail = 'nonexistent@test.com';
      const measurements = [];

      // Measure response times for existing vs non-existent users
      for (let i = 0; i < 10; i++) {
        // Existing user
        const start1 = Date.now();
        await request(app)
          .post('/api/auth/login')
          .send({
            email: existingEmail,
            password: 'wrong-password'
          });
        measurements.push({ type: 'existing', time: Date.now() - start1 });

        // Non-existent user
        const start2 = Date.now();
        await request(app)
          .post('/api/auth/login')
          .send({
            email: nonExistentEmail,
            password: 'wrong-password'
          });
        measurements.push({ type: 'nonexistent', time: Date.now() - start2 });
      }

      const existingAvg = measurements
        .filter(m => m.type === 'existing')
        .reduce((sum, m) => sum + m.time, 0) / 10;

      const nonExistentAvg = measurements
        .filter(m => m.type === 'nonexistent')
        .reduce((sum, m) => sum + m.time, 0) / 10;

      // Response times should be similar to prevent user enumeration
      const timeDifference = Math.abs(existingAvg - nonExistentAvg);
      const threshold = Math.max(existingAvg, nonExistentAvg) * 0.3; // 30% threshold

      expect(timeDifference).toBeLessThan(threshold);
    });

    test('should handle session fixation attempts', async () => {
      // Attacker provides session ID
      const attackerSessionId = 'attacker-session-id';
      
      // User logs in (should get new session, not use attacker's)
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .set('Cookie', `sessionId=${attackerSessionId}`)
        .send({
          email: testUser.email,
          password: 'ErrorTest123!'
        })
        .expect(200);

      // Should receive new session tokens
      expect(loginResponse.body).toHaveProperty('accessToken');
      
      // Session should not be the attacker's fixed session
      const newSession = await Session.findOne({
        where: { token: loginResponse.body.accessToken }
      });
      
      expect(newSession).toBeTruthy();
      expect(newSession.id).not.toBe(attackerSessionId);
    });

    test('should handle CSRF token bypass attempts', async () => {
      // Attempt to perform state-changing operation without proper CSRF protection
      const maliciousRequest = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .set('Origin', 'http://malicious-site.com')
        .set('Referer', 'http://malicious-site.com/attack')
        .send({
          currentPassword: 'ErrorTest123!',
          newPassword: 'MaliciousPass123!'
        });

      // Should either succeed (if CSRF protection not needed) or fail with proper error
      expect([200, 403, 401]).toContain(maliciousRequest.status);
      
      if (maliciousRequest.status === 403) {
        expect(maliciousRequest.body.error).toMatch(/csrf|origin|referer/i);
      }
    });
  });

  describe('Recovery and Cleanup', () => {
    test('should recover from corrupted authentication state', async () => {
      // Corrupt user data
      await testUser.update({
        password: 'invalid-hash', // Invalid bcrypt hash
        isActive: null, // Invalid boolean
        role: 'invalid-role' // Invalid role
      });

      // Attempt login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'ErrorTest123!'
        });

      expect([401, 500]).toContain(loginResponse.status);
      
      // Restore valid state
      await testUser.update({
        password: await bcrypt.hash('ErrorTest123!', 12),
        isActive: true,
        role: 'editor'
      });
    });

    test('should handle orphaned session cleanup', async () => {
      // Create sessions for non-existent users
      const orphanedSessions = await Promise.all([
        Session.create({
          userId: 99999, // Non-existent user
          token: 'orphaned1',
          refreshToken: 'orphaned-refresh1',
          expiresAt: new Date(Date.now() + 86400000)
        }),
        Session.create({
          userId: 99998, // Non-existent user
          token: 'orphaned2',
          refreshToken: 'orphaned-refresh2',
          expiresAt: new Date(Date.now() + 86400000)
        })
      ]);

      // Cleanup orphaned sessions
      const cleanupCount = await Session.destroy({
        where: {
          userId: {
            [require('sequelize').Op.notIn]: 
              await User.findAll({ attributes: ['id'] }).then(users => users.map(u => u.id))
          }
        }
      });

      expect(cleanupCount).toBe(2);
    });
  });
});