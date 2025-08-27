#!/usr/bin/env node

/**
 * Hugo Content Migration Script
 * Migrates Hugo content from markdown files to Supabase database
 * 
 * Usage: node scripts/migrate-content.js [--dry-run] [--content-type=blog|poetry|projects|all]
 * 
 * Features:
 * - Migrates blog posts from content/blog/*.md
 * - Migrates poetry from content/writing/poetry/*.md  
 * - Migrates projects from data/projects.json
 * - Handles frontmatter parsing and content processing
 * - Supports dry-run mode for testing
 * - Creates appropriate slugs and metadata
 * - Handles bilingual content (English/Spanish)
 */

const fs = require('fs').promises;
const path = require('path');
const matter = require('gray-matter');
const { createClient } = require('@supabase/supabase-js');

// Configuration
const CONTENT_PATHS = {
  blog: path.join(__dirname, '..', 'content', 'blog'),
  poetry: path.join(__dirname, '..', 'content', 'writing', 'poetry'),
  projects: path.join(__dirname, '..', 'data', 'projects.json')
};

class ContentMigrator {
  constructor() {
    this.supabase = null;
    this.dryRun = process.argv.includes('--dry-run');
    this.contentType = this.getContentTypeFilter();
    this.results = {
      blogPosts: { success: 0, errors: [] },
      poetry: { success: 0, errors: [] },
      projects: { success: 0, errors: [] }
    };
  }

  getContentTypeFilter() {
    const typeArg = process.argv.find(arg => arg.startsWith('--content-type='));
    return typeArg ? typeArg.split('=')[1] : 'all';
  }

  async initialize() {
    console.log('🚀 Initializing Hugo Content Migration...\n');
    
    if (this.dryRun) {
      console.log('🔍 DRY RUN MODE - No database connection needed');
      console.log(`📁 Content Filter: ${this.contentType}\n`);
      return;
    }
    
    // Initialize Supabase client for live migrations
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('❌ Supabase credentials not found. Please check environment variables.');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log(`✅ Connected to Supabase: ${supabaseUrl}`);
    console.log(`📋 Mode: LIVE MIGRATION`);
    console.log(`📁 Content Filter: ${this.contentType}\n`);
  }

