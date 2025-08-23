/**
 * Authentication API Routes
 * JWT and OAuth authentication endpoints
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const { User } = require('../../../models');
const { 
  authenticateToken, 
  optionalAuth,
  authRateLimit,
  bruteForceProtection,
  deviceFingerprinting
} = require('../../../middleware/auth');
const { logger } = require('../../../utils/logger');
const config = require('../../../config');

const router = express.Router();

// Validation helpers
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors.array()
    });
  }
  next();
};

// Password validation rules
const passwordValidation = [
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
];

// Registration validation
const registrationValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters'),
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 })
    .isAlphanumeric()
    .withMessage('Username must be 3-30 alphanumeric characters'),
  ...passwordValidation
];

// Login validation
const loginValidation = [
  body('email')
    .notEmpty()
    .withMessage('Email is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// JWT utility functions
const generateTokens = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    permissions: user.permissions || []
  };

  const accessToken = jwt.sign(
    payload,
    config.jwt.secret,
    { 
      expiresIn: config.jwt.accessTokenExpiry || '15m',
      issuer: config.jwt.issuer,
      audience: config.jwt.audience
    }
  );

  const refreshToken = jwt.sign(
    { id: user.id, type: 'refresh' },
    config.jwt.refreshSecret || config.jwt.secret,
    { 
      expiresIn: config.jwt.refreshTokenExpiry || '7d',
      issuer: config.jwt.issuer,
      audience: config.jwt.audience
    }
  );

  return { accessToken, refreshToken };
};

const verifyToken = (token, secret = config.jwt.secret) => {
  try {
    return jwt.verify(token, secret, {
      issuer: config.jwt.issuer,
      audience: config.jwt.audience
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    }
    throw error;
  }
};

// Password hashing
const hashPassword = async (password) => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

// Rate limiting for authentication endpoints
const strictAuthLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    error: 'Too many authentication attempts',
    code: 'AUTH_RATE_LIMIT_EXCEEDED',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const identifier = req.body?.email || req.ip;
    return `auth:${identifier}`;
  }
});

/**
 * @route POST /api/v1/auth/register
 * @desc Register a new user
 * @access Public
 */
router.post('/register',
  strictAuthLimit,
  deviceFingerprinting,
  registrationValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const {
        email,
        password,
        firstName,
        lastName,
        username
      } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({
          error: 'User with this email already exists',
          code: 'USER_EXISTS'
        });
      }

      // Check username availability if provided
      if (username) {
        const existingUsername = await User.findOne({ where: { username } });
        if (existingUsername) {
          return res.status(400).json({
            error: 'Username is already taken',
            code: 'USERNAME_TAKEN'
          });
        }
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Generate email verification token
      const emailVerificationToken = crypto.randomBytes(32).toString('hex');
      const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Create user
      const user = await User.create({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        username: username || email.split('@')[0],
        role: 'viewer', // Default role
        isActive: true,
        isEmailVerified: false,
        emailVerificationToken,
        emailVerificationExpires,
        registrationMethod: 'email',
        registrationIp: req.ip,
        registrationUserAgent: req.get('User-Agent')
      });

      // Generate tokens
      const { accessToken, refreshToken } = generateTokens(user);

      // Store refresh token (in real app, store in Redis/database)
      user.refreshToken = refreshToken;
      await user.save();

      logger.info('User registered successfully', {
        userId: user.id,
        email: user.email,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.status(201).json({
        message: 'Registration successful',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          role: user.role,
          isEmailVerified: user.isEmailVerified
        },
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: config.jwt.accessTokenExpiry || '15m'
        },
        requiresEmailVerification: true
      });

    } catch (error) {
      logger.error('User registration failed', {
        error: error.message,
        stack: error.stack,
        email: req.body.email,
        ip: req.ip
      });

      res.status(500).json({
        error: 'Registration failed',
        code: 'REGISTRATION_ERROR'
      });
    }
  }
);

/**
 * @route POST /api/v1/auth/login
 * @desc Login user with email and password
 * @access Public
 */
