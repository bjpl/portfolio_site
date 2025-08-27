#!/usr/bin/env node

/**
 * Comprehensive Migration Test Suite
 * Tests database connectivity, schema creation, constraints, indexes, RLS policies, and rollback procedures
 */

import { createClient } from '@supabase/supabase-js';
import pg from 'pg';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ANSI colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

class MigrationTester {
  constructor() {
    this.supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    this.supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    this.dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
    
    this.testResults = {
      connectivity: { passed: 0, failed: 0, tests: [] },
      tables: { passed: 0, failed: 0, tests: [] },
      constraints: { passed: 0, failed: 0, tests: [] },
      indexes: { passed: 0, failed: 0, tests: [] },
      policies: { passed: 0, failed: 0, tests: [] },
      rollback: { passed: 0, failed: 0, tests: [] }
    };

    this.pgClient = null;
    this.supabase = null;
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  logTest(category, testName, passed, error = null) {
    const status = passed ? '✅' : '❌';
    const statusColor = passed ? 'green' : 'red';
    
    this.log(`  ${status} ${testName}`, statusColor);
    
    if (error) {
      this.log(`     Error: ${error.message}`, 'red');
    }

    this.testResults[category].tests.push({ testName, passed, error });
    if (passed) {
      this.testResults[category].passed++;
    } else {
      this.testResults[category].failed++;
    }
  }

  async initializeClients() {
    this.log('\n🔄 Initializing database connections...', 'cyan');
    
    try {
      // Initialize Supabase client
      if (this.supabaseUrl && this.supabaseKey) {
        this.supabase = createClient(this.supabaseUrl, this.supabaseKey);
        this.log('✅ Supabase client initialized', 'green');
      } else {
        throw new Error('Supabase credentials not found');
      }

      // Initialize direct PostgreSQL client
      if (this.dbUrl) {
        this.pgClient = new Client({
          connectionString: this.dbUrl,
          ssl: { rejectUnauthorized: false }
        });
        await this.pgClient.connect();
        this.log('✅ PostgreSQL client connected', 'green');
      } else {
        this.log('⚠️  PostgreSQL direct connection not available', 'yellow');
      }
    } catch (error) {
      this.log(`❌ Connection initialization failed: ${error.message}`, 'red');
      throw error;
    }
  }

  async testDatabaseConnectivity() {
    this.log('\n🧪 Testing Database Connectivity...', 'blue');

    // Test Supabase connection
    try {
      const { data, error } = await this.supabase.from('profiles').select('count').limit(1);
      if (error && !error.message.includes('permission denied')) {
        throw error;
      }
      this.logTest('connectivity', 'Supabase client connection', true);
    } catch (error) {
      this.logTest('connectivity', 'Supabase client connection', false, error);
    }

    // Test direct PostgreSQL connection
    if (this.pgClient) {
      try {
        const result = await this.pgClient.query('SELECT version()');
        this.logTest('connectivity', 'Direct PostgreSQL connection', true);
        this.log(`     PostgreSQL version: ${result.rows[0].version.split(',')[0]}`, 'cyan');
      } catch (error) {
        this.logTest('connectivity', 'Direct PostgreSQL connection', false, error);
      }

      // Test extensions
      try {
        const extensionsQuery = `
          SELECT extname, extversion 
          FROM pg_extension 
          WHERE extname IN ('uuid-ossp', 'pgcrypto', 'pg_trgm', 'unaccent', 'btree_gin')
          ORDER BY extname
        `;
        const result = await this.pgClient.query(extensionsQuery);
        
        const expectedExtensions = ['uuid-ossp', 'pgcrypto', 'pg_trgm', 'unaccent', 'btree_gin'];
        const installedExtensions = result.rows.map(row => row.extname);
        
        for (const ext of expectedExtensions) {
          const isInstalled = installedExtensions.includes(ext);
          this.logTest('connectivity', `Extension: ${ext}`, isInstalled);
        }
      } catch (error) {
        this.logTest('connectivity', 'PostgreSQL extensions check', false, error);
      }
    }

    // Test authentication
    try {
      const { data: { user }, error } = await this.supabase.auth.getUser();
      this.logTest('connectivity', 'Authentication service', !error);
    } catch (error) {
      this.logTest('connectivity', 'Authentication service', false, error);
    }
  }

  async testTableCreation() {
    this.log('\n🧪 Testing Table Creation...', 'blue');

    if (!this.pgClient) {
      this.logTest('tables', 'Table creation tests', false, new Error('PostgreSQL client not available'));
      return;
    }

    const expectedTables = [
      'profiles', 'blog_posts', 'projects', 'media_assets', 'content_versions',
      'pages', 'categories', 'workflow_states', 'content_workflows', 'roles',
      'user_roles', 'media_collections', 'media_collection_items', 'content_blocks',
      'seo_metadata', 'form_definitions', 'form_submissions', 'menus', 'menu_items',
      'analytics_sessions', 'page_performance'
    ];

    try {
      const tablesQuery = `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `;
      const result = await this.pgClient.query(tablesQuery);
      const existingTables = result.rows.map(row => row.table_name);

      for (const table of expectedTables) {
        const exists = existingTables.includes(table);
        this.logTest('tables', `Table exists: ${table}`, exists);
      }

      // Test table structure for key tables
      await this.testTableStructure('profiles', [
        'id', 'email', 'full_name', 'username', 'avatar_url', 'bio', 
        'website', 'location', 'created_at', 'updated_at'
      ]);

      await this.testTableStructure('blog_posts', [
        'id', 'title', 'slug', 'content', 'excerpt', 'status', 
        'published_at', 'author_id', 'created_at', 'updated_at'
      ]);

      await this.testTableStructure('projects', [
        'id', 'title', 'slug', 'description', 'content', 'status',
        'github_url', 'demo_url', 'featured_image', 'created_at', 'updated_at'
      ]);

    } catch (error) {
      this.logTest('tables', 'Table structure validation', false, error);
    }
  }

  async testTableStructure(tableName, expectedColumns) {
    try {
      const columnsQuery = `
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `;
      const result = await this.pgClient.query(columnsQuery, [tableName]);
      const existingColumns = result.rows.map(row => row.column_name);

      for (const column of expectedColumns) {
        const exists = existingColumns.includes(column);
        this.logTest('tables', `${tableName}.${column}`, exists);
      }
    } catch (error) {
      this.logTest('tables', `Table structure: ${tableName}`, false, error);
    }
  }

  async testForeignKeyConstraints() {
    this.log('\n🧪 Testing Foreign Key Constraints...', 'blue');

    if (!this.pgClient) {
      this.logTest('constraints', 'Foreign key tests', false, new Error('PostgreSQL client not available'));
      return;
    }

    const expectedConstraints = [
      { table: 'blog_posts', column: 'author_id', ref_table: 'profiles' },
      { table: 'projects', column: 'author_id', ref_table: 'profiles' },
      { table: 'media_assets', column: 'uploaded_by', ref_table: 'profiles' },
      { table: 'content_versions', column: 'created_by', ref_table: 'profiles' },
      { table: 'pages', column: 'author_id', ref_table: 'profiles' },
      { table: 'pages', column: 'parent_id', ref_table: 'pages' },
      { table: 'categories', column: 'parent_id', ref_table: 'categories' },
      { table: 'content_workflows', column: 'workflow_state_id', ref_table: 'workflow_states' },
      { table: 'user_roles', column: 'user_id', ref_table: 'profiles' },
      { table: 'user_roles', column: 'role_id', ref_table: 'roles' }
    ];

    try {
      const constraintsQuery = `
        SELECT
          tc.table_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name,
          tc.constraint_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
        ORDER BY tc.table_name, kcu.column_name
      `;

      const result = await this.pgClient.query(constraintsQuery);
      const existingConstraints = result.rows;

      for (const constraint of expectedConstraints) {
        const exists = existingConstraints.some(row => 
          row.table_name === constraint.table &&
          row.column_name === constraint.column &&
          row.foreign_table_name === constraint.ref_table
        );
        this.logTest('constraints', 
          `FK: ${constraint.table}.${constraint.column} → ${constraint.ref_table}`, 
          exists
        );
      }

      // Test constraint enforcement
      await this.testConstraintEnforcement();

    } catch (error) {
      this.logTest('constraints', 'Foreign key constraint validation', false, error);
    }
  }

  async testConstraintEnforcement() {
    try {
      // Test that we cannot insert invalid foreign key references
      const invalidInsertQuery = `
        INSERT INTO blog_posts (id, title, slug, author_id) 
        VALUES (uuid_generate_v4(), 'Test Post', 'test-slug', '00000000-0000-0000-0000-000000000000')
      `;
      
      try {
        await this.pgClient.query(invalidInsertQuery);
        this.logTest('constraints', 'Foreign key enforcement (should fail)', false, 
          new Error('Invalid foreign key was allowed'));
      } catch (error) {
        // This should fail - which is correct behavior
        if (error.message.includes('foreign key constraint') || error.message.includes('violates')) {
          this.logTest('constraints', 'Foreign key enforcement', true);
        } else {
          this.logTest('constraints', 'Foreign key enforcement', false, error);
        }
      }
    } catch (error) {
      this.logTest('constraints', 'Constraint enforcement test', false, error);
    }
  }

  async testIndexes() {
    this.log('\n🧪 Testing Indexes...', 'blue');

    if (!this.pgClient) {
      this.logTest('indexes', 'Index tests', false, new Error('PostgreSQL client not available'));
      return;
    }

    const expectedIndexes = [
      'idx_blog_posts_slug',
      'idx_blog_posts_author_id',
      'idx_blog_posts_published_at',
      'idx_projects_slug',
      'idx_projects_author_id',
      'idx_profiles_username',
      'idx_profiles_email',
      'idx_pages_slug',
      'idx_pages_status',
      'idx_categories_slug',
      'idx_categories_parent_id',
      'idx_workflow_states_content_type',
      'idx_content_workflows_content',
      'idx_media_collections_slug',
      'idx_seo_metadata_entity',
      'idx_form_submissions_form_id',
      'idx_analytics_sessions_session_id'
    ];

    try {
      const indexesQuery = `
        SELECT indexname, tablename, indexdef
        FROM pg_indexes
        WHERE schemaname = 'public'
        AND indexname NOT LIKE '%_pkey'
        ORDER BY indexname
      `;

      const result = await this.pgClient.query(indexesQuery);
      const existingIndexes = result.rows.map(row => row.indexname);

      for (const index of expectedIndexes) {
        const exists = existingIndexes.includes(index);
        this.logTest('indexes', `Index exists: ${index}`, exists);
      }

      // Test full-text search indexes
      const ftsIndexes = existingIndexes.filter(idx => idx.includes('_fts'));
      this.logTest('indexes', 'Full-text search indexes', ftsIndexes.length > 0);

      // Test index performance (basic check)
      await this.testIndexPerformance();

    } catch (error) {
      this.logTest('indexes', 'Index validation', false, error);
    }
  }

  async testIndexPerformance() {
    try {
      // Test that queries use indexes efficiently
      const explainQuery = `
        EXPLAIN (FORMAT JSON) 
        SELECT * FROM blog_posts WHERE slug = 'test-slug'
      `;
      
      const result = await this.pgClient.query(explainQuery);
      const plan = result.rows[0]['QUERY PLAN'][0];
      
      // Check if index scan is used
      const usesIndex = JSON.stringify(plan).includes('Index Scan');
      this.logTest('indexes', 'Query uses index scan', usesIndex);
      
    } catch (error) {
      this.logTest('indexes', 'Index performance test', false, error);
    }
  }

  async testRLSPolicies() {
    this.log('\n🧪 Testing Row Level Security Policies...', 'blue');

    if (!this.pgClient) {
      this.logTest('policies', 'RLS policy tests', false, new Error('PostgreSQL client not available'));
      return;
    }

    try {
      // Check if RLS is enabled on key tables
      const rlsEnabledQuery = `
        SELECT schemaname, tablename, rowsecurity
        FROM pg_tables 
        WHERE schemaname = 'public'
        AND tablename IN ('profiles', 'blog_posts', 'projects', 'media_assets', 'pages')
        ORDER BY tablename
      `;

      const result = await this.pgClient.query(rlsEnabledQuery);
      
      for (const row of result.rows) {
        this.logTest('policies', `RLS enabled: ${row.tablename}`, row.rowsecurity);
      }

      // Check specific policies exist
      const policiesQuery = `
        SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
        FROM pg_policies
        WHERE schemaname = 'public'
        ORDER BY tablename, policyname
      `;

      const policiesResult = await this.pgClient.query(policiesQuery);
      const policies = policiesResult.rows;

      // Expected policies for key operations
      const expectedPolicyPatterns = [
        { table: 'profiles', operation: 'SELECT' },
        { table: 'profiles', operation: 'UPDATE' },
        { table: 'blog_posts', operation: 'SELECT' },
        { table: 'projects', operation: 'SELECT' },
        { table: 'media_assets', operation: 'SELECT' }
      ];

      for (const expected of expectedPolicyPatterns) {
        const hasPolicy = policies.some(p => 
          p.tablename === expected.table && 
          (p.cmd === expected.operation || p.cmd === 'ALL')
        );
        this.logTest('policies', 
          `${expected.table} ${expected.operation} policy`, 
          hasPolicy
        );
      }

      // Test policy enforcement with Supabase client
      await this.testPolicyEnforcement();

    } catch (error) {
      this.logTest('policies', 'RLS policy validation', false, error);
    }
  }

  async testPolicyEnforcement() {
    try {
      // Test public read access to published blog posts
      const { data, error } = await this.supabase
        .from('blog_posts')
        .select('id, title, status')
        .eq('status', 'published')
        .limit(1);

      this.logTest('policies', 'Public read access to published posts', !error);

      // Test that draft posts are not accessible without auth
      const { data: drafts, error: draftError } = await this.supabase
        .from('blog_posts')
        .select('id, title, status')
        .eq('status', 'draft')
        .limit(1);

      // This should either return no results or an error depending on policy
      this.logTest('policies', 'Draft post access control', 
        draftError !== null || (drafts && drafts.length === 0)
      );

    } catch (error) {
      this.logTest('policies', 'Policy enforcement test', false, error);
    }
  }

  async testRollbackProcedures() {
    this.log('\n🧪 Testing Rollback Procedures...', 'blue');

    if (!this.pgClient) {
      this.logTest('rollback', 'Rollback tests', false, new Error('PostgreSQL client not available'));
      return;
    }

    try {
      // Test transaction rollback
      await this.pgClient.query('BEGIN');
      
      // Create a test table
      await this.pgClient.query(`
        CREATE TABLE test_rollback_table (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          test_data TEXT
        )
      `);

      // Verify table exists
      const checkTable = await this.pgClient.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'test_rollback_table'
      `);
      
      this.logTest('rollback', 'Test table creation in transaction', checkTable.rows.length > 0);

      // Rollback the transaction
      await this.pgClient.query('ROLLBACK');

      // Verify table was rolled back
      const checkTableAfterRollback = await this.pgClient.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'test_rollback_table'
      `);

      this.logTest('rollback', 'Transaction rollback successful', checkTableAfterRollback.rows.length === 0);

      // Test migration version tracking
      const versionQuery = `
        SELECT version FROM supabase_migrations.schema_migrations 
        ORDER BY version DESC LIMIT 1
      `;

      try {
        const versionResult = await this.pgClient.query(versionQuery);
        this.logTest('rollback', 'Migration version tracking', versionResult.rows.length > 0);
        
        if (versionResult.rows.length > 0) {
          this.log(`     Latest migration: ${versionResult.rows[0].version}`, 'cyan');
        }
      } catch (error) {
        // Schema migrations table might not exist in all setups
        this.logTest('rollback', 'Migration version tracking', false, 
          new Error('Migration tracking table not available'));
      }

      // Test backup procedures
      await this.testBackupProcedures();

    } catch (error) {
      await this.pgClient.query('ROLLBACK'); // Ensure we're not in a bad state
      this.logTest('rollback', 'Rollback procedure test', false, error);
    }
  }

