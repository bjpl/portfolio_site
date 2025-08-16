const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { authenticate, requireRole } = require('../middleware/auth');
const authService = require('../services/authService');
const db = require('../models');

const router = express.Router();

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

/**
 * Get all users (Admin/Editor only)
 * GET /api/users
 */
router.get('/', 
  authenticate, 
  requireRole(['admin', 'editor']),
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('search').optional().trim(),
    query('role').optional().isIn(['admin', 'editor', 'author', 'viewer']),
    query('active').optional().isBoolean()
  ],
  validate,
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        role,
        active
      } = req.query;

      const options = {
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit),
        attributes: { exclude: ['password'] },
        order: [['createdAt', 'DESC']]
      };

      const where = {};
      
      if (search) {
        const { Op } = require('sequelize');
        where[Op.or] = [
          { username: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
          { firstName: { [Op.like]: `%${search}%` } },
          { lastName: { [Op.like]: `%${search}%` } }
        ];
      }

      if (role) {
        where.role = role;
      }

      if (active !== undefined) {
        where.isActive = active === 'true';
      }

      options.where = where;

      const { count, rows: users } = await db.User.findAndCountAll(options);

      res.json({
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / parseInt(limit))
        }
      });

    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * Get user statistics
 * GET /api/users/stats
 */
router.get('/stats',
  authenticate,
  requireRole(['admin', 'editor']),
  async (req, res) => {
    try {
      const totalUsers = await db.User.count();
      const activeUsers = await db.User.count({ where: { isActive: true } });
      const adminCount = await db.User.count({ where: { role: 'admin' } });
      const editorCount = await db.User.count({ where: { role: 'editor' } });
      const authorCount = await db.User.count({ where: { role: 'author' } });

      // Get recent activity (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const recentLogins = await db.User.count({
        where: {
          lastLoginAt: {
            [require('sequelize').Op.gte]: thirtyDaysAgo
          }
        }
      });

      // Get most recent login
      const lastLogin = await db.User.findOne({
        where: { lastLoginAt: { [require('sequelize').Op.not]: null } },
        order: [['lastLoginAt', 'DESC']],
        attributes: ['lastLoginAt']
      });

      res.json({
        totalUsers,
        activeUsers,
        adminCount,
        editorCount,
        authorCount,
        recentLogins,
        lastLogin: lastLogin?.lastLoginAt || null
      });

    } catch (error) {
      console.error('Get user stats error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * Get recent user activity
 * GET /api/users/activity
 */
router.get('/activity',
  authenticate,
  requireRole(['admin', 'editor']),
  [query('limit').optional().isInt({ min: 1, max: 50 })],
  validate,
  async (req, res) => {
    try {
      const { limit = 20 } = req.query;

      // Get recent user activities (logins, registrations, etc.)
      const recentActivity = await db.User.findAll({
        limit: parseInt(limit),
        order: [['lastLoginAt', 'DESC']],
        attributes: ['id', 'username', 'email', 'role', 'lastLoginAt', 'createdAt', 'isActive'],
        where: {
          lastLoginAt: { [require('sequelize').Op.not]: null }
        }
      });

      res.json(recentActivity);

    } catch (error) {
      console.error('Get user activity error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * Create new user (Admin only)
 * POST /api/users
 */
router.post('/',
  authenticate,
  requireRole(['admin']),
  [
    body('email').isEmail().normalizeEmail(),
    body('username').isAlphanumeric().isLength({ min: 3, max: 30 }),
    body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
    body('firstName').optional().trim().isLength({ min: 1, max: 50 }),
    body('lastName').optional().trim().isLength({ min: 1, max: 50 }),
    body('role').optional().isIn(['admin', 'editor', 'author', 'viewer'])
  ],
  validate,
  async (req, res) => {
    try {
      const userData = {
        ...req.body,
        role: req.body.role || 'author'
      };

      const result = await authService.register(userData);
      
      res.status(201).json({
        message: 'User created successfully',
        user: result.user
      });

    } catch (error) {
      console.error('Create user error:', error);
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * Update user (Admin only)
 * PUT /api/users/:userId
 */
router.put('/:userId',
  authenticate,
  requireRole(['admin']),
  [
    body('firstName').optional().trim().isLength({ min: 1, max: 50 }),
    body('lastName').optional().trim().isLength({ min: 1, max: 50 }),
    body('role').optional().isIn(['admin', 'editor', 'author', 'viewer']),
    body('isActive').optional().isBoolean()
  ],
  validate,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const updates = req.body;

      // Don't allow self-deactivation or role change
      if (req.user.id === parseInt(userId)) {
        if ('isActive' in updates && !updates.isActive) {
          return res.status(400).json({ error: 'Cannot deactivate your own account' });
        }
        if ('role' in updates && updates.role !== req.user.role) {
          return res.status(400).json({ error: 'Cannot change your own role' });
        }
      }

      const user = await db.User.findByPk(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      await user.update(updates);
      
      res.json({
        message: 'User updated successfully',
        user: user.toJSON()
      });

    } catch (error) {
      console.error('Update user error:', error);
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * Delete user (Admin only)
 * DELETE /api/users/:userId
 */
router.delete('/:userId',
  authenticate,
  requireRole(['admin']),
  async (req, res) => {
    try {
      const { userId } = req.params;

      // Don't allow self-deletion
      if (req.user.id === parseInt(userId)) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
      }

      const user = await db.User.findByPk(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Soft delete by deactivating instead of hard delete
      await user.update({ isActive: false });
      
      res.json({ message: 'User deactivated successfully' });

    } catch (error) {
      console.error('Delete user error:', error);
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * Reset user password (Admin only)
 * POST /api/users/:userId/reset-password
 */
router.post('/:userId/reset-password',
  authenticate,
  requireRole(['admin']),
  [body('newPassword').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)],
  validate,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { newPassword } = req.body;

      const user = await db.User.findByPk(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      await authService.adminResetPassword(userId, newPassword);
      
      res.json({ message: 'Password reset successfully' });

    } catch (error) {
      console.error('Reset password error:', error);
      res.status(400).json({ error: error.message });
    }
  }
);

module.exports = router;