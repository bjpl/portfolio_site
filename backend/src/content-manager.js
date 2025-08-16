// Content Management Module
const fs = require('fs').promises;
const path = require('path');
const matter = require('gray-matter');
const { v4: uuidv4 } = require('uuid');

class ContentManager {
  constructor(contentRoot) {
    this.contentRoot = contentRoot || path.join(__dirname, '../../content');
    this.backupDir = path.join(__dirname, '../data/backups');
  }

  // Auth middleware helper
  requireAuth(req) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      throw new Error('Authentication required');
    }
    
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'portfolio-secret-key-change-in-production';
    
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  // List all content files with metadata
  async listContent(section = null) {
    const contents = [];
    const sections = section ? [section] : ['make', 'learn', 'think', 'meet'];
    
    for (const sec of sections) {
      const sectionPath = path.join(this.contentRoot, sec);
      
      try {
        const items = await this.scanDirectory(sectionPath, sec);
        contents.push(...items);
      } catch (err) {
        console.log(`Section ${sec} not found, skipping...`);
      }
    }
    
    return contents;
  }

  // Recursively scan directory for markdown files
  async scanDirectory(dirPath, section, subdir = '') {
    const items = [];
    
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          const subItems = await this.scanDirectory(fullPath, section, 
            subdir ? `${subdir}/${entry.name}` : entry.name);
          items.push(...subItems);
        } else if (entry.name.endsWith('.md') && !entry.name.startsWith('_')) {
          const content = await fs.readFile(fullPath, 'utf8');
          const { data, content: body } = matter(content);
          
          items.push({
            id: `${section}/${subdir}/${entry.name}`.replace(/\/+/g, '/'),
            path: fullPath,
            section,
            subdir,
            filename: entry.name,
            title: data.title || entry.name.replace('.md', ''),
            description: data.description || '',
            date: data.date || null,
            draft: data.draft || false,
            tags: data.tags || [],
            featured: data.featured || false,
            wordCount: body.split(/\s+/).length,
            lastModified: (await fs.stat(fullPath)).mtime
          });
        }
      }
    } catch (err) {
      console.error(`Error scanning ${dirPath}:`, err);
    }
    
    return items;
  }

  // Get single content file
  async getContent(contentPath) {
    const fullPath = path.join(this.contentRoot, contentPath);
    
    try {
      const content = await fs.readFile(fullPath, 'utf8');
      const { data, content: body } = matter(content);
      const stats = await fs.stat(fullPath);
      
      return {
        path: contentPath,
        frontmatter: data,
        content: body,
        raw: content,
        lastModified: stats.mtime,
        size: stats.size
      };
    } catch (error) {
      throw new Error(`Content not found: ${contentPath}`);
    }
  }

  // Create new content
  async createContent(section, filename, frontmatter, content) {
    // Validate section
    const validSections = ['make', 'learn', 'think', 'meet'];
    if (!validSections.includes(section)) {
      throw new Error(`Invalid section: ${section}`);
    }
    
    // Determine subdirectory based on content type
    let subdir = '';
    if (section === 'make') {
      if (frontmatter.type === 'audio') subdir = 'sounds';
      else if (frontmatter.type === 'visual') subdir = 'visuals';
      else if (frontmatter.type === 'writing') subdir = 'words';
      else subdir = 'words'; // default
    } else if (section === 'learn') {
      subdir = frontmatter.category || 'strategies';
    } else if (section === 'think') {
      subdir = frontmatter.category || 'positions';
    } else if (section === 'meet') {
      subdir = frontmatter.category || 'me';
    }
    
    const dirPath = path.join(this.contentRoot, section, subdir);
    await fs.mkdir(dirPath, { recursive: true });
    
    // Generate filename if not provided
    if (!filename) {
      filename = this.generateFilename(frontmatter.title || 'untitled');
    }
    
    // Ensure .md extension
    if (!filename.endsWith('.md')) {
      filename += '.md';
    }
    
    const filePath = path.join(dirPath, filename);
    
    // Check if file already exists
    try {
      await fs.access(filePath);
      throw new Error(`File already exists: ${filename}`);
    } catch (err) {
      // File doesn't exist, good to proceed
    }
    
    // Add metadata
    frontmatter.date = frontmatter.date || new Date().toISOString().split('T')[0];
    frontmatter.draft = frontmatter.draft !== undefined ? frontmatter.draft : false;
    
    // Create markdown content
    const fileContent = matter.stringify(content, frontmatter);
    
    // Write file
    await fs.writeFile(filePath, fileContent, 'utf8');
    
    return {
      path: `${section}/${subdir}/${filename}`,
      message: 'Content created successfully'
    };
  }

  // Update existing content
  async updateContent(contentPath, frontmatter, content) {
    const fullPath = path.join(this.contentRoot, contentPath);
    
    // Create backup first
    await this.createBackup(contentPath);
    
    // Read existing content
    const existing = await fs.readFile(fullPath, 'utf8');
    const { data: existingFrontmatter } = matter(existing);
    
    // Merge frontmatter (preserve existing values not provided)
    const mergedFrontmatter = { ...existingFrontmatter, ...frontmatter };
    
    // Update modified date
    mergedFrontmatter.lastModified = new Date().toISOString();
    
    // Create new content
    const fileContent = matter.stringify(content, mergedFrontmatter);
    
    // Write file
    await fs.writeFile(fullPath, fileContent, 'utf8');
    
    return {
      path: contentPath,
      message: 'Content updated successfully'
    };
  }

  // Delete content
  async deleteContent(contentPath) {
    const fullPath = path.join(this.contentRoot, contentPath);
    
    // Create backup first
    await this.createBackup(contentPath);
    
    // Delete file
    await fs.unlink(fullPath);
    
    return {
      path: contentPath,
      message: 'Content deleted successfully'
    };
  }

  // Move/rename content
  async moveContent(oldPath, newPath) {
    const oldFullPath = path.join(this.contentRoot, oldPath);
    const newFullPath = path.join(this.contentRoot, newPath);
    
    // Create backup
    await this.createBackup(oldPath);
    
    // Ensure destination directory exists
    await fs.mkdir(path.dirname(newFullPath), { recursive: true });
    
    // Move file
    await fs.rename(oldFullPath, newFullPath);
    
    return {
      oldPath,
      newPath,
      message: 'Content moved successfully'
    };
  }

  // Duplicate content
  async duplicateContent(sourcePath, targetPath = null) {
    const sourceFullPath = path.join(this.contentRoot, sourcePath);
    
    // Read source content
    const content = await fs.readFile(sourceFullPath, 'utf8');
    const { data: frontmatter, content: body } = matter(content);
    
    // Generate target path if not provided
    if (!targetPath) {
      const dir = path.dirname(sourcePath);
      const filename = path.basename(sourcePath, '.md');
      targetPath = `${dir}/${filename}-copy.md`;
    }
    
    const targetFullPath = path.join(this.contentRoot, targetPath);
    
    // Update frontmatter
    frontmatter.title = `${frontmatter.title || 'Untitled'} (Copy)`;
    frontmatter.date = new Date().toISOString().split('T')[0];
    frontmatter.draft = true; // Set as draft by default
    
    // Create new content
    const fileContent = matter.stringify(body, frontmatter);
    
    // Write file
    await fs.writeFile(targetFullPath, fileContent, 'utf8');
    
    return {
      sourcePath,
      targetPath,
      message: 'Content duplicated successfully'
    };
  }

  // Create backup
  async createBackup(contentPath) {
    const fullPath = path.join(this.contentRoot, contentPath);
    
    try {
      const content = await fs.readFile(fullPath, 'utf8');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFilename = `${path.basename(contentPath, '.md')}-${timestamp}.md`;
      const backupPath = path.join(this.backupDir, path.dirname(contentPath));
      
      await fs.mkdir(backupPath, { recursive: true });
      await fs.writeFile(path.join(backupPath, backupFilename), content, 'utf8');
      
      return { backup: path.join(backupPath, backupFilename) };
    } catch (error) {
      console.error('Backup failed:', error);
      // Don't fail the operation if backup fails
    }
  }

  // List backups
  async listBackups(contentPath = null) {
    const backups = [];
    
    try {
      const scanBackupDir = async (dir, prefix = '') => {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          
          if (entry.isDirectory()) {
            await scanBackupDir(fullPath, path.join(prefix, entry.name));
          } else if (entry.name.endsWith('.md')) {
            const stats = await fs.stat(fullPath);
            backups.push({
              path: path.join(prefix, entry.name),
              size: stats.size,
              created: stats.mtime
            });
          }
        }
      };
      
      await scanBackupDir(this.backupDir);
      
      // Filter by content path if provided
      if (contentPath) {
        const basename = path.basename(contentPath, '.md');
        return backups.filter(b => b.path.includes(basename));
      }
      
      return backups;
    } catch (error) {
      return [];
    }
  }

  // Restore from backup
  async restoreBackup(backupPath, targetPath) {
    const backupFullPath = path.join(this.backupDir, backupPath);
    const targetFullPath = path.join(this.contentRoot, targetPath);
    
    const content = await fs.readFile(backupFullPath, 'utf8');
    await fs.writeFile(targetFullPath, content, 'utf8');
    
    return {
      backup: backupPath,
      restored: targetPath,
      message: 'Content restored successfully'
    };
  }

  // Bulk operations
  async bulkUpdate(operations) {
    const results = [];
    
    for (const op of operations) {
      try {
        let result;
        
        switch (op.action) {
          case 'update':
            result = await this.updateContent(op.path, op.frontmatter, op.content);
            break;
          case 'delete':
            result = await this.deleteContent(op.path);
            break;
          case 'move':
            result = await this.moveContent(op.path, op.newPath);
            break;
          case 'publish':
            result = await this.updateContent(op.path, { draft: false }, op.content || '');
            break;
          case 'unpublish':
            result = await this.updateContent(op.path, { draft: true }, op.content || '');
            break;
          default:
            throw new Error(`Unknown action: ${op.action}`);
        }
        
        results.push({ success: true, ...result });
      } catch (error) {
        results.push({ success: false, path: op.path, error: error.message });
      }
    }
    
    return results;
  }

  // Search content
  async searchContent(query, options = {}) {
    const contents = await this.listContent();
    const results = [];
    
    for (const item of contents) {
      try {
        const fullContent = await this.getContent(item.id);
        const searchText = `${item.title} ${item.description} ${fullContent.content}`.toLowerCase();
        
        if (searchText.includes(query.toLowerCase())) {
          // Find matching snippets
          const snippets = this.extractSnippets(fullContent.content, query);
          
          results.push({
            ...item,
            snippets,
            score: this.calculateRelevance(searchText, query)
          });
        }
      } catch (error) {
        // Skip files that can't be read
      }
    }
    
    // Sort by relevance
    results.sort((a, b) => b.score - a.score);
    
    // Apply limit if specified
    if (options.limit) {
      return results.slice(0, options.limit);
    }
    
    return results;
  }

  // Extract snippets around search query
  extractSnippets(content, query, contextLength = 100) {
    const snippets = [];
    const lowerContent = content.toLowerCase();
    const lowerQuery = query.toLowerCase();
    let position = 0;
    
    while ((position = lowerContent.indexOf(lowerQuery, position)) !== -1) {
      const start = Math.max(0, position - contextLength);
      const end = Math.min(content.length, position + query.length + contextLength);
      const snippet = content.substring(start, end);
      
      snippets.push({
        text: snippet,
        highlight: { start: position - start, length: query.length }
      });
      
      position += query.length;
      
      // Limit to 3 snippets
      if (snippets.length >= 3) break;
    }
    
    return snippets;
  }

  // Calculate search relevance score
  calculateRelevance(text, query) {
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    let score = 0;
    
    // Exact matches
    const exactMatches = (lowerText.match(new RegExp(lowerQuery, 'g')) || []).length;
    score += exactMatches * 10;
    
    // Word matches
    const queryWords = lowerQuery.split(/\s+/);
    for (const word of queryWords) {
      if (lowerText.includes(word)) {
        score += 5;
      }
    }
    
    return score;
  }

  // Generate URL-friendly filename from title
  generateFilename(title) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50);
  }

  // Export content as JSON
  async exportContent(section = null) {
    const contents = await this.listContent(section);
    const exportData = [];
    
    for (const item of contents) {
      const fullContent = await this.getContent(item.id);
      exportData.push({
        ...item,
        frontmatter: fullContent.frontmatter,
        content: fullContent.content
      });
    }
    
    return exportData;
  }

  // Import content from JSON
  async importContent(data) {
    const results = [];
    
    for (const item of data) {
      try {
        const section = item.section || 'make';
        const filename = item.filename || this.generateFilename(item.title);
        
        const result = await this.createContent(
          section,
          filename,
          item.frontmatter || {},
          item.content || ''
        );
        
        results.push({ success: true, ...result });
      } catch (error) {
        results.push({ 
          success: false, 
          title: item.title,
          error: error.message 
        });
      }
    }
    
    return results;
  }
}

module.exports = ContentManager;