/**
 * Simple Hugo to Supabase Migration Runner
 * This script migrates your Hugo content to Supabase
 */

require('dotenv').config({ path: '../nextjs-poc/.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tdmzayzkqyegvfgxlolj.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkbXpheXprcXllZ3ZmZ3hsb2xqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTk5OTM0MCwiZXhwIjoyMDcxNTc1MzQwfQ.N0lnWnvo323XXJAprqRhbBweguYlGsJgquBHB1g3L7E'
);

console.log('🚀 Starting Hugo to Supabase Migration...\n');

async function createTables() {
  console.log('📦 Checking database tables...');
  
  // Check if posts table exists
  const { error } = await supabase
    .from('posts')
    .select('id')
    .limit(1);
  
  if (!error) {
    console.log('✅ Posts table exists and is ready');
    return true;
  } else {
    console.log('⚠️ Posts table check failed:', error.message);
    return false;
  }
}

async function migrateContent() {
  console.log('\n📝 Migrating Hugo content...');
  
  const contentDir = path.join(__dirname, '../content');
  const blogDir = path.join(contentDir, 'blog');
  
  if (fs.existsSync(blogDir)) {
    const files = fs.readdirSync(blogDir).filter(f => f.endsWith('.md'));
    console.log(`Found ${files.length} blog posts to migrate`);
    
    for (const file of files) {
      const filePath = path.join(blogDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Parse frontmatter
      const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
      if (frontmatterMatch) {
        const frontmatter = frontmatterMatch[1];
        const body = content.replace(frontmatterMatch[0], '').trim();
        
        // Extract metadata
        const title = (frontmatter.match(/title:\s*["'](.+?)["']/) || [])[1] || file.replace('.md', '');
        const slug = file.replace('.md', '');
        const author = (frontmatter.match(/author:\s*["'](.+?)["']/) || [])[1] || 'Brandon JP Lambert';
        const tags = (frontmatter.match(/tags:\s*\[(.*?)\]/) || ['', ''])[1]
          .split(',')
          .map(t => t.trim().replace(/["']/g, ''))
          .filter(Boolean);
        
        // Insert into Supabase
        const { data, error } = await supabase
          .from('posts')
          .upsert({
            title,
            slug,
            content: body,
            excerpt: body.substring(0, 200) + '...',
            author,
            tags,
            draft: false,
            published_at: new Date()
          }, {
            onConflict: 'slug'
          });
        
        if (error) {
          console.log(`⚠️ Error migrating ${file}:`, error.message);
        } else {
          console.log(`✅ Migrated: ${title}`);
        }
      }
    }
  } else {
    console.log('No blog directory found, skipping blog migration');
  }
}

async function testConnection() {
  console.log('\n🔍 Testing Supabase connection...');
  
  try {
    const { data, error } = await supabase
      .from('posts')
      .select('count')
      .single();
    
    if (error && error.message.includes('does not exist')) {
      console.log('⚠️ Posts table does not exist yet. Please run the SQL migrations first.');
      console.log('\n📋 Next steps:');
      console.log('1. Go to your Supabase dashboard: https://app.supabase.com');
      console.log('2. Navigate to the SQL editor');
      console.log('3. Run the migration SQL from: supabase/migrations/');
      console.log('4. Then run this script again');
    } else if (error) {
      console.log('⚠️ Connection error:', error.message);
    } else {
      console.log('✅ Connected to Supabase successfully!');
      return true;
    }
  } catch (err) {
    console.log('❌ Failed to connect:', err.message);
  }
  
  return false;
}

// Main execution
async function main() {
  try {
    const connected = await testConnection();
    
    if (connected) {
      const tablesReady = await createTables();
      if (tablesReady) {
        await migrateContent();
        console.log('\n🎉 Migration complete!');
        console.log('\n📋 Next steps:');
        console.log('1. Start your Next.js app: cd ../nextjs-poc && npm run dev');
        console.log('2. Visit http://localhost:3000');
        console.log('3. Your content is now in Supabase!');
      } else {
        console.log('\n⚠️ Tables not ready. Migration skipped.');
      }
    } else {
      console.log('\n⚠️ Migration skipped due to connection issues.');
      console.log('\n📋 Manual Setup Required:');
      console.log('1. Ensure your Supabase project is set up');
      console.log('2. Run the SQL migrations in your Supabase SQL editor');
      console.log('3. Verify your .env.local credentials are correct');
    }
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run migration
main();