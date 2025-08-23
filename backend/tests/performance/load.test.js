const request = require('supertest');
const app = require('../../src/server');
const { User } = require('../../src/models');
const { factories } = require('../fixtures/testData');

describe('Performance and Load Tests', () => {
  let testUser, accessToken;

  beforeAll(async () => {
    const userData = await factories.createUser({
      email: 'performance@test.com',
      isEmailVerified: true,
      isActive: true
    });
    testUser = await User.create(userData);
    accessToken = global.testUtils.generateJWT({ 
      id: testUser.id, 
      email: testUser.email 
    });
  });

  describe('Authentication Load Tests', () => {
    it('should handle multiple concurrent login requests', async () => {
      const concurrentRequests = 50;
      const maxExecutionTime = 10000; // 10 seconds
      
      const startTime = Date.now();

      const promises = Array.from({ length: concurrentRequests }, () =>
        request(app)
          .post('/api/auth/login')
          .send({
            email: testUser.email,
            password: 'password123'
          })
      );

      const responses = await Promise.all(promises);
      const executionTime = Date.now() - startTime;

      // Performance assertions
      expect(executionTime).toBeLessThan(maxExecutionTime);
      
      // Success rate should be high
      const successfulLogins = responses.filter(r => r.status === 200);
      const successRate = (successfulLogins.length / concurrentRequests) * 100;
      expect(successRate).toBeGreaterThan(90); // 90% success rate

      // Average response time
      const avgResponseTime = executionTime / concurrentRequests;
      expect(avgResponseTime).toBeLessThan(200); // Less than 200ms average

      console.log(`Login Load Test Results:
        - Concurrent Requests: ${concurrentRequests}
        - Total Time: ${executionTime}ms
        - Success Rate: ${successRate}%
        - Average Response Time: ${avgResponseTime}ms
      `);
    });

    it('should handle registration under load', async () => {
      const concurrentRegistrations = 20;
      const maxExecutionTime = 15000; // 15 seconds

      const startTime = Date.now();

      const promises = Array.from({ length: concurrentRegistrations }, (_, i) =>
        request(app)
          .post('/api/auth/register')
          .send({
            email: `loadtest${i}@test.com`,
            username: `loadtest${i}`,
            password: 'Password123!',
            firstName: 'Load',
            lastName: `Test${i}`
          })
      );

      const responses = await Promise.all(promises);
      const executionTime = Date.now() - startTime;

      expect(executionTime).toBeLessThan(maxExecutionTime);

      const successfulRegistrations = responses.filter(r => r.status === 201);
      const successRate = (successfulRegistrations.length / concurrentRegistrations) * 100;
      expect(successRate).toBeGreaterThan(95); // 95% success rate for registration

      console.log(`Registration Load Test Results:
        - Concurrent Requests: ${concurrentRegistrations}
        - Total Time: ${executionTime}ms
        - Success Rate: ${successRate}%
      `);
    });
  });

  describe('API Endpoint Performance', () => {
    it('should handle protected endpoint requests efficiently', async () => {
      const requestCount = 100;
      const maxExecutionTime = 5000; // 5 seconds

      const startTime = Date.now();

      const promises = Array.from({ length: requestCount }, () =>
        request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${accessToken}`)
      );

      const responses = await Promise.all(promises);
      const executionTime = Date.now() - startTime;

      expect(executionTime).toBeLessThan(maxExecutionTime);

      const successfulRequests = responses.filter(r => r.status === 200);
      expect(successfulRequests.length).toBe(requestCount);

      const avgResponseTime = executionTime / requestCount;
      expect(avgResponseTime).toBeLessThan(50); // Less than 50ms average

      console.log(`Protected Endpoint Performance:
        - Requests: ${requestCount}
        - Total Time: ${executionTime}ms
        - Average Response Time: ${avgResponseTime}ms
      `);
    });

    it('should maintain performance under mixed workload', async () => {
      const mixedRequests = 30;
      const maxExecutionTime = 8000; // 8 seconds

      const startTime = Date.now();

      // Mix of different request types
      const promises = [];
      
      for (let i = 0; i < mixedRequests; i++) {
        if (i % 3 === 0) {
          // Profile requests
          promises.push(
            request(app)
              .get('/api/auth/me')
              .set('Authorization', `Bearer ${accessToken}`)
          );
        } else if (i % 3 === 1) {
          // Token refresh
          const refreshToken = global.testUtils.generateRefreshToken({ 
            id: testUser.id 
          });
          promises.push(
            request(app)
              .post('/api/auth/refresh')
              .send({ refreshToken })
          );
        } else {
          // Login requests
          promises.push(
            request(app)
              .post('/api/auth/login')
              .send({
                email: testUser.email,
                password: 'password123'
              })
          );
        }
      }

      const responses = await Promise.all(promises);
      const executionTime = Date.now() - startTime;

      expect(executionTime).toBeLessThan(maxExecutionTime);

      const successfulRequests = responses.filter(r => 
        [200, 201].includes(r.status)
      );
      const successRate = (successfulRequests.length / mixedRequests) * 100;
      expect(successRate).toBeGreaterThan(85); // 85% success rate

      console.log(`Mixed Workload Performance:
        - Mixed Requests: ${mixedRequests}
        - Total Time: ${executionTime}ms
        - Success Rate: ${successRate}%
      `);
    });
  });

  describe('Database Performance Tests', () => {
    it('should handle multiple user lookups efficiently', async () => {
      // Create test users first
      const userPromises = Array.from({ length: 20 }, async (_, i) => {
        const userData = await factories.createUser({
          email: `dbtest${i}@test.com`,
          username: `dbtest${i}`
        });
        return User.create(userData);
      });

      const testUsers = await Promise.all(userPromises);
      
      const maxQueryTime = 2000; // 2 seconds
      const startTime = Date.now();

      // Concurrent user lookups
      const lookupPromises = testUsers.map(user =>
        User.findOne({ 
          where: { email: user.email },
          include: ['roles'] // Include relations to test join performance
        })
      );

      const users = await Promise.all(lookupPromises);
      const queryTime = Date.now() - startTime;

      expect(queryTime).toBeLessThan(maxQueryTime);
      expect(users.length).toBe(testUsers.length);
      expect(users.every(u => u !== null)).toBe(true);

      console.log(`Database Query Performance:
        - User Lookups: ${testUsers.length}
        - Total Time: ${queryTime}ms
        - Average Query Time: ${queryTime / testUsers.length}ms
      `);
    });

    it('should handle bulk operations efficiently', async () => {
      const bulkSize = 100;
      const maxExecutionTime = 3000; // 3 seconds

      const startTime = Date.now();

      // Bulk create users
      const bulkUserData = await Promise.all(
        Array.from({ length: bulkSize }, async (_, i) => {
          return await factories.createUser({
            email: `bulk${i}@test.com`,
            username: `bulk${i}`
          });
        })
      );

      const createdUsers = await User.bulkCreate(bulkUserData);
      const executionTime = Date.now() - startTime;

      expect(executionTime).toBeLessThan(maxExecutionTime);
      expect(createdUsers.length).toBe(bulkSize);

      console.log(`Bulk Operation Performance:
        - Records Created: ${bulkSize}
        - Total Time: ${executionTime}ms
        - Records per Second: ${Math.round(bulkSize / (executionTime / 1000))}
      `);
    });
  });

  describe('Memory and Resource Usage', () => {
    it('should not leak memory during repeated operations', async () => {
      const iterations = 50;
      const memoryThreshold = 50 * 1024 * 1024; // 50MB increase threshold

      const initialMemory = process.memoryUsage().heapUsed;

      // Repeated operations that might cause memory leaks
      for (let i = 0; i < iterations; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({
            email: testUser.email,
            password: 'password123'
          });

        await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${accessToken}`);

        // Force garbage collection periodically
        if (i % 10 === 0 && global.gc) {
          global.gc();
        }
      }

      // Final garbage collection
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      expect(memoryIncrease).toBeLessThan(memoryThreshold);

      console.log(`Memory Usage Test:
        - Iterations: ${iterations}
        - Initial Memory: ${Math.round(initialMemory / 1024 / 1024)}MB
        - Final Memory: ${Math.round(finalMemory / 1024 / 1024)}MB
        - Memory Increase: ${Math.round(memoryIncrease / 1024 / 1024)}MB
      `);
    });
  });

  describe('Rate Limiting Performance', () => {
    it('should handle rate limiting efficiently', async () => {
      const requestsPerSecond = 100;
      const testDuration = 2; // seconds
      const totalRequests = requestsPerSecond * testDuration;

      const startTime = Date.now();
      
      const promises = Array.from({ length: totalRequests }, () =>
        request(app)
          .post('/api/auth/login')
          .send({
            email: 'nonexistent@test.com', // Will fail but tests rate limiting
            password: 'wrongpassword'
          })
      );

      const responses = await Promise.all(promises);
      const executionTime = Date.now() - startTime;

      // Should complete within reasonable time even with rate limiting
      expect(executionTime).toBeLessThan(testDuration * 1000 + 5000); // +5s buffer

      const rateLimitedResponses = responses.filter(r => r.status === 429);
      const regularResponses = responses.filter(r => r.status === 401);

      // Should have both rate limited and regular responses
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
      expect(regularResponses.length).toBeGreaterThan(0);

      console.log(`Rate Limiting Performance:
        - Total Requests: ${totalRequests}
        - Execution Time: ${executionTime}ms
        - Rate Limited: ${rateLimitedResponses.length}
        - Regular Responses: ${regularResponses.length}
      `);
    });
  });

  describe('Stress Testing', () => {
    it('should handle extreme load gracefully', async () => {
      const extremeLoad = 200;
      const maxExecutionTime = 30000; // 30 seconds

      const startTime = Date.now();

      // Create a mix of operations under extreme load
      const promises = [];

      for (let i = 0; i < extremeLoad; i++) {
        const operation = i % 4;

        switch (operation) {
          case 0:
            promises.push(
              request(app)
                .post('/api/auth/login')
                .send({
                  email: testUser.email,
                  password: 'password123'
                })
            );
            break;
          case 1:
            promises.push(
              request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${accessToken}`)
            );
            break;
          case 2:
            promises.push(
              request(app)
                .post('/api/auth/refresh')
                .send({ refreshToken: global.testUtils.generateRefreshToken() })
            );
            break;
          case 3:
            promises.push(
              request(app)
                .post('/api/auth/register')
                .send({
                  email: `stress${i}@test.com`,
                  username: `stress${i}`,
                  password: 'Password123!',
                  firstName: 'Stress',
                  lastName: `Test${i}`
                })
            );
            break;
        }
      }

      const responses = await Promise.all(promises);
      const executionTime = Date.now() - startTime;

      expect(executionTime).toBeLessThan(maxExecutionTime);

      // Calculate success rates by operation type
      const results = {
        total: responses.length,
        successful: responses.filter(r => [200, 201].includes(r.status)).length,
        errors: responses.filter(r => r.status >= 400).length,
        executionTime
      };

      const successRate = (results.successful / results.total) * 100;
      
      // Under extreme load, we expect some degradation but not complete failure
      expect(successRate).toBeGreaterThan(50); // 50% minimum success rate

      console.log(`Stress Test Results:
        - Total Requests: ${results.total}
        - Successful: ${results.successful}
        - Errors: ${results.errors}
        - Success Rate: ${successRate.toFixed(1)}%
        - Execution Time: ${results.executionTime}ms
        - Throughput: ${Math.round(results.total / (results.executionTime / 1000))} req/sec
      `);
    });
  });
});

// Helper function for performance monitoring
function measurePerformance(operation) {
  return async (req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`${operation} took ${duration}ms`);
    });
    
    next();
  };
}

module.exports = { measurePerformance };