/**
 * Users API Routes
 * User management and profile endpoints
 */

const express = require('express');
const { body, param, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');

const { User } = require('../../../models');
const { 
  authenticateToken, 
  requireAdmin, 
  requireRole,
  optionalAuth
} = require('../../../middleware/auth');
const { logger } = require('../../../utils/logger');
const { Op } = require('sequelize');

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

/**
 * @route GET /api/v1/users/profile
 * @desc Get current user's profile
 * @access Private
 */
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { 
        exclude: ['password', 'refreshToken', 'passwordResetToken', 'emailVerificationToken'] 
      }
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({
      profile: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        role: user.role,
        permissions: user.permissions || [],
        bio: user.bio,
        avatar: user.avatar,
        website: user.website,
        location: user.location,
        timezone: user.timezone,
        language: user.language,
        isActive: user.isActive,
        isEmailVerified: user.isEmailVerified,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        settings: user.settings || {},
        preferences: user.preferences || {}
      }
    });

  } catch (error) {
    logger.error('Failed to get user profile', {
      error: error.message,
      userId: req.user?.id
    });

    res.status(500).json({
      error: 'Failed to get profile',
      code: 'PROFILE_ERROR'
    });
  }
});

/**
 * @route PUT /api/v1/users/profile
 * @desc Update current user's profile
 * @access Private
 */
router.put('/profile',
  authenticateToken,
  [
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
    body('bio')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Bio must be under 500 characters'),
    body('website')
      .optional()
      .trim()
      .isURL()
      .withMessage('Website must be a valid URL'),
    body('location')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Location must be under 100 characters'),
    body('timezone')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Timezone must be under 50 characters'),
    body('language')
      .optional()
      .isIn(['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh'])
      .withMessage('Invalid language code'),
    body('settings')
      .optional()
      .isObject()
      .withMessage('Settings must be an object'),
    body('preferences')
      .optional()
      .isObject()
      .withMessage('Preferences must be an object')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const user = await User.findByPk(req.user.id);
      
      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      const {
        firstName,
        lastName,
        username,
        bio,
        avatar,
        website,
        location,
        timezone,
        language,
        settings,
        preferences
      } = req.body;

      // Check if username is unique (if being updated)
      if (username && username !== user.username) {
        const existingUser = await User.findOne({
          where: { 
            username,
            id: { [Op.ne]: user.id }
          }
        });
        
        if (existingUser) {
          return res.status(400).json({
            error: 'Username is already taken',
            code: 'USERNAME_TAKEN'
          });
        }
      }

      // Update allowed fields
      const updateData = {};
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (username !== undefined) updateData.username = username;
      if (bio !== undefined) updateData.bio = bio;
      if (avatar !== undefined) updateData.avatar = avatar;
      if (website !== undefined) updateData.website = website;
      if (location !== undefined) updateData.location = location;
      if (timezone !== undefined) updateData.timezone = timezone;
      if (language !== undefined) updateData.language = language;
      if (settings !== undefined) updateData.settings = settings;
      if (preferences !== undefined) updateData.preferences = preferences;

      await user.update(updateData);

      logger.info('User profile updated', {
        userId: user.id,
        changes: Object.keys(updateData),
        ip: req.ip
      });

      // Return updated profile
      const updatedUser = await User.findByPk(user.id, {
        attributes: { 
          exclude: ['password', 'refreshToken', 'passwordResetToken', 'emailVerificationToken'] 
        }
      });

      res.json({
        message: 'Profile updated successfully',
        profile: {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          username: updatedUser.username,
          role: updatedUser.role,
          bio: updatedUser.bio,
          avatar: updatedUser.avatar,
          website: updatedUser.website,
          location: updatedUser.location,
          timezone: updatedUser.timezone,
          language: updatedUser.language,
          settings: updatedUser.settings || {},
          preferences: updatedUser.preferences || {},
          updatedAt: updatedUser.updatedAt
        }
      });

    } catch (error) {
      logger.error('Failed to update profile', {
        error: error.message,
        userId: req.user?.id
      });

      res.status(500).json({
        error: 'Failed to update profile',
        code: 'PROFILE_UPDATE_ERROR'
      });
    }
  }
);

