const { User, Blog, Project, MediaAsset, Comment, AuditLog } = require('../../models');
const { Op, fn, col, literal } = require('sequelize');

class AdminController {
  // Dashboard statistics
  async getDashboardStats(req, res) {
    try {
      // Content statistics
      const blogStats = await Blog.findAll({
        attributes: [
          'status',
          [fn('COUNT', col('id')), 'count']
        ],
        group: ['status']
      });

      const projectStats = await Project.findAll({
        attributes: [
          'status',
          [fn('COUNT', col('id')), 'count']
        ],
        group: ['status']
      });

      // Media statistics
      const mediaStats = await MediaAsset.findAll({
        attributes: [
          'category',
          [fn('COUNT', col('id')), 'count'],
          [fn('SUM', col('fileSize')), 'totalSize']
        ],
        group: ['category']
      });

      // Comment statistics
      const commentStats = await Comment.findAll({
        attributes: [
          'status',
          [fn('COUNT', col('id')), 'count']
        ],
        group: ['status']
      });

      // Recent activity
      const recentBlogs = await Blog.findAll({
        limit: 5,
        order: [['createdAt', 'DESC']],
        include: [
          { model: User, as: 'author', attributes: ['id', 'username'] }
        ]
      });

      const recentProjects = await Project.findAll({
        limit: 5,
        order: [['createdAt', 'DESC']],
        include: [
          { model: User, as: 'author', attributes: ['id', 'username'] }
        ]
      });

      const recentComments = await Comment.findAll({
        limit: 5,
        order: [['createdAt', 'DESC']],
        include: [
          { model: Blog, as: 'blog', attributes: ['id', 'title'] }
        ]
      });

      // User statistics
      const totalUsers = await User.count();
      const activeUsers = await User.count({
        where: {
          lastLoginAt: {
            [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        }
      });

      // Traffic and views
      const totalBlogViews = await Blog.sum('viewCount') || 0;
      const totalProjectViews = await Project.sum('viewCount') || 0;

      res.json({
        content: {
          blogs: blogStats.reduce((acc, stat) => {
            acc[stat.status] = parseInt(stat.dataValues.count);
            return acc;
          }, {}),
          projects: projectStats.reduce((acc, stat) => {
            acc[stat.status] = parseInt(stat.dataValues.count);
            return acc;
          }, {}),
          comments: commentStats.reduce((acc, stat) => {
            acc[stat.status] = parseInt(stat.dataValues.count);
            return acc;
          }, {})
        },
        media: mediaStats.reduce((acc, stat) => {
          acc[stat.category] = {
            count: parseInt(stat.dataValues.count),
            totalSize: parseInt(stat.dataValues.totalSize || 0)
          };
          return acc;
        }, {}),
        users: {
          total: totalUsers,
          active: activeUsers
        },
        traffic: {
          totalBlogViews,
          totalProjectViews,
          totalViews: totalBlogViews + totalProjectViews
        },
        recent: {
          blogs: recentBlogs,
          projects: recentProjects,
          comments: recentComments
        }
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
    }
  }

  // Content moderation
  async getPendingContent(req, res) {
    try {
      const pendingComments = await Comment.findAll({
        where: { status: 'pending' },
        include: [
          { model: Blog, as: 'blog', attributes: ['id', 'title'] }
        ],
        order: [['createdAt', 'ASC']]
      });

      const draftBlogs = await Blog.findAll({
        where: { status: 'draft' },
        include: [
          { model: User, as: 'author', attributes: ['id', 'username'] }
        ],
        order: [['updatedAt', 'DESC']]
      });

      const draftProjects = await Project.findAll({
        where: { status: 'draft' },
        include: [
          { model: User, as: 'author', attributes: ['id', 'username'] }
        ],
        order: [['updatedAt', 'DESC']]
      });

      res.json({
        pendingComments,
        draftBlogs,
        draftProjects
      });
    } catch (error) {
      console.error('Error fetching pending content:', error);
      res.status(500).json({ error: 'Failed to fetch pending content' });
    }
  }

  // Moderate comment
  async moderateComment(req, res) {
    try {
      const { id } = req.params;
      const { status, reason } = req.body;

      const comment = await Comment.findByPk(id);
      if (!comment) {
        return res.status(404).json({ error: 'Comment not found' });
      }

      await comment.update({ status });

      // Log moderation action
      await AuditLog.create({
        userId: req.user.id,
        action: 'comment_moderation',
        resource: 'Comment',
        resourceId: id,
        details: {
          oldStatus: comment.status,
          newStatus: status,
          reason
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({ message: 'Comment moderation updated', comment });
    } catch (error) {
      console.error('Error moderating comment:', error);
      res.status(500).json({ error: 'Failed to moderate comment' });
    }
  }

  // Bulk moderate comments
  async bulkModerateComments(req, res) {
    try {
      const { commentIds, status, reason } = req.body;

      if (!Array.isArray(commentIds) || commentIds.length === 0) {
        return res.status(400).json({ error: 'No comment IDs provided' });
      }

      await Comment.update(
        { status },
        { where: { id: { [Op.in]: commentIds } } }
      );

      // Log bulk moderation action
      await AuditLog.create({
        userId: req.user.id,
        action: 'bulk_comment_moderation',
        resource: 'Comment',
        details: {
          commentIds,
          newStatus: status,
          reason,
          count: commentIds.length
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({ message: `${commentIds.length} comments moderated successfully` });
    } catch (error) {
      console.error('Error bulk moderating comments:', error);
      res.status(500).json({ error: 'Failed to bulk moderate comments' });
    }
  }

  // User management
  async getAllUsers(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        role,
        status,
        sortBy = 'createdAt',
        sortOrder = 'DESC'
      } = req.query;

      const offset = (page - 1) * limit;
      const where = {};

      if (search) {
        where[Op.or] = [
          { username: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } },
          { firstName: { [Op.iLike]: `%${search}%` } },
          { lastName: { [Op.iLike]: `%${search}%` } }
        ];
      }

      if (status) {
        where.isActive = status === 'active';
      }

      const include = [
        {
          model: Role,
          as: 'roles',
          attributes: ['id', 'name', 'description']
        }
      ];

      if (role) {
        include[0].where = { name: role };
      }

      const { count, rows: users } = await User.findAndCountAll({
        where,
        include,
        limit: parseInt(limit),
        offset,
        order: [[sortBy, sortOrder]],
        attributes: { exclude: ['password', 'twoFactorSecret'] }
      });

      res.json({
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          hasNext: page * limit < count,
          hasPrev: page > 1
        }
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  }

  // Update user status
  async updateUserStatus(req, res) {
    try {
      const { id } = req.params;
      const { isActive, reason } = req.body;

      const user = await User.findByPk(id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Prevent deactivating self
      if (id === req.user.id && isActive === false) {
        return res.status(400).json({ error: 'Cannot deactivate your own account' });
      }

      await user.update({ isActive });

      // Log status change
      await AuditLog.create({
        userId: req.user.id,
        action: 'user_status_change',
        resource: 'User',
        resourceId: id,
        details: {
          oldStatus: user.isActive,
          newStatus: isActive,
          reason
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({ message: 'User status updated', user });
    } catch (error) {
      console.error('Error updating user status:', error);
      res.status(500).json({ error: 'Failed to update user status' });
    }
  }

  // Activity logs
  async getActivityLogs(req, res) {
    try {
      const {
        page = 1,
        limit = 50,
        action,
        resource,
        userId,
        startDate,
        endDate
      } = req.query;

      const offset = (page - 1) * limit;
      const where = {};

      if (action) {
        where.action = action;
      }

      if (resource) {
        where.resource = resource;
      }

      if (userId) {
        where.userId = userId;
      }

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          where.createdAt[Op.gte] = new Date(startDate);
        }
        if (endDate) {
          where.createdAt[Op.lte] = new Date(endDate);
        }
      }

      const { count, rows: logs } = await AuditLog.findAndCountAll({
        where,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'email']
          }
        ],
        limit: parseInt(limit),
        offset,
        order: [['createdAt', 'DESC']]
      });

      res.json({
        logs,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          hasNext: page * limit < count,
          hasPrev: page > 1
        }
      });
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      res.status(500).json({ error: 'Failed to fetch activity logs' });
    }
  }

  // System health check
  async getSystemHealth(req, res) {
    try {
      const checks = {
        database: false,
        storage: false,
        memory: false
      };

      // Database check
      try {
        await User.findOne({ limit: 1 });
        checks.database = true;
      } catch (error) {
        console.error('Database check failed:', error);
      }

      // Storage check (upload directory)
      try {
        const fs = require('fs').promises;
        const path = require('path');
        await fs.access(path.join(process.cwd(), 'uploads'));
        checks.storage = true;
      } catch (error) {
        console.error('Storage check failed:', error);
      }

      // Memory check
      const memUsage = process.memoryUsage();
      const totalMemMB = memUsage.heapTotal / 1024 / 1024;
      const usedMemMB = memUsage.heapUsed / 1024 / 1024;
      const memoryUsagePercent = (usedMemMB / totalMemMB) * 100;
      
      checks.memory = memoryUsagePercent < 90; // Alert if memory usage > 90%

      const overallHealth = Object.values(checks).every(check => check);

      res.json({
        status: overallHealth ? 'healthy' : 'unhealthy',
        checks,
        metrics: {
          memoryUsage: {
            total: Math.round(totalMemMB),
            used: Math.round(usedMemMB),
            percentage: Math.round(memoryUsagePercent)
          },
          uptime: Math.round(process.uptime()),
          nodeVersion: process.version
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error checking system health:', error);
      res.status(500).json({ error: 'Failed to check system health' });
    }
  }

  // Analytics overview
  async getAnalytics(req, res) {
    try {
      const { period = '30d' } = req.query;
      
      let startDate;
      switch (period) {
        case '7d':
          startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      }

      // Content creation trends
      const blogCreationTrend = await Blog.findAll({
        where: {
          createdAt: { [Op.gte]: startDate }
        },
        attributes: [
          [fn('DATE', col('createdAt')), 'date'],
          [fn('COUNT', col('id')), 'count']
        ],
        group: [fn('DATE', col('createdAt'))],
        order: [[fn('DATE', col('createdAt')), 'ASC']]
      });

      const projectCreationTrend = await Project.findAll({
        where: {
          createdAt: { [Op.gte]: startDate }
        },
        attributes: [
          [fn('DATE', col('createdAt')), 'date'],
          [fn('COUNT', col('id')), 'count']
        ],
        group: [fn('DATE', col('createdAt'))],
        order: [[fn('DATE', col('createdAt')), 'ASC']]
      });

      // Popular content
      const popularBlogs = await Blog.findAll({
        where: { status: 'published' },
        order: [['viewCount', 'DESC']],
        limit: 10,
        attributes: ['id', 'title', 'viewCount', 'publishedAt']
      });

      const popularProjects = await Project.findAll({
        where: { status: 'published' },
        order: [['viewCount', 'DESC']],
        limit: 10,
        attributes: ['id', 'title', 'viewCount', 'publishedAt']
      });

      res.json({
        trends: {
          blogs: blogCreationTrend,
          projects: projectCreationTrend
        },
        popular: {
          blogs: popularBlogs,
          projects: popularProjects
        },
        period
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      res.status(500).json({ error: 'Failed to fetch analytics' });
    }
  }
}

module.exports = new AdminController();