  async testBackupProcedures() {
    try {
      // Test that we can read schema information for backup
      const schemaQuery = `
        SELECT table_name, column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
        ORDER BY table_name, ordinal_position
        LIMIT 10
      `;

      const result = await this.pgClient.query(schemaQuery);
      this.logTest('rollback', 'Schema information accessible for backup', result.rows.length > 0);

      // Test function definitions are accessible
      const functionsQuery = `
        SELECT routine_name, routine_type
        FROM information_schema.routines
        WHERE routine_schema = 'public'
        AND routine_type = 'FUNCTION'
        LIMIT 5
      `;

      const functionsResult = await this.pgClient.query(functionsQuery);
      this.logTest('rollback', 'Function definitions accessible', functionsResult.rows.length > 0);

    } catch (error) {
      this.logTest('rollback', 'Backup procedures test', false, error);
    }
  }

  async runAllTests() {
    const startTime = Date.now();
    
    this.log('🚀 Starting Migration Test Suite', 'bold');
    this.log('=====================================', 'blue');

    try {
      await this.initializeClients();
      await this.testDatabaseConnectivity();
      await this.testTableCreation();
      await this.testForeignKeyConstraints();
      await this.testIndexes();
      await this.testRLSPolicies();
      await this.testRollbackProcedures();
    } catch (error) {
      this.log(`\n❌ Test suite failed: ${error.message}`, 'red');
    } finally {
      if (this.pgClient) {
        await this.pgClient.end();
      }
    }

    this.generateTestReport(Date.now() - startTime);
  }

