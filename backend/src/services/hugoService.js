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
      bySection: {},
      byLanguage: { en: 0, es: 0 },
      drafts: 0,
      published: 0,
    };

    const enFiles = await this.listContent('', 'en');
    const esFiles = await this.listContent('', 'es');

    stats.byLanguage.en = enFiles.length;
    stats.byLanguage.es = esFiles.length;
    stats.total = enFiles.length + esFiles.length;

    return stats;
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
