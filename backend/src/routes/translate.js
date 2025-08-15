const express = require('express');
const { body } = require('express-validator');

const router = express.Router();
const NodeCache = require('node-cache');

const { Translator } = require('../../../tools/translator/translator');
const { optionalAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const logger = require('../utils/logger');

const crypto = require('crypto');

// Create cache for translations (24 hour TTL)
const translationCache = new NodeCache({
  stdTTL: 86400,
  checkperiod: 3600,
  maxKeys: 10000,
});

// Initialize translator (API key from environment)
let translator = null;
const initTranslator = () => {
  if (!translator && process.env.ANTHROPIC_API_KEY) {
    try {
      translator = new Translator(process.env.ANTHROPIC_API_KEY);
      logger.info('Claude translator initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Claude translator:', error);
    }
  }
  return translator;
};

// Validation rules
const translateValidation = [
  body('text')
    .notEmpty().withMessage('Text is required')
    .isString().withMessage('Text must be a string')
    .isLength({ max: 10000 }).withMessage('Text must be less than 10000 characters'),
  body('targetLang')
    .notEmpty().withMessage('Target language is required')
    .isIn(['es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko', 'ar', 'he', 'hi', 'nl', 'sv'])
    .withMessage('Invalid target language'),
  body('sourceLang')
    .optional()
    .isIn(['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko', 'ar', 'he', 'hi', 'nl', 'sv'])
    .withMessage('Invalid source language')
];

const batchTranslateValidation = [
  body('texts')
    .isArray().withMessage('Texts must be an array')
    .custom(value => {
      if (!value || value.length === 0) {
        throw new Error('At least one text is required');
      }
      if (value.length > 100) {
        throw new Error('Maximum 100 texts per batch');
      }
      if (value.some(text => typeof text !== 'string')) {
        throw new Error('All texts must be strings');
      }
      if (value.some(text => text.length > 5000)) {
        throw new Error('Each text must be less than 5000 characters');
      }
      return true;
    }),
  body('targetLang')
    .notEmpty().withMessage('Target language is required')
    .isIn(['es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko', 'ar', 'he', 'hi', 'nl', 'sv'])
    .withMessage('Invalid target language'),
  body('sourceLang')
    .optional()
    .isIn(['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko', 'ar', 'he', 'hi', 'nl', 'sv'])
    .withMessage('Invalid source language')
];

/**
 * GET /api/translate/status
 * Check if translation service is available
 */
router.get('/status', (req, res) => {
  const isAvailable = !!process.env.ANTHROPIC_API_KEY;
  const supportedLanguages = ['es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko', 'ar', 'he', 'hi', 'nl', 'sv'];

  res.json({
    available: isAvailable,
    supportedLanguages,
    cacheStats: translationCache.getStats(),
    message: isAvailable ? 'Translation service is available' : 'Translation service is not configured',
  });
});

/**
 * POST /api/translate
 * Translate a single text
 */
router.post('/', optionalAuth, validate(translateValidation), async (req, res) => {
  try {
    const { text, targetLang, sourceLang = 'en' } = req.body;

    // Skip if same language
    if (targetLang === sourceLang || targetLang === 'en') {
      return res.json({ translatedText: text });
    }

    // Check cache
    const cacheKey = crypto.createHash('md5').update(`${sourceLang}:${targetLang}:${text}`).digest('hex');

    const cached = translationCache.get(cacheKey);
    if (cached) {
      logger.debug(`Translation cache hit for ${sourceLang} -> ${targetLang}`);
      return res.json({ translatedText: cached, cached: true });
    }

    // Initialize translator if needed
    const trans = initTranslator();
    if (!trans) {
      return res.status(503).json({
        error: 'Translation service unavailable',
        message: 'Claude API key not configured',
      });
    }

    // Perform translation
    logger.info(`Translating text from ${sourceLang} to ${targetLang}`);
    const translatedText = await trans.translateText(text, targetLang);

    // Cache the result
    translationCache.set(cacheKey, translatedText);

    // Track usage for authenticated users
    if (req.user) {
      logger.info(`User ${req.user.id} translated text to ${targetLang}`);
    }

    res.json({
      translatedText,
      targetLang,
      sourceLang,
      cached: false,
    });
  } catch (error) {
    logger.error('Translation error:', error);
    res.status(500).json({
      error: 'Translation failed',
      message: error.message,
    });
  }
});

/**
 * POST /api/translate/batch
 * Translate multiple texts in batch
 */
router.post('/batch', optionalAuth, validate(batchTranslateValidation), async (req, res) => {
  try {
    const { texts, targetLang, sourceLang = 'en' } = req.body;

    // Skip if same language
    if (targetLang === sourceLang || targetLang === 'en') {
      return res.json({ translations: texts });
    }

    // Initialize translator if needed
    const trans = initTranslator();
    if (!trans) {
      return res.status(503).json({
        error: 'Translation service unavailable',
        message: 'Claude API key not configured',
      });
    }

    logger.info(`Batch translating ${texts.length} texts from ${sourceLang} to ${targetLang}`);

    // Process translations with cache check
    const translations = await Promise.all(
      texts.map(async text => {
        // Check cache first
        const cacheKey = crypto.createHash('md5').update(`${sourceLang}:${targetLang}:${text}`).digest('hex');

        const cached = translationCache.get(cacheKey);
        if (cached) {
          return cached;
        }

        try {
          // Translate using Claude
          const translated = await trans.translateText(text, targetLang);

          // Cache the result
          translationCache.set(cacheKey, translated);

          return translated;
        } catch (error) {
          logger.error(`Failed to translate text: ${error.message}`);
          return text; // Return original on error
        }
      })
    );

    // Track usage for authenticated users
    if (req.user) {
      logger.info(`User ${req.user.id} batch translated ${texts.length} texts to ${targetLang}`);
    }

    res.json({
      translations,
      targetLang,
      sourceLang,
      count: texts.length,
    });
  } catch (error) {
    logger.error('Batch translation error:', error);
    res.status(500).json({
      error: 'Batch translation failed',
      message: error.message,
    });
  }
});

/**
 * POST /api/translate/content
 * Translate markdown content (preserves formatting)
 */
router.post('/content', optionalAuth, async (req, res) => {
  try {
    const { content, targetLang, sourceLang = 'en' } = req.body;

    if (!content || !targetLang) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Content and targetLang are required',
      });
    }

    // Skip if same language
    if (targetLang === sourceLang || targetLang === 'en') {
      return res.json({ translatedContent: content });
    }

    // Initialize translator if needed
    const trans = initTranslator();
    if (!trans) {
      return res.status(503).json({
        error: 'Translation service unavailable',
        message: 'Claude API key not configured',
      });
    }

    logger.info(`Translating markdown content from ${sourceLang} to ${targetLang}`);

    // Use the translator's content method which preserves markdown
    const translatedContent = await trans.translateContent(content, targetLang);

    res.json({
      translatedContent,
      targetLang,
      sourceLang,
    });
  } catch (error) {
    logger.error('Content translation error:', error);
    res.status(500).json({
      error: 'Content translation failed',
      message: error.message,
    });
  }
});

