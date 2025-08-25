#!/usr/bin/env node

/**
 * Database Schema Migration Script for Production
 * Creates and validates database schema for Supabase integration
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tdmzayzkqyegvfgxlolj.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_KEY is required for schema migrations');
  process.exit(1);
}

class DatabaseSchemaMigration {
  constructor() {
    this.client = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    this.migrations = [
      {
        name: 'create_profiles_table',
        description: 'Create user profiles table',
        sql: `
          CREATE TABLE IF NOT EXISTS public.profiles (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            username TEXT UNIQUE,
            full_name TEXT,
            email TEXT,
            bio TEXT,
            avatar_url TEXT,
            website TEXT,
            location TEXT,
            skills TEXT[],
            social_links JSONB DEFAULT '{}',
            is_public BOOLEAN DEFAULT true,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );
          
          -- Enable Row Level Security
          ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
          
          -- Create policies
          CREATE POLICY "Public profiles are viewable by everyone" 
            ON profiles FOR SELECT USING (is_public = true);
            
          CREATE POLICY "Users can update own profile" 
            ON profiles FOR UPDATE USING (auth.uid() = user_id);
            
          -- Create indexes
          CREATE INDEX IF NOT EXISTS profiles_user_id_idx ON profiles(user_id);
          CREATE INDEX IF NOT EXISTS profiles_username_idx ON profiles(username);
          CREATE INDEX IF NOT EXISTS profiles_email_idx ON profiles(email);
        `
      },
      {
        name: 'create_projects_table',
        description: 'Create projects table',
        sql: `
          CREATE TABLE IF NOT EXISTS public.projects (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            title TEXT NOT NULL,
            slug TEXT UNIQUE NOT NULL,
            description TEXT,
            content TEXT,
            featured_image TEXT,
            gallery JSONB DEFAULT '[]',
            technologies TEXT[],
            project_url TEXT,
            github_url TEXT,
            demo_url TEXT,
            status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'draft')),
            priority INTEGER DEFAULT 0,
            is_featured BOOLEAN DEFAULT false,
            is_public BOOLEAN DEFAULT true,
            view_count INTEGER DEFAULT 0,
            likes_count INTEGER DEFAULT 0,
            meta_title TEXT,
            meta_description TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );
          
          -- Enable Row Level Security
          ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
          
          -- Create policies
          CREATE POLICY "Public projects are viewable by everyone" 
            ON projects FOR SELECT USING (is_public = true AND status = 'active');
            
          -- Create indexes
          CREATE INDEX IF NOT EXISTS projects_slug_idx ON projects(slug);
          CREATE INDEX IF NOT EXISTS projects_status_idx ON projects(status);
          CREATE INDEX IF NOT EXISTS projects_is_featured_idx ON projects(is_featured);
          CREATE INDEX IF NOT EXISTS projects_created_at_idx ON projects(created_at DESC);
        `
      },
      {
        name: 'create_blog_posts_table',
        description: 'Create blog posts table',
        sql: `
          CREATE TABLE IF NOT EXISTS public.blog_posts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            title TEXT NOT NULL,
            slug TEXT UNIQUE NOT NULL,
            excerpt TEXT,
            content TEXT,
            featured_image TEXT,
            tags TEXT[],
            category TEXT,
            status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
            is_featured BOOLEAN DEFAULT false,
            view_count INTEGER DEFAULT 0,
            likes_count INTEGER DEFAULT 0,
            reading_time INTEGER DEFAULT 0,
            meta_title TEXT,
            meta_description TEXT,
            published_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );
          
          -- Enable Row Level Security
          ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
          
          -- Create policies
          CREATE POLICY "Published posts are viewable by everyone" 
            ON blog_posts FOR SELECT USING (status = 'published');
            
          -- Create indexes
          CREATE INDEX IF NOT EXISTS blog_posts_slug_idx ON blog_posts(slug);
          CREATE INDEX IF NOT EXISTS blog_posts_status_idx ON blog_posts(status);
          CREATE INDEX IF NOT EXISTS blog_posts_published_at_idx ON blog_posts(published_at DESC);
          CREATE INDEX IF NOT EXISTS blog_posts_tags_idx ON blog_posts USING GIN(tags);
          CREATE INDEX IF NOT EXISTS blog_posts_category_idx ON blog_posts(category);
        `
      },
      {
        name: 'create_contact_messages_table',
        description: 'Create contact messages table',
        sql: `
          CREATE TABLE IF NOT EXISTS public.contact_messages (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            subject TEXT,
            message TEXT NOT NULL,
            phone TEXT,
            company TEXT,
            status TEXT DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'replied', 'archived')),
            priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
            ip_address INET,
            user_agent TEXT,
            referrer TEXT,
            metadata JSONB DEFAULT '{}',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            replied_at TIMESTAMPTZ,
            replied_by UUID REFERENCES auth.users(id)
          );
          
          -- Enable Row Level Security  
          ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
          
          -- Create policies (admin only access)
          CREATE POLICY "Admin can view all messages" 
            ON contact_messages FOR ALL USING (
              EXISTS (
                SELECT 1 FROM auth.users 
                WHERE auth.users.id = auth.uid() 
                AND auth.users.raw_app_meta_data->>'role' = 'admin'
              )
            );
            
          -- Create indexes
          CREATE INDEX IF NOT EXISTS contact_messages_status_idx ON contact_messages(status);
          CREATE INDEX IF NOT EXISTS contact_messages_created_at_idx ON contact_messages(created_at DESC);
          CREATE INDEX IF NOT EXISTS contact_messages_email_idx ON contact_messages(email);
        `
      },
      {
        name: 'create_analytics_events_table',
        description: 'Create analytics events table',
        sql: `
          CREATE TABLE IF NOT EXISTS public.analytics_events (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            event_type TEXT NOT NULL,
            event_data JSONB DEFAULT '{}',
            page_url TEXT,
            referrer TEXT,
            user_agent TEXT,
            ip_address INET,
            country TEXT,
            city TEXT,
            device_type TEXT,
            browser TEXT,
            os TEXT,
            session_id TEXT,
            user_id UUID REFERENCES auth.users(id),
            created_at TIMESTAMPTZ DEFAULT NOW()
          );
          
          -- Enable Row Level Security
          ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
          
          -- Create policies (admin only access)
          CREATE POLICY "Admin can view all analytics" 
            ON analytics_events FOR ALL USING (
              EXISTS (
                SELECT 1 FROM auth.users 
                WHERE auth.users.id = auth.uid() 
                AND auth.users.raw_app_meta_data->>'role' = 'admin'
              )
            );
            
          -- Create indexes
          CREATE INDEX IF NOT EXISTS analytics_events_type_idx ON analytics_events(event_type);
          CREATE INDEX IF NOT EXISTS analytics_events_created_at_idx ON analytics_events(created_at DESC);
          CREATE INDEX IF NOT EXISTS analytics_events_page_url_idx ON analytics_events(page_url);
          CREATE INDEX IF NOT EXISTS analytics_events_session_idx ON analytics_events(session_id);
        `
      },
      {
        name: 'create_system_settings_table',
        description: 'Create system settings table',
        sql: `
          CREATE TABLE IF NOT EXISTS public.system_settings (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            key TEXT UNIQUE NOT NULL,
            value JSONB NOT NULL,
            description TEXT,
            type TEXT DEFAULT 'string' CHECK (type IN ('string', 'number', 'boolean', 'json', 'array')),
            is_public BOOLEAN DEFAULT false,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );
          
          -- Enable Row Level Security
          ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
          
          -- Create policies
          CREATE POLICY "Public settings are viewable by everyone" 
            ON system_settings FOR SELECT USING (is_public = true);
            
          CREATE POLICY "Admin can manage all settings" 
            ON system_settings FOR ALL USING (
              EXISTS (
                SELECT 1 FROM auth.users 
                WHERE auth.users.id = auth.uid() 
                AND auth.users.raw_app_meta_data->>'role' = 'admin'
              )
            );
            
          -- Create indexes
          CREATE INDEX IF NOT EXISTS system_settings_key_idx ON system_settings(key);
          CREATE INDEX IF NOT EXISTS system_settings_is_public_idx ON system_settings(is_public);
        `
      }
    ];
  }

  async runMigrations() {
    console.log('🚀 Running Database Schema Migrations');
    console.log('====================================');

    const results = {
      successful: 0,
      failed: 0,
      errors: []
    };

    for (const migration of this.migrations) {
      console.log(`\n📋 Running: ${migration.description}`);
      
      try {
        // Execute the migration SQL
        const { error } = await this.client.rpc('exec_sql', {
          sql: migration.sql
        });

        if (error) {
          console.log(`❌ Migration '${migration.name}' failed:`, error.message);
          results.failed++;
          results.errors.push({
            migration: migration.name,
            error: error.message
          });
        } else {
          console.log(`✅ Migration '${migration.name}' completed successfully`);
          results.successful++;
        }
      } catch (error) {
        console.log(`❌ Migration '${migration.name}' threw exception:`, error.message);
        results.failed++;
        results.errors.push({
          migration: migration.name,
          error: error.message
        });
      }
    }

    console.log('\n📊 Migration Summary');
    console.log('===================');
    console.log(`✅ Successful: ${results.successful}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`📋 Total: ${this.migrations.length}`);

    if (results.errors.length > 0) {
      console.log('\n❌ Migration Errors:');
      results.errors.forEach(error => {
        console.log(`- ${error.migration}: ${error.error}`);
      });
    }

    return results;
  }

  async validateSchema() {
    console.log('\n🔍 Validating Database Schema');
    console.log('=============================');

    const expectedTables = [
      'profiles',
      'projects', 
      'blog_posts',
      'contact_messages',
      'analytics_events',
      'system_settings'
    ];

    const validation = {
      tablesFound: 0,
      tablesMissing: [],
      tablesWorking: 0,
      tablesWithIssues: []
    };

    for (const tableName of expectedTables) {
      try {
        const { data, error } = await this.client
          .from(tableName)
          .select('*')
          .limit(1);

        if (error) {
          if (error.code === 'PGRST116') {
            console.log(`❌ Table '${tableName}': NOT FOUND`);
            validation.tablesMissing.push(tableName);
          } else {
            console.log(`⚠️  Table '${tableName}': FOUND but has issues - ${error.message}`);
            validation.tablesFound++;
            validation.tablesWithIssues.push({
              table: tableName,
              issue: error.message
            });
          }
        } else {
          console.log(`✅ Table '${tableName}': WORKING`);
          validation.tablesFound++;
          validation.tablesWorking++;
        }
      } catch (error) {
        console.log(`❌ Table '${tableName}': ERROR - ${error.message}`);
        validation.tablesWithIssues.push({
          table: tableName,
          issue: error.message
        });
      }
    }

    console.log('\n📊 Schema Validation Summary');
    console.log('============================');
    console.log(`✅ Working tables: ${validation.tablesWorking}/${expectedTables.length}`);
    console.log(`⚠️  Tables with issues: ${validation.tablesWithIssues.length}`);
    console.log(`❌ Missing tables: ${validation.tablesMissing.length}`);

    if (validation.tablesMissing.length > 0) {
      console.log('\n❌ Missing Tables:');
      validation.tablesMissing.forEach(table => {
        console.log(`- ${table}`);
      });
    }

    if (validation.tablesWithIssues.length > 0) {
      console.log('\n⚠️  Tables with Issues:');
      validation.tablesWithIssues.forEach(issue => {
        console.log(`- ${issue.table}: ${issue.issue}`);
      });
    }

    return validation;
  }

  async insertSampleData() {
    console.log('\n📝 Inserting Sample Data');
    console.log('========================');

    const sampleData = [
      {
        table: 'system_settings',
        data: [
          {
            key: 'site_title',
            value: JSON.stringify('Portfolio Site'),
            description: 'Main site title',
            type: 'string',
            is_public: true
          },
          {
            key: 'site_description',
            value: JSON.stringify('Professional portfolio and blog'),
            description: 'Site meta description',
            type: 'string',
            is_public: true
          },
          {
            key: 'contact_email',
            value: JSON.stringify('contact@portfolio.com'),
            description: 'Main contact email',
            type: 'string',
            is_public: true
          }
        ]
      }
    ];

    for (const { table, data } of sampleData) {
      try {
        console.log(`Inserting sample data into ${table}...`);
        
        const { error } = await this.client
          .from(table)
          .upsert(data, { onConflict: 'key' });

        if (error) {
          console.log(`❌ Failed to insert sample data into ${table}:`, error.message);
        } else {
          console.log(`✅ Sample data inserted into ${table}`);
        }
      } catch (error) {
        console.log(`❌ Error inserting sample data into ${table}:`, error.message);
      }
    }
  }

  async run() {
    try {
      console.log('Database Schema Migration Tool');
      console.log('==============================');
      console.log(`Target: ${SUPABASE_URL}`);
      console.log(`Service Key: ${SUPABASE_SERVICE_KEY ? 'Configured' : 'Missing'}`);

      // Run migrations
      const migrationResults = await this.runMigrations();
      
      // Validate schema
      const validationResults = await this.validateSchema();
      
      // Insert sample data
      await this.insertSampleData();

      // Generate final report
      const overallSuccess = migrationResults.failed === 0 && validationResults.tablesMissing.length === 0;
      
      console.log('\n🎯 Final Report');
      console.log('================');
      console.log(`Status: ${overallSuccess ? '✅ SUCCESS' : '⚠️  NEEDS ATTENTION'}`);
      console.log(`Migrations: ${migrationResults.successful}/${this.migrations.length} successful`);
      console.log(`Schema: ${validationResults.tablesWorking}/${validationResults.tablesFound + validationResults.tablesMissing.length} tables working`);

      return overallSuccess;
    } catch (error) {
      console.error('❌ Migration failed:', error);
      return false;
    }
  }
}

// Run migrations if called directly
if (require.main === module) {
  const migration = new DatabaseSchemaMigration();
  migration.run().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Migration error:', error);
    process.exit(1);
  });
}

module.exports = DatabaseSchemaMigration;