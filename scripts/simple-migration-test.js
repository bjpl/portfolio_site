#!/usr/bin/env node
/**
 * Simple Supabase Migration Test
 * Tests basic connectivity and executes a simple migration
 */

const { createClient } = require('@supabase/supabase-js');

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

async function testBasicConnection() {
  console.log('🔍 Testing basic Supabase connection...');
  
  try {
    // Try to create a simple test table and drop it
    const { data, error } = await supabase
      .rpc('exec_sql', { 
        sql_query: 'SELECT version();' 
      });
    
    if (error) {
      console.error('❌ SQL execution failed:', error.message);
      return false;
    }
    
    console.log('✅ Connection successful, PostgreSQL version:', data);
    return true;
    
  } catch (err) {
    console.error('❌ Connection test failed:', err.message);
    return false;
  }
}

async function listExistingTables() {
  console.log('\n🔍 Listing existing tables...');
  
  try {
    const { data, error } = await supabase
      .rpc('exec_sql', {
        sql_query: `
          SELECT schemaname, tablename 
          FROM pg_tables 
          WHERE schemaname NOT IN ('information_schema', 'pg_catalog', 'auth', 'storage', 'graphql_public', 'realtime', 'supabase_functions')
          ORDER BY schemaname, tablename;
        `
      });

    if (error) {
      console.error('❌ Failed to list tables:', error.message);
      return false;
    }

    console.log('📋 Existing tables:', data);
    return true;
    
  } catch (err) {
    console.error('❌ Exception listing tables:', err.message);
    return false;
  }
}

async function createSimpleTestTable() {
  console.log('\n🔨 Creating a simple test table...');
  
  try {
    const { data, error } = await supabase
      .rpc('exec_sql', {
        sql_query: `
          DROP TABLE IF EXISTS test_migration;
          CREATE TABLE test_migration (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
          INSERT INTO test_migration (name) VALUES ('Migration Test');
        `
      });

    if (error) {
      console.error('❌ Failed to create test table:', error.message);
      return false;
    }

    console.log('✅ Test table created successfully');
    return true;
    
  } catch (err) {
    console.error('❌ Exception creating test table:', err.message);
    return false;
  }
}

async function queryTestTable() {
  console.log('\n🔍 Querying test table via Supabase client...');
  
  try {
    const { data, error } = await supabase
      .from('test_migration')
      .select('*');

    if (error) {
      console.error('❌ Failed to query test table:', error.message);
      return false;
    }

    console.log('✅ Query successful, data:', data);
    return true;
    
  } catch (err) {
    console.error('❌ Exception querying test table:', err.message);
    return false;
  }
}

async function cleanupTestTable() {
  console.log('\n🧹 Cleaning up test table...');
  
  try {
    const { data, error } = await supabase
      .rpc('exec_sql', {
        sql_query: 'DROP TABLE IF EXISTS test_migration;'
      });

    if (error) {
      console.error('❌ Failed to cleanup test table:', error.message);
      return false;
    }

    console.log('✅ Test table cleaned up');
    return true;
    
  } catch (err) {
    console.error('❌ Exception cleaning up test table:', err.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting Simple Supabase Migration Test');
  console.log('=' .repeat(50));
  
  const tests = [
    { name: 'Basic Connection', fn: testBasicConnection },
    { name: 'List Existing Tables', fn: listExistingTables },
    { name: 'Create Test Table', fn: createSimpleTestTable },
    { name: 'Query Test Table', fn: queryTestTable },
    { name: 'Cleanup Test Table', fn: cleanupTestTable }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    console.log(`\n🧪 Running: ${test.name}`);
    
    const success = await test.fn();
    if (success) {
      console.log(`✅ ${test.name} - PASSED`);
      passed++;
    } else {
      console.log(`❌ ${test.name} - FAILED`);
      failed++;
    }
  }

  console.log('\n' + '=' .repeat(50));
  console.log('📊 TEST RESULTS');
  console.log('=' .repeat(50));
  console.log(`✅ Passed: ${passed}/${tests.length}`);
  console.log(`❌ Failed: ${failed}/${tests.length}`);

  if (failed === 0) {
    console.log('\n🎉 All tests passed! Supabase connection is working.');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.');
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the test
main().catch(console.error);