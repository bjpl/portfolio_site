#!/usr/bin/env node

/**
 * Supabase Deployment Validation Script
 * Validates database schema, RLS policies, storage configuration, and functions
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   - SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Validation results
let validationResults = {
  schema: { passed: 0, failed: 0, warnings: 0, tests: [] },
  policies: { passed: 0, failed: 0, warnings: 0, tests: [] },
  storage: { passed: 0, failed: 0, warnings: 0, tests: [] },
  functions: { passed: 0, failed: 0, warnings: 0, tests: [] },
  indexes: { passed: 0, failed: 0, warnings: 0, tests: [] }
};

// Helper functions
function logTest(category, testName, passed, message = '', warning = false) {
  const icon = passed ? '✅' : (warning ? '⚠️' : '❌');
  const status = passed ? 'PASS' : (warning ? 'WARN' : 'FAIL');
  
  console.log(`${icon} [${category.toUpperCase()}] ${testName}: ${status}`);
  if (message) {
    console.log(`   ${message}`);
  }
  
  validationResults[category].tests.push({
    name: testName,
    passed,
    warning,
    message
  });
  
  if (passed) {
    validationResults[category].passed++;
  } else if (warning) {
    validationResults[category].warnings++;
  } else {
    validationResults[category].failed++;
  }
}

async function runQuery(query, params = []) {
  try {
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql: query,
      params: params 
    });
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    // Fallback to direct query if RPC doesn't exist
    try {
      const result = await supabase
        .from('pg_stat_user_tables')
        .select('*')
        .limit(1);
      
      // Use PostgreSQL system catalogs for validation
      const { data, error: queryError } = await supabase.rpc('sql', {
        query: query
      });
      
      return { data, error: queryError };
    } catch (fallbackError) {
      return { data: null, error: fallbackError };
    }
  }
}

async function validateSchema() {
  console.log('\n🔍 Validating Database Schema...');
  
  // Core tables validation
  const requiredTables = [
    'profiles', 'blog_posts', 'projects', 'pages', 'comments',
    'media_assets', 'categories', 'tags', 'skills', 'testimonials',
    'contact_messages', 'analytics_events', 'newsletter_subscribers',
    'content_versions', 'site_settings', 'workflow_states',
    'content_workflows', 'roles', 'user_roles', 'media_collections',
    'media_collection_items', 'content_blocks', 'seo_metadata',
    'form_definitions', 'form_submissions', 'menus', 'menu_items',
    'editing_sessions', 'content_operations', 'content_locks',
    'realtime_notifications', 'storage_versions', 'storage_processing_queue',
    'backup_operations', 'migration_operations', 'data_integrity_checks'
  ];
  
  for (const tableName of requiredTables) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
      
      if (error) {
        logTest('schema', `Table ${tableName}`, false, error.message);
      } else {
        logTest('schema', `Table ${tableName}`, true);
      }
    } catch (error) {
      logTest('schema', `Table ${tableName}`, false, error.message);
    }
  }
  
  // Check for required extensions
  const requiredExtensions = [
    'uuid-ossp', 'pgcrypto', 'pg_trgm', 'unaccent', 'btree_gin'
  ];
  
  try {
    const { data: extensions } = await supabase
      .rpc('get_extensions')
      .then(result => result)
      .catch(() => ({ data: [] }));
    
    const installedExtensions = extensions?.map(ext => ext.name) || [];
    
    for (const ext of requiredExtensions) {
      const installed = installedExtensions.includes(ext);
      logTest('schema', `Extension ${ext}`, installed, 
        installed ? '' : 'Extension may not be available');
    }
  } catch (error) {
    logTest('schema', 'Extensions check', false, 'Could not verify extensions');
  }
  
  // Validate critical columns exist
  const columnChecks = [
    { table: 'profiles', column: 'user_id', type: 'uuid' },
    { table: 'blog_posts', column: 'author_id', type: 'uuid' },
    { table: 'projects', column: 'tech_stack', type: 'text[]' },
    { table: 'pages', column: 'visibility', type: 'text' },
    { table: 'media_assets', column: 'metadata', type: 'jsonb' }
  ];
  
  for (const check of columnChecks) {
    try {
      const query = `
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = '${check.table}' 
        AND column_name = '${check.column}'
      `;
      
      const { data } = await supabase.rpc('sql', { query }).catch(() => ({ data: [] }));
      
      if (data && data.length > 0) {
        logTest('schema', `Column ${check.table}.${check.column}`, true);
      } else {
        logTest('schema', `Column ${check.table}.${check.column}`, false, 'Column not found');
      }
    } catch (error) {
      logTest('schema', `Column ${check.table}.${check.column}`, false, error.message);
    }
  }
}

async function validatePolicies() {
  console.log('\n🛡️ Validating Row Level Security Policies...');
  
  const tablesToCheck = [
    'profiles', 'blog_posts', 'projects', 'pages', 'comments',
    'media_assets', 'categories', 'tags', 'content_workflows',
    'form_submissions', 'realtime_notifications'
  ];
  
  for (const tableName of tablesToCheck) {
    try {
      // Check if RLS is enabled
      const rlsQuery = `
        SELECT c.relname, c.relrowsecurity 
        FROM pg_class c 
        WHERE c.relname = '${tableName}'
      `;
      
      const { data: rlsData } = await supabase.rpc('sql', { query: rlsQuery }).catch(() => ({ data: [] }));
      
      if (rlsData && rlsData.length > 0) {
        const rlsEnabled = rlsData[0].relrowsecurity;
        logTest('policies', `RLS enabled for ${tableName}`, rlsEnabled, 
          rlsEnabled ? '' : 'RLS should be enabled for this table');
      } else {
        logTest('policies', `RLS check for ${tableName}`, false, 'Could not verify RLS status');
      }
      
      // Check for policies
      const policiesQuery = `
        SELECT pol.polname, pol.polcmd 
        FROM pg_policy pol
        JOIN pg_class c ON pol.polrelid = c.oid
        WHERE c.relname = '${tableName}'
      `;
      
      const { data: policies } = await supabase.rpc('sql', { query: policiesQuery }).catch(() => ({ data: [] }));
      
      if (policies && policies.length > 0) {
        logTest('policies', `Policies for ${tableName}`, true, `Found ${policies.length} policies`);
      } else {
        logTest('policies', `Policies for ${tableName}`, false, 'No policies found', true);
      }
    } catch (error) {
      logTest('policies', `Policy check for ${tableName}`, false, error.message);
    }
  }
  
  // Test policy functions
  const policyFunctions = [
    'auth.is_admin()', 'auth.is_admin_or_editor()', 
    'auth.has_permission(text)', 'auth.is_content_owner(text, uuid)'
  ];
  
  for (const func of policyFunctions) {
    try {
      const funcName = func.split('(')[0];
      const checkQuery = `
        SELECT p.proname 
        FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'auth' AND p.proname = '${funcName.split('.')[1]}'
      `;
      
      const { data } = await supabase.rpc('sql', { query: checkQuery }).catch(() => ({ data: [] }));
      
      logTest('policies', `Function ${func}`, data && data.length > 0, 
        data && data.length > 0 ? '' : 'Function not found');
    } catch (error) {
      logTest('policies', `Function ${func}`, false, error.message);
    }
  }
}

async function validateStorage() {
  console.log('\n💾 Validating Storage Configuration...');
  
  const expectedBuckets = [
    'avatars', 'project-images', 'blog-images', 'page-assets',
    'media', 'thumbnails', 'system-assets', 'user-content',
    'documents', 'media-versions', 'temp-uploads', 'backups'
  ];
  
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      logTest('storage', 'List buckets', false, error.message);
      return;
    }
    
    const bucketNames = buckets.map(b => b.name);
    
    for (const expectedBucket of expectedBuckets) {
      const exists = bucketNames.includes(expectedBucket);
      logTest('storage', `Bucket ${expectedBucket}`, exists, 
        exists ? '' : 'Bucket not found');
    }
    
    // Test upload permissions
    for (const bucket of ['avatars', 'media']) {
      if (bucketNames.includes(bucket)) {
        try {
          // Create a test file
          const testContent = new Blob(['test'], { type: 'text/plain' });
          const testPath = `test-${Date.now()}.txt`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(testPath, testContent);
          
          if (!uploadError) {
            logTest('storage', `Upload test ${bucket}`, true);
            
            // Clean up test file
            await supabase.storage.from(bucket).remove([testPath]);
          } else {
            logTest('storage', `Upload test ${bucket}`, false, uploadError.message, true);
          }
        } catch (error) {
          logTest('storage', `Upload test ${bucket}`, false, error.message, true);
        }
      }
    }
  } catch (error) {
    logTest('storage', 'Storage validation', false, error.message);
  }
}

async function validateFunctions() {
  console.log('\n⚙️ Validating Database Functions...');
  
  const requiredFunctions = [
    'get_content_paginated',
    'get_content_with_relationships',
    'get_user_profile_complete',
    'update_user_profile',
    'get_analytics_dashboard',
    'advanced_search',
    'generate_unique_slug',
    'create_content_version',
    'start_editing_session',
    'apply_content_operation',
    'create_full_backup',
    'run_integrity_checks'
  ];
  
  for (const funcName of requiredFunctions) {
    try {
      const checkQuery = `
        SELECT p.proname, p.proargtypes, p.prorettype
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE p.proname = '${funcName}' AND n.nspname = 'public'
      `;
      
      const { data } = await supabase.rpc('sql', { query: checkQuery }).catch(() => ({ data: [] }));
      
      logTest('functions', `Function ${funcName}`, data && data.length > 0,
        data && data.length > 0 ? '' : 'Function not found');
    } catch (error) {
      logTest('functions', `Function ${funcName}`, false, error.message);
    }
  }
  
  // Test function execution (basic tests)
  const functionTests = [
    {
      name: 'generate_unique_slug',
      test: async () => {
        const { data, error } = await supabase.rpc('generate_unique_slug', {
          base_slug: 'test-slug',
          table_name: 'blog_posts'
        });
        return { success: !error && data, error };
      }
    },
    {
      name: 'get_content_paginated',
      test: async () => {
        const { data, error } = await supabase.rpc('get_content_paginated', {
          content_type: 'blog_posts',
          page_number: 1,
          page_size: 10
        });
        return { success: !error && data, error };
      }
    }
  ];
  
  for (const test of functionTests) {
    try {
      const result = await test.test();
      logTest('functions', `Execute ${test.name}`, result.success, 
        result.success ? '' : (result.error?.message || 'Function execution failed'));
    } catch (error) {
      logTest('functions', `Execute ${test.name}`, false, error.message);
    }
  }
}

async function validateIndexes() {
  console.log('\n📊 Validating Database Indexes...');
  
  const criticalIndexes = [
    { table: 'profiles', column: 'user_id' },
    { table: 'blog_posts', column: 'slug' },
    { table: 'blog_posts', column: 'author_id' },
    { table: 'projects', column: 'slug' },
    { table: 'pages', column: 'slug' },
    { table: 'media_assets', column: 'uploaded_by' },
    { table: 'comments', column: 'post_id' },
    { table: 'content_versions', column: 'content_id' },
    { table: 'analytics_events', column: 'created_at' }
  ];
  
  for (const index of criticalIndexes) {
    try {
      const checkQuery = `
        SELECT i.indexname, i.indexdef
        FROM pg_indexes i
        WHERE i.tablename = '${index.table}'
        AND i.indexdef LIKE '%${index.column}%'
      `;
      
      const { data } = await supabase.rpc('sql', { query: checkQuery }).catch(() => ({ data: [] }));
      
      logTest('indexes', `Index on ${index.table}.${index.column}`, 
        data && data.length > 0,
        data && data.length > 0 ? '' : 'Index not found or not optimal');
    } catch (error) {
      logTest('indexes', `Index on ${index.table}.${index.column}`, false, error.message);
    }
  }
  
  // Check for full-text search indexes
  const ftsIndexes = ['blog_posts', 'projects', 'pages'];
  
  for (const table of ftsIndexes) {
    try {
      const checkQuery = `
        SELECT i.indexname, i.indexdef
        FROM pg_indexes i
        WHERE i.tablename = '${table}'
        AND (i.indexdef LIKE '%gin%' OR i.indexdef LIKE '%tsvector%')
      `;
      
      const { data } = await supabase.rpc('sql', { query: checkQuery }).catch(() => ({ data: [] }));
      
      logTest('indexes', `Full-text search index on ${table}`, 
        data && data.length > 0,
        data && data.length > 0 ? '' : 'FTS index not found', true);
    } catch (error) {
      logTest('indexes', `Full-text search index on ${table}`, false, error.message);
    }
  }
}

function generateReport() {
  console.log('\n📋 VALIDATION SUMMARY');
  console.log('='.repeat(50));
  
  let totalPassed = 0;
  let totalFailed = 0;
  let totalWarnings = 0;
  
  for (const [category, results] of Object.entries(validationResults)) {
    console.log(`\n${category.toUpperCase()}:`);
    console.log(`  ✅ Passed: ${results.passed}`);
    console.log(`  ❌ Failed: ${results.failed}`);
    console.log(`  ⚠️  Warnings: ${results.warnings}`);
    
    totalPassed += results.passed;
    totalFailed += results.failed;
    totalWarnings += results.warnings;
  }
  
  console.log('\nOVERALL:');
  console.log(`  ✅ Total Passed: ${totalPassed}`);
  console.log(`  ❌ Total Failed: ${totalFailed}`);
  console.log(`  ⚠️  Total Warnings: ${totalWarnings}`);
  
  const successRate = ((totalPassed / (totalPassed + totalFailed + totalWarnings)) * 100).toFixed(1);
  console.log(`  📊 Success Rate: ${successRate}%`);
  
  // Save detailed report
  const reportPath = path.join(__dirname, '..', 'validation-report.json');
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalPassed,
      totalFailed,
      totalWarnings,
      successRate: parseFloat(successRate)
    },
    details: validationResults
  };
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  
  if (totalFailed > 0) {
    console.log('\n❌ VALIDATION FAILED - Please fix the errors above before deployment');
    process.exit(1);
  } else if (totalWarnings > 0) {
    console.log('\n⚠️  VALIDATION PASSED WITH WARNINGS - Review warnings before deployment');
  } else {
    console.log('\n✅ ALL VALIDATIONS PASSED - Database is ready for deployment!');
  }
}

async function main() {
  console.log('🚀 Starting Supabase Deployment Validation...');
  console.log(`📍 Supabase URL: ${SUPABASE_URL}`);
  
  try {
    // Test basic connection
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    if (error && !error.message.includes('permission denied')) {
      throw new Error(`Connection failed: ${error.message}`);
    }
    console.log('✅ Supabase connection successful');
    
    // Run all validations
    await validateSchema();
    await validatePolicies();
    await validateStorage();
    await validateFunctions();
    await validateIndexes();
    
    generateReport();
    
  } catch (error) {
    console.error('\n❌ Validation failed with error:', error.message);
    process.exit(1);
  }
}

// Run validation
main().catch(console.error);

module.exports = {
  validateSchema,
  validatePolicies,
  validateStorage,
  validateFunctions,
  validateIndexes,
  generateReport
};