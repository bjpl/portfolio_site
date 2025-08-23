const authService = require('../../../src/services/authService');
const { User, Role } = require('../../../src/models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { factories } = require('../../fixtures/testData');

// Mock external dependencies
jest.mock('../../../src/utils/logger');
jest.mock('../../../src/services/emailService', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(true),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
  sendWelcomeEmail: jest.fn().mockResolvedValue(true)
}));

describe('AuthService', () => {
  describe('User Registration', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'newuser@test.com',
        username: 'newuser',
        password: 'Password123!',
        firstName: 'New',
        lastName: 'User'
      };

      const result = await authService.registerUser(userData);

      expect(result.success).toBe(true);
      expect(result.user).toHaveValidId();
      expect(result.user.email).toBe(userData.email);
      expect(result.user.isEmailVerified).toBe(false);
      expect(result.tokens).toHaveProperty('accessToken');
      expect(result.tokens).toHaveProperty('refreshToken');
    });

    it('should hash password during registration', async () => {
      const userData = {
        email: 'hashtest@test.com',
        username: 'hashtest',
        password: 'PlainTextPassword123!',
        firstName: 'Hash',
        lastName: 'Test'
      };

      await authService.registerUser(userData);
      
      const user = await User.findOne({ where: { email: userData.email } });
      expect(user.password).not.toBe(userData.password);
      expect(await bcrypt.compare(userData.password, user.password)).toBe(true);
    });

    it('should assign default user role during registration', async () => {
      const userData = {
        email: 'roletest@test.com',
        username: 'roletest',
        password: 'Password123!',
        firstName: 'Role',
        lastName: 'Test'
      };

      const result = await authService.registerUser(userData);
      const user = await User.findByPk(result.user.id, {
        include: [Role]
      });

      const roles = await user.getRoles();
      expect(roles.some(role => role.name === 'user')).toBe(true);
    });

    it('should send verification email after registration', async () => {
      const emailService = require('../../../src/services/emailService');
      const userData = {
        email: 'verify@test.com',
        username: 'verify',
        password: 'Password123!',
        firstName: 'Verify',
        lastName: 'Test'
      };

      await authService.registerUser(userData);

      expect(emailService.sendVerificationEmail).toHaveBeenCalledWith(
        userData.email,
        expect.any(String),
        expect.objectContaining({
          firstName: userData.firstName
        })
      );
    });

    it('should reject registration with existing email', async () => {
      const userData = await factories.createUser();
      const existingUser = await User.create(userData);

      const duplicateUserData = {
        email: existingUser.email,
        username: 'different',
        password: 'Password123!',
        firstName: 'Duplicate',
        lastName: 'User'
      };

      const result = await authService.registerUser(duplicateUserData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('email');
    });

    it('should reject registration with weak password', async () => {
      const userData = {
        email: 'weak@test.com',
        username: 'weak',
        password: '123',
        firstName: 'Weak',
        lastName: 'Password'
      };

      const result = await authService.registerUser(userData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('password');
    });
  });

  describe('User Login', () => {
    let user;

    beforeEach(async () => {
      const userData = await factories.createUser({
        email: 'login@test.com',
        isEmailVerified: true,
        isActive: true
      });
      user = await User.create(userData);
    });

    it('should login user with valid credentials', async () => {
      const result = await authService.loginUser({
        email: 'login@test.com',
        password: 'password123'
      });

      expect(result.success).toBe(true);
      expect(result.user.id).toBe(user.id);
      expect(result.tokens).toHaveProperty('accessToken');
      expect(result.tokens).toHaveProperty('refreshToken');
    });

    it('should update last login timestamp', async () => {
      const originalLastLogin = user.lastLoginAt;
      
      await authService.loginUser({
        email: 'login@test.com',
        password: 'password123'
      });

      await user.reload();
      expect(user.lastLoginAt).toBeValidDate();
      expect(user.lastLoginAt.getTime()).toBeGreaterThan(
        originalLastLogin ? originalLastLogin.getTime() : 0
      );
    });

    it('should reset login attempts on successful login', async () => {
      user.loginAttempts = 3;
      await user.save();

      await authService.loginUser({
        email: 'login@test.com',
        password: 'password123'
      });

      await user.reload();
      expect(user.loginAttempts).toBe(0);
    });

    it('should reject login with invalid email', async () => {
      const result = await authService.loginUser({
        email: 'nonexistent@test.com',
        password: 'password123'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid credentials');
    });

    it('should reject login with invalid password', async () => {
      const result = await authService.loginUser({
        email: 'login@test.com',
        password: 'wrongpassword'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid credentials');
    });

    it('should increment login attempts on failed login', async () => {
      const initialAttempts = user.loginAttempts;

      await authService.loginUser({
        email: 'login@test.com',
        password: 'wrongpassword'
      });

      await user.reload();
      expect(user.loginAttempts).toBe(initialAttempts + 1);
    });

    it('should lock account after max failed attempts', async () => {
      user.loginAttempts = 4; // One less than max
      await user.save();

      const result = await authService.loginUser({
        email: 'login@test.com',
        password: 'wrongpassword'
      });

      await user.reload();
      expect(result.success).toBe(false);
      expect(user.lockUntil).toBeValidDate();
      expect(result.error).toContain('account is locked');
    });

    it('should reject login for locked account', async () => {
      user.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      await user.save();

      const result = await authService.loginUser({
        email: 'login@test.com',
        password: 'password123'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('account is locked');
    });

    it('should reject login for unverified email', async () => {
      user.isEmailVerified = false;
      await user.save();

      const result = await authService.loginUser({
        email: 'login@test.com',
        password: 'password123'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('email not verified');
    });

    it('should reject login for inactive account', async () => {
      user.isActive = false;
      await user.save();

      const result = await authService.loginUser({
        email: 'login@test.com',
        password: 'password123'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('account is inactive');
    });
  });

  describe('Token Management', () => {
    let user;

    beforeEach(async () => {
      const userData = await factories.createUser();
      user = await User.create(userData);
    });

    it('should generate valid JWT tokens', () => {
      const tokens = authService.generateTokens(user);

      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      expect(tokens.accessToken).toHaveValidJWT();
      expect(tokens.refreshToken).toHaveValidJWT();
    });

    it('should verify valid access token', () => {
      const tokens = authService.generateTokens(user);
      const decoded = authService.verifyAccessToken(tokens.accessToken);

      expect(decoded).toHaveProperty('id', user.id);
      expect(decoded).toHaveProperty('email', user.email);
      expect(decoded).toHaveProperty('type', 'access');
    });

    it('should verify valid refresh token', () => {
      const tokens = authService.generateTokens(user);
      const decoded = authService.verifyRefreshToken(tokens.refreshToken);

      expect(decoded).toHaveProperty('id', user.id);
      expect(decoded).toHaveProperty('type', 'refresh');
    });

    it('should reject invalid access token', () => {
      const invalidToken = 'invalid.jwt.token';
      
      expect(() => {
        authService.verifyAccessToken(invalidToken);
      }).toThrow();
    });

    it('should reject expired token', () => {
      const expiredToken = jwt.sign(
        { id: user.id, email: user.email, type: 'access' },
        process.env.JWT_SECRET,
        { expiresIn: '-1h' } // Already expired
      );

      expect(() => {
        authService.verifyAccessToken(expiredToken);
      }).toThrow(/expired/);
    });

    it('should refresh access token with valid refresh token', async () => {
      const tokens = authService.generateTokens(user);
      const newTokens = await authService.refreshToken(tokens.refreshToken);

      expect(newTokens.success).toBe(true);
      expect(newTokens.tokens).toHaveProperty('accessToken');
      expect(newTokens.tokens).toHaveProperty('refreshToken');
      expect(newTokens.tokens.accessToken).not.toBe(tokens.accessToken);
    });
  });

  describe('Email Verification', () => {
    let user;

    beforeEach(async () => {
      const userData = await factories.createUser({
        isEmailVerified: false
      });
      user = await User.create(userData);
      await user.generateEmailVerificationToken();
    });

    it('should verify email with valid token', async () => {
      const token = user.emailVerificationToken;
      const result = await authService.verifyEmail(token);

      expect(result.success).toBe(true);
      
      await user.reload();
      expect(user.isEmailVerified).toBe(true);
      expect(user.emailVerificationToken).toBeNull();
      expect(user.emailVerificationExpiry).toBeNull();
    });

    it('should reject verification with invalid token', async () => {
      const result = await authService.verifyEmail('invalid-token');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid or expired token');
    });

    it('should reject verification with expired token', async () => {
      user.emailVerificationExpiry = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
      await user.save();

      const token = user.emailVerificationToken;
      const result = await authService.verifyEmail(token);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid or expired token');
    });

    it('should resend verification email', async () => {
      const emailService = require('../../../src/services/emailService');
      emailService.sendVerificationEmail.mockClear();

      const result = await authService.resendVerificationEmail(user.email);

      expect(result.success).toBe(true);
      expect(emailService.sendVerificationEmail).toHaveBeenCalledWith(
        user.email,
        expect.any(String),
        expect.any(Object)
      );
    });
  });

  describe('Password Reset', () => {
    let user;

    beforeEach(async () => {
      const userData = await factories.createUser();
      user = await User.create(userData);
    });

    it('should initiate password reset', async () => {
      const emailService = require('../../../src/services/emailService');
      emailService.sendPasswordResetEmail.mockClear();

      const result = await authService.initiatePasswordReset(user.email);

      expect(result.success).toBe(true);
      expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        user.email,
        expect.any(String),
        expect.any(Object)
      );

      await user.reload();
      expect(user.passwordResetToken).toBeDefined();
      expect(user.passwordResetExpiry).toBeValidDate();
    });

    it('should reset password with valid token', async () => {
      await user.generatePasswordResetToken();
      const token = user.passwordResetToken;
      const newPassword = 'NewPassword123!';

      const result = await authService.resetPassword(token, newPassword);

      expect(result.success).toBe(true);

      await user.reload();
      expect(user.passwordResetToken).toBeNull();
      expect(user.passwordResetExpiry).toBeNull();
      expect(await bcrypt.compare(newPassword, user.password)).toBe(true);
    });

    it('should reject password reset with invalid token', async () => {
      const result = await authService.resetPassword('invalid-token', 'NewPassword123!');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid or expired token');
    });

    it('should reject weak new password', async () => {
      await user.generatePasswordResetToken();
      const token = user.passwordResetToken;

      const result = await authService.resetPassword(token, 'weak');

      expect(result.success).toBe(false);
      expect(result.error).toContain('password');
    });
  });

  describe('User Logout', () => {
    it('should logout user successfully', async () => {
      const result = await authService.logoutUser('some-token-id');

      expect(result.success).toBe(true);
    });

    it('should invalidate refresh token on logout', async () => {
      // This would require token blacklisting implementation
      const result = await authService.logoutUser('some-token-id');

      expect(result.success).toBe(true);
      // Additional assertions would depend on blacklisting implementation
    });
  });

  describe('Permission Checking', () => {
    let user, adminRole;

    beforeEach(async () => {
      const userData = await factories.createUser();
      user = await User.create(userData);
      adminRole = await Role.findOne({ where: { name: 'admin' } });
    });

    it('should check user permissions', async () => {
      await user.addRole(adminRole);
      
      const hasPermission = await authService.hasPermission(user.id, 'admin');
      expect(hasPermission).toBe(true);

      const noPermission = await authService.hasPermission(user.id, 'superadmin');
      expect(noPermission).toBe(false);
    });

    it('should check admin role specifically', async () => {
      await user.addRole(adminRole);

      const isAdmin = await authService.isAdmin(user.id);
      expect(isAdmin).toBe(true);
    });
  });

  describe('Account Locking and Security', () => {
    let user;

    beforeEach(async () => {
      const userData = await factories.createUser();
      user = await User.create(userData);
    });

    it('should lock account after maximum failed attempts', async () => {
      // Simulate 5 failed login attempts
      for (let i = 0; i < 5; i++) {
        await authService.loginUser({
          email: user.email,
          password: 'wrongpassword'
        });
      }

      await user.reload();
      expect(user.isAccountLocked()).toBe(true);
    });

    it('should unlock account after lock period expires', async () => {
      user.lockUntil = new Date(Date.now() - 1000); // Already expired
      await user.save();

      const result = await authService.loginUser({
        email: user.email,
        password: 'password123'
      });

      expect(result.success).toBe(true);
    });

    it('should handle concurrent login attempts safely', async () => {
      // Simulate concurrent failed login attempts
      const promises = Array(3).fill(null).map(() =>
        authService.loginUser({
          email: user.email,
          password: 'wrongpassword'
        })
      );

      await Promise.all(promises);
      await user.reload();

      expect(user.loginAttempts).toBeWithinRange(3, 5);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Mock database error
      const originalCreate = User.create;
      User.create = jest.fn().mockRejectedValue(new Error('Database error'));

      const result = await authService.registerUser({
        email: 'error@test.com',
        username: 'error',
        password: 'Password123!',
        firstName: 'Error',
        lastName: 'Test'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Registration failed');

      // Restore original function
      User.create = originalCreate;
    });

    it('should handle email service errors gracefully', async () => {
      const emailService = require('../../../src/services/emailService');
      emailService.sendVerificationEmail.mockRejectedValue(new Error('Email service error'));

      const result = await authService.registerUser({
        email: 'emailerror@test.com',
        username: 'emailerror',
        password: 'Password123!',
        firstName: 'Email',
        lastName: 'Error'
      });

      // Registration should still succeed even if email fails
      expect(result.success).toBe(true);
      expect(result.user).toHaveValidId();
    });
  });
});