const express = require('express');

const router = express.Router();
const fs = require('fs').promises;
const { exec } = require('child_process');
const path = require('path');
const util = require('util');

const { body, param, query } = require('express-validator');
const matter = require('gray-matter');

const execPromise = util.promisify(exec);
const { authenticate, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { Post } = require('../models/Portfolio');
const cache = require('../services/cache');
const logger = require('../utils/logger');

// Get all drafts for review (requires editor role)
router.get('/drafts', authenticate, requireRole('admin', 'editor'), async (req, res) => {
  const projectRoot = path.join(__dirname, '../../../..');
  const contentPath = path.join(projectRoot, 'content');

  try {
    const drafts = [];
    const categories = ['learn', 'make', 'meet', 'think'];

    for (const category of categories) {
      const categoryPath = path.join(contentPath, category);
      const files = await walkDir(categoryPath);

      for (const file of files) {
        if (file.endsWith('.md')) {
          const content = await fs.readFile(file, 'utf8');
          const parsed = matter(content);

          if (parsed.data.draft === true) {
            const relativePath = path.relative(contentPath, file);
            const stats = await fs.stat(file);

            drafts.push({
              path: relativePath,
              title: parsed.data.title || path.basename(file, '.md'),
              category,
              description: parsed.data.description || parsed.data.excerpt || '',
              author: parsed.data.author || 'Unknown',
              tags: parsed.data.tags || [],
              modified: stats.mtime,
              created: parsed.data.date || stats.birthtime,
              size: stats.size,
              wordCount: parsed.content.split(/\s+/).filter(w => w).length,
              readingTime: Math.ceil(parsed.content.split(/\s+/).filter(w => w).length / 200),
            });
          }
        }
      }
    }

    // Sort by modified date (newest first)
    drafts.sort((a, b) => new Date(b.modified) - new Date(a.modified));

    logger.info('Drafts retrieved for review', {
      userId: req.user.id,
      count: drafts.length,
    });

    res.json({
      drafts,
      total: drafts.length,
      categories: [...new Set(drafts.map(d => d.category))],
    });
  } catch (error) {
    logger.error('Error retrieving drafts', error);
    res.status(500).json({ error: 'Failed to retrieve drafts' });
  }
});

// Run accessibility test (requires authentication)
router.post(
  '/accessibility',
  authenticate,
  [
    body('url').isURL().withMessage('Valid URL required'),
    body('standard').optional().isIn(['WCAG2A', 'WCAG2AA', 'WCAG2AAA']).withMessage('Invalid standard'),
  ],
  validate,
  async (req, res) => {
    const { url, standard = 'WCAG2AA' } = req.body;
    const projectRoot = path.join(__dirname, '../../../..');

    try {
      // Check cache first
      const cacheKey = `accessibility:${url}:${standard}`;
      const cached = await cache.get(cacheKey);
      if (cached) {
        return res.json({ success: true, results: cached, fromCache: true });
      }

      const { stdout } = await execPromise(`npx pa11y ${url} --standard ${standard} --reporter json`, {
        cwd: projectRoot,
        timeout: 30000,
      });

      const results = JSON.parse(stdout);

      // Cache results for 1 hour
      await cache.set(cacheKey, results, 3600);

      logger.info('Accessibility test completed', {
        userId: req.user.id,
        url,
        issueCount: results.length,
      });

      res.json({
        success: true,
        results,
        summary: {
          total: results.length,
          errors: results.filter(r => r.type === 'error').length,
          warnings: results.filter(r => r.type === 'warning').length,
          notices: results.filter(r => r.type === 'notice').length,
        },
      });
    } catch (error) {
      logger.error('Accessibility test failed', { url, error });
      res.status(500).json({ error: 'Accessibility test failed' });
    }
  }
);

// Get content for review (requires authentication)
router.get('/content/:path(*)', authenticate, async (req, res) => {
  const projectRoot = path.join(__dirname, '../../../..');
  const contentPath = path.join(projectRoot, 'content', req.params.path);

  try {
    // Security check: ensure path doesn't escape content directory
    const normalizedPath = path.normalize(contentPath);
    const contentRoot = path.join(projectRoot, 'content');
    if (!normalizedPath.startsWith(contentRoot)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const content = await fs.readFile(contentPath, 'utf8');
    const stats = await fs.stat(contentPath);
    const parsed = matter(content);

    // Extract category from path
    const pathParts = req.params.path.split('/');
    const category = pathParts[0];

    res.json({
      content: parsed.content,
      frontMatter: parsed.data,
      path: req.params.path,
      category,
      modified: stats.mtime,
      created: parsed.data.date || stats.birthtime,
      size: stats.size,
      wordCount: parsed.content.split(/\s+/).filter(w => w).length,
      readingTime: Math.ceil(parsed.content.split(/\s+/).filter(w => w).length / 200),
    });
  } catch (error) {
    logger.error('Error retrieving content', { path: req.params.path, error });
    if (error.code === 'ENOENT') {
      res.status(404).json({ error: 'Content not found' });
    } else {
      res.status(500).json({ error: 'Failed to retrieve content' });
    }
  }
});

// Update content status (requires editor role)
router.post(
  '/publish/:path(*)',
  authenticate,
  requireRole('admin', 'editor'),
  [body('message').optional().isString().withMessage('Message must be a string')],
  validate,
  async (req, res) => {
    const projectRoot = path.join(__dirname, '../../../..');
    const contentPath = path.join(projectRoot, 'content', req.params.path);
    const { message } = req.body;

    try {
      // Security check
      const normalizedPath = path.normalize(contentPath);
      const contentRoot = path.join(projectRoot, 'content');
      if (!normalizedPath.startsWith(contentRoot)) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const content = await fs.readFile(contentPath, 'utf8');
      const parsed = matter(content);

      // Update front matter
      parsed.data.draft = false;
      parsed.data.lastmod = new Date().toISOString();
      parsed.data.publishedBy = req.user.username;
      parsed.data.publishedAt = new Date().toISOString();

      if (message) {
        parsed.data.publishNote = message;
      }

      // Rebuild content with updated front matter
      const updatedContent = matter.stringify(parsed.content, parsed.data);
      await fs.writeFile(contentPath, updatedContent);

      // Log the action
      logger.audit('content_published', req.user.id, {
        path: req.params.path,
        message,
      });

      // Clear relevant caches
      await cache.del('content:*');

      res.json({
        success: true,
        message: 'Content published successfully',
        publishedAt: parsed.data.publishedAt,
      });
    } catch (error) {
      logger.error('Error publishing content', { path: req.params.path, error });
      res.status(500).json({ error: 'Failed to publish content' });
    }
  }
);

// Helper function to walk directory
async function walkDir(dir) {
  let files = [];
  try {
    const items = await fs.readdir(dir, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        files = files.concat(await walkDir(fullPath));
      } else {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.error(`Error walking directory ${dir}:`, error);
  }
  return files;
}

// Get comprehensive content statistics
router.get('/stats/:path(*)', authenticate, async (req, res) => {
  const projectRoot = path.join(__dirname, '../../../..');
  const contentPath = path.join(projectRoot, 'content', req.params.path);

  try {
    // Security check
    const normalizedPath = path.normalize(contentPath);
    const contentRoot = path.join(projectRoot, 'content');
    if (!normalizedPath.startsWith(contentRoot)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const content = await fs.readFile(contentPath, 'utf8');
    const parsed = matter(content);
    const stats = await fs.stat(contentPath);

    // Calculate various statistics
    const words = parsed.content.split(/\s+/).filter(word => word.length > 0);
    const wordCount = words.length;
    const readingTime = Math.ceil(wordCount / 200);
    const sentences = parsed.content.split(/[.!?]+/).filter(s => s.trim()).length;
    const paragraphs = parsed.content.split(/\n\n+/).filter(p => p.trim()).length;

    // Calculate readability (simple Flesch Reading Ease approximation)
    const avgWordsPerSentence = wordCount / Math.max(sentences, 1);
    const avgSyllablesPerWord =
      words.reduce(
        (acc, word) =>
          // Simple syllable counting (not perfect but good enough)
          acc + Math.max(1, word.replace(/[^aeiouAEIOU]/g, '').length),
        0
      ) / Math.max(wordCount, 1);

    const fleschScore = 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord;
    let readabilityLevel = 'Very Difficult';
    if (fleschScore >= 90) readabilityLevel = 'Very Easy';
    else if (fleschScore >= 80) readabilityLevel = 'Easy';
    else if (fleschScore >= 70) readabilityLevel = 'Fairly Easy';
    else if (fleschScore >= 60) readabilityLevel = 'Standard';
    else if (fleschScore >= 50) readabilityLevel = 'Fairly Difficult';
    else if (fleschScore >= 30) readabilityLevel = 'Difficult';

    // Find images and links
    const images = (parsed.content.match(/!\[.*?\]\(.*?\)/g) || []).length;
    const links = (parsed.content.match(/\[.*?\]\(.*?\)/g) || []).length - images;
    const codeBlocks = (parsed.content.match(/```[\s\S]*?```/g) || []).length;

    res.json({
      wordCount,
      readingTime,
      characters: parsed.content.length,
      sentences,
      paragraphs,
      images,
      links,
      codeBlocks,
      readability: {
        score: Math.round(fleschScore),
        level: readabilityLevel,
        avgWordsPerSentence: Math.round(avgWordsPerSentence),
        avgSyllablesPerWord: Math.round(avgSyllablesPerWord * 10) / 10,
      },
      metadata: {
        created: parsed.data.date || stats.birthtime,
        modified: stats.mtime,
        size: stats.size,
        draft: parsed.data.draft || false,
        tags: parsed.data.tags || [],
        category: req.params.path.split('/')[0],
      },
    });
  } catch (error) {
    logger.error('Error calculating stats', { path: req.params.path, error });
    if (error.code === 'ENOENT') {
      res.status(404).json({ error: 'Content not found' });
    } else {
      res.status(500).json({ error: 'Failed to calculate statistics' });
    }
  }
});

// Bulk review operations (requires admin role)
router.post(
  '/bulk-publish',
  authenticate,
  requireRole('admin'),
  [
    body('paths').isArray().withMessage('Paths must be an array'),
    body('paths.*').isString().withMessage('Each path must be a string'),
  ],
  validate,
  async (req, res) => {
    const { paths } = req.body;
    const projectRoot = path.join(__dirname, '../../../..');
    const results = [];

    for (const contentPath of paths) {
      try {
        const fullPath = path.join(projectRoot, 'content', contentPath);

        // Security check
        const normalizedPath = path.normalize(fullPath);
        const contentRoot = path.join(projectRoot, 'content');
        if (!normalizedPath.startsWith(contentRoot)) {
          results.push({ path: contentPath, success: false, error: 'Access denied' });
          continue;
        }

        const content = await fs.readFile(fullPath, 'utf8');
        const parsed = matter(content);

        parsed.data.draft = false;
        parsed.data.lastmod = new Date().toISOString();
        parsed.data.publishedBy = req.user.username;
        parsed.data.publishedAt = new Date().toISOString();

        const updatedContent = matter.stringify(parsed.content, parsed.data);
        await fs.writeFile(fullPath, updatedContent);

        results.push({ path: contentPath, success: true });
      } catch (error) {
        results.push({ path: contentPath, success: false, error: error.message });
      }
    }

    // Clear caches
    await cache.del('content:*');

    logger.audit('bulk_publish', req.user.id, {
      total: paths.length,
      successful: results.filter(r => r.success).length,
    });

    res.json({
      results,
      summary: {
        total: paths.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
      },
    });
  }
);

// SEO analysis for content
router.get('/seo/:path(*)', authenticate, async (req, res) => {
  const projectRoot = path.join(__dirname, '../../../..');
  const contentPath = path.join(projectRoot, 'content', req.params.path);

  try {
    const content = await fs.readFile(contentPath, 'utf8');
    const parsed = matter(content);

    const issues = [];
    const suggestions = [];

    // Check title
    if (!parsed.data.title) {
      issues.push('Missing title');
    } else if (parsed.data.title.length > 60) {
      suggestions.push('Title is longer than 60 characters (may be truncated in search results)');
    } else if (parsed.data.title.length < 30) {
      suggestions.push('Title is shorter than 30 characters (consider making it more descriptive)');
    }

    // Check description
    if (!parsed.data.description && !parsed.data.excerpt) {
      issues.push('Missing description/excerpt');
    } else {
      const desc = parsed.data.description || parsed.data.excerpt;
      if (desc.length > 160) {
        suggestions.push('Description is longer than 160 characters (may be truncated)');
      } else if (desc.length < 120) {
        suggestions.push('Description is shorter than 120 characters (consider expanding)');
      }
    }

    // Check images
    const images = parsed.content.match(/!\[([^\]]*)\]\([^\)]+\)/g) || [];
    images.forEach((img, index) => {
      const altMatch = img.match(/!\[([^\]]*)\]/);
      if (!altMatch || !altMatch[1]) {
        issues.push(`Image ${index + 1} is missing alt text`);
      }
    });

    // Check headings
    const h1s = (parsed.content.match(/^# .+$/gm) || []).length;
    if (h1s === 0) {
      suggestions.push('No H1 heading found in content');
    } else if (h1s > 1) {
      suggestions.push(`Multiple H1 headings found (${h1s}). Consider using only one H1`);
    }

    // Check keywords
    if (!parsed.data.keywords && !parsed.data.tags) {
      suggestions.push('No keywords or tags defined');
    }

    // Calculate SEO score
    const maxScore = 100;
    let score = maxScore;
    score -= issues.length * 15;
    score -= suggestions.length * 5;
    score = Math.max(0, score);

    res.json({
      score,
      grade: score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F',
      issues,
      suggestions,
      metadata: {
        title: parsed.data.title,
        description: parsed.data.description || parsed.data.excerpt,
        keywords: parsed.data.keywords || parsed.data.tags || [],
        images: images.length,
        wordCount: parsed.content.split(/\s+/).filter(w => w).length,
      },
    });
  } catch (error) {
    logger.error('SEO analysis failed', { path: req.params.path, error });
    res.status(500).json({ error: 'Failed to analyze SEO' });
  }
});

module.exports = router;