/**
 * DELETE /api/translate/cache
 * Clear translation cache (admin only)
 */
router.delete('/cache', optionalAuth, (req, res) => {
  // Check if user is admin
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Admin access required',
    });
  }

  const stats = translationCache.getStats();
  translationCache.flushAll();

  logger.info(`Translation cache cleared by user ${req.user.id}`);

  res.json({
    message: 'Translation cache cleared',
    previousStats: stats,
  });
});

/**
 * GET /api/translate/languages
 * Get supported languages
 */
router.get('/languages', (req, res) => {
  const languages = [
    { code: 'en', name: 'English', native: 'English', dir: 'ltr' },
    { code: 'es', name: 'Spanish', native: 'Español', dir: 'ltr' },
    { code: 'fr', name: 'French', native: 'Français', dir: 'ltr' },
    { code: 'de', name: 'German', native: 'Deutsch', dir: 'ltr' },
    { code: 'it', name: 'Italian', native: 'Italiano', dir: 'ltr' },
    { code: 'pt', name: 'Portuguese', native: 'Português', dir: 'ltr' },
    { code: 'ru', name: 'Russian', native: 'Русский', dir: 'ltr' },
    { code: 'zh', name: 'Chinese', native: '中文', dir: 'ltr' },
    { code: 'ja', name: 'Japanese', native: '日本語', dir: 'ltr' },
    { code: 'ko', name: 'Korean', native: '한국어', dir: 'ltr' },
    { code: 'ar', name: 'Arabic', native: 'العربية', dir: 'rtl' },
    { code: 'he', name: 'Hebrew', native: 'עברית', dir: 'rtl' },
    { code: 'hi', name: 'Hindi', native: 'हिन्दी', dir: 'ltr' },
    { code: 'nl', name: 'Dutch', native: 'Nederlands', dir: 'ltr' },
    { code: 'sv', name: 'Swedish', native: 'Svenska', dir: 'ltr' },
  ];

  res.json({
    languages,
    default: 'en',
    translationAvailable: !!process.env.ANTHROPIC_API_KEY,
  });
});

module.exports = router;