  generateTestReport(duration) {
    this.log('\n📊 Test Results Summary', 'bold');
    this.log('======================', 'blue');

    let totalPassed = 0;
    let totalFailed = 0;

    for (const [category, results] of Object.entries(this.testResults)) {
      const total = results.passed + results.failed;
      const passRate = total > 0 ? Math.round((results.passed / total) * 100) : 0;
      const status = results.failed === 0 ? '✅' : '❌';
      
      this.log(`${status} ${category.toUpperCase()}: ${results.passed}/${total} (${passRate}%)`, 
        results.failed === 0 ? 'green' : 'yellow');

      totalPassed += results.passed;
      totalFailed += results.failed;
    }

    const overallTotal = totalPassed + totalFailed;
    const overallPassRate = overallTotal > 0 ? Math.round((totalPassed / overallTotal) * 100) : 0;
    
    this.log('\n📈 Overall Results:', 'bold');
    this.log(`   Total Tests: ${overallTotal}`, 'cyan');
    this.log(`   Passed: ${totalPassed}`, 'green');
    this.log(`   Failed: ${totalFailed}`, totalFailed > 0 ? 'red' : 'green');
    this.log(`   Pass Rate: ${overallPassRate}%`, overallPassRate >= 90 ? 'green' : 'yellow');
    this.log(`   Duration: ${Math.round(duration / 1000)}s`, 'cyan');

    // Recommendations
    this.log('\n💡 Recommendations:', 'bold');
    
    if (this.testResults.connectivity.failed > 0) {
      this.log('   • Check database connection configuration', 'yellow');
    }
    if (this.testResults.tables.failed > 0) {
      this.log('   • Run pending migrations to create missing tables', 'yellow');
    }
    if (this.testResults.constraints.failed > 0) {
      this.log('   • Review foreign key relationships and constraints', 'yellow');
    }
    if (this.testResults.indexes.failed > 0) {
      this.log('   • Add missing indexes for query performance', 'yellow');
    }
    if (this.testResults.policies.failed > 0) {
      this.log('   • Configure Row Level Security policies', 'yellow');
    }
    if (this.testResults.rollback.failed > 0) {
      this.log('   • Test rollback procedures in staging environment', 'yellow');
    }

    const exitCode = totalFailed === 0 ? 0 : 1;
    this.log(`\n🏁 Test suite completed with exit code: ${exitCode}`, 
      exitCode === 0 ? 'green' : 'red');
    
    process.exit(exitCode);
  }
}

// Main execution
async function main() {
  // Check for required environment variables
  const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
    console.error('Please set these variables before running the test suite.');
    process.exit(1);
  }

  const tester = new MigrationTester();
  await tester.runAllTests();
}

// Run the test suite
if (require.main === module) {
  main().catch(error => {
    console.error(`❌ Test suite error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { MigrationTester };