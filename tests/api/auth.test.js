const request = require('supertest');
const app = require('../../backend/src/server');
const { sequelize, User } = require('../../backend/src/models');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

describe('Authentication API', () => {
  let testUser;
  let accessToken;
  let refreshToken;

  beforeAll(async () => {
    // Setup test database
    await sequelize.sync({ force: true });

    // Create test user
    const hashedPassword = await bcrypt.hash('testpassword123', 12);
    testUser = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: hashedPassword,
      isActive: true,
      isVerified: true
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'testpassword123'
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(loginData.email);
      expect(response.body.user).not.toHaveProperty('password');

      accessToken = response.body.accessToken;
      refreshToken = response.body.refreshToken;
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Validation failed');
    });

    it('should reject unverified accounts', async () => {
      const unverifiedUser = await User.create({
        username: 'unverified',
        email: 'unverified@example.com',
        password: await bcrypt.hash('password123', 12),
        isActive: true,
        isVerified: false
      });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'unverified@example.com',
          password: 'password123'
        })
        .expect(403);

      expect(response.body.error).toBe('Please verify your email address');
    });
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register new user', async () => {
      const userData = {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'newpassword123',
        firstName: 'New',
        lastName: 'User'
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user.username).toBe(userData.username);
      expect(response.body.user).not.toHaveProperty('password');
      expect(response.body.message).toContain('verification email');
    });

    it('should reject duplicate email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: 'duplicate',
          email: 'test@example.com', // Already exists
          password: 'password123'
        })
        .expect(400);

      expect(response.body.error).toBe('Email already registered');
    });

    it('should validate password strength', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: 'weakpass',
          email: 'weak@example.com',
          password: '123' // Too weak
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should refresh access token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid.token.here' })
        .expect(401);

      expect(response.body.error).toBe('Invalid refresh token');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should logout user', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken })
        .expect(200);

      expect(response.body.message).toBe('Logged out successfully');
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/v1/auth/logout')
        .send({ refreshToken })
        .expect(401);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    beforeEach(async () => {
      // Get fresh token for these tests
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'testpassword123'
        });
      
      accessToken = loginResponse.body.accessToken;
    });

    it('should return current user profile', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('email');
      expect(response.body).toHaveProperty('username');
      expect(response.body).not.toHaveProperty('password');
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/v1/auth/me')
        .expect(401);
    });

    it('should reject invalid token', async () => {
      await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid.token')
        .expect(401);
    });
  });

  describe('POST /api/v1/auth/forgot-password', () => {
    it('should send password reset email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'test@example.com' })
        .expect(200);

      expect(response.body.message).toContain('password reset email');
    });

    it('should handle non-existent email gracefully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      // Should return same message for security
      expect(response.body.message).toContain('password reset email');
    });

    it('should validate email format', async () => {
      await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'invalid-email' })
        .expect(400);
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit login attempts', async () => {
      const promises = [];
      
      // Make 6 rapid login attempts (rate limit is 5)
      for (let i = 0; i < 6; i++) {
        promises.push(
          request(app)
            .post('/api/v1/auth/login')
            .send({
              email: 'test@example.com',
              password: 'wrongpassword'
            })
        );
      }

      const responses = await Promise.all(promises);
      const rateLimitedResponse = responses.find(r => r.status === 429);
      
      expect(rateLimitedResponse).toBeDefined();
    }, 10000);
  });
});
