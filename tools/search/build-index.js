// tools/search/build-index.js

const fs = require('fs').promises;
const path = require('path');
const glob = require('glob').sync;
const matter = require('gray-matter');
const chalk = require('chalk');
const ora = require('ora');

class SearchIndexBuilder {
  constructor(options = {}) {
    this.options = {
      contentDir: options.contentDir || 'content',
      outputPath: options.outputPath || 'static/search-index.json',
      excludePatterns: options.excludePatterns || ['**/draft/**', '**/_index.md'],
      languages: options.languages || ['en', 'es'],
      ...options
    };
  }

  async build() {
    const spinner = ora('Building search index...').start();
    
    try {
      const documents = [];
      
      // Process English content (default)
      const enDocs = await this.processLanguage('en');
      documents.push(...enDocs);
      
      // Process Spanish content if it exists
      const esPath = path.join(this.options.contentDir, 'es');
      if (require('fs').existsSync(esPath)) {
        const esDocs = await this.processLanguage('es');
        documents.push(...esDocs);
      }
      
      // Sort by date
      documents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      // Write index file
      await this.writeIndex(documents);
      
      spinner.succeed(chalk.green(`✓ Search index built with ${documents.length} documents`));
      
      // Print statistics
      this.printStatistics(documents);
      
      return documents;
    } catch (error) {
      spinner.fail(chalk.red(`✗ Failed to build search index: ${error.message}`));
      throw error;
    }
  }

  async processLanguage(lang) {
    const documents = [];
    const basePath = lang === 'en' ? this.options.contentDir : path.join(this.options.contentDir, lang);
    
    // Find all markdown files
    const pattern = path.join(basePath, '**/*.md').replace(/\\/g, '/');
    const files = glob(pattern, {
      ignore: this.options.excludePatterns
    });
    
    for (const file of files) {
      try {
        const doc = await this.processFile(file, lang);
        if (doc) {
          documents.push(doc);
        }
      } catch (error) {
        console.warn(chalk.yellow(`Warning: Failed to process ${file}: ${error.message}`));
      }
    }
    
    return documents;
  }

  async processFile(filePath, lang) {
    // Read file
    const content = await fs.readFile(filePath, 'utf-8');
    const { data: frontmatter, content: markdown } = matter(content);
    
    // Skip drafts
    if (frontmatter.draft === true) {
      return null;
    }
    
    // Extract plain text (simple markdown removal)
    const plainText = markdown
      .replace(/{{<[^>]+>}}/g, '') // Remove Hugo shortcodes
      .replace(/{{%[^%]+%}}/g, '') // Remove Hugo shortcodes
      .replace(/<!--[\s\S]*?-->/g, '') // Remove HTML comments
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/`[^`]+`/g, '') // Remove inline code
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links to text
      .replace(/#{1,6}\s+/g, '') // Remove headers
      .replace(/[*_~]+/g, '') // Remove emphasis
      .replace(/\n{3,}/g, '\n\n') // Clean up whitespace
      .trim();
    
    // Generate URL
    const url = this.generateUrl(filePath, lang);
    
    // Extract section from path
    const section = this.extractSection(filePath);
    
    // Create document
    const document = {
      id: this.generateId(filePath),
      title: frontmatter.title || 'Untitled',
      description: frontmatter.description || frontmatter.summary || '',
      content: this.truncateContent(plainText, 500),
      tags: frontmatter.tags || [],
      categories: frontmatter.categories || [],
      section: section,
      url: url,
      date: frontmatter.date || new Date().toISOString(),
      lastmod: frontmatter.lastmod || frontmatter.date || new Date().toISOString(),
      language: lang,
      image: frontmatter.featuredImage || frontmatter.image || null,
      format: frontmatter.format || null,
      type: frontmatter.type || null
    };
    
    return document;
  }

  generateId(filePath) {
    return filePath
      .replace(/\\/g, '/')
      .replace(/^content\//, '')
      .replace(/\.md$/, '')
      .replace(/\//g, '-');
  }

  generateUrl(filePath, lang) {
    let url = filePath
      .replace(/\\/g, '/')
      .replace(/^content/, '')
      .replace(/\.md$/, '/');
    
    // Handle language prefix
    if (lang !== 'en') {
      if (!url.startsWith(`/${lang}/`)) {
        url = `/${lang}${url}`;
      }
    }
    
    // Clean up duplicate slashes
    url = url.replace(/\/+/g, '/');
    
    // Remove index from URLs
    url = url.replace(/\/index\/$/, '/');
    
    return url;
  }

  extractSection(filePath) {
    const parts = filePath.replace(/\\/g, '/').split('/');
    
    // Find the section (usually the first directory after content)
    for (let i = 0; i < parts.length; i++) {
      if (parts[i] === 'content') {
        if (parts[i + 1] && parts[i + 1] !== 'content') {
          // Check if it's a language directory
          if (['en', 'es', 'fr', 'de'].includes(parts[i + 1])) {
            return parts[i + 2] || 'page';
          }
          return parts[i + 1];
        }
      }
    }
    
    return 'page';
  }

  truncateContent(text, maxLength) {
    if (text.length <= maxLength) {
      return text;
    }
    
    // Truncate at word boundary
    const truncated = text.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    
    if (lastSpace > 0) {
      return truncated.substring(0, lastSpace) + '...';
    }
    
    return truncated + '...';
  }

  async writeIndex(documents) {
    // Ensure output directory exists
    const outputDir = path.dirname(this.options.outputPath);
    await fs.mkdir(outputDir, { recursive: true });
    
    // Write JSON file
    const json = JSON.stringify(documents, null, 2);
    await fs.writeFile(this.options.outputPath, json, 'utf-8');
    
    // Also write a minified version
    const minifiedPath = this.options.outputPath.replace('.json', '.min.json');
    await fs.writeFile(minifiedPath, JSON.stringify(documents), 'utf-8');
  }

  printStatistics(documents) {
    console.log(chalk.cyan('\n📊 Search Index Statistics:'));
    console.log(chalk.white(`   Total documents: ${documents.length}`));
    
    // Count by section
    const sections = {};
    documents.forEach(doc => {
      sections[doc.section] = (sections[doc.section] || 0) + 1;
    });
    
    console.log(chalk.cyan('\n   By Section:'));
    Object.entries(sections).forEach(([section, count]) => {
      console.log(chalk.white(`     ${section}: ${count}`));
    });
  }
}

// CLI execution
if (require.main === module) {
  const builder = new SearchIndexBuilder();
  
  builder.build()
    .then(() => {
      console.log(chalk.green('\n✅ Search index build complete!'));
      process.exit(0);
    })
    .catch(error => {
      console.error(chalk.red('\n❌ Search index build failed:'), error);
      process.exit(1);
    });
}

module.exports = SearchIndexBuilder;
