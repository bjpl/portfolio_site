const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const util = require('util');

const execPromise = util.promisify(exec);

class HugoService {
  constructor() {
    this.projectRoot = path.join(__dirname, '../../../..');
    this.contentPath = path.join(this.projectRoot, 'content');
  }

  async createContent(section, subsection, title, language = 'en') {
    const slug = this.slugify(title);
    const contentPath =
      language === 'es' ? `es/${section}/${subsection}/${slug}.md` : `${section}/${subsection}/${slug}.md`;

    try {
      const { stdout, stderr } = await execPromise(`hugo new "${contentPath}"`, { cwd: this.projectRoot });

      return {
        success: true,
        path: contentPath,
        message: stdout || 'Content created successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async listContent(section = '', language = 'en') {
    const basePath =
      language === 'es' ? path.join(this.contentPath, 'es', section) : path.join(this.contentPath, section);

    try {
      const files = await this.walkDir(basePath);
      return files.filter(f => f.endsWith('.md'));
    } catch (error) {
      return [];
    }
  }

  async walkDir(dir) {
    let files = [];
    try {
      const items = await fs.readdir(dir, { withFileTypes: true });
      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
          files = files.concat(await this.walkDir(fullPath));
        } else {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.error(`Error walking directory ${dir}:`, error);
    }
    return files;
  }

  async buildSite(draft = false) {
    const command = draft ? 'hugo server -D' : 'hugo --minify';
    try {
      const { stdout, stderr } = await execPromise(command, { cwd: this.projectRoot });
      return { success: true, output: stdout };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getContentStats() {
    const stats = {
      total: 0,
      bySection: {
        learn: 0,
        make: 0,
        meet: 0,
        think: 0
      },
      byLanguage: { en: 0, es: 0 },
      drafts: 0,
      published: 0,
      recentlyUpdated: []
    };

    try {
      // Get all content files
      const allFiles = await this.walkDir(this.contentPath);
      const contentFiles = allFiles.filter(f => f.endsWith('.md') && !f.includes('_index.md'));

      stats.total = contentFiles.length;

      // Analyze each file
      for (const filePath of contentFiles) {
        try {
          const relativePath = path.relative(this.contentPath, filePath);
          const fileStats = await fs.stat(filePath);
          const content = await fs.readFile(filePath, 'utf8');
          
          // Parse frontmatter
          const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
          let frontmatter = {};
          if (frontmatterMatch) {
            try {
              frontmatter = this.parseFrontmatter(frontmatterMatch[1]);
            } catch (e) {
              // Skip invalid frontmatter
            }
          }

          // Determine language
          const isSpanish = relativePath.startsWith('es/');
          if (isSpanish) {
            stats.byLanguage.es++;
          } else {
            stats.byLanguage.en++;
          }

          // Determine section
          const pathParts = relativePath.split('/');
          const section = isSpanish ? pathParts[1] : pathParts[0];
          if (stats.bySection.hasOwnProperty(section)) {
            stats.bySection[section]++;
          }

          // Check if draft
          if (frontmatter.draft === true || frontmatter.draft === 'true') {
            stats.drafts++;
          } else {
            stats.published++;
          }

          // Add to recently updated if modified in last 7 days
          const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          if (fileStats.mtime > sevenDaysAgo) {
            stats.recentlyUpdated.push({
              path: relativePath,
              title: frontmatter.title || path.basename(filePath, '.md'),
              modified: fileStats.mtime,
              section: section
            });
          }

        } catch (fileError) {
          console.error(`Error processing file ${filePath}:`, fileError);
        }
      }

      // Sort recently updated by modification time
      stats.recentlyUpdated.sort((a, b) => new Date(b.modified) - new Date(a.modified));
      stats.recentlyUpdated = stats.recentlyUpdated.slice(0, 10); // Keep only 10 most recent

    } catch (error) {
      console.error('Error getting content stats:', error);
    }

    return stats;
  }

  parseFrontmatter(yamlContent) {
    const frontmatter = {};
    const lines = yamlContent.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const colonIndex = trimmed.indexOf(':');
        if (colonIndex > 0) {
          const key = trimmed.substring(0, colonIndex).trim();
          let value = trimmed.substring(colonIndex + 1).trim();
          
          // Remove quotes
          if ((value.startsWith('"') && value.endsWith('"')) || 
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          
          // Parse boolean
          if (value === 'true') value = true;
          if (value === 'false') value = false;
          
          frontmatter[key] = value;
        }
      }
    }
    
    return frontmatter;
  }

  async getRecentContent(limit = 5) {
    try {
      const allFiles = await this.walkDir(this.contentPath);
      const contentFiles = allFiles.filter(f => f.endsWith('.md') && !f.includes('_index.md'));
      
      const recentFiles = [];
      
      for (const filePath of contentFiles) {
        try {
          const fileStats = await fs.stat(filePath);
          const relativePath = path.relative(this.contentPath, filePath);
          const content = await fs.readFile(filePath, 'utf8');
          
          // Parse frontmatter for title
          const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
          let title = path.basename(filePath, '.md');
          if (frontmatterMatch) {
            const frontmatter = this.parseFrontmatter(frontmatterMatch[1]);
            title = frontmatter.title || title;
          }
          
          const pathParts = relativePath.split('/');
          const isSpanish = relativePath.startsWith('es/');
          const section = isSpanish ? pathParts[1] : pathParts[0];
          
          recentFiles.push({
            id: path.basename(filePath, '.md'),
            title: title,
            section: section,
            language: isSpanish ? 'es' : 'en',
            date: fileStats.mtime,
            path: relativePath
          });
        } catch (fileError) {
          console.error(`Error processing file ${filePath}:`, fileError);
        }
      }
      
      // Sort by modification time and return most recent
      return recentFiles
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, limit);
        
    } catch (error) {
      console.error('Error getting recent content:', error);
      return [];
    }
  }

  slugify(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }
}

module.exports = HugoService;