/**
 * @route POST /api/v1/users/change-email
 * @desc Change user email address
 * @access Private
 */
router.post('/change-email',
  authenticateToken,
  [
    body('newEmail')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email address required'),
    body('password')
      .notEmpty()
      .withMessage('Current password required for email change')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { newEmail, password } = req.body;

      const user = await User.findByPk(req.user.id);
      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(400).json({
          error: 'Invalid password',
          code: 'INVALID_PASSWORD'
        });
      }

      // Check if new email is already in use
      const existingUser = await User.findOne({ 
        where: { 
          email: newEmail,
          id: { [Op.ne]: user.id }
        }
      });

      if (existingUser) {
        return res.status(400).json({
          error: 'Email address is already in use',
          code: 'EMAIL_IN_USE'
        });
      }

      // Update email and mark as unverified
      const oldEmail = user.email;
      await user.update({
        email: newEmail,
        isEmailVerified: false,
        emailVerificationToken: crypto.randomBytes(32).toString('hex'),
        emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      });

      logger.info('User email changed', {
        userId: user.id,
        oldEmail,
        newEmail,
        ip: req.ip
      });

      res.json({
        message: 'Email changed successfully. Please verify your new email address.',
        newEmail,
        requiresVerification: true
      });

    } catch (error) {
      logger.error('Failed to change email', {
        error: error.message,
        userId: req.user?.id
      });

      res.status(500).json({
        error: 'Failed to change email',
        code: 'EMAIL_CHANGE_ERROR'
      });
    }
  }
);

/**
 * @route DELETE /api/v1/users/account
 * @desc Delete user account
 * @access Private
 */
router.delete('/account',
  authenticateToken,
  [
    body('password')
      .notEmpty()
      .withMessage('Password required for account deletion'),
    body('confirmation')
      .equals('DELETE')
      .withMessage('Confirmation must be "DELETE"')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { password } = req.body;

      const user = await User.findByPk(req.user.id);
      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(400).json({
          error: 'Invalid password',
          code: 'INVALID_PASSWORD'
        });
      }

      // Prevent admin deletion if they're the last admin
      if (user.role === 'admin') {
        const adminCount = await User.count({ where: { role: 'admin', isActive: true } });
        if (adminCount <= 1) {
          return res.status(400).json({
            error: 'Cannot delete the last admin account',
            code: 'LAST_ADMIN'
          });
        }
      }

      // Soft delete the user
      await user.update({
        isActive: false,
        deletedAt: new Date(),
        email: `deleted_${Date.now()}_${user.email}`, // Anonymize email
        refreshToken: null
      });

      logger.info('User account deleted', {
        userId: user.id,
        email: user.email,
        role: user.role,
        ip: req.ip
      });

      res.json({
        message: 'Account deleted successfully'
      });

    } catch (error) {
      logger.error('Failed to delete account', {
        error: error.message,
        userId: req.user?.id
      });

      res.status(500).json({
        error: 'Failed to delete account',
        code: 'ACCOUNT_DELETE_ERROR'
      });
    }
  }
);

/**
 * @route GET /api/v1/users/settings
 * @desc Get user settings and preferences
 * @access Private
 */
router.get('/settings', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['settings', 'preferences', 'language', 'timezone']
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    const defaultSettings = {
      theme: 'light',
      notifications: {
        email: true,
        browser: true,
        marketing: false
      },
      privacy: {
        profileVisible: true,
        showEmail: false,
        showLastSeen: true
      }
    };

    const defaultPreferences = {
      language: user.language || 'en',
      timezone: user.timezone || 'UTC',
      dateFormat: 'MM/dd/yyyy',
      timeFormat: '12h'
    };

    res.json({
      settings: { ...defaultSettings, ...(user.settings || {}) },
      preferences: { ...defaultPreferences, ...(user.preferences || {}) }
    });

  } catch (error) {
    logger.error('Failed to get user settings', {
      error: error.message,
      userId: req.user?.id
    });

    res.status(500).json({
      error: 'Failed to get settings',
      code: 'SETTINGS_ERROR'
    });
  }
});

