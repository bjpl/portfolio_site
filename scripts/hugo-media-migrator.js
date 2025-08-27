#!/usr/bin/env node

/**
 * Hugo to Supabase Media Migration Script
 * Migrates media files from Hugo static directory to Supabase Storage
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { glob } = require('glob');
const mime = require('mime-types');
const crypto = require('crypto');

class HugoMediaMigrator {
  constructor() {
    // Initialize Supabase client with service key for storage operations
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    this.staticDir = './static';
    this.publicDir = './public';
    this.bucket = 'portfolio-media';
    
    // Migration statistics
    this.stats = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      totalSize: 0,
      errors: []
    };

    // Supported file types
    this.supportedTypes = {
      images: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
      videos: ['.mp4', '.webm', '.mov', '.avi'],
      audio: ['.mp3', '.wav', '.ogg', '.m4a'],
      documents: ['.pdf', '.doc', '.docx', '.txt', '.md'],
      other: ['.zip', '.tar', '.gz']
    };
  }

  /**
   * Main migration method
   */
  async migrateAll() {
    console.log('🚀 Starting Hugo media migration to Supabase Storage...\n');
    
    try {
      // Test connection and setup
      await this.setupStorage();
      
      // Find and migrate media files
      const mediaFiles = await this.findMediaFiles();
      await this.migrateMediaFiles(mediaFiles);
      
      // Update content references
      await this.updateContentReferences();
      
      // Print summary
      this.printMigrationSummary();
      
    } catch (error) {
      console.error('💥 Media migration failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Setup Supabase Storage bucket
   */
  async setupStorage() {
    console.log('🔧 Setting up Supabase Storage...');
    
    try {
      // Check if bucket exists
      const { data: buckets, error: listError } = await this.supabase.storage.listBuckets();
      
      if (listError) throw listError;
      
      const bucketExists = buckets.some(bucket => bucket.name === this.bucket);
      
      if (!bucketExists) {
        // Create bucket
        const { error: createError } = await this.supabase.storage.createBucket(this.bucket, {
          public: true,
          allowedMimeTypes: [
            'image/*',
            'video/*',
            'audio/*',
            'application/pdf',
            'text/*'
          ],
          fileSizeLimit: 50 * 1024 * 1024 // 50MB
        });
        
        if (createError) throw createError;
        console.log(`✅ Created storage bucket: ${this.bucket}`);
      } else {
        console.log(`✅ Storage bucket exists: ${this.bucket}`);
      }
      
    } catch (error) {
      throw new Error(`Storage setup failed: ${error.message}`);
    }
  }

  /**
   * Find all media files in static and public directories
   */
  async findMediaFiles() {
    console.log('🔍 Scanning for media files...');
    
    const mediaFiles = [];
    const searchPaths = [
      `${this.staticDir}/**/*`,
      `${this.publicDir}/images/**/*`,
      `${this.publicDir}/media/**/*`,
      `${this.publicDir}/uploads/**/*`
    ];

    for (const searchPath of searchPaths) {
      try {
        const files = await glob(searchPath, { nodir: true });
        
        for (const file of files) {
          const fileInfo = await this.analyzeFile(file);
          if (fileInfo) {
            mediaFiles.push(fileInfo);
          }
        }
      } catch (error) {
        console.warn(`⚠️  Could not scan ${searchPath}: ${error.message}`);
      }
    }

    console.log(`📁 Found ${mediaFiles.length} media files\n`);
    return mediaFiles;
  }

  /**
   * Analyze individual file
   */
  async analyzeFile(filePath) {
    try {
      const stats = fs.statSync(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const mimeType = mime.lookup(filePath) || 'application/octet-stream';
      
      // Check if file type is supported
      const isSupported = Object.values(this.supportedTypes).flat().includes(ext);
      
      if (!isSupported) {
        return null; // Skip unsupported files
      }

      // Generate unique filename to avoid conflicts
      const basename = path.basename(filePath, ext);
      const hash = crypto.createHash('md5').update(filePath).digest('hex').substring(0, 8);
      const uniqueName = `${basename}-${hash}${ext}`;
      
      // Determine file category
      let category = 'other';
      for (const [cat, extensions] of Object.entries(this.supportedTypes)) {
        if (extensions.includes(ext)) {
          category = cat;
          break;
        }
      }

      return {
        path: filePath,
        name: path.basename(filePath),
        uniqueName: uniqueName,
        relativePath: path.relative(process.cwd(), filePath),
        size: stats.size,
        mimeType: mimeType,
        category: category,
        extension: ext,
        hugoUrl: this.generateHugoUrl(filePath),
        supabaseKey: `${category}/${uniqueName}`,
        lastModified: stats.mtime
      };
      
    } catch (error) {
      console.warn(`⚠️  Could not analyze ${filePath}: ${error.message}`);
      return null;
    }
  }

  /**
   * Generate Hugo-style URL for file
   */
  generateHugoUrl(filePath) {
    // Convert file path to Hugo URL format
    let url = filePath.replace(/\\/g, '/'); // Convert Windows paths
    
    if (url.startsWith('./static/')) {
      url = url.substring(9); // Remove './static/'
    } else if (url.startsWith('./public/')) {
      url = url.substring(9); // Remove './public/'
    }
    
    return `/${url}`;
  }

  /**
   * Migrate all media files
   */
  async migrateMediaFiles(mediaFiles) {
    console.log('📤 Migrating media files...');
    
    // Process files in batches to avoid overwhelming the server
    const batchSize = 5;
    
    for (let i = 0; i < mediaFiles.length; i += batchSize) {
      const batch = mediaFiles.slice(i, i + batchSize);
      
      await Promise.all(batch.map(file => this.migrateFile(file)));
      
      // Progress indicator
      const progress = Math.min(i + batchSize, mediaFiles.length);
      console.log(`📊 Progress: ${progress}/${mediaFiles.length} files`);
    }
    
    console.log('📤 Media files migration complete\n');
  }

  /**
   * Migrate individual file
   */
  async migrateFile(fileInfo) {
    try {
      // Check if file already exists
      const { data: existingFiles, error: listError } = await this.supabase.storage
        .from(this.bucket)
        .list(fileInfo.category, { limit: 1, search: fileInfo.uniqueName });

      if (listError) throw listError;

      if (existingFiles && existingFiles.length > 0) {
        console.log(`⏭️  Skipping ${fileInfo.name} (already exists)`);
        this.stats.skipped++;
        return;
      }

      // Read file
      const fileBuffer = fs.readFileSync(fileInfo.path);
      
      // Upload to Supabase Storage
      const { data, error } = await this.supabase.storage
        .from(this.bucket)
        .upload(fileInfo.supabaseKey, fileBuffer, {
          contentType: fileInfo.mimeType,
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Get public URL
      const { data: publicUrlData } = this.supabase.storage
        .from(this.bucket)
        .getPublicUrl(fileInfo.supabaseKey);

      const supabaseUrl = publicUrlData.publicUrl;

      // Record migration in database
      await this.recordMigration(fileInfo, supabaseUrl, 'completed');

      this.stats.succeeded++;
      this.stats.totalSize += fileInfo.size;
      console.log(`✅ Migrated: ${fileInfo.name} → ${fileInfo.category}/${fileInfo.uniqueName}`);
      
    } catch (error) {
      this.stats.failed++;
      this.stats.errors.push({ file: fileInfo.name, error: error.message });
      
      // Record failed migration
      await this.recordMigration(fileInfo, null, 'failed');
      
      console.error(`❌ Failed: ${fileInfo.name} - ${error.message}`);
    }
    
    this.stats.processed++;
  }

  /**
   * Record migration in database
   */
  async recordMigration(fileInfo, supabaseUrl, status) {
    try {
      const migrationRecord = {
        original_path: fileInfo.relativePath,
        hugo_url: fileInfo.hugoUrl,
        supabase_url: supabaseUrl,
        migration_status: status,
        file_size: fileInfo.size,
        mime_type: fileInfo.mimeType,
        category: fileInfo.category,
        unique_name: fileInfo.uniqueName
      };

      const { error } = await this.supabase
        .from('hugo_media_migration')
        .upsert(migrationRecord, { onConflict: 'original_path' });

      if (error) {
        console.warn(`⚠️  Could not record migration for ${fileInfo.name}: ${error.message}`);
      }
      
    } catch (error) {
      console.warn(`⚠️  Database recording failed for ${fileInfo.name}: ${error.message}`);
    }
  }

  /**
   * Update content references to use new Supabase URLs
   */
  async updateContentReferences() {
    console.log('🔄 Updating content references...');
    
    try {
      // Get migration mappings
      const { data: migrations, error } = await this.supabase
        .from('hugo_media_migration')
        .select('*')
        .eq('migration_status', 'completed');

      if (error) throw error;

      if (!migrations || migrations.length === 0) {
        console.log('ℹ️  No successful migrations to update references for');
        return;
      }

      // Update references in each content type
      await this.updateTableReferences('hugo_posts', 'content', migrations);
      await this.updateTableReferences('hugo_projects', 'content', migrations);
      await this.updateTableReferences('hugo_projects', 'description', migrations);
      await this.updateTableReferences('hugo_academic_content', 'content', migrations);
      await this.updateTableReferences('hugo_creative_works', 'content', migrations);

      console.log(`✅ Updated content references for ${migrations.length} migrated files`);
      
    } catch (error) {
      console.error(`❌ Failed to update content references: ${error.message}`);
    }
  }

  /**
   * Update references in specific table/column
   */
  async updateTableReferences(tableName, columnName, migrations) {
    try {
      const { data: records, error: fetchError } = await this.supabase
        .from(tableName)
        .select(`id, ${columnName}`);

      if (fetchError) throw fetchError;

      for (const record of records || []) {
        let content = record[columnName];
        let updated = false;

        if (!content) continue;

        // Replace each migration URL
        for (const migration of migrations) {
          const oldUrl = migration.hugo_url;
          const newUrl = migration.supabase_url;
          
          if (content.includes(oldUrl)) {
            content = content.replace(new RegExp(oldUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newUrl);
            updated = true;
          }
        }

        // Update record if changes were made
        if (updated) {
          const { error: updateError } = await this.supabase
            .from(tableName)
            .update({ [columnName]: content })
            .eq('id', record.id);

          if (updateError) {
            console.warn(`⚠️  Failed to update ${tableName}[${record.id}]: ${updateError.message}`);
          }
        }
      }
      
    } catch (error) {
      console.warn(`⚠️  Failed to update references in ${tableName}.${columnName}: ${error.message}`);
    }
  }

  /**
   * Print migration summary
   */
  printMigrationSummary() {
    console.log('\n📊 MEDIA MIGRATION SUMMARY');
    console.log('==========================================');
    console.log(`Total files processed: ${this.stats.processed}`);
    console.log(`Successfully migrated: ${this.stats.succeeded}`);
    console.log(`Failed migrations: ${this.stats.failed}`);
    console.log(`Skipped files: ${this.stats.skipped}`);
    console.log(`Total size migrated: ${this.formatBytes(this.stats.totalSize)}`);
    
    if (this.stats.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      this.stats.errors.forEach(({ file, error }) => {
        console.log(`  ${file}: ${error}`);
      });
    }
    
    console.log('\n🎉 Media migration completed!');
    console.log(`📁 Files are now available in Supabase Storage bucket: ${this.bucket}`);
  }

  /**
   * Format bytes for human-readable output
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// CLI execution
if (require.main === module) {
  const migrator = new HugoMediaMigrator();
  migrator.migrateAll().catch(console.error);
}

module.exports = HugoMediaMigrator;