const request = require('supertest');
const express = require('express');
const authRoutes = require('../../../src/routes/auth');
const { User, Session } = require('../../../src/models/User');

// Create test app
const app = express();
app.use(express.json());
app.use('/auth', authRoutes);

describe('Auth API Integration Tests', () => {
  let testUser;
  let authToken;

  beforeEach(async () => {
    // Clear database
    await User.destroy({ where: {} });
    await Session.destroy({ where: {} });

    // Create test user
    testUser = await User.create({
      email: 'test@example.com',
      username: 'testuser',
      password: 'testpassword123',
      firstName: 'Test',
      lastName: 'User',
      role: 'user',
      isActive: true,
      isEmailVerified: true,
    });
  });

  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'newuser@example.com',
        username: 'newuser',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
      };

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        message: 'User registered successfully',
        user: {
          email: userData.email,
          username: userData.username,
          firstName: userData.firstName,
          lastName: userData.lastName,
        },
      });

      expect(response.body.tokens).toHaveProperty('accessToken');
      expect(response.body.tokens).toHaveProperty('refreshToken');
    });

    it('should return 400 for invalid email format', async () => {
      const userData = {
        email: 'invalid-email',
        username: 'testuser',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      };

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('email');
    });

    it('should return 400 for weak password', async () => {
      const userData = {
        email: 'test@example.com',
        username: 'testuser',
        password: '123',
        firstName: 'Test',
        lastName: 'User',
      };

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('password');
    });

    it('should return 409 for duplicate email', async () => {
      const userData = {
        email: testUser.email,
        username: 'differentuser',
        password: 'password123',
        firstName: 'Different',
        lastName: 'User',
      };

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already registered');
    });

    it('should return 409 for duplicate username', async () => {
      const userData = {
        email: 'different@example.com',
        username: testUser.username,
        password: 'password123',
        firstName: 'Different',
        lastName: 'User',
      };

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already taken');
    });
  });

  describe('POST /auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          emailOrUsername: testUser.email,
          password: 'testpassword123',
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Login successful',
        user: {
          id: testUser.id,
          email: testUser.email,
          username: testUser.username,
        },
      });

      expect(response.body.tokens).toHaveProperty('accessToken');
      expect(response.body.tokens).toHaveProperty('refreshToken');
      
      authToken = response.body.tokens.accessToken;
    });

    it('should login with username instead of email', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          emailOrUsername: testUser.username,
          password: 'testpassword123',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.username).toBe(testUser.username);
    });

    it('should return 401 for invalid credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          emailOrUsername: testUser.email,
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should return 401 for non-existent user', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          emailOrUsername: 'nonexistent@example.com',
          password: 'password123',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should include user agent and IP in session', async () => {
      const response = await request(app)
        .post('/auth/login')
        .set('User-Agent', 'Test Agent')
        .send({
          emailOrUsername: testUser.email,
          password: 'testpassword123',
        })
        .expect(200);

      const sessions = await Session.findAll({ where: { userId: testUser.id } });
      expect(sessions).toHaveLength(1);
      expect(sessions[0].userAgent).toBe('Test Agent');
    });
  });

  describe('POST /auth/refresh', () => {
    let refreshToken;

    beforeEach(async () => {
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          emailOrUsername: testUser.email,
          password: 'testpassword123',
        });

      refreshToken = loginResponse.body.tokens.refreshToken;
      authToken = loginResponse.body.tokens.accessToken;
    });

    it('should refresh access token with valid refresh token', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.tokens).toHaveProperty('accessToken');
      expect(response.body.tokens.accessToken).not.toBe(authToken);
    });

    it('should return 401 for invalid refresh token', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid');
    });

    it('should return 401 for expired refresh token', async () => {
      // Create expired session
      const expiredSession = await Session.create({
        userId: testUser.id,
        token: 'expired-token',
        refreshToken: 'expired-refresh-token',
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
      });

      const response = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: 'expired-refresh-token' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('expired');
    });
  });

  describe('POST /auth/logout', () => {
    beforeEach(async () => {
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          emailOrUsername: testUser.email,
          password: 'testpassword123',
        });

      authToken = loginResponse.body.tokens.accessToken;
    });

    it('should logout successfully with valid token', async () => {
      const response = await request(app)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logged out successfully');

      // Verify session is deleted
      const sessions = await Session.findAll({ where: { token: authToken } });
      expect(sessions).toHaveLength(0);
    });

    it('should return 401 for missing authorization header', async () => {
      const response = await request(app)
        .post('/auth/logout')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should handle logout with invalid token gracefully', async () => {
      const response = await request(app)
        .post('/auth/logout')
        .set('Authorization', 'Bearer invalid-token')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /auth/logout-all', () => {
    beforeEach(async () => {
      // Create multiple sessions
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/auth/login')
          .send({
            emailOrUsername: testUser.email,
            password: 'testpassword123',
          });
      }

      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          emailOrUsername: testUser.email,
          password: 'testpassword123',
        });

      authToken = loginResponse.body.tokens.accessToken;
    });

    it('should logout from all sessions', async () => {
      // Verify multiple sessions exist
      let sessions = await Session.findAll({ where: { userId: testUser.id } });
      expect(sessions.length).toBeGreaterThan(1);

      const response = await request(app)
        .post('/auth/logout-all')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('All sessions terminated');

      // Verify all sessions are deleted
      sessions = await Session.findAll({ where: { userId: testUser.id } });
      expect(sessions).toHaveLength(0);
    });
  });

  describe('POST /auth/change-password', () => {
    beforeEach(async () => {
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          emailOrUsername: testUser.email,
          password: 'testpassword123',
        });

      authToken = loginResponse.body.tokens.accessToken;
    });

    it('should change password successfully', async () => {
      const response = await request(app)
        .post('/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'testpassword123',
          newPassword: 'newpassword123',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Password changed successfully');

      // Verify can login with new password
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          emailOrUsername: testUser.email,
          password: 'newpassword123',
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
    });

    it('should return 400 for incorrect current password', async () => {
      const response = await request(app)
        .post('/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'wrongpassword',
          newPassword: 'newpassword123',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('incorrect');
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app)
        .post('/auth/change-password')
        .send({
          currentPassword: 'testpassword123',
          newPassword: 'newpassword123',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /auth/profile', () => {
    beforeEach(async () => {
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          emailOrUsername: testUser.email,
          password: 'testpassword123',
        });

      authToken = loginResponse.body.tokens.accessToken;
    });

    it('should return user profile', async () => {
      const response = await request(app)
        .get('/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toMatchObject({
        id: testUser.id,
        email: testUser.email,
        username: testUser.username,
        firstName: testUser.firstName,
        lastName: testUser.lastName,
      });

      // Should not include sensitive data
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app)
        .get('/auth/profile')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /auth/profile', () => {
    beforeEach(async () => {
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          emailOrUsername: testUser.email,
          password: 'testpassword123',
        });

      authToken = loginResponse.body.tokens.accessToken;
    });

    it('should update profile successfully', async () => {
      const updates = {
        firstName: 'Updated',
        lastName: 'Name',
        preferences: { theme: 'dark' },
      };

      const response = await request(app)
        .put('/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.firstName).toBe(updates.firstName);
      expect(response.body.user.lastName).toBe(updates.lastName);
    });

    it('should ignore unauthorized fields', async () => {
      const updates = {
        email: 'hacker@example.com',
        role: 'admin',
        firstName: 'Updated',
      };

      const response = await request(app)
        .put('/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates)
        .expect(200);

      expect(response.body.user.firstName).toBe(updates.firstName);
      expect(response.body.user.email).toBe(testUser.email); // Should not change
      expect(response.body.user.role).toBe(testUser.role); // Should not change
    });
  });

  describe('Rate limiting', () => {
    it('should rate limit login attempts', async () => {
      const promises = [];
      
      // Make many rapid login attempts
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app)
            .post('/auth/login')
            .send({
              emailOrUsername: 'nonexistent@example.com',
              password: 'wrongpassword',
            })
        );
      }

      const responses = await Promise.all(promises);
      const rateLimitedResponses = responses.filter(res => res.status === 429);

      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Input validation', () => {
    it('should validate required fields on registration', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          // Missing required fields
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should sanitize input data', async () => {
      const userData = {
        email: '  TEST@EXAMPLE.COM  ',
        username: '  TestUser  ',
        password: 'password123',
        firstName: '  <script>alert("xss")</script>John  ',
        lastName: 'Doe',
      };

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.user.email).toBe('test@example.com');
      expect(response.body.user.username).toBe('TestUser');
      expect(response.body.user.firstName).not.toContain('<script>');
    });
  });

  describe('Security headers', () => {
    it('should include security headers in responses', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          emailOrUsername: testUser.email,
          password: 'testpassword123',
        });

      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-xss-protection');
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      // Mock database error
      jest.spyOn(User, 'create').mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          username: 'testuser',
          password: 'password123',
          firstName: 'Test',
          lastName: 'User',
        })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('server error');
    });

    it('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/auth/login')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});