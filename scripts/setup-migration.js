#!/usr/bin/env node

/**
 * Migration Setup Helper Script
 * Sets up environment and validates requirements for content migration
 * 
 * Usage: node scripts/setup-migration.js
 */

const fs = require('fs').promises;
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

class MigrationSetup {
  constructor() {
    this.checks = {
      environment: false,
      database: false,
      content: false,
      dependencies: false
    };
  }

  async checkEnvironmentVariables() {
    console.log('🔧 Checking environment variables...');
    
    const requiredVars = [
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY',
      // Alternative names
      'VITE_SUPABASE_URL', 
      'VITE_SUPABASE_ANON_KEY'
    ];

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      console.log('  ✅ Supabase credentials found');
      console.log(`  📍 URL: ${supabaseUrl.substring(0, 30)}...`);
      this.checks.environment = true;
    } else {
      console.log('  ❌ Supabase credentials missing');
      console.log('  💡 Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables');
      console.log('  💡 Or use VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
      
      // Try to find .env files
      await this.checkEnvFiles();
    }
  }

  async checkEnvFiles() {
    const envFiles = ['.env', '.env.local', '.env.development', 'scripts/.env'];
    
    for (const envFile of envFiles) {
      try {
        const filePath = path.join(process.cwd(), envFile);
        await fs.access(filePath);
        console.log(`  📄 Found ${envFile} file`);
        
        const content = await fs.readFile(filePath, 'utf-8');
        if (content.includes('SUPABASE_URL') || content.includes('VITE_SUPABASE_URL')) {
          console.log(`  💡 ${envFile} contains Supabase variables - make sure they're loaded`);
        }
      } catch (error) {
        // File doesn't exist, continue
      }
    }
  }

  async checkDatabaseConnection() {
    console.log('\n🗄️  Checking database connection...');
    
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.log('  ❌ Cannot test database - credentials missing');
      return;
    }

    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      // Check if blog_posts table exists
      const { data, error } = await supabase
        .from('blog_posts')
        .select('count(*)')
        .limit(1);

      if (error) {
        console.log('  ❌ Database connection failed:', error.message);
        console.log('  💡 Make sure migrations have been run: npm run migrate');
      } else {
        console.log('  ✅ Database connection successful');
        console.log('  ✅ blog_posts table exists');
        this.checks.database = true;
      }

      // Check projects table
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('count(*)')
        .limit(1);

