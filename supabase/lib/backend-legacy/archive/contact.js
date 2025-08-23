/**
 * Contact API Routes
 * Public contact form submission endpoints
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');

const { logger } = require('../../../utils/logger');
const { optionalAuth } = require('../../../middleware/auth');

const router = express.Router();

// Rate limiting for contact form (stricter)
const contactRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // 3 submissions per window per IP
  message: {
    error: 'Too many contact form submissions',
    code: 'CONTACT_RATE_LIMIT',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit by IP and email if provided
    const identifier = req.body?.email || req.ip;
    return `contact:${identifier}`;
  }
});

// Additional rate limiting by email
const emailRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 submissions per hour per email
  keyGenerator: (req) => `contact_email:${req.body?.email}`,
  skip: (req) => !req.body?.email
});

// Email transporter configuration
let emailTransporter = null;

const initializeEmailTransporter = () => {
  if (process.env.SMTP_HOST && process.env.SMTP_PORT) {
    emailTransporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USERNAME,
        pass: process.env.SMTP_PASSWORD
      },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production'
      }
    });
  } else {
    // Fallback to console logging in development
    logger.warn('Email configuration not found, using console logging');
  }
};

// Initialize email transporter
initializeEmailTransporter();

// Validation rules
const contactValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s\-'\.]+$/)
    .withMessage('Name can only contain letters, spaces, hyphens, apostrophes, and periods'),
  
  body('email')
    .isEmail()
    .normalizeEmail({
      gmail_lowercase: true,
      gmail_remove_dots: false
    })
    .withMessage('Please provide a valid email address')
    .isLength({ max: 255 })
    .withMessage('Email address is too long'),
  
  body('subject')
    .optional()
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Subject must be between 5 and 200 characters'),
  
  body('message')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Message must be between 10 and 2000 characters'),
  
  body('phone')
    .optional()
    .trim()
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Please provide a valid phone number'),
  
  body('company')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Company name is too long'),
  
  body('website')
    .optional()
    .trim()
    .isURL({
      protocols: ['http', 'https'],
      require_protocol: true
    })
    .withMessage('Please provide a valid website URL'),
  
  body('projectBudget')
    .optional()
    .isIn(['under-5k', '5k-15k', '15k-50k', '50k-100k', 'over-100k', 'not-specified'])
    .withMessage('Invalid project budget range'),
  
  body('projectTimeline')
    .optional()
    .isIn(['urgent', '1-month', '1-3-months', '3-6-months', '6-months-plus', 'flexible'])
    .withMessage('Invalid project timeline'),
  
  body('projectType')
    .optional()
    .isIn(['web-development', 'mobile-app', 'e-commerce', 'consulting', 'maintenance', 'other'])
    .withMessage('Invalid project type'),
  
  body('hearAboutUs')
    .optional()
    .isIn(['google', 'social-media', 'referral', 'portfolio', 'github', 'linkedin', 'other'])
    .withMessage('Invalid source'),
  
  body('newsletter')
    .optional()
    .isBoolean()
    .withMessage('Newsletter preference must be a boolean'),
  
  body('gdprConsent')
    .optional()
    .isBoolean()
    .withMessage('GDPR consent must be a boolean')
];

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

// Spam detection
const detectSpam = (data) => {
  const spamKeywords = [
    'viagra', 'cialis', 'pharmacy', 'casino', 'lottery', 'winner',
    'congratulations', 'inherit', 'million', 'billion', 'prince',
    'click here', 'free money', 'get rich', 'make money fast',
    'no investment', 'risk free', 'guaranteed', 'act now',
    'limited time', 'urgent', 'bitcoin', 'cryptocurrency'
  ];
  
  const content = `${data.message} ${data.subject || ''} ${data.name}`.toLowerCase();
  
  // Check for spam keywords
  const spamScore = spamKeywords.reduce((score, keyword) => {
    return score + (content.includes(keyword) ? 1 : 0);
  }, 0);
  
  // Check for excessive links
  const linkCount = (content.match(/https?:\/\/[^\s]+/g) || []).length;
  if (linkCount > 3) spamScore += 2;
  
  // Check for suspicious patterns
  const suspiciousPatterns = [
    /(.)\1{4,}/, // Repeated characters
    /[A-Z]{10,}/, // Excessive caps
    /\$\d+/, // Money mentions
    /@.*@/, // Multiple @ symbols
  ];
  
  suspiciousPatterns.forEach(pattern => {
    if (pattern.test(content)) spamScore += 1;
  });
  
  return {
    isSpam: spamScore >= 3,
    score: spamScore,
    reasons: spamScore >= 3 ? ['High spam score'] : []
  };
};

// Store contact submission
const storeContact = async (contactData) => {
  try {
    const dataDir = path.join(process.cwd(), '..', 'data', 'contacts');
    await fs.mkdir(dataDir, { recursive: true });
    
    const timestamp = Date.now();
    const filename = `${timestamp}-${contactData.email.replace('@', '-at-')}.json`;
    const filepath = path.join(dataDir, filename);
    
    const dataToStore = {
      ...contactData,
      id: `contact_${timestamp}`,
      timestamp: new Date().toISOString(),
      ip: contactData.ip,
      userAgent: contactData.userAgent,
      status: 'new'
    };
    
    await fs.writeFile(filepath, JSON.stringify(dataToStore, null, 2));
    
    return dataToStore.id;
  } catch (error) {
    logger.error('Failed to store contact data', { error: error.message });
    throw new Error('Failed to store contact submission');
  }
};

// Send email notification
const sendEmailNotification = async (contactData) => {
  if (!emailTransporter) {
    logger.info('Contact form submission (email disabled)', contactData);
    return;
  }
  
  const subject = contactData.subject || 'New Contact Form Submission';
  
  // Email to site owner
  const ownerEmail = {
    from: process.env.CONTACT_FROM_EMAIL || process.env.SMTP_USERNAME,
    to: process.env.CONTACT_TO_EMAIL || 'hello@brandoncurrie.com',
    subject: `[Portfolio Contact] ${subject}`,
    html: `
      <h2>New Contact Form Submission</h2>
      <p><strong>Name:</strong> ${contactData.name}</p>
      <p><strong>Email:</strong> ${contactData.email}</p>
      ${contactData.phone ? `<p><strong>Phone:</strong> ${contactData.phone}</p>` : ''}
      ${contactData.company ? `<p><strong>Company:</strong> ${contactData.company}</p>` : ''}
      ${contactData.website ? `<p><strong>Website:</strong> ${contactData.website}</p>` : ''}
      <p><strong>Subject:</strong> ${subject}</p>
      <p><strong>Message:</strong></p>
      <div style="background: #f5f5f5; padding: 15px; border-left: 4px solid #007cba;">
        ${contactData.message.replace(/\n/g, '<br>')}
      </div>
      ${contactData.projectType ? `<p><strong>Project Type:</strong> ${contactData.projectType}</p>` : ''}
      ${contactData.projectBudget ? `<p><strong>Budget:</strong> ${contactData.projectBudget}</p>` : ''}
      ${contactData.projectTimeline ? `<p><strong>Timeline:</strong> ${contactData.projectTimeline}</p>` : ''}
      ${contactData.hearAboutUs ? `<p><strong>How they heard about us:</strong> ${contactData.hearAboutUs}</p>` : ''}
      <hr>
      <p><small>Submitted at: ${new Date().toLocaleString()}</small></p>
      <p><small>IP: ${contactData.ip}</small></p>
    `
  };
  
  // Auto-reply to sender
  const autoReply = {
    from: process.env.CONTACT_FROM_EMAIL || process.env.SMTP_USERNAME,
    to: contactData.email,
    subject: 'Thank you for contacting Brandon Currie',
    html: `
      <h2>Thank you for your message!</h2>
      <p>Hi ${contactData.name},</p>
      <p>Thank you for reaching out through my portfolio website. I've received your message and will get back to you within 24-48 hours.</p>
      <p>Here's a copy of what you sent:</p>
      <div style="background: #f5f5f5; padding: 15px; border-left: 4px solid #007cba;">
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong></p>
        <p>${contactData.message.replace(/\n/g, '<br>')}</p>
      </div>
      <p>Best regards,<br>Brandon Currie</p>
      <hr>
      <p><small>This is an automated response. Please do not reply to this email.</small></p>
    `
  };
  
  try {
    await emailTransporter.sendMail(ownerEmail);
    await emailTransporter.sendMail(autoReply);
    logger.info('Contact form emails sent successfully');
  } catch (error) {
    logger.error('Failed to send contact form emails', { error: error.message });
    throw new Error('Failed to send email notifications');
  }
};

/**
 * @route POST /api/v1/contact
 * @desc Submit contact form
 * @access Public
 */