/**
 * @route PUT /api/v1/users/settings
 * @desc Update user settings and preferences
 * @access Private
 */
router.put('/settings',
  authenticateToken,
  [
    body('settings').optional().isObject().withMessage('Settings must be an object'),
    body('preferences').optional().isObject().withMessage('Preferences must be an object')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { settings, preferences } = req.body;

      const user = await User.findByPk(req.user.id);
      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      const updateData = {};
      
      if (settings) {
        updateData.settings = { ...(user.settings || {}), ...settings };
      }
      
      if (preferences) {
        updateData.preferences = { ...(user.preferences || {}), ...preferences };
        
        // Update language and timezone if provided in preferences
        if (preferences.language) updateData.language = preferences.language;
        if (preferences.timezone) updateData.timezone = preferences.timezone;
      }

      await user.update(updateData);

      logger.info('User settings updated', {
        userId: user.id,
        hasSettings: !!settings,
        hasPreferences: !!preferences,
        ip: req.ip
      });

      res.json({
        message: 'Settings updated successfully',
        settings: updateData.settings || user.settings,
        preferences: updateData.preferences || user.preferences
      });

    } catch (error) {
      logger.error('Failed to update settings', {
        error: error.message,
        userId: req.user?.id
      });

      res.status(500).json({
        error: 'Failed to update settings',
        code: 'SETTINGS_UPDATE_ERROR'
      });
    }
  }
);

/**
 * @route GET /api/v1/users/activity
 * @desc Get user activity log
 * @access Private
 */
router.get('/activity', authenticateToken, async (req, res) => {
  try {
    // This would typically query an audit log or activity table
    // For now, return basic user information
    const user = await User.findByPk(req.user.id, {
      attributes: [
        'lastLoginAt', 
        'lastLoginIp', 
        'loginAttempts', 
        'createdAt',
        'updatedAt',
        'passwordChangedAt'
      ]
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    const activity = {
      lastLogin: {
        timestamp: user.lastLoginAt,
        ip: user.lastLoginIp
      },
      account: {
        createdAt: user.createdAt,
        lastUpdated: user.updatedAt,
        passwordChanged: user.passwordChangedAt
      },
      security: {
        failedLoginAttempts: user.loginAttempts || 0,
        isLocked: user.lockoutUntil && user.lockoutUntil > new Date()
      }
    };

    res.json({ activity });

  } catch (error) {
    logger.error('Failed to get user activity', {
      error: error.message,
      userId: req.user?.id
    });

    res.status(500).json({
      error: 'Failed to get activity',
      code: 'ACTIVITY_ERROR'
    });
  }
});

/**
 * @route GET /api/v1/users/:id/public-profile
 * @desc Get public profile of a user
 * @access Public
 */
router.get('/:id/public-profile',
  [
    param('id').isUUID().withMessage('Valid user ID required')
  ],
  handleValidationErrors,
  optionalAuth,
  async (req, res) => {
    try {
      const { id } = req.params;

      const user = await User.findOne({
        where: {
          id,
          isActive: true
        },
        attributes: [
          'id',
          'firstName',
          'lastName',
          'username',
          'bio',
          'avatar',
          'website',
          'location',
          'createdAt',
          'settings'
        ]
      });

      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      // Check privacy settings
      const settings = user.settings || {};
      if (!settings.privacy?.profileVisible && (!req.user || req.user.id !== user.id)) {
        return res.status(403).json({
          error: 'Profile is private',
          code: 'PRIVATE_PROFILE'
        });
      }

      const publicProfile = {
        id: user.id,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username,
        username: user.username,
        bio: user.bio,
        avatar: user.avatar,
        website: settings.privacy?.showEmail ? user.website : null,
        location: user.location,
        memberSince: user.createdAt
      };

      res.json({ profile: publicProfile });

    } catch (error) {
      logger.error('Failed to get public profile', {
        error: error.message,
        userId: req.params.id
      });

      res.status(500).json({
        error: 'Failed to get profile',
        code: 'PUBLIC_PROFILE_ERROR'
      });
    }
  }
);

module.exports = router;