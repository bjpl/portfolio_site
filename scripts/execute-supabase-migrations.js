#!/usr/bin/env node
/**
 * Supabase Migration Executor
 * Executes SQL migrations directly against the Supabase database
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuration from .env
const SUPABASE_URL = 'https://tdmzayzkqyegvfgxlolj.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkbXpheXprcXllZ3ZmZ3hsb2xqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTk5OTM0MCwiZXhwIjoyMDcxNTc1MzQwfQ.N0lnWnvo323XXJAprqRhbBweguYlGsJgquBHB1g3L7E';

// Initialize Supabase client with service key for admin operations
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function executeMigration(migrationFile, migrationContent) {
  console.log(`\n🔄 Executing migration: ${migrationFile}`);
  console.log(`📝 Content length: ${migrationContent.length} characters`);
  
  try {
    // Split migration into individual SQL statements
    const statements = migrationContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📋 Found ${statements.length} SQL statements to execute`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim().length === 0) continue;

      try {
        console.log(`   ⏳ Executing statement ${i + 1}/${statements.length}...`);
        
        const { data, error } = await supabase.rpc('exec_sql', {
          sql_query: statement + ';'
        });

        if (error) {
          console.error(`   ❌ Error in statement ${i + 1}: ${error.message}`);
          errorCount++;
        } else {
          console.log(`   ✅ Statement ${i + 1} executed successfully`);
          successCount++;
        }
      } catch (err) {
        console.error(`   ❌ Exception in statement ${i + 1}: ${err.message}`);
        errorCount++;
      }
    }

    console.log(`\n📊 Migration ${migrationFile} completed:`);
    console.log(`   ✅ Successful: ${successCount} statements`);
    console.log(`   ❌ Failed: ${errorCount} statements`);
    
    return { success: errorCount === 0, successCount, errorCount };
    
  } catch (error) {
    console.error(`❌ Failed to execute migration ${migrationFile}:`, error.message);
    return { success: false, error: error.message };
  }
}

async function testConnection() {
  console.log('🔍 Testing Supabase connection...');
  
  try {
    const { data, error } = await supabase
      .from('_dummy_test_table')
      .select('*')
      .limit(1);
    
    // We expect this to fail, but if it fails with a table doesn't exist error,
    // that means the connection is working
    if (error && error.message.includes("relation") && error.message.includes("does not exist")) {
      console.log('✅ Connection successful (database accessible)');
      return true;
    } else if (!error) {
      console.log('✅ Connection successful');
      return true;
    } else {
      console.error('❌ Connection failed:', error.message);
      return false;
    }
  } catch (err) {
    console.error('❌ Connection test failed:', err.message);
    return false;
  }
}

async function checkExistingTables() {
  console.log('\n🔍 Checking existing database schema...');
  
  try {
    // Try to get table info using information_schema
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name;
      `
    });

    if (error) {
      console.error('❌ Failed to check existing tables:', error.message);
      return [];
    }

    const tables = data || [];
    console.log(`📋 Found ${tables.length} existing tables:`, tables.map(t => t.table_name));
    return tables.map(t => t.table_name);
    
  } catch (err) {
    console.error('❌ Exception checking tables:', err.message);
    return [];
  }
}

async function main() {
  console.log('🚀 Starting Supabase Migration Execution');
  console.log('=' .repeat(50));
  
  // Test connection first
  const connectionOk = await testConnection();
  if (!connectionOk) {
    console.error('❌ Cannot proceed without database connection');
    process.exit(1);
  }

  // Check existing schema
  await checkExistingTables();

  // Get all migration files
  const migrationsDir = path.join(__dirname, '../supabase/migrations');
  
  if (!fs.existsSync(migrationsDir)) {
    console.error(`❌ Migrations directory not found: ${migrationsDir}`);
    process.exit(1);
  }

  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();

  console.log(`\n📁 Found ${migrationFiles.length} migration files:`);
  migrationFiles.forEach(file => console.log(`   📄 ${file}`));

  let totalSuccess = 0;
  let totalErrors = 0;
  const results = [];

  // Execute each migration
  for (const file of migrationFiles) {
    const filePath = path.join(migrationsDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    
    const result = await executeMigration(file, content);
    results.push({ file, ...result });
    
    if (result.success) {
      totalSuccess++;
    } else {
      totalErrors++;
    }
  }

  // Final report
  console.log('\n' + '=' .repeat(50));
  console.log('📊 FINAL MIGRATION REPORT');
  console.log('=' .repeat(50));
  
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.file}: ${result.successCount || 0} successful, ${result.errorCount || 0} failed`);
  });

  console.log(`\n🎯 Overall Results:`);
  console.log(`   ✅ Successful migrations: ${totalSuccess}/${migrationFiles.length}`);
  console.log(`   ❌ Failed migrations: ${totalErrors}/${migrationFiles.length}`);

  if (totalErrors === 0) {
    console.log('\n🎉 All migrations executed successfully!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some migrations failed. Please review the errors above.');
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the migration
main().catch(console.error);