router.post('/',
  contactRateLimit,
  emailRateLimit,
  contactValidation,
  handleValidationErrors,
  optionalAuth,
  async (req, res) => {
    try {
      const {
        name,
        email,
        phone,
        company,
        website,
        subject,
        message,
        projectType,
        projectBudget,
        projectTimeline,
        hearAboutUs,
        newsletter = false,
        gdprConsent = false
      } = req.body;

      // Spam detection
      const spamCheck = detectSpam(req.body);
      if (spamCheck.isSpam) {
        logger.warn('Spam detected in contact form', {
          email,
          spamScore: spamCheck.score,
          reasons: spamCheck.reasons,
          ip: req.ip
        });
        
        return res.status(400).json({
          error: 'Message rejected by spam filter',
          code: 'SPAM_DETECTED'
        });
      }

      const contactData = {
        name,
        email,
        phone,
        company,
        website,
        subject: subject || `Contact from ${name}`,
        message,
        projectType,
        projectBudget,
        projectTimeline,
        hearAboutUs,
        newsletter,
        gdprConsent,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        referrer: req.get('Referer'),
        authenticatedUser: req.user?.id || null
      };

      // Store the contact submission
      const contactId = await storeContact(contactData);

      // Send email notifications (async, don't wait for completion)
      sendEmailNotification(contactData).catch(error => {
        logger.error('Email notification failed', { contactId, error: error.message });
      });

      // Log successful submission
      logger.info('Contact form submission received', {
        contactId,
        name,
        email,
        company,
        projectType,
        ip: req.ip
      });

      res.status(201).json({
        success: true,
        message: 'Thank you for your message! I\'ll get back to you within 24-48 hours.',
        contactId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Contact form submission failed', {
        error: error.message,
        stack: error.stack,
        body: { ...req.body, message: req.body.message?.substring(0, 100) + '...' }
      });

      res.status(500).json({
        error: 'Failed to process contact form submission',
        code: 'CONTACT_SUBMISSION_ERROR'
      });
    }
  }
);