      if (projectsError) {
        console.log('  ❌ projects table not accessible:', projectsError.message);
      } else {
        console.log('  ✅ projects table exists');
      }

    } catch (error) {
      console.log('  ❌ Database check failed:', error.message);
    }
  }

  async checkContentFiles() {
    console.log('\n📁 Checking content files...');
    
    const contentPaths = {
      blog: path.join(process.cwd(), 'content', 'blog'),
      poetry: path.join(process.cwd(), 'content', 'writing', 'poetry'),
      projects: path.join(process.cwd(), 'data', 'projects.json')
    };

    let foundFiles = 0;

    // Check blog files
    try {
      const blogFiles = await fs.readdir(contentPaths.blog);
      const markdownFiles = blogFiles.filter(f => f.endsWith('.md') && !f.startsWith('_index'));
      console.log(`  📰 Found ${markdownFiles.length} blog post files`);
      foundFiles += markdownFiles.length;
    } catch (error) {
      console.log('  ❌ Blog directory not accessible:', contentPaths.blog);
    }

    // Check poetry files
    try {
      const poetryFiles = await fs.readdir(contentPaths.poetry);
      const markdownFiles = poetryFiles.filter(f => f.endsWith('.md') && !f.startsWith('_index'));
      console.log(`  🎭 Found ${markdownFiles.length} poetry files`);
      foundFiles += markdownFiles.length;
    } catch (error) {
      console.log('  ❌ Poetry directory not accessible:', contentPaths.poetry);
    }

    // Check projects file
    try {
      await fs.access(contentPaths.projects);
      const content = await fs.readFile(contentPaths.projects, 'utf-8');
      const data = JSON.parse(content);
      console.log(`  🚀 Found ${data.projects?.length || 0} projects`);
      foundFiles += data.projects?.length || 0;
    } catch (error) {
      console.log('  ❌ Projects file not accessible:', contentPaths.projects);
    }

    if (foundFiles > 0) {
      console.log(`  ✅ Total content items found: ${foundFiles}`);
      this.checks.content = true;
    } else {
      console.log('  ❌ No content files found to migrate');
    }
  }

  async checkDependencies() {
    console.log('\n📦 Checking dependencies...');
    
    try {
      const packagePath = path.join(__dirname, 'package.json');
      const packageContent = await fs.readFile(packagePath, 'utf-8');
      const packageData = JSON.parse(packageContent);
      
      const requiredDeps = ['@supabase/supabase-js', 'gray-matter'];
      const missing = requiredDeps.filter(dep => !packageData.dependencies[dep]);
      
      if (missing.length === 0) {
        console.log('  ✅ All required dependencies found in scripts/package.json');
        this.checks.dependencies = true;
      } else {
        console.log('  ❌ Missing dependencies:', missing.join(', '));
        console.log('  💡 Run: cd scripts && npm install');
      }
      
    } catch (error) {
      console.log('  ❌ Could not check dependencies:', error.message);
    }
  }

  printUsageInstructions() {
    console.log('\n' + '='.repeat(60));
    console.log('📋 MIGRATION USAGE INSTRUCTIONS');
    console.log('='.repeat(60));
    
    if (Object.values(this.checks).every(check => check)) {
      console.log('\n✅ All checks passed! You can run the migration.');
      console.log('\n🚀 Available commands:');
      console.log('\n  # Dry run (recommended first)');
      console.log('  node scripts/migrate-content.js --dry-run');
      console.log('\n  # Migrate specific content types');
      console.log('  node scripts/migrate-content.js --content-type=blog --dry-run');
      console.log('  node scripts/migrate-content.js --content-type=poetry --dry-run');
      console.log('  node scripts/migrate-content.js --content-type=projects --dry-run');
      console.log('\n  # Full migration (no dry-run)');
      console.log('  node scripts/migrate-content.js');
      console.log('\n  # Using npm scripts (from scripts directory)');
      console.log('  npm run migrate:content:dry-run');
      console.log('  npm run migrate:content');
    } else {
      console.log('\n❌ Some checks failed. Please address the issues above.');
      console.log('\n🔧 Setup steps:');
      
      if (!this.checks.environment) {
        console.log('  1. Set Supabase environment variables');
        console.log('     export SUPABASE_URL="your-supabase-url"');
        console.log('     export SUPABASE_ANON_KEY="your-supabase-anon-key"');
      }
      
      if (!this.checks.dependencies) {
        console.log('  2. Install dependencies:');
        console.log('     cd scripts && npm install');
      }
      
      if (!this.checks.database) {
        console.log('  3. Run database migrations:');
        console.log('     supabase db push  # or your migration command');
      }
      
      if (!this.checks.content) {
        console.log('  4. Ensure content files exist in the expected locations');
      }
    }

    console.log('\n📚 Content structure expected:');
    console.log('  content/blog/*.md           → blog_posts table');
    console.log('  content/writing/poetry/*.md → blog_posts table (type=poetry)');
    console.log('  data/projects.json          → projects table');
    
    console.log('\n💡 Pro tips:');
    console.log('  • Always run --dry-run first to see what will happen');
    console.log('  • Use --content-type to migrate specific content types');
    console.log('  • Check the migration summary for any errors');
    console.log('  • user_id fields will need to be updated after migration');
  }

  async run() {
    console.log('🚀 Migration Setup Check\n');
    
    await this.checkEnvironmentVariables();
    await this.checkDatabaseConnection();
    await this.checkContentFiles();
    await this.checkDependencies();
    
    this.printUsageInstructions();
  }
}

// Main execution
if (require.main === module) {
  const setup = new MigrationSetup();
  setup.run().catch(error => {
    console.error('💥 Setup check failed:', error);
    process.exit(1);
  });
}

module.exports = MigrationSetup;