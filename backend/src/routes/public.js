const express = require('express');

const router = express.Router();
const path = require('path');
const fs = require('fs').promises;

const { query, validationResult } = require('express-validator');
const matter = require('gray-matter');

const cache = require('../services/cache');
const logger = require('../utils/logger');

/**
 * Public API Routes
 * These routes are accessible without authentication
 */

// Get site information
router.get('/info', async (req, res) => {
  const cacheKey = 'public:site-info';

  try {
    // Try cache first
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const siteInfo = {
      name: process.env.SITE_NAME || 'Portfolio Site',
      tagline: process.env.SITE_TAGLINE || 'Professional Portfolio',
      author: process.env.SITE_AUTHOR || 'Site Author',
      social: {
        github: process.env.GITHUB_URL,
        linkedin: process.env.LINKEDIN_URL,
        twitter: process.env.TWITTER_URL,
        email: process.env.CONTACT_EMAIL,
      },
      features: {
        blog: true,
        portfolio: true,
        contact: true,
        newsletter: process.env.ENABLE_NEWSLETTER === 'true',
      },
      version: process.env.APP_VERSION || '1.0.0',
    };

    // Cache for 1 hour
    await cache.set(cacheKey, siteInfo, 3600);

    res.json(siteInfo);
  } catch (error) {
    logger.error('Failed to get site info', error);
    res.status(500).json({ error: 'Failed to retrieve site information' });
  }
});

