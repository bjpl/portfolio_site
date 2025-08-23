const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = require('../src/server');
const User = require('../src/models/User');
const authService = require('../src/services/auth');

describe('Authentication', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const userData = {
        email: 'newuser@test.com',
        password: 'SecurePass123!',
        name: 'Test User',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('message', 'User registered successfully');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should not register user with existing email', async () => {
      const userData = {
        email: 'existing@test.com',
        password: 'SecurePass123!',
        name: 'Test User',
      };

      // Create user first
      await User.create({
        ...userData,
        password: await bcrypt.hash(userData.password, 10),
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should validate email format', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'SecurePass123!',
        name: 'Test User',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('POST /api/auth/login', () => {
    let testUser;
    const password = 'TestPassword123!';

    beforeEach(async () => {
      testUser = await User.create({
        email: 'logintest@test.com',
        password: await bcrypt.hash(password, 10),
        name: 'Login Test',
        role: 'user',
        isActive: true,
      });
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: password,
        })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(testUser.email);
    });

    it('should not login with invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword123!',
        })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });

    it('should not login with non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: password,
        })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });

    it('should not login inactive user', async () => {
      await User.update({ isActive: false }, { where: { id: testUser.id } });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: password,
        })
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh token with valid refresh token', async () => {
      const user = await User.create({
        email: 'refresh@test.com',
        password: await bcrypt.hash('password', 10),
        name: 'Refresh Test',
      });

      const refreshToken = authService.generateRefreshToken(user);

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('refreshToken');
    });

    it('should not refresh with invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Protected Routes', () => {
    let authToken;
    let testUser;

    beforeEach(async () => {
      testUser = await User.create({
        email: 'protected@test.com',
        password: await bcrypt.hash('password', 10),
        name: 'Protected Test',
        role: 'user',
      });
      authToken = authService.generateToken(testUser);
    });

    it('should access protected route with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(testUser.email);
    });

    it('should not access protected route without token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should not access protected route with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should not access admin route as regular user', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      const user = await User.create({
        email: 'logout@test.com',
        password: await bcrypt.hash('password', 10),
        name: 'Logout Test',
      });
      const authToken = authService.generateToken(user);

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Logged out successfully');
    });
  });
});

describe('Auth Service', () => {
  describe('generateToken', () => {
    it('should generate valid JWT token', () => {
      const user = { id: 1, email: 'test@test.com', role: 'user' };
      const token = authService.generateToken(user);

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      expect(decoded).toHaveProperty('id', user.id);
      expect(decoded).toHaveProperty('email', user.email);
      expect(decoded).toHaveProperty('role', user.role);
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token', () => {
      const user = { id: 1, email: 'test@test.com', role: 'user' };
      const token = authService.generateToken(user);
      const decoded = authService.verifyToken(token);

      expect(decoded).toHaveProperty('id', user.id);
      expect(decoded).toHaveProperty('email', user.email);
    });

    it('should throw error for invalid token', () => {
      expect(() => {
        authService.verifyToken('invalid-token');
      }).toThrow();
    });
  });

  describe('hashPassword', () => {
    it('should hash password correctly', async () => {
      const password = 'MySecurePassword123!';
      const hashed = await authService.hashPassword(password);

      expect(hashed).not.toBe(password);
      expect(await bcrypt.compare(password, hashed)).toBe(true);
    });
  });

  describe('comparePassword', () => {
    it('should compare passwords correctly', async () => {
      const password = 'MySecurePassword123!';
      const hashed = await bcrypt.hash(password, 10);

      expect(await authService.comparePassword(password, hashed)).toBe(true);
      expect(await authService.comparePassword('WrongPassword', hashed)).toBe(false);
    });
  });
});