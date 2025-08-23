const { body, validationResult } = require('express-validator');

// Helper function to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// Blog validation
const validateBlog = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Title must be between 1 and 500 characters'),
  
  body('markdown')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Content is required'),
  
  body('excerpt')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Excerpt must be less than 500 characters'),
  
  body('status')
    .optional()
    .isIn(['draft', 'published', 'scheduled', 'archived'])
    .withMessage('Invalid status'),
  
  body('metaTitle')
    .optional()
    .trim()
    .isLength({ max: 70 })
    .withMessage('Meta title must be less than 70 characters'),
  
  body('metaDescription')
    .optional()
    .trim()
    .isLength({ max: 160 })
    .withMessage('Meta description must be less than 160 characters'),
  
  body('metaKeywords')
    .optional()
    .isArray()
    .withMessage('Meta keywords must be an array'),
  
  body('language')
    .optional()
    .isIn(['en', 'es'])
    .withMessage('Language must be either en or es'),
  
  body('categoryIds')
    .optional()
    .isArray()
    .withMessage('Category IDs must be an array'),
  
  body('tagIds')
    .optional()
    .isArray()
    .withMessage('Tag IDs must be an array'),
  
  handleValidationErrors
];

const validateBlogUpdate = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Title must be between 1 and 500 characters'),
  
  body('markdown')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Content cannot be empty'),
  
  body('excerpt')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Excerpt must be less than 500 characters'),
  
  body('status')
    .optional()
    .isIn(['draft', 'published', 'scheduled', 'archived'])
    .withMessage('Invalid status'),
  
  body('metaTitle')
    .optional()
    .trim()
    .isLength({ max: 70 })
    .withMessage('Meta title must be less than 70 characters'),
  
  body('metaDescription')
    .optional()
    .trim()
    .isLength({ max: 160 })
    .withMessage('Meta description must be less than 160 characters'),
  
  body('metaKeywords')
    .optional()
    .isArray()
    .withMessage('Meta keywords must be an array'),
  
  handleValidationErrors
];

// Project validation
const validateProject = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  
  body('shortDescription')
    .trim()
    .isLength({ min: 1, max: 300 })
    .withMessage('Short description must be between 1 and 300 characters'),
  
  body('description')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Description is required'),
  
  body('category')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Category is required'),
  
  body('status')
    .optional()
    .isIn(['draft', 'published', 'archived'])
    .withMessage('Invalid status'),
  
  body('projectUrl')
    .optional()
    .isURL()
    .withMessage('Project URL must be valid'),
  
  body('githubUrl')
    .optional()
    .isURL()
    .withMessage('GitHub URL must be valid'),
  
  body('demoUrl')
    .optional()
    .isURL()
    .withMessage('Demo URL must be valid'),
  
  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date'),
  
  body('teamSize')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Team size must be a positive integer'),
  
  handleValidationErrors
];

const validateProjectUpdate = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  
  body('shortDescription')
    .optional()
    .trim()
    .isLength({ min: 1, max: 300 })
    .withMessage('Short description must be between 1 and 300 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Description cannot be empty'),
  
  body('category')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Category cannot be empty'),
  
  body('status')
    .optional()
    .isIn(['draft', 'published', 'archived'])
    .withMessage('Invalid status'),
  
  body('projectUrl')
    .optional()
    .custom((value) => {
      if (value === '') return true; // Allow empty string
      return /^https?:\/\/.+/.test(value);
    })
    .withMessage('Project URL must be valid'),
  
  body('githubUrl')
    .optional()
    .custom((value) => {
      if (value === '') return true; // Allow empty string
      return /^https?:\/\/.+/.test(value);
    })
    .withMessage('GitHub URL must be valid'),
  
  body('demoUrl')
    .optional()
    .custom((value) => {
      if (value === '') return true; // Allow empty string
      return /^https?:\/\/.+/.test(value);
    })
    .withMessage('Demo URL must be valid'),
  
  handleValidationErrors
];

// Comment validation
const validateComment = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Comment must be between 1 and 2000 characters'),
  
  body('authorName')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Author name must be between 1 and 100 characters'),
  
  body('authorEmail')
    .trim()
    .isEmail()
    .withMessage('Valid email is required'),
  
  body('authorWebsite')
    .optional()
    .custom((value) => {
      if (value === '') return true; // Allow empty string
      return /^https?:\/\/.+/.test(value);
    })
    .withMessage('Website must be a valid URL'),
  
  body('blogId')
    .isUUID()
    .withMessage('Valid blog ID is required'),
  
  body('parentId')
    .optional()
    .isUUID()
    .withMessage('Parent ID must be a valid UUID'),
  
  handleValidationErrors
];

module.exports = {
  validateBlog,
  validateBlogUpdate,
  validateProject,
  validateProjectUpdate,
  validateComment
};