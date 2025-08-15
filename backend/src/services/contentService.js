const path = require('path');
const fs = require('fs').promises;
const util = require('util');

const matter = require('gray-matter');

const { exec } = require('child_process');

const execPromise = util.promisify(exec);
const config = require('../config');
const logger = require('../utils/logger');

const cacheService = require('./cache');

class ContentService {
  constructor() {
    this.contentRoot = path.join(__dirname, '../../../content');
    this.hugoRoot = path.join(__dirname, '../../..');
  }

  /**
   * Get content from all sections with filtering
   */
  async getContent(options) {
    const {
      page = 1,
      limit = 20,
      section,
      subsection,
      language = 'en',
      draft = false,
      search,
      sortBy = 'date',
      sortOrder = 'desc',
    } = options;

    let basePath = this.contentRoot;
    if (language !== 'en') {
      basePath = path.join(basePath, language);
    }
    if (section) {
      basePath = path.join(basePath, section);
      if (subsection) {
        basePath = path.join(basePath, subsection);
      }
    }

    const files = await this.getAllMarkdownFiles(basePath);
    const content = [];

    for (const file of files) {
      const item = await this.parseMarkdownFile(file);

      // Filter drafts
      if (!draft && item.frontmatter.draft) continue;

      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesSearch =
          item.frontmatter.title?.toLowerCase().includes(searchLower) ||
          item.frontmatter.description?.toLowerCase().includes(searchLower) ||
          item.content.toLowerCase().includes(searchLower);

        if (!matchesSearch) continue;
      }

      content.push(item);
    }

    // Sort content
    content.sort((a, b) => {
      let aVal;
      let bVal;

      if (sortBy === 'date') {
        aVal = new Date(a.frontmatter.date || 0);
        bVal = new Date(b.frontmatter.date || 0);
      } else if (sortBy === 'title') {
        aVal = a.frontmatter.title || '';
        bVal = b.frontmatter.title || '';
      } else {
        aVal = a.frontmatter[sortBy] || '';
        bVal = b.frontmatter[sortBy] || '';
      }

      if (sortOrder === 'desc') {
        return bVal > aVal ? 1 : -1;
      }
      return aVal > bVal ? 1 : -1;
    });

    // Paginate
    const offset = (page - 1) * limit;
    const paginatedContent = content.slice(offset, offset + limit);

