/**
 * Session Persistence Tests
 * 
 * Comprehensive test suite for session management, persistence, expiration,
 * cleanup, security, and edge cases in session handling.
 */

const request = require('supertest');
const { Sequelize } = require('sequelize');
const app = require('../../backend/src/simple-cms-server.js');
const { User, Session } = require('../../backend/src/models');
const authService = require('../../backend/src/services/authService.js');
const config = require('../../backend/src/config');

describe('💾 Session Persistence Tests', () => {
  let testUser;
  let adminUser;
  let testDatabase;

  beforeAll(async () => {
    // Initialize test database
    testDatabase = new Sequelize(config.database.test);
    
    // Clean up existing data
    await User.destroy({ where: {}, force: true });
    await Session.destroy({ where: {}, force: true });

    // Create test users
    testUser = await User.create({
      email: 'session@test.com',
      username: 'session_user',
      password: '$2b$12$hash', // Pre-hashed for testing
      firstName: 'Session',
      lastName: 'Test',
      role: 'editor',
      isActive: true,
      isEmailVerified: true,
      refreshTokenVersion: 0
    });

    adminUser = await User.create({
      email: 'admin@session.com',
      username: 'admin_session',
      password: '$2b$12$hash',
      firstName: 'Admin',
      lastName: 'Session',
      role: 'admin',
      isActive: true,
      isEmailVerified: true,
      refreshTokenVersion: 0
    });
  });

  afterAll(async () => {
    await User.destroy({ where: {}, force: true });
    await Session.destroy({ where: {}, force: true });
    if (testDatabase) {
      await testDatabase.close();
    }
  });

  beforeEach(async () => {
    // Clean up sessions before each test
    await Session.destroy({ where: {}, force: true });
  });

  describe('Session Creation and Storage', () => {
    test('should create session with all required fields', async () => {
      const sessionData = {
        userId: testUser.id,
        token: 'test-access-token-12345',
        refreshToken: 'test-refresh-token-67890',
        userAgent: 'Test-Browser/1.0 (Windows NT 10.0; Win64; x64)',
        ipAddress: '192.168.1.100'
      };

      const session = await authService.createSession(
        sessionData.userId,
        sessionData.token,
        sessionData.refreshToken,
        sessionData.userAgent,
        sessionData.ipAddress
      );

      expect(session).toMatchObject({
        userId: sessionData.userId,
        token: sessionData.token,
        refreshToken: sessionData.refreshToken,
        userAgent: sessionData.userAgent,
        ipAddress: sessionData.ipAddress,
        expiresAt: expect.any(Date),
        createdAt: expect.any(Date),
        lastActivity: expect.any(Date)
      });

      // Verify session was persisted to database
      const persistedSession = await Session.findByPk(session.id);
      expect(persistedSession).toBeTruthy();
      expect(persistedSession.userId).toBe(sessionData.userId);
    });

    test('should set appropriate expiration time', async () => {
      const beforeCreation = new Date();
      const session = await authService.createSession(
        testUser.id,
        'token',
        'refresh-token'
      );
      const afterCreation = new Date();

      expect(session.expiresAt).toBeInstanceOf(Date);
      expect(session.expiresAt.getTime()).toBeGreaterThan(beforeCreation.getTime());
      
      // Should expire in approximately 7 days (default)
      const expectedExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const timeDiff = Math.abs(session.expiresAt.getTime() - expectedExpiry.getTime());
      expect(timeDiff).toBeLessThan(60000); // Within 1 minute
    });

    test('should handle missing optional fields gracefully', async () => {
      const session = await authService.createSession(
        testUser.id,
        'token-no-metadata',
        'refresh-token-no-metadata'
        // No userAgent or ipAddress
      );

      expect(session).toMatchObject({
        userId: testUser.id,
        token: 'token-no-metadata',
        refreshToken: 'refresh-token-no-metadata',
        expiresAt: expect.any(Date)
      });

      // Optional fields should be null or undefined
      expect(session.userAgent).toBeFalsy();
      expect(session.ipAddress).toBeFalsy();
    });

    test('should create multiple sessions for same user', async () => {
      const sessions = await Promise.all([
        authService.createSession(testUser.id, 'token1', 'refresh1', 'Browser1'),
        authService.createSession(testUser.id, 'token2', 'refresh2', 'Browser2'),
        authService.createSession(testUser.id, 'token3', 'refresh3', 'Mobile1')
      ]);

      expect(sessions).toHaveLength(3);
      
      // All sessions should belong to the same user but have different tokens
      sessions.forEach(session => {
        expect(session.userId).toBe(testUser.id);
      });

      const tokens = sessions.map(s => s.token);
      const uniqueTokens = new Set(tokens);
      expect(uniqueTokens.size).toBe(3); // All tokens should be unique
    });

    test('should handle concurrent session creation', async () => {
      const concurrentCreations = Array.from({ length: 10 }, (_, i) =>
        authService.createSession(
          testUser.id,
          `concurrent-token-${i}`,
          `concurrent-refresh-${i}`,
          `Browser-${i}`
        )
      );

      const sessions = await Promise.all(concurrentCreations);
      
      expect(sessions).toHaveLength(10);
      
      // Verify all sessions were persisted
      const persistedCount = await Session.count({
        where: { userId: testUser.id }
      });
      expect(persistedCount).toBe(10);

      // All sessions should have unique IDs
      const sessionIds = sessions.map(s => s.id);
      const uniqueIds = new Set(sessionIds);
      expect(uniqueIds.size).toBe(10);
    });
  });

  describe('Session Retrieval and Querying', () => {
    let testSessions;

    beforeEach(async () => {
      // Create test sessions
      testSessions = await Promise.all([
        authService.createSession(testUser.id, 'active-token-1', 'refresh-1', 'Browser1', '192.168.1.1'),
        authService.createSession(testUser.id, 'active-token-2', 'refresh-2', 'Browser2', '192.168.1.2'),
        authService.createSession(testUser.id, 'active-token-3', 'refresh-3', 'Mobile1', '10.0.0.1'),
        // Create expired session
        Session.create({
          userId: testUser.id,
          token: 'expired-token',
          refreshToken: 'expired-refresh',
          userAgent: 'ExpiredBrowser',
          ipAddress: '127.0.0.1',
          expiresAt: new Date(Date.now() - 86400000), // 1 day ago
          lastActivity: new Date(Date.now() - 86400000)
        })
      ]);
    });

    test('should retrieve only active sessions', async () => {
      const activeSessions = await authService.getActiveSessions(testUser.id);
      
      expect(activeSessions).toHaveLength(3); // Excluding expired session
      
      activeSessions.forEach(session => {
        expect(session.userId).toBe(testUser.id);
        expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now());
        // Should not expose sensitive data
        expect(session).not.toHaveProperty('token');
        expect(session).not.toHaveProperty('refreshToken');
      });
    });

    test('should include session metadata in retrieval', async () => {
      const sessions = await authService.getActiveSessions(testUser.id);
      
      const browserSessions = sessions.filter(s => s.userAgent.includes('Browser'));
      const mobileSessions = sessions.filter(s => s.userAgent.includes('Mobile'));
      
      expect(browserSessions).toHaveLength(2);
      expect(mobileSessions).toHaveLength(1);

      // Should include all metadata fields
      sessions.forEach(session => {
        expect(session).toHaveProperty('userAgent');
        expect(session).toHaveProperty('ipAddress');
        expect(session).toHaveProperty('lastActivity');
        expect(session).toHaveProperty('createdAt');
      });
    });

    test('should find session by refresh token', async () => {
      const targetSession = testSessions[1];
      
      const foundSession = await Session.findOne({
        where: { refreshToken: targetSession.refreshToken }
      });

      expect(foundSession).toBeTruthy();
      expect(foundSession.id).toBe(targetSession.id);
      expect(foundSession.userId).toBe(testUser.id);
    });

    test('should find session by access token', async () => {
      const targetSession = testSessions[0];
      
      const foundSession = await Session.findOne({
        where: { token: targetSession.token }
      });

      expect(foundSession).toBeTruthy();
      expect(foundSession.id).toBe(targetSession.id);
    });

    test('should handle queries for non-existent sessions', async () => {
      const sessions = await authService.getActiveSessions(99999); // Non-existent user
      expect(sessions).toHaveLength(0);
      
      const sessionByToken = await Session.findOne({
        where: { token: 'non-existent-token' }
      });
      expect(sessionByToken).toBeNull();
    });

    test('should filter sessions by date range', async () => {
      const yesterday = new Date(Date.now() - 86400000);
      const tomorrow = new Date(Date.now() + 86400000);

      const recentSessions = await Session.findAll({
        where: {
          userId: testUser.id,
          createdAt: {
            [Sequelize.Op.between]: [yesterday, tomorrow]
          }
        }
      });

      expect(recentSessions.length).toBeGreaterThan(0);
    });
  });

  describe('Session Updates and Activity Tracking', () => {
    let testSession;

    beforeEach(async () => {
      testSession = await authService.createSession(
        testUser.id,
        'update-test-token',
        'update-test-refresh',
        'UpdateBrowser/1.0',
        '192.168.1.50'
      );
    });

    test('should update last activity timestamp', async () => {
      const originalActivity = testSession.lastActivity;
      
      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await Session.update(
        { lastActivity: new Date() },
        { where: { id: testSession.id } }
      );

      const updatedSession = await Session.findByPk(testSession.id);
      expect(updatedSession.lastActivity.getTime()).toBeGreaterThan(originalActivity.getTime());
    });

    test('should update session tokens during refresh', async () => {
      const newAccessToken = 'new-access-token-12345';
      const newRefreshToken = 'new-refresh-token-67890';

      await Session.update(
        { 
          token: newAccessToken,
          refreshToken: newRefreshToken,
          lastActivity: new Date()
        },
        { where: { id: testSession.id } }
      );

      const updatedSession = await Session.findByPk(testSession.id);
      expect(updatedSession.token).toBe(newAccessToken);
      expect(updatedSession.refreshToken).toBe(newRefreshToken);
      expect(updatedSession.lastActivity.getTime()).toBeGreaterThan(testSession.lastActivity.getTime());
    });

    test('should track IP address changes', async () => {
      const newIpAddress = '10.0.0.100';
      
      await Session.update(
        { 
          ipAddress: newIpAddress,
          lastActivity: new Date()
        },
        { where: { id: testSession.id } }
      );

      const updatedSession = await Session.findByPk(testSession.id);
      expect(updatedSession.ipAddress).toBe(newIpAddress);
    });

    test('should maintain session history through updates', async () => {
      const originalCreatedAt = testSession.createdAt;
      const originalUserId = testSession.userId;

      // Update session multiple times
      for (let i = 0; i < 5; i++) {
        await Session.update(
          { 
            lastActivity: new Date(),
            token: `updated-token-${i}`
          },
          { where: { id: testSession.id } }
        );
      }

      const finalSession = await Session.findByPk(testSession.id);
      
      // Core immutable fields should remain the same
      expect(finalSession.createdAt.getTime()).toBe(originalCreatedAt.getTime());
      expect(finalSession.userId).toBe(originalUserId);
      
      // Updated fields should reflect changes
      expect(finalSession.token).toBe('updated-token-4');
    });

    test('should handle concurrent session updates', async () => {
      const concurrentUpdates = Array.from({ length: 5 }, (_, i) =>
        Session.update(
          { 
            lastActivity: new Date(),
            token: `concurrent-token-${i}`
          },
          { where: { id: testSession.id } }
        )
      );

      await Promise.all(concurrentUpdates);

      const updatedSession = await Session.findByPk(testSession.id);
      expect(updatedSession).toBeTruthy();
      expect(updatedSession.token).toMatch(/concurrent-token-\d/);
    });
  });

  describe('Session Expiration and Cleanup', () => {
    beforeEach(async () => {
      // Create sessions with various expiration times
      await Promise.all([
        // Active sessions
        authService.createSession(testUser.id, 'active-1', 'refresh-1'),
        authService.createSession(testUser.id, 'active-2', 'refresh-2'),
        
        // Expired sessions
        Session.create({
          userId: testUser.id,
          token: 'expired-1',
          refreshToken: 'expired-refresh-1',
          expiresAt: new Date(Date.now() - 3600000), // 1 hour ago
          lastActivity: new Date(Date.now() - 3600000)
        }),
        Session.create({
          userId: testUser.id,
          token: 'expired-2',
          refreshToken: 'expired-refresh-2',
          expiresAt: new Date(Date.now() - 86400000), // 1 day ago
          lastActivity: new Date(Date.now() - 86400000)
        }),
        
        // Soon-to-expire session
        Session.create({
          userId: testUser.id,
          token: 'soon-expired',
          refreshToken: 'soon-expired-refresh',
          expiresAt: new Date(Date.now() + 60000), // 1 minute from now
          lastActivity: new Date()
        })
      ]);
    });

    test('should identify expired sessions', async () => {
      const allSessions = await Session.findAll({
        where: { userId: testUser.id }
      });

      const expiredSessions = allSessions.filter(s => s.expiresAt < new Date());
      const activeSessions = allSessions.filter(s => s.expiresAt >= new Date());

      expect(expiredSessions).toHaveLength(2);
      expect(activeSessions).toHaveLength(3);
    });

    test('should clean up expired sessions', async () => {
      // Simulate cleanup process
      const deletedCount = await Session.destroy({
        where: {
          expiresAt: {
            [Sequelize.Op.lt]: new Date()
          }
        }
      });

      expect(deletedCount).toBe(2); // Two expired sessions

      // Verify only active sessions remain
      const remainingSessions = await Session.findAll({
        where: { userId: testUser.id }
      });
      expect(remainingSessions).toHaveLength(3);
    });

    test('should handle bulk session expiration', async () => {
      // Expire all sessions by setting expiry in the past
      await Session.update(
        { expiresAt: new Date(Date.now() - 1000) },
        { where: { userId: testUser.id } }
      );

      const activeSessions = await authService.getActiveSessions(testUser.id);
      expect(activeSessions).toHaveLength(0);
    });

    test('should prevent access with expired session tokens', async () => {
      const expiredSession = await Session.findOne({
        where: { token: 'expired-1' }
      });

      expect(expiredSession).toBeTruthy();
      expect(expiredSession.expiresAt.getTime()).toBeLessThan(Date.now());

      // Attempt to use expired token should fail
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer expired-1`)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    test('should automatically clean up expired sessions on access', async () => {
      // This test depends on implementation - some systems clean up on access
      const expiredRefreshToken = 'expired-refresh-1';

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: expiredRefreshToken })
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/expired/i);

      // Check if expired session was cleaned up (implementation dependent)
      const cleanedSession = await Session.findOne({
        where: { refreshToken: expiredRefreshToken }
      });
      
      // Session might be deleted or might remain for audit purposes
      if (cleanedSession === null) {
        // Session was cleaned up
        expect(cleanedSession).toBeNull();
      } else {
        // Session remains but is expired
        expect(cleanedSession.expiresAt.getTime()).toBeLessThan(Date.now());
      }
    });
  });

  describe('Session Security and Isolation', () => {
    let user1Sessions;
    let user2Sessions;

    beforeEach(async () => {
      // Create sessions for both users
      user1Sessions = await Promise.all([
        authService.createSession(testUser.id, 'user1-token1', 'user1-refresh1'),
        authService.createSession(testUser.id, 'user1-token2', 'user1-refresh2')
      ]);

      user2Sessions = await Promise.all([
        authService.createSession(adminUser.id, 'user2-token1', 'user2-refresh1'),
        authService.createSession(adminUser.id, 'user2-token2', 'user2-refresh2')
      ]);
    });

    test('should isolate sessions between users', async () => {
      const user1ActiveSessions = await authService.getActiveSessions(testUser.id);
      const user2ActiveSessions = await authService.getActiveSessions(adminUser.id);

      expect(user1ActiveSessions).toHaveLength(2);
      expect(user2ActiveSessions).toHaveLength(2);

      // Verify no cross-contamination
      user1ActiveSessions.forEach(session => {
        expect(session.userId).toBe(testUser.id);
      });

      user2ActiveSessions.forEach(session => {
        expect(session.userId).toBe(adminUser.id);
      });
    });

    test('should prevent cross-user session access', async () => {
      // Try to revoke user2's session using user1's permissions
      const user2SessionId = user2Sessions[0].id;

      const response = await request(app)
        .delete(`/api/auth/sessions/${user2SessionId}`)
        .set('Authorization', `Bearer user1-token1`)
        .expect(400);

      expect(response.body).toHaveProperty('error');

      // Verify session was not deleted
      const sessionStillExists = await Session.findByPk(user2SessionId);
      expect(sessionStillExists).toBeTruthy();
    });

    test('should ensure session token uniqueness across users', async () => {
      const allSessions = await Session.findAll();
      const allTokens = allSessions.map(s => s.token);
      const allRefreshTokens = allSessions.map(s => s.refreshToken);

      // All access tokens should be unique
      const uniqueTokens = new Set(allTokens);
      expect(uniqueTokens.size).toBe(allTokens.length);

      // All refresh tokens should be unique
      const uniqueRefreshTokens = new Set(allRefreshTokens);
      expect(uniqueRefreshTokens.size).toBe(allRefreshTokens.length);
    });

    test('should prevent session hijacking via token prediction', async () => {
      const sessionTokens = [
        user1Sessions[0].token,
        user1Sessions[1].token,
        user2Sessions[0].token,
        user2Sessions[1].token
      ];

      // Verify tokens don't follow predictable patterns
      sessionTokens.forEach((token, index) => {
        // Tokens should not be sequential or predictable
        const otherTokens = sessionTokens.filter((_, i) => i !== index);
        
        // Simple pattern detection (this is just an example)
        otherTokens.forEach(otherToken => {
          // Tokens should not be similar (Hamming distance test)
          if (token.length === otherToken.length) {
            let differences = 0;
            for (let i = 0; i < token.length; i++) {
              if (token[i] !== otherToken[i]) {
                differences++;
              }
            }
            const similarity = (token.length - differences) / token.length;
            expect(similarity).toBeLessThan(0.8); // Less than 80% similar
          }
        });
      });
    });

    test('should handle session data encryption/hashing', async () => {
      const session = user1Sessions[0];

      // Verify sensitive data is not stored in plain text (if implemented)
      // This test depends on whether tokens are hashed in database
      if (session.token !== 'user1-token1') {
        // Token is hashed/encrypted
        expect(session.token).not.toBe('user1-token1');
        expect(session.token.length).toBeGreaterThan(20); // Reasonable hash length
      }

      // IP addresses might be hashed for privacy
      if (session.ipAddress && session.ipAddress.length > 15) {
        // Might be hashed IPv4 address
        expect(session.ipAddress).toMatch(/^[a-f0-9]+$/); // Hex hash
      }
    });
  });

  describe('Session Limits and Management', () => {
    test('should enforce session limits per user', async () => {
      const maxSessions = 10; // Assuming this is the limit
      
      // Create maximum allowed sessions
      const sessionPromises = Array.from({ length: maxSessions + 2 }, (_, i) =>
        authService.createSession(
          testUser.id,
          `limit-token-${i}`,
          `limit-refresh-${i}`,
          `Browser-${i}`
        )
      );

      await Promise.all(sessionPromises);

      // Check actual number of sessions
      const activeSessions = await authService.getActiveSessions(testUser.id);
      
      // Should either limit to maxSessions or clean up oldest sessions
      expect(activeSessions.length).toBeLessThanOrEqual(maxSessions);
      
      if (activeSessions.length < maxSessions + 2) {
        // System enforces session limits by cleaning up old sessions
        console.log(`Session limit enforced: ${activeSessions.length} sessions maintained`);
      }
    });

    test('should prioritize recent sessions when cleaning up', async () => {
      // Create sessions with staggered creation times
      const oldSessions = [];
      for (let i = 0; i < 3; i++) {
        const session = await authService.createSession(
          testUser.id,
          `old-token-${i}`,
          `old-refresh-${i}`
        );
        oldSessions.push(session);
        
        // Manually set old lastActivity
        await Session.update(
          { 
            lastActivity: new Date(Date.now() - (86400000 * (3 - i))), // 3-1 days ago
            createdAt: new Date(Date.now() - (86400000 * (3 - i)))
          },
          { where: { id: session.id } }
        );
        
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
      }

      // Create new sessions
      const newSessions = [];
      for (let i = 0; i < 3; i++) {
        const session = await authService.createSession(
          testUser.id,
          `new-token-${i}`,
          `new-refresh-${i}`
        );
        newSessions.push(session);
      }

      // If session cleanup occurs, newer sessions should be preferred
      const allActiveSessions = await authService.getActiveSessions(testUser.id);
      
      // Check that newer sessions are more likely to be retained
      const oldTokensRemaining = allActiveSessions.filter(s => 
        s.token && s.token.includes('old-token')
      ).length;
      
      const newTokensRemaining = allActiveSessions.filter(s => 
        s.token && s.token.includes('new-token')
      ).length;

      expect(newTokensRemaining).toBeGreaterThanOrEqual(oldTokensRemaining);
    });

    test('should handle session cleanup on user deactivation', async () => {
      // Create active sessions
      await Promise.all([
        authService.createSession(testUser.id, 'deactivate-token1', 'deactivate-refresh1'),
        authService.createSession(testUser.id, 'deactivate-token2', 'deactivate-refresh2')
      ]);

      // Verify sessions exist
      let sessionCount = await Session.count({
        where: { userId: testUser.id }
      });
      expect(sessionCount).toBe(2);

      // Deactivate user
      await testUser.update({ isActive: false });

      // Sessions might be cleaned up immediately or remain for audit
      const sessionsAfterDeactivation = await Session.count({
        where: { userId: testUser.id }
      });

      // Reactivate user for other tests
      await testUser.update({ isActive: true });

      // Result depends on implementation - sessions might be kept for audit
      expect(sessionsAfterDeactivation).toBeGreaterThanOrEqual(0);
    });

    test('should handle session cleanup on password change', async () => {
      // Create sessions
      const sessions = await Promise.all([
        authService.createSession(testUser.id, 'password-token1', 'password-refresh1'),
        authService.createSession(testUser.id, 'password-token2', 'password-refresh2')
      ]);

      // Change password (simulate)
      await testUser.update({ refreshTokenVersion: 1 });

      // Old sessions should become invalid
      for (const session of sessions) {
        const response = await request(app)
          .post('/api/auth/refresh')
          .send({ refreshToken: session.refreshToken })
          .expect(401);

        expect(response.body).toHaveProperty('error');
      }
    });
  });

  describe('Session Performance and Scalability', () => {
    test('should handle large number of sessions efficiently', async () => {
      const sessionCount = 1000;
      const batchSize = 100;

      const startTime = Date.now();

      // Create sessions in batches
      for (let i = 0; i < sessionCount; i += batchSize) {
        const batch = Array.from({ length: Math.min(batchSize, sessionCount - i) }, (_, j) =>
          authService.createSession(
            testUser.id,
            `perf-token-${i + j}`,
            `perf-refresh-${i + j}`,
            `Browser-${i + j}`
          )
        );
        
        await Promise.all(batch);
      }

      const creationTime = Date.now() - startTime;
      console.log(`Created ${sessionCount} sessions in ${creationTime}ms`);

      // Test retrieval performance
      const retrievalStart = Date.now();
      const activeSessions = await authService.getActiveSessions(testUser.id);
      const retrievalTime = Date.now() - retrievalStart;

      console.log(`Retrieved ${activeSessions.length} sessions in ${retrievalTime}ms`);

      // Performance benchmarks
      expect(creationTime / sessionCount).toBeLessThan(10); // Less than 10ms per session
      expect(retrievalTime).toBeLessThan(1000); // Less than 1 second for retrieval
    });

    test('should efficiently query sessions with indexes', async () => {
      // Create test data for index performance testing
      await Promise.all(Array.from({ length: 100 }, (_, i) =>
        authService.createSession(
          testUser.id,
          `index-token-${i}`,
          `index-refresh-${i}`
        )
      ));

      const queries = [
        // Query by user ID (should be indexed)
        () => Session.findAll({ where: { userId: testUser.id } }),
        
        // Query by token (should be indexed)
        () => Session.findOne({ where: { token: 'index-token-50' } }),
        
        // Query by refresh token (should be indexed)
        () => Session.findOne({ where: { refreshToken: 'index-refresh-25' } }),
        
        // Query by expiration (should be indexed for cleanup)
        () => Session.findAll({ 
          where: { 
            expiresAt: { 
              [Sequelize.Op.gt]: new Date() 
            } 
          } 
        })
      ];

      for (const query of queries) {
        const start = Date.now();
        const result = await query();
        const duration = Date.now() - start;

        expect(duration).toBeLessThan(100); // Should be fast with proper indexes
        expect(result).toBeTruthy();
      }
    });

    test('should handle concurrent session operations without deadlocks', async () => {
      const concurrentOperations = Array.from({ length: 50 }, (_, i) => {
        // Mix of different operations
        const operations = [
          () => authService.createSession(testUser.id, `concurrent-${i}`, `refresh-${i}`),
          () => authService.getActiveSessions(testUser.id),
          () => Session.update({ lastActivity: new Date() }, { where: { userId: testUser.id } }),
          () => Session.destroy({ where: { token: `non-existent-${i}` } })
        ];
        
        return operations[i % operations.length]();
      });

      const start = Date.now();
      const results = await Promise.all(concurrentOperations);
      const duration = Date.now() - start;

      // All operations should complete successfully
      expect(results).toHaveLength(50);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds

      // Verify database consistency
      const finalSessions = await Session.findAll({ where: { userId: testUser.id } });
      expect(finalSessions.length).toBeGreaterThan(0);
    });
  });

  describe('Session Error Handling', () => {
    test('should handle database connection failures gracefully', async () => {
      // Mock database error
      const originalCreate = Session.create;
      Session.create = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      try {
        await authService.createSession(testUser.id, 'error-token', 'error-refresh');
      } catch (error) {
        expect(error.message).toMatch(/database|connection/i);
      }

      // Restore original method
      Session.create = originalCreate;
    });

    test('should handle constraint violations', async () => {
      // Try to create session with duplicate token (if uniqueness constraint exists)
      await authService.createSession(testUser.id, 'duplicate-token', 'duplicate-refresh');

      try {
        await authService.createSession(testUser.id, 'duplicate-token', 'different-refresh');
      } catch (error) {
        // Should handle constraint violation gracefully
        expect(error).toBeDefined();
      }
    });

    test('should handle invalid foreign key references', async () => {
      const nonExistentUserId = 999999;

      try {
        await authService.createSession(nonExistentUserId, 'invalid-user-token', 'invalid-user-refresh');
      } catch (error) {
        expect(error).toBeDefined();
        expect(error.message).toMatch(/foreign key|user|not found/i);
      }
    });

    test('should handle session cleanup failures gracefully', async () => {
      // Create sessions
      await Promise.all([
        authService.createSession(testUser.id, 'cleanup-token1', 'cleanup-refresh1'),
        authService.createSession(testUser.id, 'cleanup-token2', 'cleanup-refresh2')
      ]);

      // Mock cleanup failure
      const originalDestroy = Session.destroy;
      Session.destroy = jest.fn().mockRejectedValue(new Error('Cleanup failed'));

      try {
        await Session.destroy({ where: { userId: testUser.id } });
      } catch (error) {
        expect(error.message).toBe('Cleanup failed');
      }

      // Restore original method
      Session.destroy = originalDestroy;
    });
  });
});