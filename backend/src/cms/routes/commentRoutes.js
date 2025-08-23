const express = require('express');
const CommentController = require('../controllers/CommentController');
const { authenticateToken, requireRole } = require('../../middleware/auth');
const { validateComment } = require('../middleware/validation');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate limiting for comments
const commentCreateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 comments per 15 minutes
  message: { error: 'Too many comments. Please try again later.' }
});

// Public routes
router.get('/blog/:blogId', CommentController.getBlogComments);
router.post('/', 
  commentCreateLimit,
  validateComment,
  CommentController.createComment
);

// Protected routes
router.get('/', 
  authenticateToken, 
  requireRole('admin'), 
  CommentController.getAllComments
);

router.get('/stats', 
  authenticateToken, 
  requireRole('admin'), 
  CommentController.getCommentStats
);

router.get('/:id', 
  authenticateToken, 
  CommentController.getComment
);

router.put('/:id', 
  authenticateToken, 
  requireRole('admin'), 
  CommentController.updateComment
);

router.delete('/:id', 
  authenticateToken, 
  requireRole('admin'), 
  CommentController.deleteComment
);

router.post('/:id/approve', 
  authenticateToken, 
  requireRole('admin'), 
  CommentController.approveComment
);

router.post('/:id/spam', 
  authenticateToken, 
  requireRole('admin'), 
  CommentController.markAsSpam
);

module.exports = router;