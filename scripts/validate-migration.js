#!/usr/bin/env node

/**
 * Hugo to Supabase Migration Validation Script
 * Validates the success and integrity of the migration process
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const { glob } = require('glob');
const matter = require('gray-matter');

class MigrationValidator {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
    );
    
    this.contentDir = './content';
    this.validation = {
      totalFiles: 0,
      migratedFiles: 0,
      missingFiles: 0,
      corruptedFiles: 0,
      urlMappings: 0,
      mediaMigrated: 0,
      errors: [],
      warnings: []
    };
  }

  /**
   * Run complete validation
   */
  async validateAll() {
    console.log('🔍 Starting migration validation...\n');
    
    try {
      await this.testConnection();
      await this.validateContentMigration();
      await this.validateUrlMappings();
      await this.validateMediaMigration();
      await this.validateDataIntegrity();
      await this.generateValidationReport();
      
    } catch (error) {
      console.error('💥 Validation failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Test database connection
   */
  async testConnection() {
    console.log('🔗 Testing Supabase connection...');
    
    try {
      const { data, error } = await this.supabase
        .from('hugo_posts')
        .select('count')
        .limit(1);
      
      if (error) throw error;
      console.log('✅ Connection successful\n');
    } catch (error) {
      throw new Error(`Connection failed: ${error.message}`);
    }
  }

  /**
   * Validate content migration
   */
  async validateContentMigration() {
    console.log('📝 Validating content migration...');
    
    // Get all Hugo markdown files
    const allFiles = await glob('./content/**/*.md', { ignore: '**/index.md' });
    this.validation.totalFiles = allFiles.length;
    
    // Check each content type
    await this.validateBlogPosts();
    await this.validateProjects();
    await this.validateAcademicContent();
    await this.validateCreativeWorks();
    
    console.log(`📊 Content validation: ${this.validation.migratedFiles}/${this.validation.totalFiles} files migrated\n`);
  }

  /**
   * Validate blog posts migration
   */
  async validateBlogPosts() {
    const blogFiles = await glob('./content/blog/*.md', { ignore: '**/index.md' });
    
    for (const file of blogFiles) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const { data: frontmatter } = matter(content);
        
        if (!frontmatter.title) continue;
        
        const slug = this.generateSlug(frontmatter.title);
        const { data, error } = await this.supabase
          .from('hugo_posts')
          .select('*')
          .eq('slug', slug)
          .single();
          
        if (error || !data) {
          this.validation.missingFiles++;
          this.validation.errors.push(`Missing blog post: ${frontmatter.title} (${file})`);
        } else {
          this.validation.migratedFiles++;
          await this.validatePostIntegrity(data, frontmatter, file);
        }
        
      } catch (error) {
        this.validation.corruptedFiles++;
        this.validation.errors.push(`Corrupted file: ${file} - ${error.message}`);
      }
    }
  }

  /**
   * Validate projects migration
   */
  async validateProjects() {
    const projectPaths = [
      './content/me/work/*.md',
      './content/tools/**/*.md'
    ];
    
    for (const pathPattern of projectPaths) {
      const files = await glob(pathPattern, { ignore: '**/index.md' });
      
      for (const file of files) {
        try {
          const content = fs.readFileSync(file, 'utf-8');
          const { data: frontmatter } = matter(content);
          
          if (!frontmatter.title) continue;
          
          const slug = this.generateSlug(frontmatter.title);
          const { data, error } = await this.supabase
            .from('hugo_projects')
            .select('*')
            .eq('slug', slug)
            .single();
            
          if (error || !data) {
            this.validation.missingFiles++;
            this.validation.errors.push(`Missing project: ${frontmatter.title} (${file})`);
          } else {
            this.validation.migratedFiles++;
            await this.validateProjectIntegrity(data, frontmatter, file);
          }
          
        } catch (error) {
          this.validation.corruptedFiles++;
          this.validation.errors.push(`Corrupted project file: ${file} - ${error.message}`);
        }
      }
    }
  }

  /**
   * Validate academic content migration
   */
  async validateAcademicContent() {
    const academicFiles = await glob('./content/teaching-learning/**/*.md', { ignore: '**/index.md' });
    
    for (const file of academicFiles) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const { data: frontmatter } = matter(content);
        
        if (!frontmatter.title) continue;
        
        const slug = this.generateSlug(frontmatter.title);
        const { data, error } = await this.supabase
          .from('hugo_academic_content')
          .select('*')
          .eq('slug', slug)
          .single();
          
        if (error || !data) {
          this.validation.missingFiles++;
          this.validation.errors.push(`Missing academic content: ${frontmatter.title} (${file})`);
        } else {
          this.validation.migratedFiles++;
        }
        
      } catch (error) {
        this.validation.corruptedFiles++;
        this.validation.errors.push(`Corrupted academic file: ${file} - ${error.message}`);
      }
    }
  }

  /**
   * Validate creative works migration
   */
  async validateCreativeWorks() {
    const creativeFiles = await glob('./content/writing/**/*.md', { ignore: '**/index.md' });
    
    for (const file of creativeFiles) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const { data: frontmatter } = matter(content);
        
        if (!frontmatter.title) continue;
        
        const slug = this.generateSlug(frontmatter.title);
        const { data, error } = await this.supabase
          .from('hugo_creative_works')
          .select('*')
          .eq('slug', slug)
          .single();
          
        if (error || !data) {
          this.validation.missingFiles++;
          this.validation.errors.push(`Missing creative work: ${frontmatter.title} (${file})`);
        } else {
          this.validation.migratedFiles++;
        }
        
      } catch (error) {
        this.validation.corruptedFiles++;
        this.validation.errors.push(`Corrupted creative file: ${file} - ${error.message}`);
      }
    }
  }

  /**
   * Validate post data integrity
   */
  async validatePostIntegrity(dbData, frontmatter, filePath) {
    const issues = [];
    
    // Check title matches
    if (dbData.title !== frontmatter.title) {
      issues.push(`Title mismatch: DB="${dbData.title}" vs File="${frontmatter.title}"`);
    }
    
    // Check date parsing
    const fileDate = new Date(frontmatter.date);
    const dbDate = new Date(dbData.date);
    if (Math.abs(fileDate - dbDate) > 86400000) { // More than 1 day difference
      issues.push(`Date mismatch: DB="${dbDate}" vs File="${fileDate}"`);
    }
    
    // Check tags
    const fileTags = frontmatter.tags || [];
    const dbTags = dbData.tags || [];
    if (JSON.stringify(fileTags.sort()) !== JSON.stringify(dbTags.sort())) {
      issues.push(`Tags mismatch: DB=[${dbTags.join(', ')}] vs File=[${fileTags.join(', ')}]`);
    }
    
    // Check status
    const expectedStatus = frontmatter.draft ? 'draft' : 'published';
    if (dbData.status !== expectedStatus) {
      issues.push(`Status mismatch: DB="${dbData.status}" vs Expected="${expectedStatus}"`);
    }
    
    if (issues.length > 0) {
      this.validation.warnings.push(`Integrity issues in ${path.basename(filePath)}: ${issues.join('; ')}`);
    }
  }

  /**
   * Validate project data integrity
   */
  async validateProjectIntegrity(dbData, frontmatter, filePath) {
    const issues = [];
    
    if (dbData.title !== frontmatter.title) {
      issues.push(`Title mismatch: DB="${dbData.title}" vs File="${frontmatter.title}"`);
    }
    
    if (dbData.description !== frontmatter.description) {
      issues.push(`Description mismatch`);
    }
    
    if (issues.length > 0) {
      this.validation.warnings.push(`Project integrity issues in ${path.basename(filePath)}: ${issues.join('; ')}`);
    }
  }

  /**
   * Validate URL mappings
   */
  async validateUrlMappings() {
    console.log('🔗 Validating URL mappings...');
    
    try {
      const { data: mappings, error } = await this.supabase
        .from('hugo_url_mappings')
        .select('*');
      
      if (error) throw error;
      
      this.validation.urlMappings = mappings?.length || 0;
      
      // Validate each mapping
      for (const mapping of mappings || []) {
        try {
          const { data, error: lookupError } = await this.supabase
            .from(mapping.supabase_table)
            .select('id')
            .eq('id', mapping.supabase_id)
            .single();
          
          if (lookupError || !data) {
            this.validation.errors.push(`Broken URL mapping: ${mapping.hugo_url} -> ${mapping.supabase_table}[${mapping.supabase_id}]`);
          }
        } catch (error) {
          this.validation.errors.push(`URL mapping validation error: ${mapping.hugo_url} - ${error.message}`);
        }
      }
      
      console.log(`✅ URL mappings validated: ${this.validation.urlMappings} mappings\n`);
      
    } catch (error) {
      this.validation.errors.push(`URL mapping validation failed: ${error.message}`);
    }
  }

  /**
   * Validate media migration
   */
  async validateMediaMigration() {
    console.log('📸 Validating media migration...');
    
    try {
      const { data: mediaMigrations, error } = await this.supabase
        .from('hugo_media_migration')
        .select('*');
      
      if (error) throw error;
      
      const successful = mediaMigrations?.filter(m => m.migration_status === 'completed') || [];
      this.validation.mediaMigrated = successful.length;
      
      // Test a few media URLs
      const sampleMedia = successful.slice(0, 5);
      for (const media of sampleMedia) {
        try {
          const response = await fetch(media.supabase_url, { method: 'HEAD' });
          if (!response.ok) {
            this.validation.warnings.push(`Media file not accessible: ${media.supabase_url}`);
          }
        } catch (error) {
          this.validation.warnings.push(`Media validation error: ${media.original_path} - ${error.message}`);
        }
      }
      
      console.log(`✅ Media migration validated: ${this.validation.mediaMigrated} files\n`);
      
    } catch (error) {
      this.validation.errors.push(`Media migration validation failed: ${error.message}`);
    }
  }

  /**
   * Validate data integrity
   */
  async validateDataIntegrity() {
    console.log('🔍 Running data integrity checks...');
    
    // Check for duplicate slugs
    await this.checkDuplicateSlugs();
    
    // Check for orphaned records
    await this.checkOrphanedRecords();
    
    // Check required fields
    await this.checkRequiredFields();
    
    console.log('✅ Data integrity checks complete\n');
  }

  /**
   * Check for duplicate slugs across tables
   */
  async checkDuplicateSlugs() {
    const tables = ['hugo_posts', 'hugo_projects', 'hugo_academic_content', 'hugo_creative_works'];
    
    for (const table of tables) {
      try {
        const { data, error } = await this.supabase
          .from(table)
          .select('slug');
          
        if (error) throw error;
        
        const slugs = data?.map(r => r.slug) || [];
        const duplicates = slugs.filter((slug, index) => slugs.indexOf(slug) !== index);
        
        if (duplicates.length > 0) {
          this.validation.errors.push(`Duplicate slugs in ${table}: ${[...new Set(duplicates)].join(', ')}`);
        }
        
      } catch (error) {
        this.validation.warnings.push(`Could not check duplicates in ${table}: ${error.message}`);
      }
    }
  }

  /**
   * Check for orphaned records
   */
  async checkOrphanedRecords() {
    // Check URL mappings point to existing records
    try {
      const { data: mappings, error } = await this.supabase
        .from('hugo_url_mappings')
        .select('*');
        
      if (error) throw error;
      
      for (const mapping of mappings || []) {
        const { data, error: checkError } = await this.supabase
          .from(mapping.supabase_table)
          .select('id')
          .eq('id', mapping.supabase_id)
          .single();
          
        if (checkError || !data) {
          this.validation.errors.push(`Orphaned URL mapping: ${mapping.hugo_url} -> ${mapping.supabase_table}[${mapping.supabase_id}]`);
        }
      }
      
    } catch (error) {
      this.validation.warnings.push(`Could not check orphaned records: ${error.message}`);
    }
  }

  /**
   * Check required fields
   */
  async checkRequiredFields() {
    const tables = [
      { name: 'hugo_posts', required: ['title', 'slug', 'content', 'hugo_path'] },
      { name: 'hugo_projects', required: ['title', 'slug', 'hugo_path'] },
      { name: 'hugo_academic_content', required: ['title', 'slug', 'content', 'hugo_path'] },
      { name: 'hugo_creative_works', required: ['title', 'slug', 'content', 'hugo_path'] }
    ];
    
    for (const table of tables) {
      try {
        for (const field of table.required) {
          const { data, error } = await this.supabase
            .from(table.name)
            .select('id')
            .is(field, null);
            
          if (error) throw error;
          
          if (data && data.length > 0) {
            this.validation.errors.push(`Missing required field ${field} in ${table.name}: ${data.length} records`);
          }
        }
        
      } catch (error) {
        this.validation.warnings.push(`Could not check required fields in ${table.name}: ${error.message}`);
      }
    }
  }

  /**
   * Generate validation report
   */
  async generateValidationReport() {
    console.log('\n📊 MIGRATION VALIDATION REPORT');
    console.log('==========================================');
    console.log(`Total Hugo files found: ${this.validation.totalFiles}`);
    console.log(`Successfully migrated: ${this.validation.migratedFiles}`);
    console.log(`Missing files: ${this.validation.missingFiles}`);
    console.log(`Corrupted files: ${this.validation.corruptedFiles}`);
    console.log(`URL mappings created: ${this.validation.urlMappings}`);
    console.log(`Media files migrated: ${this.validation.mediaMigrated}`);
    
    const successRate = ((this.validation.migratedFiles / this.validation.totalFiles) * 100).toFixed(2);
    console.log(`\nMigration success rate: ${successRate}%`);
    
    if (this.validation.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      this.validation.errors.forEach(error => console.log(`  ${error}`));
    }
    
    if (this.validation.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      this.validation.warnings.forEach(warning => console.log(`  ${warning}`));
    }
    
    // Overall status
    if (this.validation.errors.length === 0) {
      console.log('\n✅ Migration validation PASSED');
    } else {
      console.log('\n❌ Migration validation FAILED');
      console.log(`${this.validation.errors.length} errors need to be resolved`);
    }
    
    // Save report to file
    const report = {
      timestamp: new Date().toISOString(),
      validation: this.validation,
      successRate: parseFloat(successRate),
      status: this.validation.errors.length === 0 ? 'PASSED' : 'FAILED'
    };
    
    fs.writeFileSync('./migration-validation-report.json', JSON.stringify(report, null, 2));
    console.log('\n💾 Full report saved to: migration-validation-report.json');
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
}

// CLI execution
if (require.main === module) {
  const validator = new MigrationValidator();
  validator.validateAll().catch(console.error);
}

module.exports = MigrationValidator;