router.post('/login',
  strictAuthLimit,
  bruteForceProtection,
  deviceFingerprinting,
  loginValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { email, password, rememberMe = false } = req.body;

      // Find user by email or username
      const user = await User.findOne({
        where: {
          [Op.or]: [
            { email },
            { username: email }
          ]
        }
      });

      if (!user) {
        return res.status(401).json({
          error: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS'
        });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(401).json({
          error: 'Account is deactivated',
          code: 'ACCOUNT_DEACTIVATED'
        });
      }

      // Check if account is locked
      if (user.lockoutUntil && user.lockoutUntil > new Date()) {
        const lockoutMinutes = Math.ceil((user.lockoutUntil - new Date()) / (1000 * 60));
        return res.status(423).json({
          error: `Account is locked. Try again in ${lockoutMinutes} minutes`,
          code: 'ACCOUNT_LOCKED',
          lockoutUntil: user.lockoutUntil
        });
      }

      // Verify password
      const isValidPassword = await comparePassword(password, user.password);
      if (!isValidPassword) {
        // Increment login attempts
        const maxAttempts = 5;
        const lockoutDuration = 15 * 60 * 1000; // 15 minutes

        user.loginAttempts = (user.loginAttempts || 0) + 1;
        user.lastLoginAttempt = new Date();

        if (user.loginAttempts >= maxAttempts) {
          user.lockoutUntil = new Date(Date.now() + lockoutDuration);
        }

        await user.save();

        logger.warn('Failed login attempt', {
          userId: user.id,
          email: user.email,
          attempts: user.loginAttempts,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });

        return res.status(401).json({
          error: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS',
          attemptsLeft: Math.max(0, maxAttempts - user.loginAttempts)
        });
      }

      // Successful login - reset attempts and update login info
      user.loginAttempts = 0;
      user.lockoutUntil = null;
      user.lastLoginAt = new Date();
      user.lastLoginIp = req.ip;
      user.lastLoginUserAgent = req.get('User-Agent');

      // Generate tokens
      const tokenExpiry = rememberMe ? '30d' : (config.jwt.accessTokenExpiry || '15m');
      const { accessToken, refreshToken } = generateTokens(user);

      // Store refresh token
      user.refreshToken = refreshToken;
      await user.save();

      logger.info('User logged in successfully', {
        userId: user.id,
        email: user.email,
        rememberMe,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          role: user.role,
          permissions: user.permissions || [],
          isEmailVerified: user.isEmailVerified,
          lastLoginAt: user.lastLoginAt
        },
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: tokenExpiry
        }
      });

    } catch (error) {
      logger.error('User login failed', {
        error: error.message,
        stack: error.stack,
        email: req.body.email,
        ip: req.ip
      });

      res.status(500).json({
        error: 'Login failed',
        code: 'LOGIN_ERROR'
      });
    }
  }
);

/**
 * @route POST /api/v1/auth/refresh
 * @desc Refresh access token using refresh token
 * @access Public
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        error: 'Refresh token required',
        code: 'REFRESH_TOKEN_REQUIRED'
      });
    }

    // Verify refresh token
    const decoded = verifyToken(refreshToken, config.jwt.refreshSecret || config.jwt.secret);

    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        error: 'Invalid refresh token',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }

    // Find user and validate refresh token
    const user = await User.findByPk(decoded.id);
    if (!user || !user.isActive || user.refreshToken !== refreshToken) {
      return res.status(401).json({
        error: 'Invalid refresh token',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);

    // Update stored refresh token
    user.refreshToken = newRefreshToken;
    await user.save();

    res.json({
      tokens: {
        accessToken,
        refreshToken: newRefreshToken,
        expiresIn: config.jwt.accessTokenExpiry || '15m'
      }
    });

  } catch (error) {
    logger.error('Token refresh failed', {
      error: error.message,
      ip: req.ip
    });

    res.status(401).json({
      error: 'Token refresh failed',
      code: 'REFRESH_ERROR'
    });
  }
});

/**
 * @route POST /api/v1/auth/logout
 * @desc Logout user and invalidate tokens
 * @access Private
 */
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (user) {
      // Invalidate refresh token
      user.refreshToken = null;
      await user.save();
    }

    logger.info('User logged out', {
      userId: req.user.id,
      ip: req.ip
    });

    res.json({
      message: 'Logout successful'
    });

  } catch (error) {
    logger.error('Logout failed', {
      error: error.message,
      userId: req.user?.id,
      ip: req.ip
    });

    res.status(500).json({
      error: 'Logout failed',
      code: 'LOGOUT_ERROR'
    });
  }
});

/**
 * @route POST /api/v1/auth/change-password
 * @desc Change user password
 * @access Private
 */
router.post('/change-password',
  authenticateToken,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
    ...passwordValidation.map(rule => 
      rule.withMessage(rule.options?.message?.replace('Password', 'New password'))
    )
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;

      const user = await User.findByPk(req.user.id);
      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      // Verify current password
      const isCurrentPasswordValid = await comparePassword(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          error: 'Current password is incorrect',
          code: 'INVALID_CURRENT_PASSWORD'
        });
      }

      // Check if new password is different
      const isSamePassword = await comparePassword(newPassword, user.password);
      if (isSamePassword) {
        return res.status(400).json({
          error: 'New password must be different from current password',
          code: 'PASSWORD_UNCHANGED'
        });
      }

      // Hash new password
      const hashedNewPassword = await hashPassword(newPassword);

      // Update password and invalidate all refresh tokens
      user.password = hashedNewPassword;
      user.refreshToken = null;
      user.passwordChangedAt = new Date();
      await user.save();

      logger.info('Password changed successfully', {
        userId: user.id,
        email: user.email,
        ip: req.ip
      });

      res.json({
        message: 'Password changed successfully'
      });

    } catch (error) {
      logger.error('Password change failed', {
        error: error.message,
        userId: req.user?.id,
        ip: req.ip
      });

      res.status(500).json({
        error: 'Password change failed',
        code: 'PASSWORD_CHANGE_ERROR'
      });
    }
  }
);

