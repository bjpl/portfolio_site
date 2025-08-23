const { User, Role } = require('../../../src/models');
const bcrypt = require('bcryptjs');
const { factories, invalidData } = require('../../fixtures/testData');

describe('User Model', () => {
  describe('Model Creation', () => {
    it('should create a valid user with required fields', async () => {
      const userData = await factories.createUser();
      const user = await User.create(userData);

      expect(user).toHaveValidId();
      expect(user.email).toBe(userData.email);
      expect(user.username).toBe(userData.username);
      expect(user.firstName).toBe(userData.firstName);
      expect(user.lastName).toBe(userData.lastName);
      expect(user.isEmailVerified).toBe(userData.isEmailVerified);
      expect(user.isActive).toBe(userData.isActive);
      expect(user.createdAt).toBeValidDate();
      expect(user.updatedAt).toBeValidDate();
    });

    it('should hash password before saving', async () => {
      const userData = await factories.createUser({ password: 'plaintext123' });
      const user = await User.create(userData);

      expect(user.password).not.toBe('plaintext123');
      expect(user.password).toMatch(/^\$2[ayb]\$.{56}$/); // bcrypt hash pattern
      
      // Verify password can be compared
      const isValid = await bcrypt.compare('plaintext123', user.password);
      expect(isValid).toBe(true);
    });

    it('should generate unique usernames when not provided', async () => {
      const userData1 = await factories.createUser({ email: 'user1@test.com' });
      delete userData1.username;
      const user1 = await User.create(userData1);

      const userData2 = await factories.createUser({ email: 'user2@test.com' });
      delete userData2.username;
      const user2 = await User.create(userData2);

      expect(user1.username).toBeDefined();
      expect(user2.username).toBeDefined();
      expect(user1.username).not.toBe(user2.username);
    });

    it('should set default values for optional fields', async () => {
      const userData = await factories.createUser();
      delete userData.isEmailVerified;
      delete userData.isActive;
      delete userData.loginAttempts;
      delete userData.isTwoFactorEnabled;

      const user = await User.create(userData);

      expect(user.isEmailVerified).toBe(false);
      expect(user.isActive).toBe(true);
      expect(user.loginAttempts).toBe(0);
      expect(user.isTwoFactorEnabled).toBe(false);
      expect(user.lastLoginAt).toBeNull();
      expect(user.lockUntil).toBeNull();
    });
  });

  describe('Model Validation', () => {
    it('should require email field', async () => {
      await expect(User.create(invalidData.users.noEmail))
        .rejects.toThrow(/notNull Violation.*email/);
    });

    it('should validate email format', async () => {
      await expect(User.create(invalidData.users.invalidEmail))
        .rejects.toThrow(/Validation error.*email/);
    });

    it('should require password field', async () => {
      await expect(User.create(invalidData.users.noPassword))
        .rejects.toThrow(/notNull Violation.*password/);
    });

    it('should validate password strength', async () => {
      await expect(User.create(invalidData.users.shortPassword))
        .rejects.toThrow(/Password must be at least 8 characters/);
    });

    it('should enforce unique email constraint', async () => {
      const userData1 = await factories.createUser({ email: 'unique@test.com' });
      await User.create(userData1);

      const userData2 = await factories.createUser({ email: 'unique@test.com' });
      await expect(User.create(userData2))
        .rejects.toThrow(/Validation error.*email/);
    });

    it('should enforce unique username constraint', async () => {
      const userData1 = await factories.createUser({ username: 'uniqueuser' });
      await User.create(userData1);

      const userData2 = await factories.createUser({ 
        email: 'different@test.com', 
        username: 'uniqueuser' 
      });
      await expect(User.create(userData2))
        .rejects.toThrow(/Validation error.*username/);
    });

    it('should validate email verification token format', async () => {
      const userData = await factories.createUser({
        emailVerificationToken: 'invalid-token'
      });
      
      await expect(User.create(userData))
        .rejects.toThrow(/Validation error.*emailVerificationToken/);
    });

    it('should validate preferences JSON format', async () => {
      const userData = await factories.createUser({
        preferences: 'invalid-json'
      });
      
      await expect(User.create(userData))
        .rejects.toThrow(/invalid input syntax for type json/);
    });
  });

  describe('Instance Methods', () => {
    let user;

    beforeEach(async () => {
      const userData = await factories.createUser();
      user = await User.create(userData);
    });

    it('should validate correct password', async () => {
      const isValid = await user.validatePassword('password123');
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const isValid = await user.validatePassword('wrongpassword');
      expect(isValid).toBe(false);
    });

    it('should get full name', () => {
      const fullName = user.getFullName();
      expect(fullName).toBe(`${user.firstName} ${user.lastName}`);
    });

    it('should check if account is locked', () => {
      expect(user.isAccountLocked()).toBe(false);

      user.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now
      expect(user.isAccountLocked()).toBe(true);

      user.lockUntil = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
      expect(user.isAccountLocked()).toBe(false);
    });

    it('should increment login attempts', async () => {
      const initialAttempts = user.loginAttempts;
      await user.incrementLoginAttempts();
      await user.reload();

      expect(user.loginAttempts).toBe(initialAttempts + 1);
    });

    it('should lock account after max attempts', async () => {
      user.loginAttempts = 4; // One less than max
      await user.incrementLoginAttempts();
      await user.reload();

      expect(user.lockUntil).toBeValidDate();
      expect(user.lockUntil.getTime()).toBeGreaterThan(Date.now());
    });

    it('should reset login attempts after successful login', async () => {
      user.loginAttempts = 3;
      await user.save();

      await user.resetLoginAttempts();
      await user.reload();

      expect(user.loginAttempts).toBe(0);
      expect(user.lockUntil).toBeNull();
      expect(user.lastLoginAt).toBeValidDate();
    });

    it('should generate email verification token', async () => {
      await user.generateEmailVerificationToken();
      await user.reload();

      expect(user.emailVerificationToken).toBeDefined();
      expect(user.emailVerificationToken).toHaveLength(64);
      expect(user.emailVerificationExpiry).toBeValidDate();
      expect(user.emailVerificationExpiry.getTime()).toBeGreaterThan(Date.now());
    });

    it('should verify email verification token', async () => {
      await user.generateEmailVerificationToken();
      const token = user.emailVerificationToken;

      const isValid = await user.verifyEmailToken(token);
      expect(isValid).toBe(true);

      const isInvalid = await user.verifyEmailToken('invalid-token');
      expect(isInvalid).toBe(false);
    });

    it('should generate password reset token', async () => {
      await user.generatePasswordResetToken();
      await user.reload();

      expect(user.passwordResetToken).toBeDefined();
      expect(user.passwordResetToken).toHaveLength(64);
      expect(user.passwordResetExpiry).toBeValidDate();
      expect(user.passwordResetExpiry.getTime()).toBeGreaterThan(Date.now());
    });

    it('should verify password reset token', async () => {
      await user.generatePasswordResetToken();
      const token = user.passwordResetToken;

      const isValid = await user.verifyPasswordResetToken(token);
      expect(isValid).toBe(true);

      const isInvalid = await user.verifyPasswordResetToken('invalid-token');
      expect(isInvalid).toBe(false);
    });

    it('should update preferences', async () => {
      const newPreferences = {
        theme: 'dark',
        language: 'es',
        notifications: false
      };

      await user.updatePreferences(newPreferences);
      await user.reload();

      const preferences = JSON.parse(user.preferences);
      expect(preferences).toEqual(newPreferences);
    });

    it('should get sanitized user data', () => {
      const sanitized = user.toSafeJSON();

      expect(sanitized).not.toHaveProperty('password');
      expect(sanitized).not.toHaveProperty('emailVerificationToken');
      expect(sanitized).not.toHaveProperty('passwordResetToken');
      expect(sanitized).not.toHaveProperty('twoFactorSecret');
      
      expect(sanitized).toHaveProperty('id');
      expect(sanitized).toHaveProperty('email');
      expect(sanitized).toHaveProperty('username');
      expect(sanitized).toHaveProperty('firstName');
      expect(sanitized).toHaveProperty('lastName');
    });
  });

  describe('Associations', () => {
    let user, adminRole, userRole;

    beforeEach(async () => {
      const userData = await factories.createUser();
      user = await User.create(userData);

      adminRole = await Role.findOne({ where: { name: 'admin' } });
      userRole = await Role.findOne({ where: { name: 'user' } });
    });

    it('should associate user with roles', async () => {
      await user.addRole(userRole);
      const roles = await user.getRoles();

      expect(roles).toHaveLength(1);
      expect(roles[0].name).toBe('user');
    });

    it('should associate user with multiple roles', async () => {
      await user.addRoles([adminRole, userRole]);
      const roles = await user.getRoles();

      expect(roles).toHaveLength(2);
      const roleNames = roles.map(r => r.name);
      expect(roleNames).toContain('admin');
      expect(roleNames).toContain('user');
    });

    it('should check if user has specific role', async () => {
      await user.addRole(adminRole);

      const hasAdminRole = await user.hasRole('admin');
      const hasUserRole = await user.hasRole('user');

      expect(hasAdminRole).toBe(true);
      expect(hasUserRole).toBe(false);
    });

    it('should check if user has any of specified roles', async () => {
      await user.addRole(userRole);

      const hasAnyRole = await user.hasAnyRole(['admin', 'user']);
      const hasNoRole = await user.hasAnyRole(['admin', 'editor']);

      expect(hasAnyRole).toBe(true);
      expect(hasNoRole).toBe(false);
    });

    it('should get user permissions from roles', async () => {
      await user.addRole(adminRole);
      const permissions = await user.getPermissions();

      expect(permissions).toContain('*');
    });
  });

  describe('Hooks and Lifecycle', () => {
    it('should hash password before create', async () => {
      const userData = await factories.createUser({ password: 'plaintext123' });
      const user = await User.create(userData);

      expect(user.password).not.toBe('plaintext123');
      expect(await bcrypt.compare('plaintext123', user.password)).toBe(true);
    });

    it('should hash password before update when changed', async () => {
      const userData = await factories.createUser();
      const user = await User.create(userData);
      const originalHash = user.password;

      user.password = 'newpassword123';
      await user.save();

      expect(user.password).not.toBe(originalHash);
      expect(user.password).not.toBe('newpassword123');
      expect(await bcrypt.compare('newpassword123', user.password)).toBe(true);
    });

    it('should not rehash password if not changed', async () => {
      const userData = await factories.createUser();
      const user = await User.create(userData);
      const originalHash = user.password;

      user.firstName = 'Updated';
      await user.save();

      expect(user.password).toBe(originalHash);
    });

    it('should update timestamps on save', async () => {
      const userData = await factories.createUser();
      const user = await User.create(userData);
      const originalUpdatedAt = user.updatedAt;

      // Wait a moment to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      user.firstName = 'Updated';
      await user.save();

      expect(user.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('Scopes and Queries', () => {
    let activeUser, inactiveUser, verifiedUser, unverifiedUser;

    beforeEach(async () => {
      const activeUserData = await factories.createUser({ 
        email: 'active@test.com',
        isActive: true 
      });
      activeUser = await User.create(activeUserData);

      const inactiveUserData = await factories.createUser({ 
        email: 'inactive@test.com',
        isActive: false 
      });
      inactiveUser = await User.create(inactiveUserData);

      const verifiedUserData = await factories.createUser({ 
        email: 'verified@test.com',
        isEmailVerified: true 
      });
      verifiedUser = await User.create(verifiedUserData);

      const unverifiedUserData = await factories.createUser({ 
        email: 'unverified@test.com',
        isEmailVerified: false 
      });
      unverifiedUser = await User.create(unverifiedUserData);
    });

    it('should find active users', async () => {
      const users = await User.findAll({
        where: { isActive: true }
      });

      const userIds = users.map(u => u.id);
      expect(userIds).toContain(activeUser.id);
      expect(userIds).toContain(verifiedUser.id);
      expect(userIds).toContain(unverifiedUser.id);
      expect(userIds).not.toContain(inactiveUser.id);
    });

    it('should find verified users', async () => {
      const users = await User.findAll({
        where: { isEmailVerified: true }
      });

      const userIds = users.map(u => u.id);
      expect(userIds).toContain(activeUser.id);
      expect(userIds).toContain(verifiedUser.id);
      expect(userIds).not.toContain(unverifiedUser.id);
    });

    it('should find user by email (case insensitive)', async () => {
      const user = await User.findOne({
        where: { email: 'ACTIVE@TEST.COM' }
      });

      expect(user).toBeDefined();
      expect(user.id).toBe(activeUser.id);
    });

    it('should find users with recent login', async () => {
      activeUser.lastLoginAt = new Date();
      await activeUser.save();

      const users = await User.findAll({
        where: {
          lastLoginAt: {
            [require('sequelize').Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      });

      expect(users).toHaveLength(1);
      expect(users[0].id).toBe(activeUser.id);
    });
  });
});