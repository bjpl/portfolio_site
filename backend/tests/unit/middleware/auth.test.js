const authMiddleware = require('../../../src/middleware/auth');
const { User } = require('../../../src/models');
const jwt = require('jsonwebtoken');
const { factories } = require('../../fixtures/testData');

describe('Auth Middleware', () => {
  let user, token;

  beforeEach(async () => {
    const userData = await factories.createUser({
      isEmailVerified: true,
      isActive: true
    });
    user = await User.create(userData);
    token = global.testUtils.generateJWT({ id: user.id, email: user.email });
  });

  describe('authenticateToken', () => {
    it('should authenticate valid token', async () => {
      const req = global.testUtils.mockRequest({
        headers: { authorization: `Bearer ${token}` }
      });
      const res = global.testUtils.mockResponse();
      const next = global.testUtils.mockNext();

      await authMiddleware.authenticateToken(req, res, next);

      expect(req.user).toBeDefined();
      expect(req.user.id).toBe(user.id);
      expect(next).toHaveBeenCalled();
    });

    it('should reject request without token', async () => {
      const req = global.testUtils.mockRequest();
      const res = global.testUtils.mockResponse();
      const next = global.testUtils.mockNext();

      await authMiddleware.authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access token required'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject invalid token format', async () => {
      const req = global.testUtils.mockRequest({
        headers: { authorization: 'InvalidFormat' }
      });
      const res = global.testUtils.mockResponse();
      const next = global.testUtils.mockNext();

      await authMiddleware.authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid token format'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject expired token', async () => {
      const expiredToken = jwt.sign(
        { id: user.id, email: user.email, type: 'access' },
        process.env.JWT_SECRET,
        { expiresIn: '-1h' }
      );

      const req = global.testUtils.mockRequest({
        headers: { authorization: `Bearer ${expiredToken}` }
      });
      const res = global.testUtils.mockResponse();
      const next = global.testUtils.mockNext();

      await authMiddleware.authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Token expired'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject token for non-existent user', async () => {
      const nonExistentToken = global.testUtils.generateJWT({ 
        id: 99999, 
        email: 'nonexistent@test.com' 
      });

      const req = global.testUtils.mockRequest({
        headers: { authorization: `Bearer ${nonExistentToken}` }
      });
      const res = global.testUtils.mockResponse();
      const next = global.testUtils.mockNext();

      await authMiddleware.authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not found'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject token for inactive user', async () => {
      user.isActive = false;
      await user.save();

      const req = global.testUtils.mockRequest({
        headers: { authorization: `Bearer ${token}` }
      });
      const res = global.testUtils.mockResponse();
      const next = global.testUtils.mockNext();

      await authMiddleware.authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Account is inactive'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireEmailVerification', () => {
    it('should allow verified user', async () => {
      user.isEmailVerified = true;
      await user.save();

      const req = global.testUtils.mockRequest({ user });
      const res = global.testUtils.mockResponse();
      const next = global.testUtils.mockNext();

      authMiddleware.requireEmailVerification(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject unverified user', async () => {
      user.isEmailVerified = false;
      await user.save();

      const req = global.testUtils.mockRequest({ user });
      const res = global.testUtils.mockResponse();
      const next = global.testUtils.mockNext();

      authMiddleware.requireEmailVerification(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Email verification required'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle missing user', async () => {
      const req = global.testUtils.mockRequest();
      const res = global.testUtils.mockResponse();
      const next = global.testUtils.mockNext();

      authMiddleware.requireEmailVerification(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication required'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    it('should allow user with required role', async () => {
      const adminRole = await require('../../../src/models/Role')
        .findOne({ where: { name: 'admin' } });
      await user.addRole(adminRole);

      const middleware = authMiddleware.requireRole('admin');
      const req = global.testUtils.mockRequest({ user });
      const res = global.testUtils.mockResponse();
      const next = global.testUtils.mockNext();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject user without required role', async () => {
      const middleware = authMiddleware.requireRole('admin');
      const req = global.testUtils.mockRequest({ user });
      const res = global.testUtils.mockResponse();
      const next = global.testUtils.mockNext();

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Insufficient permissions'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle missing user', async () => {
      const middleware = authMiddleware.requireRole('admin');
      const req = global.testUtils.mockRequest();
      const res = global.testUtils.mockResponse();
      const next = global.testUtils.mockNext();

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication required'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireAnyRole', () => {
    it('should allow user with any of the required roles', async () => {
      const editorRole = await require('../../../src/models/Role')
        .findOne({ where: { name: 'editor' } });
      await user.addRole(editorRole);

      const middleware = authMiddleware.requireAnyRole(['admin', 'editor']);
      const req = global.testUtils.mockRequest({ user });
      const res = global.testUtils.mockResponse();
      const next = global.testUtils.mockNext();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject user without any required role', async () => {
      const middleware = authMiddleware.requireAnyRole(['admin', 'editor']);
      const req = global.testUtils.mockRequest({ user });
      const res = global.testUtils.mockResponse();
      const next = global.testUtils.mockNext();

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Insufficient permissions'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('optionalAuth', () => {
    it('should authenticate valid token but continue if none', async () => {
      const req = global.testUtils.mockRequest({
        headers: { authorization: `Bearer ${token}` }
      });
      const res = global.testUtils.mockResponse();
      const next = global.testUtils.mockNext();

      await authMiddleware.optionalAuth(req, res, next);

      expect(req.user).toBeDefined();
      expect(req.user.id).toBe(user.id);
      expect(next).toHaveBeenCalled();
    });

    it('should continue without authentication if no token', async () => {
      const req = global.testUtils.mockRequest();
      const res = global.testUtils.mockResponse();
      const next = global.testUtils.mockNext();

      await authMiddleware.optionalAuth(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });

    it('should continue without authentication if invalid token', async () => {
      const req = global.testUtils.mockRequest({
        headers: { authorization: 'Bearer invalid-token' }
      });
      const res = global.testUtils.mockResponse();
      const next = global.testUtils.mockNext();

      await authMiddleware.optionalAuth(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Mock User.findByPk to throw error
      const originalFindByPk = User.findByPk;
      User.findByPk = jest.fn().mockRejectedValue(new Error('Database error'));

      const req = global.testUtils.mockRequest({
        headers: { authorization: `Bearer ${token}` }
      });
      const res = global.testUtils.mockResponse();
      const next = global.testUtils.mockNext();

      await authMiddleware.authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication error'
      });

      // Restore original function
      User.findByPk = originalFindByPk;
    });

    it('should handle malformed tokens', async () => {
      const req = global.testUtils.mockRequest({
        headers: { authorization: 'Bearer malformed.token' }
      });
      const res = global.testUtils.mockResponse();
      const next = global.testUtils.mockNext();

      await authMiddleware.authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid token'
      });
    });
  });

  describe('Token Types', () => {
    it('should reject refresh token in place of access token', async () => {
      const refreshToken = global.testUtils.generateRefreshToken({ 
        id: user.id, 
        email: user.email 
      });

      const req = global.testUtils.mockRequest({
        headers: { authorization: `Bearer ${refreshToken}` }
      });
      const res = global.testUtils.mockResponse();
      const next = global.testUtils.mockNext();

      await authMiddleware.authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid token type'
      });
    });
  });
});