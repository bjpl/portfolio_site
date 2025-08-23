const { Comment, Blog, User } = require('../../models');
const { Op } = require('sequelize');

class CommentController {
  // Get comments for a blog
  async getBlogComments(req, res) {
    try {
      const { blogId } = req.params;
      const { page = 1, limit = 20, status = 'approved' } = req.query;

      const offset = (page - 1) * limit;

      // Verify blog exists
      const blog = await Blog.findByPk(blogId);
      if (!blog) {
        return res.status(404).json({ error: 'Blog not found' });
      }

      const { count, rows: comments } = await Comment.findAndCountAll({
        where: { 
          blogId,
          status,
          parentId: null // Only root comments, replies are loaded separately
        },
        include: [
          {
            model: Comment,
            as: 'replies',
            where: { status },
            required: false,
            separate: true,
            order: [['createdAt', 'ASC']]
          }
        ],
        limit: parseInt(limit),
        offset,
        order: [['createdAt', 'DESC']]
      });

      res.json({
        comments,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          hasNext: page * limit < count,
          hasPrev: page > 1
        }
      });
    } catch (error) {
      console.error('Error fetching comments:', error);
      res.status(500).json({ error: 'Failed to fetch comments' });
    }
  }

  // Create new comment
  async createComment(req, res) {
    try {
      const {
        content,
        authorName,
        authorEmail,
        authorWebsite,
        blogId,
        parentId
      } = req.body;

      // Verify blog exists
      const blog = await Blog.findByPk(blogId);
      if (!blog) {
        return res.status(404).json({ error: 'Blog not found' });
      }

      // Check if comments are enabled for this blog
      if (!blog.commentsEnabled) {
        return res.status(403).json({ error: 'Comments are disabled for this blog' });
      }

      // If replying to a comment, verify parent exists
      if (parentId) {
        const parentComment = await Comment.findByPk(parentId);
        if (!parentComment || parentComment.blogId !== blogId) {
          return res.status(404).json({ error: 'Parent comment not found' });
        }
      }

      // Basic spam detection
      const spamKeywords = ['viagra', 'cialis', 'casino', 'lottery', 'winner'];
      const containsSpam = spamKeywords.some(keyword => 
        content.toLowerCase().includes(keyword) || 
        authorName.toLowerCase().includes(keyword)
      );

      const comment = await Comment.create({
        content,
        authorName,
        authorEmail,
        authorWebsite,
        blogId,
        parentId,
        status: containsSpam ? 'spam' : 'pending',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      // If auto-approved, include in response with replies structure
      if (comment.status === 'approved') {
        const commentWithReplies = await Comment.findByPk(comment.id, {
          include: [
            {
              model: Comment,
              as: 'replies',
              where: { status: 'approved' },
              required: false,
              order: [['createdAt', 'ASC']]
            }
          ]
        });
        
        res.status(201).json(commentWithReplies);
      } else {
        res.status(201).json({
          message: 'Comment submitted and is awaiting moderation',
          status: comment.status
        });
      }
    } catch (error) {
      console.error('Error creating comment:', error);
      res.status(500).json({ error: 'Failed to create comment' });
    }
  }

  // Get single comment
  async getComment(req, res) {
    try {
      const { id } = req.params;

      const comment = await Comment.findByPk(id, {
        include: [
          {
            model: Blog,
            as: 'blog',
            attributes: ['id', 'title', 'slug']
          },
          {
            model: Comment,
            as: 'parent',
            attributes: ['id', 'authorName', 'content']
          },
          {
            model: Comment,
            as: 'replies',
            order: [['createdAt', 'ASC']]
          }
        ]
      });

      if (!comment) {
        return res.status(404).json({ error: 'Comment not found' });
      }

      res.json(comment);
    } catch (error) {
      console.error('Error fetching comment:', error);
      res.status(500).json({ error: 'Failed to fetch comment' });
    }
  }

  // Update comment (admin only)
  async updateComment(req, res) {
    try {
      const { id } = req.params;
      const { content, status } = req.body;

      const comment = await Comment.findByPk(id);
      if (!comment) {
        return res.status(404).json({ error: 'Comment not found' });
      }

      // Only admins can update comments
      if (!req.user.roles.some(role => role.name === 'admin')) {
        return res.status(403).json({ error: 'Not authorized to update comments' });
      }

      await comment.update({ content, status });
      res.json(comment);
    } catch (error) {
      console.error('Error updating comment:', error);
      res.status(500).json({ error: 'Failed to update comment' });
    }
  }

  // Delete comment
  async deleteComment(req, res) {
    try {
      const { id } = req.params;

      const comment = await Comment.findByPk(id);
      if (!comment) {
        return res.status(404).json({ error: 'Comment not found' });
      }

      // Only admins can delete comments
      if (!req.user.roles.some(role => role.name === 'admin')) {
        return res.status(403).json({ error: 'Not authorized to delete comments' });
      }

      // Delete replies first
      await Comment.destroy({
        where: { parentId: id }
      });

      await comment.destroy();
      res.json({ message: 'Comment deleted successfully' });
    } catch (error) {
      console.error('Error deleting comment:', error);
      res.status(500).json({ error: 'Failed to delete comment' });
    }
  }

  // Get all comments with filtering (admin only)
  async getAllComments(req, res) {
    try {
      const {
        page = 1,
        limit = 50,
        status,
        blogId,
        search,
        sortBy = 'createdAt',
        sortOrder = 'DESC'
      } = req.query;

      // Only admins can view all comments
      if (!req.user.roles.some(role => role.name === 'admin')) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      const offset = (page - 1) * limit;
      const where = {};

      if (status) {
        where.status = status;
      }

      if (blogId) {
        where.blogId = blogId;
      }

      if (search) {
        where[Op.or] = [
          { content: { [Op.iLike]: `%${search}%` } },
          { authorName: { [Op.iLike]: `%${search}%` } },
          { authorEmail: { [Op.iLike]: `%${search}%` } }
        ];
      }

      const { count, rows: comments } = await Comment.findAndCountAll({
        where,
        include: [
          {
            model: Blog,
            as: 'blog',
            attributes: ['id', 'title', 'slug']
          }
        ],
        limit: parseInt(limit),
        offset,
        order: [[sortBy, sortOrder]]
      });

      res.json({
        comments,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          hasNext: page * limit < count,
          hasPrev: page > 1
        }
      });
    } catch (error) {
      console.error('Error fetching all comments:', error);
      res.status(500).json({ error: 'Failed to fetch comments' });
    }
  }

  // Approve comment
  async approveComment(req, res) {
    try {
      const { id } = req.params;

      // Only admins can approve comments
      if (!req.user.roles.some(role => role.name === 'admin')) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      const comment = await Comment.findByPk(id);
      if (!comment) {
        return res.status(404).json({ error: 'Comment not found' });
      }

      await comment.update({ status: 'approved' });
      res.json({ message: 'Comment approved', comment });
    } catch (error) {
      console.error('Error approving comment:', error);
      res.status(500).json({ error: 'Failed to approve comment' });
    }
  }

  // Mark comment as spam
  async markAsSpam(req, res) {
    try {
      const { id } = req.params;

      // Only admins can mark as spam
      if (!req.user.roles.some(role => role.name === 'admin')) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      const comment = await Comment.findByPk(id);
      if (!comment) {
        return res.status(404).json({ error: 'Comment not found' });
      }

      await comment.update({ status: 'spam' });
      res.json({ message: 'Comment marked as spam', comment });
    } catch (error) {
      console.error('Error marking comment as spam:', error);
      res.status(500).json({ error: 'Failed to mark comment as spam' });
    }
  }

  // Get comment statistics
  async getCommentStats(req, res) {
    try {
      // Only admins can view stats
      if (!req.user.roles.some(role => role.name === 'admin')) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      const stats = await Comment.findAll({
        attributes: [
          'status',
          [fn('COUNT', col('id')), 'count']
        ],
        group: ['status']
      });

      const totalComments = await Comment.count();
      
      // Comments by blog
      const commentsByBlog = await Comment.findAll({
        attributes: [
          'blogId',
          [fn('COUNT', col('id')), 'count']
        ],
        include: [
          {
            model: Blog,
            as: 'blog',
            attributes: ['title']
          }
        ],
        group: ['blogId', 'blog.id', 'blog.title'],
        order: [[fn('COUNT', col('Comment.id')), 'DESC']],
        limit: 10
      });

      const formattedStats = stats.reduce((acc, stat) => {
        acc[stat.status] = parseInt(stat.dataValues.count);
        return acc;
      }, {});

      res.json({
        statusCounts: formattedStats,
        totalComments,
        commentsByBlog: commentsByBlog.map(item => ({
          blogId: item.blogId,
          blogTitle: item.blog.title,
          commentCount: parseInt(item.dataValues.count)
        }))
      });
    } catch (error) {
      console.error('Error fetching comment stats:', error);
      res.status(500).json({ error: 'Failed to fetch comment statistics' });
    }
  }
}

module.exports = new CommentController();