// Get recent posts (public)
router.get(
  '/posts/recent',
  [query('limit').optional().isInt({ min: 1, max: 20 }).toInt().default(5), query('category').optional().isString()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { limit, category } = req.query;
    const cacheKey = `public:recent-posts:${limit}:${category || 'all'}`;

    try {
      // Try cache first
      const cached = await cache.get(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      const projectRoot = path.join(__dirname, '../../../..');
      const contentPath = path.join(projectRoot, 'content');

      const posts = [];
      const categories = category ? [category] : ['learn', 'make', 'think'];

      for (const cat of categories) {
        const catPath = path.join(contentPath, cat);

        try {
          const files = await getMarkdownFiles(catPath);

          for (const file of files) {
            const content = await fs.readFile(file, 'utf8');
            const parsed = matter(content);

            // Only include published posts
            if (!parsed.data.draft && parsed.data.published !== false) {
              const relativePath = path.relative(contentPath, file);

              posts.push({
                title: parsed.data.title || path.basename(file, '.md'),
                slug: path.basename(file, '.md'),
                category: cat,
                path: relativePath.replace(/\\/g, '/'),
                excerpt:
                  parsed.data.excerpt ||
                  parsed.data.description ||
                  `${parsed.content.substring(0, 200).replace(/\n/g, ' ')}...`,
                date: parsed.data.date || parsed.data.publishedAt,
                author: parsed.data.author || 'Anonymous',
                tags: parsed.data.tags || [],
                image: parsed.data.image || parsed.data.featured_image,
                readingTime: Math.ceil(parsed.content.split(/\s+/).length / 200),
              });
            }
          }
        } catch (error) {
          logger.warn(`Failed to read category ${cat}`, error);
        }
      }

      // Sort by date (newest first)
      posts.sort((a, b) => {
        const dateA = new Date(a.date || 0);
        const dateB = new Date(b.date || 0);
        return dateB - dateA;
      });

      // Limit results
      const recentPosts = posts.slice(0, limit);

      // Cache for 10 minutes
      await cache.set(cacheKey, recentPosts, 600);

      res.json(recentPosts);
    } catch (error) {
      logger.error('Failed to get recent posts', error);
      res.status(500).json({ error: 'Failed to retrieve recent posts' });
    }
  }
);

// Get featured projects (public)
router.get('/projects/featured', async (req, res) => {
  const cacheKey = 'public:featured-projects';

  try {
    // Try cache first
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const projectRoot = path.join(__dirname, '../../../..');
    const projectsPath = path.join(projectRoot, 'content', 'make');

    const projects = [];
    const files = await getMarkdownFiles(projectsPath);

    for (const file of files) {
      const content = await fs.readFile(file, 'utf8');
      const parsed = matter(content);

      // Only include featured and published projects
      if (parsed.data.featured && !parsed.data.draft) {
        projects.push({
          title: parsed.data.title,
          slug: path.basename(file, '.md'),
          description: parsed.data.description || parsed.data.excerpt,
          technologies: parsed.data.technologies || [],
          image: parsed.data.image || parsed.data.thumbnail,
          liveUrl: parsed.data.live_url || parsed.data.demo_url,
          githubUrl: parsed.data.github_url,
          order: parsed.data.featured_order || 999,
        });
      }
    }

    // Sort by featured order
    projects.sort((a, b) => a.order - b.order);

    // Cache for 30 minutes
    await cache.set(cacheKey, projects, 1800);

    res.json(projects);
  } catch (error) {
    logger.error('Failed to get featured projects', error);
    res.status(500).json({ error: 'Failed to retrieve featured projects' });
  }
});

// Get site statistics (public)
router.get('/stats', async (req, res) => {
  const cacheKey = 'public:site-stats';

  try {
    // Try cache first
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const projectRoot = path.join(__dirname, '../../../..');
    const contentPath = path.join(projectRoot, 'content');

    let totalPosts = 0;
    let totalProjects = 0;
    const categories = ['learn', 'make', 'meet', 'think'];
    const tags = new Set();

    for (const category of categories) {
      const catPath = path.join(contentPath, category);

      try {
        const files = await getMarkdownFiles(catPath);

        for (const file of files) {
          const content = await fs.readFile(file, 'utf8');
          const parsed = matter(content);

          if (!parsed.data.draft) {
            if (category === 'make') {
              totalProjects++;
            } else {
              totalPosts++;
            }

            if (parsed.data.tags) {
              parsed.data.tags.forEach(tag => tags.add(tag));
            }
          }
        }
      } catch (error) {
        logger.warn(`Failed to read category ${category}`, error);
      }
    }

    const stats = {
      posts: totalPosts,
      projects: totalProjects,
      tags: tags.size,
      categories: categories.length,
      lastUpdated: new Date().toISOString(),
    };

    // Cache for 1 hour
    await cache.set(cacheKey, stats, 3600);

    res.json(stats);
  } catch (error) {
    logger.error('Failed to get site stats', error);
    res.status(500).json({ error: 'Failed to retrieve site statistics' });
  }
});

// RSS/Atom feed
router.get('/feed.xml', async (req, res) => {
  const cacheKey = 'public:rss-feed';

  try {
    // Try cache first
    const cached = await cache.get(cacheKey);
    if (cached) {
      res.set('Content-Type', 'application/rss+xml');
      return res.send(cached);
    }

    const projectRoot = path.join(__dirname, '../../../..');
    const contentPath = path.join(projectRoot, 'content');

    const posts = [];
    const categories = ['learn', 'make', 'think'];

    for (const category of categories) {
      const catPath = path.join(contentPath, category);
      const files = await getMarkdownFiles(catPath);

      for (const file of files) {
        const content = await fs.readFile(file, 'utf8');
        const parsed = matter(content);

        if (!parsed.data.draft) {
          posts.push({
            title: parsed.data.title || path.basename(file, '.md'),
            description: parsed.data.excerpt || parsed.data.description,
            link: `${process.env.SITE_URL || 'http://localhost:3000'}/${category}/${path.basename(file, '.md')}`,
            date: new Date(parsed.data.date || parsed.data.publishedAt || Date.now()),
            author: parsed.data.author || process.env.SITE_AUTHOR,
            category,
          });
        }
      }
    }

    // Sort by date
    posts.sort((a, b) => b.date - a.date);

    // Generate RSS XML
    const rss = generateRSSFeed(posts.slice(0, 20));

    // Cache for 30 minutes
    await cache.set(cacheKey, rss, 1800);

    res.set('Content-Type', 'application/rss+xml');
    res.send(rss);
  } catch (error) {
    logger.error('Failed to generate RSS feed', error);
    res.status(500).json({ error: 'Failed to generate RSS feed' });
  }
});

// Sitemap
router.get('/sitemap.xml', async (req, res) => {
  const cacheKey = 'public:sitemap';

  try {
    // Try cache first
    const cached = await cache.get(cacheKey);
    if (cached) {
      res.set('Content-Type', 'application/xml');
      return res.send(cached);
    }

    const projectRoot = path.join(__dirname, '../../../..');
    const contentPath = path.join(projectRoot, 'content');
    const baseUrl = process.env.SITE_URL || 'http://localhost:3000';

    const urls = [
      { loc: baseUrl, priority: '1.0', changefreq: 'daily' },
      { loc: `${baseUrl}/learn`, priority: '0.8', changefreq: 'weekly' },
      { loc: `${baseUrl}/make`, priority: '0.8', changefreq: 'weekly' },
      { loc: `${baseUrl}/meet`, priority: '0.7', changefreq: 'monthly' },
      { loc: `${baseUrl}/think`, priority: '0.8', changefreq: 'weekly' },
    ];

    // Add all published content
    const categories = ['learn', 'make', 'meet', 'think'];

    for (const category of categories) {
      const catPath = path.join(contentPath, category);
      const files = await getMarkdownFiles(catPath);

      for (const file of files) {
        const content = await fs.readFile(file, 'utf8');
        const parsed = matter(content);

        if (!parsed.data.draft) {
          const slug = path.basename(file, '.md');
          urls.push({
            loc: `${baseUrl}/${category}/${slug}`,
            lastmod: parsed.data.lastmod || parsed.data.date,
            priority: '0.6',
            changefreq: 'monthly',
          });
        }
      }
    }

    // Generate sitemap XML
    const sitemap = generateSitemap(urls);

    // Cache for 6 hours
    await cache.set(cacheKey, sitemap, 21600);

    res.set('Content-Type', 'application/xml');
    res.send(sitemap);
  } catch (error) {
    logger.error('Failed to generate sitemap', error);
    res.status(500).json({ error: 'Failed to generate sitemap' });
  }
});

// Helper function to get markdown files recursively
async function getMarkdownFiles(dir) {
  const files = [];

  try {
    const items = await fs.readdir(dir, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(dir, item.name);

      if (item.isDirectory()) {
        const subFiles = await getMarkdownFiles(fullPath);
        files.push(...subFiles);
      } else if (item.name.endsWith('.md')) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    // Directory might not exist
    logger.debug(`Directory not found: ${dir}`);
  }

  return files;
}

// Generate RSS feed XML
function generateRSSFeed(posts) {
  const siteUrl = process.env.SITE_URL || 'http://localhost:3000';
  const siteName = process.env.SITE_NAME || 'Portfolio Site';
  const siteDescription = process.env.SITE_DESCRIPTION || 'A professional portfolio site';

  const items = posts
    .map(
      post => `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <description><![CDATA[${post.description || ''}]]></description>
      <link>${post.link}</link>
      <guid isPermaLink="true">${post.link}</guid>
      <pubDate>${post.date.toUTCString()}</pubDate>
      <author>${post.author}</author>
      <category>${post.category}</category>
    </item>
  `
    )
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${siteName}</title>
    <description>${siteDescription}</description>
    <link>${siteUrl}</link>
    <atom:link href="${siteUrl}/api/public/feed.xml" rel="self" type="application/rss+xml" />
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${items}
  </channel>
</rss>`;
}

// Generate sitemap XML
function generateSitemap(urls) {
  const urlElements = urls
    .map(
      url => `
  <url>
    <loc>${url.loc}</loc>
    ${url.lastmod ? `<lastmod>${url.lastmod}</lastmod>` : ''}
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`
    )
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urlElements}
</urlset>`;
}

module.exports = router;