/**
 * @route POST /api/v1/auth/forgot-password
 * @desc Request password reset
 * @access Public
 */
router.post('/forgot-password',
  strictAuthLimit,
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { email } = req.body;

      const user = await User.findOne({ where: { email } });
      
      // Always return success to prevent email enumeration
      const successResponse = {
        message: 'If an account with this email exists, you will receive a password reset link shortly'
      };

      if (!user) {
        logger.warn('Password reset requested for non-existent email', {
          email,
          ip: req.ip
        });
        return res.json(successResponse);
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      user.passwordResetToken = resetToken;
      user.passwordResetExpires = resetTokenExpires;
      await user.save();

      // In a real application, send email here
      logger.info('Password reset token generated', {
        userId: user.id,
        email: user.email,
        token: resetToken.substring(0, 8) + '...',
        ip: req.ip
      });

      res.json(successResponse);

    } catch (error) {
      logger.error('Password reset request failed', {
        error: error.message,
        email: req.body.email,
        ip: req.ip
      });

      res.status(500).json({
        error: 'Password reset request failed',
        code: 'PASSWORD_RESET_REQUEST_ERROR'
      });
    }
  }
);

/**
 * @route POST /api/v1/auth/reset-password
 * @desc Reset password with token
 * @access Public
 */
router.post('/reset-password',
  strictAuthLimit,
  [
    body('token').notEmpty().withMessage('Reset token is required'),
    body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    ...passwordValidation.map(rule => 
      rule.withMessage(rule.options?.message?.replace('Password', 'New password'))
    )
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      const user = await User.findOne({
        where: {
          passwordResetToken: token,
          passwordResetExpires: { [Op.gt]: new Date() }
        }
      });

      if (!user) {
        return res.status(400).json({
          error: 'Invalid or expired reset token',
          code: 'INVALID_RESET_TOKEN'
        });
      }

      // Hash new password
      const hashedPassword = await hashPassword(newPassword);

      // Update user
      user.password = hashedPassword;
      user.passwordResetToken = null;
      user.passwordResetExpires = null;
      user.refreshToken = null; // Invalidate all sessions
      user.passwordChangedAt = new Date();
      await user.save();

      logger.info('Password reset completed', {
        userId: user.id,
        email: user.email,
        ip: req.ip
      });

      res.json({
        message: 'Password reset successful'
      });

    } catch (error) {
      logger.error('Password reset failed', {
        error: error.message,
        ip: req.ip
      });

      res.status(500).json({
        error: 'Password reset failed',
        code: 'PASSWORD_RESET_ERROR'
      });
    }
  }
);

/**
 * @route GET /api/v1/auth/me
 * @desc Get current user info
 * @access Private
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password', 'refreshToken', 'passwordResetToken'] }
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        role: user.role,
        permissions: user.permissions || [],
        isActive: user.isActive,
        isEmailVerified: user.isEmailVerified,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });

  } catch (error) {
    logger.error('Failed to get current user', {
      error: error.message,
      userId: req.user?.id
    });

    res.status(500).json({
      error: 'Failed to get user information',
      code: 'USER_INFO_ERROR'
    });
  }
});

/**
 * @route POST /api/v1/auth/verify-email
 * @desc Verify email address with token
 * @access Public
 */
router.post('/verify-email',
  [
    body('token').notEmpty().withMessage('Verification token is required')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { token } = req.body;

      const user = await User.findOne({
        where: {
          emailVerificationToken: token,
          emailVerificationExpires: { [Op.gt]: new Date() }
        }
      });

      if (!user) {
        return res.status(400).json({
          error: 'Invalid or expired verification token',
          code: 'INVALID_VERIFICATION_TOKEN'
        });
      }

      // Update user as verified
      user.isEmailVerified = true;
      user.emailVerificationToken = null;
      user.emailVerificationExpires = null;
      user.emailVerifiedAt = new Date();
      await user.save();

      logger.info('Email verified successfully', {
        userId: user.id,
        email: user.email,
        ip: req.ip
      });

      res.json({
        message: 'Email verified successfully'
      });

    } catch (error) {
      logger.error('Email verification failed', {
        error: error.message,
        ip: req.ip
      });

      res.status(500).json({
        error: 'Email verification failed',
        code: 'EMAIL_VERIFICATION_ERROR'
      });
    }
  }
);

module.exports = router;