/**
 * @route GET /api/v1/contact/options
 * @desc Get contact form options and metadata
 * @access Public
 */
router.get('/options', (req, res) => {
  res.json({
    projectTypes: [
      { value: 'web-development', label: 'Web Development' },
      { value: 'mobile-app', label: 'Mobile App Development' },
      { value: 'e-commerce', label: 'E-commerce Solution' },
      { value: 'consulting', label: 'Technical Consulting' },
      { value: 'maintenance', label: 'Website Maintenance' },
      { value: 'other', label: 'Other' }
    ],
    budgetRanges: [
      { value: 'under-5k', label: 'Under $5,000' },
      { value: '5k-15k', label: '$5,000 - $15,000' },
      { value: '15k-50k', label: '$15,000 - $50,000' },
      { value: '50k-100k', label: '$50,000 - $100,000' },
      { value: 'over-100k', label: 'Over $100,000' },
      { value: 'not-specified', label: 'Prefer not to specify' }
    ],
    timelines: [
      { value: 'urgent', label: 'ASAP (Rush job)' },
      { value: '1-month', label: 'Within 1 month' },
      { value: '1-3-months', label: '1-3 months' },
      { value: '3-6-months', label: '3-6 months' },
      { value: '6-months-plus', label: '6+ months' },
      { value: 'flexible', label: 'Flexible timeline' }
    ],
    sources: [
      { value: 'google', label: 'Google Search' },
      { value: 'social-media', label: 'Social Media' },
      { value: 'referral', label: 'Referral from someone' },
      { value: 'portfolio', label: 'Browsing portfolios' },
      { value: 'github', label: 'GitHub' },
      { value: 'linkedin', label: 'LinkedIn' },
      { value: 'other', label: 'Other' }
    ],
    validation: {
      name: { minLength: 2, maxLength: 100, required: true },
      email: { maxLength: 255, required: true },
      subject: { minLength: 5, maxLength: 200, required: false },
      message: { minLength: 10, maxLength: 2000, required: true },
      phone: { required: false },
      company: { maxLength: 100, required: false },
      website: { required: false }
    },
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxSubmissions: 3,
      message: 'Maximum 3 submissions per 15 minutes'
    }
  });
});

/**
 * @route POST /api/v1/contact/validate
 * @desc Validate contact form data without submitting
 * @access Public
 */
router.post('/validate',
  contactValidation,
  (req, res) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      return res.status(400).json({
        valid: false,
        errors: errors.array()
      });
    }
    
    // Check for spam without blocking
    const spamCheck = detectSpam(req.body);
    
    res.json({
      valid: true,
      spamRisk: spamCheck.score > 0 ? 'detected' : 'none',
      message: 'Form data is valid'
    });
  }
);

module.exports = router;