  /**
   * Generate URL-friendly slug from title
   */
  generateSlug(title) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim('-'); // Remove leading/trailing hyphens
  }

  /**
   * Calculate reading time for blog posts
   */
  calculateReadingTime(content) {
    const wordsPerMinute = 200;
    const wordCount = content.split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute);
  }

  /**
   * Format project content from structured data
   */
  formatProjectContent(project) {
    let content = project.longDescription || project.description;
    
    // Add features section
    if (project.features && project.features.length > 0) {
      content += '\n\n## Key Features\n\n';
      project.features.forEach(feature => {
        content += `- ${feature}\n`;
      });
    }
    
    // Add challenges section
    if (project.challenges && project.challenges.length > 0) {
      content += '\n\n## Technical Challenges\n\n';
      project.challenges.forEach(challenge => {
        content += `- ${challenge}\n`;
      });
    }
    
    // Add technologies section
    if (project.technologies && project.technologies.length > 0) {
      content += '\n\n## Technologies Used\n\n';
      content += project.technologies.join(', ');
    }
    
    return content;
  }

  /**
   * Map project type to database enum
   */
  mapProjectType(type) {
    const typeMap = {
      'Web Development': 'web',
      'Full Stack': 'web',
      'Web Application': 'web',
      'Mobile Development': 'mobile',
      'Machine Learning': 'api',
      'Blockchain': 'other'
    };
    
    return typeMap[type] || 'web';
  }

  /**
   * Parse markdown content and extract frontmatter
   */
  parseMarkdownFile(filePath, fileContent) {
    try {
      const parsed = matter(fileContent);
      return {
        frontmatter: parsed.data,
        content: parsed.content,
        isEmpty: parsed.isEmpty
      };
    } catch (error) {
      console.error(`❌ Error parsing ${filePath}:`, error.message);
      return null;
    }
  }

  /**
   * Migrate blog posts from content/blog/*.md
   */
  async migrateBlogPosts() {
    if (this.contentType !== 'all' && this.contentType !== 'blog') {
      return;
    }

    console.log('📰 Migrating Blog Posts...\n');

    try {
      const files = await fs.readdir(CONTENT_PATHS.blog);
      const markdownFiles = files.filter(file => 
        file.endsWith('.md') && !file.startsWith('_index')
      );

      console.log(`Found ${markdownFiles.length} blog post files`);

      for (const file of markdownFiles) {
        const filePath = path.join(CONTENT_PATHS.blog, file);
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const parsed = this.parseMarkdownFile(filePath, fileContent);

        if (!parsed) {
          this.results.blogPosts.errors.push(`Failed to parse ${file}`);
          continue;
        }

        const { frontmatter, content } = parsed;

        // Prepare blog post data
        const blogPost = {
          title: frontmatter.title || path.basename(file, '.md'),
          slug: this.generateSlug(frontmatter.title || path.basename(file, '.md')),
          content: content,
          excerpt: frontmatter.description || content.substring(0, 200) + '...',
          status: frontmatter.draft === false ? 'published' : 'draft',
          tags: Array.isArray(frontmatter.tags) ? frontmatter.tags : [],
          categories: Array.isArray(frontmatter.categories) ? frontmatter.categories : [],
          reading_time: this.calculateReadingTime(content),
          seo_title: frontmatter.title,
          seo_description: frontmatter.description,
          seo_keywords: Array.isArray(frontmatter.tags) ? frontmatter.tags : [],
          published_at: frontmatter.date ? new Date(frontmatter.date).toISOString() : new Date().toISOString(),
          metadata: {
            author: frontmatter.author,
            original_file: file,
            language: frontmatter.language || 'en',
            type: frontmatter.type || 'blog_post'
          },
          // Note: user_id would need to be set based on your auth system
          user_id: null // This should be replaced with actual user UUID
        };

        console.log(`  📄 Processing: ${blogPost.title}`);

        if (!this.dryRun) {
          try {
            const { data, error } = await this.supabase
              .from('blog_posts')
              .insert([blogPost])
              .select();

            if (error) {
              console.error(`    ❌ Error inserting ${file}:`, error.message);
              this.results.blogPosts.errors.push(`${file}: ${error.message}`);
            } else {
              console.log(`    ✅ Successfully migrated: ${blogPost.title}`);
              this.results.blogPosts.success++;
            }
          } catch (error) {
            console.error(`    ❌ Database error for ${file}:`, error.message);
            this.results.blogPosts.errors.push(`${file}: ${error.message}`);
          }
        } else {
          console.log(`    🔍 [DRY RUN] Would insert:`, {
            title: blogPost.title,
            slug: blogPost.slug,
            tags: blogPost.tags,
            categories: blogPost.categories
          });
          this.results.blogPosts.success++;
        }
      }

    } catch (error) {
      console.error('❌ Error reading blog posts directory:', error.message);
      this.results.blogPosts.errors.push(`Directory error: ${error.message}`);
    }
  }

  /**
   * Migrate poetry from content/writing/poetry/*.md
   * Note: Poetry will be stored in blog_posts table with type='poetry'
   */
  async migratePoetry() {
    if (this.contentType !== 'all' && this.contentType !== 'poetry') {
      return;
    }

    console.log('\n🎭 Migrating Poetry...\n');

    try {
      const files = await fs.readdir(CONTENT_PATHS.poetry);
      const markdownFiles = files.filter(file => 
        file.endsWith('.md') && !file.startsWith('_index')
      );

      console.log(`Found ${markdownFiles.length} poetry files`);

      for (const file of markdownFiles) {
        const filePath = path.join(CONTENT_PATHS.poetry, file);
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const parsed = this.parseMarkdownFile(filePath, fileContent);

        if (!parsed) {
          this.results.poetry.errors.push(`Failed to parse ${file}`);
          continue;
        }

        const { frontmatter, content } = parsed;

        // Prepare poetry data (stored as blog_posts with type='poetry')
        const poem = {
          title: frontmatter.title || path.basename(file, '.md'),
          slug: this.generateSlug(frontmatter.title || path.basename(file, '.md')),
          content: content,
          excerpt: frontmatter.description || content.substring(0, 200) + '...',
          status: frontmatter.draft === false ? 'published' : 'draft',
          tags: Array.isArray(frontmatter.tags) ? frontmatter.tags : [],
          categories: Array.isArray(frontmatter.categories) ? frontmatter.categories : [],
          reading_time: Math.max(1, this.calculateReadingTime(content)), // Poetry minimum 1 minute
          seo_title: frontmatter.title,
          seo_description: frontmatter.description,
          seo_keywords: Array.isArray(frontmatter.tags) ? frontmatter.tags : [],
          published_at: frontmatter.date ? new Date(frontmatter.date).toISOString() : new Date().toISOString(),
          metadata: {
            author: frontmatter.author || 'Brandon JP Lambert',
            original_file: file,
            language: frontmatter.language || 'en',
            type: 'poetry',
            bilingual: content.includes('poem-translation'),
            has_translation: content.includes('poem-translation')
          },
          user_id: null // This should be replaced with actual user UUID
        };

        console.log(`  🎨 Processing: ${poem.title}`);

        if (!this.dryRun) {
          try {
            const { data, error } = await this.supabase
              .from('blog_posts')
              .insert([poem])
              .select();

            if (error) {
              console.error(`    ❌ Error inserting ${file}:`, error.message);
              this.results.poetry.errors.push(`${file}: ${error.message}`);
            } else {
              console.log(`    ✅ Successfully migrated: ${poem.title}`);
              this.results.poetry.success++;
            }
          } catch (error) {
            console.error(`    ❌ Database error for ${file}:`, error.message);
            this.results.poetry.errors.push(`${file}: ${error.message}`);
          }
        } else {
          console.log(`    🔍 [DRY RUN] Would insert:`, {
            title: poem.title,
            slug: poem.slug,
            type: 'poetry',
            language: poem.metadata.language,
            bilingual: poem.metadata.bilingual
          });
          this.results.poetry.success++;
        }
      }

    } catch (error) {
      console.error('❌ Error reading poetry directory:', error.message);
      this.results.poetry.errors.push(`Directory error: ${error.message}`);
    }
  }

  /**
   * Migrate projects from data/projects.json
   */
  async migrateProjects() {
    if (this.contentType !== 'all' && this.contentType !== 'projects') {
      return;
    }

    console.log('\n🚀 Migrating Projects...\n');

    try {
      const projectsContent = await fs.readFile(CONTENT_PATHS.projects, 'utf-8');
      const projectsData = JSON.parse(projectsContent);
      
      if (!projectsData.projects || !Array.isArray(projectsData.projects)) {
        throw new Error('Invalid projects.json structure');
      }

      console.log(`Found ${projectsData.projects.length} projects`);

      for (const project of projectsData.projects) {
        // Prepare project data for database
        const projectRecord = {
          title: project.title,
          slug: project.slug || this.generateSlug(project.title),
          description: project.longDescription || project.description,
          content: this.formatProjectContent(project),
          short_description: project.description,
          status: project.status?.toLowerCase() === 'completed' ? 'published' : 'draft',
          featured: project.featured || false,
          technologies: Array.isArray(project.technologies) ? project.technologies : [],
          project_type: this.mapProjectType(project.type),
          demo_url: project.demo && project.demo !== '/' ? project.demo : null,
          live_url: project.link && project.link !== '/' ? project.link : null,
          github_url: project.github || null,
          sort_order: project.order || 0,
          seo_title: project.title,
          seo_description: project.description,
          metadata: {
            original_id: project.id,
            project_type: project.type,
            status: project.status,
            features: project.features || [],
            challenges: project.challenges || [],
            image: project.image,
            gallery: project.gallery || [],
            order: project.order
          },
          user_id: null // This should be replaced with actual user UUID
        };

        console.log(`  🛠️  Processing: ${projectRecord.title}`);

        if (!this.dryRun) {
          try {
            const { data, error } = await this.supabase
              .from('projects')
              .insert([projectRecord])
              .select();

            if (error) {
              console.error(`    ❌ Error inserting project ${project.id}:`, error.message);
              this.results.projects.errors.push(`${project.id}: ${error.message}`);
            } else {
              console.log(`    ✅ Successfully migrated: ${projectRecord.title}`);
              this.results.projects.success++;
            }
          } catch (error) {
            console.error(`    ❌ Database error for project ${project.id}:`, error.message);
            this.results.projects.errors.push(`${project.id}: ${error.message}`);
          }
        } else {
          console.log(`    🔍 [DRY RUN] Would insert:`, {
            title: projectRecord.title,
            slug: projectRecord.slug,
            technologies: projectRecord.technologies,
            featured: projectRecord.featured
          });
          this.results.projects.success++;
        }
      }

    } catch (error) {
      console.error('❌ Error reading projects.json:', error.message);
      this.results.projects.errors.push(`Projects file error: ${error.message}`);
    }
  }

  /**
   * Print migration summary
   */
  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    
    const total = {
      success: this.results.blogPosts.success + this.results.poetry.success + this.results.projects.success,
      errors: this.results.blogPosts.errors.length + this.results.poetry.errors.length + this.results.projects.errors.length
    };

    console.log(`\n📰 Blog Posts: ${this.results.blogPosts.success} successful, ${this.results.blogPosts.errors.length} errors`);
    console.log(`🎭 Poetry: ${this.results.poetry.success} successful, ${this.results.poetry.errors.length} errors`);
    console.log(`🚀 Projects: ${this.results.projects.success} successful, ${this.results.projects.errors.length} errors`);
    console.log(`\n📈 Total: ${total.success} successful, ${total.errors} errors`);

    // Print errors if any
    const allErrors = [
      ...this.results.blogPosts.errors.map(e => `Blog: ${e}`),
      ...this.results.poetry.errors.map(e => `Poetry: ${e}`),
      ...this.results.projects.errors.map(e => `Project: ${e}`)
    ];

    if (allErrors.length > 0) {
      console.log('\n❌ ERRORS:');
      allErrors.forEach(error => console.log(`  • ${error}`));
    }

    console.log('\n' + '='.repeat(60));

    if (this.dryRun) {
      console.log('🔍 This was a DRY RUN - no data was actually inserted into the database.');
      console.log('💡 Run without --dry-run to perform the actual migration.');
    } else {
      console.log('✅ Migration completed!');
    }
  }

  /**
   * Run the complete migration process
   */
  async run() {
    try {
      await this.initialize();
      
      // Run migrations based on content type filter
      await this.migrateBlogPosts();
      await this.migratePoetry();
      await this.migrateProjects();
      
      this.printSummary();
      
    } catch (error) {
      console.error('💥 Migration failed:', error.message);
      process.exit(1);
    }
  }
}

// Help text
function showHelp() {
  console.log(`
Hugo Content Migration Script
============================

Usage: node scripts/migrate-content.js [options]

Options:
  --dry-run                    Run in dry-run mode (no database changes)
  --content-type=TYPE          Migrate specific content type (blog|poetry|projects|all)
  --help                       Show this help message

Examples:
  node scripts/migrate-content.js --dry-run
  node scripts/migrate-content.js --content-type=blog
  node scripts/migrate-content.js --content-type=poetry --dry-run

Environment Variables:
  SUPABASE_URL                 Your Supabase project URL
  SUPABASE_ANON_KEY           Your Supabase anon key
  (or VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY)

Before running:
1. Ensure Supabase environment variables are set
2. Ensure database migrations have been run
3. Consider running with --dry-run first to test

Content Sources:
- Blog Posts: content/blog/*.md
- Poetry: content/writing/poetry/*.md  
- Projects: data/projects.json
`);
}

// Main execution
if (require.main === module) {
  if (process.argv.includes('--help')) {
    showHelp();
    process.exit(0);
  }

  const migrator = new ContentMigrator();
  migrator.run().catch(error => {
    console.error('💥 Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = ContentMigrator;