    return {
      items: paginatedContent,
      pagination: {
        total: content.length,
        page,
        limit,
        totalPages: Math.ceil(content.length / limit),
      },
    };
  }

  /**
   * Get Learn section content
   */
  async getLearnContent(subsection, limit = 10) {
    const sections = subsection ? [subsection] : ['built', 'found', 'strategies'];
    const content = {
      built: [],
      found: [],
      strategies: [],
    };

    for (const sub of sections) {
      const path = `learn/${sub}`;
      const items = await this.getContentByPath(path, limit);
      content[sub] = items;
    }

    return subsection ? content[subsection] : content;
  }

  /**
   * Get Make section content (creative works)
   */
  async getMakeContent(subsection, type, limit = 12) {
    const sections = subsection ? [subsection] : ['sounds', 'visuals', 'words'];
    const content = {
      sounds: [],
      visuals: [],
      words: [],
    };

    for (const sub of sections) {
      const path = `make/${sub}`;
      let items = await this.getContentByPath(path, limit);

      // Filter by type if specified
      if (type) {
        items = items.filter(item => item.frontmatter.type === type);
      }

      content[sub] = items;
    }

    return subsection ? content[subsection] : content;
  }

  /**
   * Get Meet section content (about/portfolio)
   */
  async getMeetContent(subsection) {
    const sections = subsection ? [subsection] : ['me', 'work'];
    const content = {
      me: [],
      work: [],
    };

    for (const sub of sections) {
      const path = `meet/${sub}`;
      const items = await this.getContentByPath(path);
      content[sub] = items;
    }

    return subsection ? content[subsection] : content;
  }

  /**
   * Get Think section content (blog/thoughts)
   */
  async getThinkContent(options) {
    const { subsection, page = 1, limit = 10, tag, search } = options;

    const sections = subsection ? [subsection] : ['links', 'positions'];
    let allContent = [];

    for (const sub of sections) {
      const path = `think/${sub}`;
      const items = await this.getContentByPath(path);
      allContent = allContent.concat(
        items.map(item => ({
          ...item,
          subsection: sub,
        }))
      );
    }

    // Filter by tag
    if (tag) {
      allContent = allContent.filter(item => item.frontmatter.tags && item.frontmatter.tags.includes(tag));
    }

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      allContent = allContent.filter(
        item =>
          item.frontmatter.title?.toLowerCase().includes(searchLower) ||
          item.frontmatter.description?.toLowerCase().includes(searchLower) ||
          item.content.toLowerCase().includes(searchLower)
      );
    }

    // Sort by date (newest first)
    allContent.sort((a, b) => new Date(b.frontmatter.date || 0) - new Date(a.frontmatter.date || 0));

    // Paginate
    const offset = (page - 1) * limit;
    const paginatedContent = allContent.slice(offset, offset + limit);

    return {
      items: paginatedContent,
      pagination: {
        total: allContent.length,
        page,
        limit,
        totalPages: Math.ceil(allContent.length / limit),
      },
    };
  }

  /**
   * Get single content item
   */
  async getContentItem(section, subsection, slug, language = 'en') {
    const cacheKey = `content:item:${section}:${subsection}:${slug}:${language}`;
    const cached = await cacheService.get(cacheKey);

    if (cached) return cached;

    let contentPath = path.join(this.contentRoot);
    if (language !== 'en') {
      contentPath = path.join(contentPath, language);
    }
    contentPath = path.join(contentPath, section, subsection, `${slug}.md`);

    try {
      const content = await fs.readFile(contentPath, 'utf-8');
      const parsed = matter(content);

      const item = {
        slug,
        section,
        subsection,
        language,
        frontmatter: parsed.data,
        content: parsed.content,
        excerpt: this.generateExcerpt(parsed.content),
        readTime: this.calculateReadTime(parsed.content),
        path: `/${section}/${subsection}/${slug}`,
      };

      await cacheService.set(cacheKey, item, 300); // Cache for 5 minutes
      return item;
    } catch (error) {
      logger.error('Error reading content item', { error, path: contentPath });
      return null;
    }
  }

  /**
   * Create new content
   */
  async createContent(data) {
    const {
      section,
      subsection,
      title,
      content,
      language = 'en',
      draft = true,
      tags = [],
      categories = [],
      metadata = {},
      authorId,
      authorName,
    } = data;

    const slug = this.generateSlug(title);
    let contentPath = path.join(this.contentRoot);

    if (language !== 'en') {
      contentPath = path.join(contentPath, language);
    }
    contentPath = path.join(contentPath, section, subsection);

    // Ensure directory exists
    await fs.mkdir(contentPath, { recursive: true });

    const filename = `${slug}.md`;
    const filePath = path.join(contentPath, filename);

    // Check if file already exists
    try {
      await fs.access(filePath);
      throw new Error('Content with this title already exists');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }

    // Create frontmatter
    const frontmatter = {
      title,
      date: new Date().toISOString(),
      draft,
      description: metadata.description || '',
      tags,
      categories,
      author: authorName,
      authorId,
      ...metadata,
    };

    // Create markdown content
    const markdownContent = matter.stringify(content, frontmatter);

    // Write file
    await fs.writeFile(filePath, markdownContent, 'utf-8');

    // Trigger Hugo build if configured
    if (config.hugo.autoBuild) {
      this.triggerHugoBuild();
    }

    return {
      slug,
      section,
      subsection,
      language,
      frontmatter,
      content,
      path: `/${section}/${subsection}/${slug}`,
    };
  }

  /**
   * Update content
   */
  async updateContent(section, subsection, slug, updates) {
    const { language = 'en' } = updates;

    let contentPath = path.join(this.contentRoot);
    if (language !== 'en') {
      contentPath = path.join(contentPath, language);
    }
    contentPath = path.join(contentPath, section, subsection, `${slug}.md`);

    try {
      // Read existing content
      const existing = await fs.readFile(contentPath, 'utf-8');
      const parsed = matter(existing);

      // Update frontmatter
      if (updates.frontmatter) {
        Object.assign(parsed.data, updates.frontmatter);
      }
      parsed.data.lastmod = new Date().toISOString();

      // Update content if provided
      const content = updates.content || parsed.content;

      // Write updated content
      const markdownContent = matter.stringify(content, parsed.data);
      await fs.writeFile(contentPath, markdownContent, 'utf-8');

      // Trigger Hugo build if configured
      if (config.hugo.autoBuild && !parsed.data.draft) {
        this.triggerHugoBuild();
      }

      return {
        slug,
        section,
        subsection,
        language,
        frontmatter: parsed.data,
        content,
        path: `/${section}/${subsection}/${slug}`,
      };
    } catch (error) {
      logger.error('Error updating content', { error, path: contentPath });
      return null;
    }
  }

  /**
   * Delete content
   */
  async deleteContent(section, subsection, slug, language = 'en') {
    let contentPath = path.join(this.contentRoot);
    if (language !== 'en') {
      contentPath = path.join(contentPath, language);
    }
    contentPath = path.join(contentPath, section, subsection, `${slug}.md`);

    await fs.unlink(contentPath);

    // Trigger Hugo build if configured
    if (config.hugo.autoBuild) {
      this.triggerHugoBuild();
    }
  }

  /**
   * Track content view
   */
  async trackContentView(section, subsection, slug, ip) {
    const viewKey = `view:${section}:${subsection}:${slug}:${ip}`;
    const recentView = await cacheService.get(viewKey);

    if (!recentView) {
      // Increment view count in cache
      await cacheService.incr(`views:${section}:${subsection}:${slug}`);

      // Prevent multiple views from same IP for 1 hour
      await cacheService.set(viewKey, true, 3600);
    }
  }

  /**
   * Get content statistics
   */
  async getContentStats(includePrivate = false) {
    const cacheKey = `content:stats:${includePrivate ? 'admin' : 'public'}`;
    const cached = await cacheService.get(cacheKey);

    if (cached) return cached;

    const stats = {
      total: 0,
      bySection: {
        learn: 0,
        make: 0,
        meet: 0,
        think: 0,
      },
      bySubsection: {},
      drafts: 0,
      published: 0,
    };

    const sections = ['learn', 'make', 'meet', 'think'];

    for (const section of sections) {
      const sectionPath = path.join(this.contentRoot, section);
      const files = await this.getAllMarkdownFiles(sectionPath);

      for (const file of files) {
        const content = await this.parseMarkdownFile(file);
        stats.total++;
        stats.bySection[section]++;

        if (content.frontmatter.draft) {
          stats.drafts++;
        } else {
          stats.published++;
        }

        // Count by subsection
        const relativePath = path.relative(sectionPath, file);
        const subsection = relativePath.split(path.sep)[0];
        const subsectionKey = `${section}/${subsection}`;
        stats.bySubsection[subsectionKey] = (stats.bySubsection[subsectionKey] || 0) + 1;
      }
    }

    if (includePrivate) {
      // Add view counts
      const viewKeys = await cacheService.client?.keys('views:*');
      if (viewKeys) {
        stats.totalViews = 0;
        for (const key of viewKeys) {
          const views = await cacheService.get(key);
          stats.totalViews += views || 0;
        }
      }
    }

    await cacheService.set(cacheKey, stats, 300); // Cache for 5 minutes
    return stats;
  }

  /**
   * Search content
   */
  async searchContent(query, limit = 20) {
    const cacheKey = `search:${query}:${limit}`;
    const cached = await cacheService.get(cacheKey);

    if (cached) return cached;

    const results = [];
    const queryLower = query.toLowerCase();
    const sections = ['learn', 'make', 'meet', 'think'];

    for (const section of sections) {
      const sectionPath = path.join(this.contentRoot, section);
      const files = await this.getAllMarkdownFiles(sectionPath);

      for (const file of files) {
        const content = await this.parseMarkdownFile(file);

        // Calculate relevance score
        let score = 0;

        // Title match (highest weight)
        if (content.frontmatter.title?.toLowerCase().includes(queryLower)) {
          score += 10;
        }

        // Description match
        if (content.frontmatter.description?.toLowerCase().includes(queryLower)) {
          score += 5;
        }

        // Content match
        const contentMatches = (content.content.toLowerCase().match(new RegExp(queryLower, 'g')) || []).length;
        score += Math.min(contentMatches, 10);

        // Tag match
        if (content.frontmatter.tags?.some(tag => tag.toLowerCase().includes(queryLower))) {
          score += 3;
        }

        if (score > 0) {
          results.push({
            ...content,
            score,
            section,
            highlight: this.generateHighlight(content.content, query),
          });
        }
      }
    }

    // Sort by relevance score
    results.sort((a, b) => b.score - a.score);

    const limitedResults = results.slice(0, limit);
    await cacheService.set(cacheKey, limitedResults, 600); // Cache for 10 minutes

    return limitedResults;
  }

  /**
   * Get content tags
   */
  async getContentTags(section) {
    const tags = new Map();
    const basePath = section ? path.join(this.contentRoot, section) : this.contentRoot;

    const files = await this.getAllMarkdownFiles(basePath);

    for (const file of files) {
      const content = await this.parseMarkdownFile(file);
      if (content.frontmatter.tags) {
        for (const tag of content.frontmatter.tags) {
          tags.set(tag, (tags.get(tag) || 0) + 1);
        }
      }
    }

    return Array.from(tags.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Get content categories
   */
  async getContentCategories(section) {
    const categories = new Map();
    const basePath = section ? path.join(this.contentRoot, section) : this.contentRoot;

    const files = await this.getAllMarkdownFiles(basePath);

    for (const file of files) {
      const content = await this.parseMarkdownFile(file);
      if (content.frontmatter.categories) {
        for (const category of content.frontmatter.categories) {
          categories.set(category, (categories.get(category) || 0) + 1);
        }
      }
    }

    return Array.from(categories.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Get related content
   */
  async getRelatedContent(section, subsection, slug, limit = 5) {
    const current = await this.getContentItem(section, subsection, slug);
    if (!current) return [];

    const related = [];
    const currentTags = current.frontmatter.tags || [];
    const currentCategories = current.frontmatter.categories || [];

    // Get content from same subsection
    const sectionPath = path.join(this.contentRoot, section, subsection);
    const files = await this.getAllMarkdownFiles(sectionPath);

    for (const file of files) {
      if (file.includes(slug)) continue; // Skip current item

      const content = await this.parseMarkdownFile(file);
      let score = 0;

      // Score based on shared tags
      if (content.frontmatter.tags) {
        const sharedTags = content.frontmatter.tags.filter(tag => currentTags.includes(tag));
        score += sharedTags.length * 2;
      }

      // Score based on shared categories
      if (content.frontmatter.categories) {
        const sharedCategories = content.frontmatter.categories.filter(cat => currentCategories.includes(cat));
        score += sharedCategories.length;
      }

      if (score > 0) {
        related.push({ ...content, score });
      }
    }

    // Sort by relevance and limit
    related.sort((a, b) => b.score - a.score);
    return related.slice(0, limit);
  }

  /**
   * Toggle publish status
   */
  async togglePublishStatus(section, subsection, slug, published, language = 'en') {
    let contentPath = path.join(this.contentRoot);
    if (language !== 'en') {
      contentPath = path.join(contentPath, language);
    }
    contentPath = path.join(contentPath, section, subsection, `${slug}.md`);

    try {
      const existing = await fs.readFile(contentPath, 'utf-8');
      const parsed = matter(existing);

      parsed.data.draft = !published;
      if (published && !parsed.data.publishedAt) {
        parsed.data.publishedAt = new Date().toISOString();
      }

      const markdownContent = matter.stringify(parsed.content, parsed.data);
      await fs.writeFile(contentPath, markdownContent, 'utf-8');

      // Trigger Hugo build if publishing
      if (published && config.hugo.autoBuild) {
        this.triggerHugoBuild();
      }

      return {
        slug,
        section,
        subsection,
        published,
        frontmatter: parsed.data,
      };
    } catch (error) {
      logger.error('Error toggling publish status', { error, path: contentPath });
      return null;
    }
  }

  // Helper methods

  async getContentByPath(relativePath, limit) {
    const fullPath = path.join(this.contentRoot, relativePath);
    const files = await this.getAllMarkdownFiles(fullPath);
    const content = [];

    for (const file of files.slice(0, limit)) {
      const item = await this.parseMarkdownFile(file);
      content.push(item);
    }

    return content.sort((a, b) => new Date(b.frontmatter.date || 0) - new Date(a.frontmatter.date || 0));
  }

  async getAllMarkdownFiles(dir, files = []) {
    try {
      const items = await fs.readdir(dir, { withFileTypes: true });

      for (const item of items) {
        const fullPath = path.join(dir, item.name);

        if (item.isDirectory()) {
          await this.getAllMarkdownFiles(fullPath, files);
        } else if (item.name.endsWith('.md') && !item.name.startsWith('_')) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      logger.warn('Error reading directory', { dir, error: error.message });
    }

    return files;
  }

  async parseMarkdownFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const parsed = matter(content);

      const relativePath = path.relative(this.contentRoot, filePath);
      const pathParts = relativePath.split(path.sep);
      const slug = path.basename(filePath, '.md');

      return {
        slug,
        path: relativePath,
        section: pathParts[0],
        subsection: pathParts[1],
        frontmatter: parsed.data,
        content: parsed.content,
        excerpt: this.generateExcerpt(parsed.content),
        readTime: this.calculateReadTime(parsed.content),
      };
    } catch (error) {
      logger.error('Error parsing markdown file', { file: filePath, error });
      return null;
    }
  }

  generateSlug(title) {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  generateExcerpt(content, maxLength = 200) {
    const plainText = content
      .replace(/#{1,6}\s+/g, '')
      .replace(/[*_~`]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\n+/g, ' ')
      .trim();

    if (plainText.length <= maxLength) return plainText;

    return `${plainText.substring(0, maxLength).replace(/\s+\S*$/, '')}...`;
  }

  generateHighlight(content, query, contextLength = 150) {
    const queryLower = query.toLowerCase();
    const contentLower = content.toLowerCase();
    const index = contentLower.indexOf(queryLower);

    if (index === -1) return this.generateExcerpt(content, contextLength);

    const start = Math.max(0, index - contextLength / 2);
    const end = Math.min(content.length, index + query.length + contextLength / 2);

    let highlight = content.substring(start, end);
    if (start > 0) highlight = `...${highlight}`;
    if (end < content.length) highlight += '...';

    // Highlight the query
    const regex = new RegExp(`(${query})`, 'gi');
    highlight = highlight.replace(regex, '<mark>$1</mark>');

    return highlight;
  }

  calculateReadTime(content) {
    const wordsPerMinute = 200;
    const wordCount = content.trim().split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute);
  }

  async triggerHugoBuild() {
    try {
      const { stdout, stderr } = await execPromise('hugo', { cwd: this.hugoRoot });
      logger.info('Hugo build triggered', { stdout });
    } catch (error) {
      logger.error('Hugo build failed', { error: error.message });
    }
  }
}

module.exports = new ContentService();
