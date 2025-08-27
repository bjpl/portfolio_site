#!/usr/bin/env node
/**
 * Supabase Status Checker
 * Checks the current state of the Supabase database without executing migrations
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration from .env
const SUPABASE_URL = 'https://tdmzayzkqyegvfgxlolj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkbXpheXprcXllZ3ZmZ3hsb2xqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5OTkzNDAsImV4cCI6MjA3MTU3NTM0MH0.u4i07AojTzeSVRfbUyTSKfPv1EKUCFCv7XPri22gbkM';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkConnection() {
  console.log('🔍 Testing Supabase connection...');
  
  try {
    // Try to access auth API to test connectivity
    const { data, error } = await supabase.auth.getSession();
    
    if (error && error.message.includes('Invalid API key')) {
      console.error('❌ Invalid API key');
      return false;
    }
    
    console.log('✅ Connection to Supabase established');
    return true;
    
  } catch (err) {
    console.error('❌ Connection test failed:', err.message);
    return false;
  }
}

async function testTableAccess(tableName) {
  console.log(`🔍 Testing access to table: ${tableName}`);
  
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (error) {
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        console.log(`   ⚠️  Table ${tableName} does not exist`);
        return { exists: false, accessible: false, error: error.message };
      } else if (error.message.includes('permission denied') || error.message.includes('JWT')) {
        console.log(`   🔒 Table ${tableName} exists but not accessible with anon key`);
        return { exists: true, accessible: false, error: error.message };
      } else {
        console.log(`   ❌ Error accessing table ${tableName}: ${error.message}`);
        return { exists: false, accessible: false, error: error.message };
      }
    }
    
    console.log(`   ✅ Table ${tableName} exists and accessible, records: ${data?.length || 0}`);
    return { exists: true, accessible: true, records: data?.length || 0 };
    
  } catch (err) {
    console.error(`   ❌ Exception testing table ${tableName}:`, err.message);
    return { exists: false, accessible: false, error: err.message };
  }
}

async function main() {
  console.log('🚀 Checking Supabase Database Status');
  console.log('=' .repeat(50));
  
  // Test basic connection
  const connected = await checkConnection();
  if (!connected) {
    console.error('❌ Cannot proceed without Supabase connection');
    process.exit(1);
  }
  
  // List of expected tables from migrations
  const expectedTables = [
    'users',
    'roles', 
    'user_roles',
    'tags',
    'skills',
    'projects',
    'experiences',
    'education',
    'testimonials',
    'content_versions',
    'workflow_states',
    'media_assets',
    'blog_posts',
    'categories',
    'comments',
    'portfolio_items',
    'project_skills',
    'project_tags'
  ];
  
  console.log(`\n🔍 Checking ${expectedTables.length} expected tables...`);
  
  let existingTables = 0;
  let accessibleTables = 0;
  const tableStatus = {};
  
  for (const table of expectedTables) {
    const status = await testTableAccess(table);
    tableStatus[table] = status;
    
    if (status.exists) existingTables++;
    if (status.accessible) accessibleTables++;
  }
  
  // Summary
  console.log('\n' + '=' .repeat(50));
  console.log('📊 DATABASE STATUS SUMMARY');
  console.log('=' .repeat(50));
  
  console.log(`🎯 Tables Analysis:`);
  console.log(`   📋 Expected tables: ${expectedTables.length}`);
  console.log(`   ✅ Existing tables: ${existingTables}`);
  console.log(`   🔓 Accessible tables: ${accessibleTables}`);
  console.log(`   ❌ Missing tables: ${expectedTables.length - existingTables}`);
  
  console.log('\n📋 Detailed Table Status:');
  for (const [table, status] of Object.entries(tableStatus)) {
    const icon = status.exists ? (status.accessible ? '✅' : '🔒') : '❌';
    const statusText = status.exists ? (status.accessible ? 'OK' : 'EXISTS_NO_ACCESS') : 'MISSING';
    console.log(`   ${icon} ${table.padEnd(20)} ${statusText}`);
  }
  
  // Migration recommendation
  console.log('\n🎯 Recommendation:');
  if (existingTables === 0) {
    console.log('   🚨 No tables found - Database migration required');
    console.log('   💡 Run migrations to create the database schema');
  } else if (existingTables < expectedTables.length) {
    console.log('   ⚠️  Partial schema detected - Some migrations may be missing');
    console.log('   💡 Review and run missing migrations');
  } else {
    console.log('   🎉 All expected tables are present');
    console.log('   💡 Database schema appears complete');
  }
  
  console.log('\n📝 Notes:');
  console.log('   • Tables marked as EXISTS_NO_ACCESS are likely protected by RLS policies');
  console.log('   • This is expected behavior for authenticated-only tables');
  console.log('   • Use service key for administrative operations');
  
  process.exit(0);
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the status check
main().catch(console.error);