#!/usr/bin/env node

/**
 * Hugo to Supabase Content Migration Script
 * Parses Hugo markdown files and migrates content to Supabase
 */

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { createClient } = require('@supabase/supabase-js');
const { glob } = require('glob');

class HugoContentParser {
  constructor() {
    // Initialize Supabase client
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
    );
    
    this.contentDir = './content';
    this.staticDir = './static';
    
    // Migration statistics
    this.stats = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };

    // Content type mappings
    this.contentTypes = {
      'blog': 'hugo_posts',
      'me/work': 'hugo_projects',
      'tools': 'hugo_projects',
      'teaching-learning/sla-theory': 'hugo_academic_content',
      'teaching-learning': 'hugo_academic_content',
      'writing/poetry': 'hugo_creative_works',
      'writing': 'hugo_creative_works'
    };
  }

  /**
   * Main migration method
   */
  async migrateAll() {
    console.log('🚀 Starting Hugo to Supabase content migration...\n');
    
    try {
      // Test Supabase connection
      await this.testConnection();
      
      // Run migration phases
      await this.migrateBlogPosts();
      await this.migratePortfolioProjects();
      await this.migrateAcademicContent();
      await this.migrateCreativeWorks();
      await this.migrateSpanishContent();
      await this.createUrlMappings();
      
      // Print summary
      this.printMigrationSummary();
      
    } catch (error) {
      console.error('💥 Migration failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Test Supabase connection
   */
  async testConnection() {
    console.log('🔍 Testing Supabase connection...');
    
    try {
      const { data, error } = await this.supabase
        .from('hugo_posts')
        .select('count')
        .limit(1);
      
      if (error) throw error;
      console.log('✅ Supabase connection successful\n');
    } catch (error) {
      throw new Error(`Supabase connection failed: ${error.message}`);
    }
  }

  /**
   * Migrate blog posts from /content/blog/
   */
  async migrateBlogPosts() {
    console.log('📝 Migrating blog posts...');
    
    const blogFiles = await glob('./content/blog/*.md', { ignore: '**/index.md' });
    
    for (const file of blogFiles) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const { data: frontmatter, content: body } = matter(content);
        
        // Skip if no title
        if (!frontmatter.title) {
          console.log(`⚠️  Skipping ${file}: No title found`);
          this.stats.skipped++;
          continue;
        }

        const post = {
          title: frontmatter.title,
          slug: this.generateSlug(frontmatter.title),
          content: this.processContent(body),
          hugo_path: path.relative('./content', file),
          frontmatter: frontmatter,
          date: this.parseDate(frontmatter.date),
          draft: frontmatter.draft || false,
          author: frontmatter.author || 'Brandon JP Lambert',
          description: frontmatter.description,
          tags: Array.isArray(frontmatter.tags) ? frontmatter.tags : [],
          categories: Array.isArray(frontmatter.categories) ? frontmatter.categories : [],
          reading_time: this.calculateReadingTime(body),
          word_count: this.countWords(body),
          status: frontmatter.draft ? 'draft' : 'published',
          published_at: frontmatter.draft ? null : this.parseDate(frontmatter.date),
          language: 'en'
        };

        const { error } = await this.supabase
          .from('hugo_posts')
          .upsert(post, { onConflict: 'slug' });

        if (error) throw error;
        
        this.stats.succeeded++;
        console.log(`✅ Migrated: ${post.title}`);
        
      } catch (error) {
        this.stats.failed++;
        this.stats.errors.push({ file, error: error.message });
        console.error(`❌ Failed: ${path.basename(file)} - ${error.message}`);
      }
      
      this.stats.processed++;
    }
    
    console.log(`📝 Blog posts migration complete: ${this.stats.succeeded}/${blogFiles.length}\n`);
  }

  /**
   * Migrate portfolio projects from /content/me/work/ and /content/tools/
   */
  async migratePortfolioProjects() {
    console.log('🛠️  Migrating portfolio projects...');
    
    const projectPaths = [
      './content/me/work/*.md',
      './content/tools/**/*.md'
    ];
    
    for (const pathPattern of projectPaths) {
      const files = await glob(pathPattern, { ignore: '**/index.md' });
      
      for (const file of files) {
        try {
          const content = fs.readFileSync(file, 'utf-8');
          const { data: frontmatter, content: body } = matter(content);
          
          if (!frontmatter.title) {
            this.stats.skipped++;
            continue;
          }

          const projectType = this.determineProjectType(file);
          
          const project = {
            title: frontmatter.title,
            slug: this.generateSlug(frontmatter.title),
            description: frontmatter.description,
            content: this.processContent(body),
            hugo_path: path.relative('./content', file),
            frontmatter: frontmatter,
            project_type: projectType,
            tech_stack: frontmatter.tech_stack || frontmatter.technologies || [],
            github_url: frontmatter.github_url || frontmatter.repository,
            live_url: frontmatter.live_url || frontmatter.demo_url,
            demo_url: frontmatter.demo_url,
            repository_url: frontmatter.repository || frontmatter.github,
            featured: frontmatter.featured || false,
            tags: Array.isArray(frontmatter.tags) ? frontmatter.tags : [],
            categories: Array.isArray(frontmatter.categories) ? frontmatter.categories : [],
            language: 'en',
            status: frontmatter.draft ? 'draft' : 'active',
            date: this.parseDate(frontmatter.date)
          };

          const { error } = await this.supabase
            .from('hugo_projects')
            .upsert(project, { onConflict: 'slug' });

          if (error) throw error;
          
          this.stats.succeeded++;
          console.log(`✅ Migrated: ${project.title} (${projectType})`);
          
        } catch (error) {
          this.stats.failed++;
          this.stats.errors.push({ file, error: error.message });
          console.error(`❌ Failed: ${path.basename(file)} - ${error.message}`);
        }
        
        this.stats.processed++;
      }
    }
    
    console.log(`🛠️  Portfolio projects migration complete\n`);
  }

  /**
   * Migrate academic content from /content/teaching-learning/
   */
  async migrateAcademicContent() {
    console.log('🎓 Migrating academic content...');
    
    const academicFiles = await glob('./content/teaching-learning/**/*.md', { ignore: '**/index.md' });
    
    for (const file of academicFiles) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const { data: frontmatter, content: body } = matter(content);
        
        if (!frontmatter.title) {
          this.stats.skipped++;
          continue;
        }

        const theoryCategory = file.includes('sla-theory') ? 'sla-theory' : 'general';
        
        const academic = {
          title: frontmatter.title,
          slug: this.generateSlug(frontmatter.title),
          content: this.processContent(body),
          hugo_path: path.relative('./content', file),
          frontmatter: frontmatter,
          theory_category: theoryCategory,
          academic_level: frontmatter.level || 'intermediate',
          parent_topic: frontmatter.parent || null,
          related_topics: frontmatter.related || [],
          difficulty: frontmatter.difficulty || 3,
          tags: Array.isArray(frontmatter.tags) ? frontmatter.tags : [],
          language: 'en',
          date: this.parseDate(frontmatter.date)
        };

        const { error } = await this.supabase
          .from('hugo_academic_content')
          .upsert(academic, { onConflict: 'slug' });

        if (error) throw error;
        
        this.stats.succeeded++;
        console.log(`✅ Migrated: ${academic.title} (${theoryCategory})`);
        
      } catch (error) {
        this.stats.failed++;
        this.stats.errors.push({ file, error: error.message });
        console.error(`❌ Failed: ${path.basename(file)} - ${error.message}`);
      }
      
      this.stats.processed++;
    }
    
    console.log(`🎓 Academic content migration complete\n`);
  }

  /**
   * Migrate creative works from /content/writing/
   */
  async migrateCreativeWorks() {
    console.log('✍️  Migrating creative works...');
    
    const creativeFiles = await glob('./content/writing/**/*.md', { ignore: '**/index.md' });
    
    for (const file of creativeFiles) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const { data: frontmatter, content: body } = matter(content);
        
        if (!frontmatter.title) {
          this.stats.skipped++;
          continue;
        }

        const workType = file.includes('poetry') ? 'poetry' : 'prose';
        
        const creative = {
          title: frontmatter.title,
          slug: this.generateSlug(frontmatter.title),
          content: this.processContent(body),
          hugo_path: path.relative('./content', file),
          frontmatter: frontmatter,
          work_type: workType,
          original_language: frontmatter.language || 'en',
          translation: this.extractTranslation(body),
          style_notes: frontmatter.style_notes,
          themes: frontmatter.themes || [],
          tags: Array.isArray(frontmatter.tags) ? frontmatter.tags : [],
          mood: frontmatter.mood,
          date: this.parseDate(frontmatter.date),
          featured: frontmatter.featured || false,
          language: frontmatter.language || 'en'
        };

        const { error } = await this.supabase
          .from('hugo_creative_works')
          .upsert(creative, { onConflict: 'slug' });

        if (error) throw error;
        
        this.stats.succeeded++;
        console.log(`✅ Migrated: ${creative.title} (${workType})`);
        
      } catch (error) {
        this.stats.failed++;
        this.stats.errors.push({ file, error: error.message });
        console.error(`❌ Failed: ${path.basename(file)} - ${error.message}`);
      }
      
      this.stats.processed++;
    }
    
    console.log(`✍️  Creative works migration complete\n`);
  }

  /**
   * Migrate Spanish content from /content/es/
   */
  async migrateSpanishContent() {
    console.log('🇪🇸 Migrating Spanish content...');
    
    const spanishFiles = await glob('./content/es/**/*.md', { ignore: '**/index.md' });
    
    for (const file of spanishFiles) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const { data: frontmatter, content: body } = matter(content);
        
        if (!frontmatter.title) {
          this.stats.skipped++;
          continue;
        }

        // Determine content type based on path
        let targetTable = 'hugo_posts';
        if (file.includes('/es/tools/') || file.includes('/es/me/')) {
          targetTable = 'hugo_projects';
        } else if (file.includes('/es/writing/')) {
          targetTable = 'hugo_creative_works';
        } else if (file.includes('/es/teaching-learning/')) {
          targetTable = 'hugo_academic_content';
        }

        const spanishContent = {
          title: frontmatter.title,
          slug: this.generateSlug(frontmatter.title) + '-es',
          content: this.processContent(body),
          hugo_path: path.relative('./content', file),
          frontmatter: frontmatter,
          language: 'es',
          tags: Array.isArray(frontmatter.tags) ? frontmatter.tags : [],
          categories: Array.isArray(frontmatter.categories) ? frontmatter.categories : [],
          date: this.parseDate(frontmatter.date)
        };

        // Add table-specific fields
        if (targetTable === 'hugo_projects') {
          spanishContent.project_type = this.determineProjectType(file);
          spanishContent.status = 'active';
        } else if (targetTable === 'hugo_creative_works') {
          spanishContent.work_type = 'poetry';
          spanishContent.original_language = 'es';
        } else if (targetTable === 'hugo_academic_content') {
          spanishContent.theory_category = 'general';
          spanishContent.difficulty = 3;
        } else {
          spanishContent.author = 'Brandon JP Lambert';
          spanishContent.status = 'published';
          spanishContent.published_at = spanishContent.date;
        }

        const { error } = await this.supabase
          .from(targetTable)
          .upsert(spanishContent, { onConflict: 'slug' });

        if (error) throw error;
        
        this.stats.succeeded++;
        console.log(`✅ Migrated: ${spanishContent.title} (ES)`);
        
      } catch (error) {
        this.stats.failed++;
        this.stats.errors.push({ file, error: error.message });
        console.error(`❌ Failed: ${path.basename(file)} - ${error.message}`);
      }
      
      this.stats.processed++;
    }
    
    console.log(`🇪🇸 Spanish content migration complete\n`);
  }

  /**
   * Create URL mappings for SEO preservation
   */
  async createUrlMappings() {
    console.log('🔗 Creating URL mappings...');
    
    try {
      // Get all migrated content
      const { data: posts } = await this.supabase.from('hugo_posts').select('*');
      const { data: projects } = await this.supabase.from('hugo_projects').select('*');
      const { data: academic } = await this.supabase.from('hugo_academic_content').select('*');
      const { data: creative } = await this.supabase.from('hugo_creative_works').select('*');

      let mappingCount = 0;

      // Map blog posts
      for (const post of posts || []) {
        const hugoUrl = `/blog/${post.slug}/`;
        await this.createUrlMapping(post.hugo_path, hugoUrl, 'hugo_posts', post.id);
        mappingCount++;
      }

      // Map projects
      for (const project of projects || []) {
        const section = project.project_type === 'work' ? 'me/work' : `tools/${project.project_type}`;
        const hugoUrl = `/${section}/${project.slug}/`;
        await this.createUrlMapping(project.hugo_path, hugoUrl, 'hugo_projects', project.id);
        mappingCount++;
      }

      // Map academic content
      for (const content of academic || []) {
        const hugoUrl = `/teaching-learning/${content.theory_category || 'general'}/${content.slug}/`;
        await this.createUrlMapping(content.hugo_path, hugoUrl, 'hugo_academic_content', content.id);
        mappingCount++;
      }

      // Map creative works
      for (const work of creative || []) {
        const hugoUrl = `/writing/${work.work_type}/${work.slug}/`;
        await this.createUrlMapping(work.hugo_path, hugoUrl, 'hugo_creative_works', work.id);
        mappingCount++;
      }

      console.log(`✅ Created ${mappingCount} URL mappings\n`);
      
    } catch (error) {
      console.error(`❌ URL mapping failed: ${error.message}`);
    }
  }

  /**
   * Create individual URL mapping
   */
  async createUrlMapping(hugoPath, hugoUrl, supabaseTable, supabaseId) {
    try {
      const mapping = {
        hugo_path: hugoPath,
        hugo_url: hugoUrl,
        supabase_table: supabaseTable,
        supabase_id: supabaseId,
        redirect_type: 301
      };

      const { error } = await this.supabase
        .from('hugo_url_mappings')
        .upsert(mapping, { onConflict: 'hugo_path' });

      if (error) throw error;
      
    } catch (error) {
      console.error(`Failed to create URL mapping for ${hugoPath}:`, error.message);
    }
  }

  /**
   * Utility functions
   */
  
  generateSlug(title) {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  parseDate(dateString) {
    if (!dateString) return new Date();
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? new Date() : date;
  }

  calculateReadingTime(content) {
    const wordsPerMinute = 200;
    const words = this.countWords(content);
    return Math.ceil(words / wordsPerMinute);
  }

  countWords(content) {
    return content.trim().split(/\s+/).length;
  }

  processContent(content) {
    // Process markdown content, handle shortcodes, etc.
    return content
      .replace(/{{< ([^>]+) >}}/g, '') // Remove Hugo shortcodes for now
      .trim();
  }

  determineProjectType(filePath) {
    if (filePath.includes('tools/built')) return 'built';
    if (filePath.includes('tools/strategies')) return 'strategies';
    if (filePath.includes('tools/what-i-use')) return 'resources';
    if (filePath.includes('me/work')) return 'work';
    return 'project';
  }

  extractTranslation(content) {
    // Extract translation from bilingual content
    const translationMatch = content.match(/<div class="poem-translation">(.*?)<\/div>/s);
    return translationMatch ? translationMatch[1].trim() : null;
  }

  printMigrationSummary() {
    console.log('\n📊 MIGRATION SUMMARY');
    console.log('==========================================');
    console.log(`Total files processed: ${this.stats.processed}`);
    console.log(`Successfully migrated: ${this.stats.succeeded}`);
    console.log(`Failed migrations: ${this.stats.failed}`);
    console.log(`Skipped files: ${this.stats.skipped}`);
    
    if (this.stats.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      this.stats.errors.forEach(({ file, error }) => {
        console.log(`  ${path.basename(file)}: ${error}`);
      });
    }
    
    console.log('\n🎉 Migration completed!');
  }
}

// CLI execution
if (require.main === module) {
  const parser = new HugoContentParser();
  parser.migrateAll().catch(console.error);
}

module.exports = HugoContentParser;