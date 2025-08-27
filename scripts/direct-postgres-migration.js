#!/usr/bin/env node
/**
 * Direct PostgreSQL Migration Executor
 * Uses pg library to connect directly to Supabase PostgreSQL database
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Extract connection details from Supabase URL
const SUPABASE_URL = 'https://tdmzayzkqyegvfgxlolj.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkbXpheXprcXllZ3ZmZ3hsb2xqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTk5OTM0MCwiZXhwIjoyMDcxNTc1MzQwfQ.N0lnWnvo323XXJAprqRhbBweguYlGsJgquBHB1g3L7E';

// Decode the JWT to get project reference
function decodeJWT(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(Buffer.from(base64, 'base64').toString()
      .split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

const jwtPayload = decodeJWT(SUPABASE_SERVICE_KEY);
const projectRef = jwtPayload ? jwtPayload.ref : 'tdmzayzkqyegvfgxlolj';

// PostgreSQL connection configuration
const config = {
  host: `db.${projectRef}.supabase.co`,
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: process.env.SUPABASE_DB_PASSWORD || 'your-db-password', // This needs to be provided
  ssl: {
    rejectUnauthorized: false
  }
};

console.log('🔧 Configuration:');
console.log(`   Host: ${config.host}`);
console.log(`   Database: ${config.database}`);
console.log(`   User: ${config.user}`);
console.log(`   SSL: enabled`);

async function testDirectConnection() {
  console.log('\n🔍 Testing direct PostgreSQL connection...');
  
  const client = new Client(config);
  
  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL database');
    
    const result = await client.query('SELECT version()');
    console.log('✅ Database version:', result.rows[0].version);
    
    await client.end();
    return true;
    
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
    return false;
  }
}

async function listExistingTables() {
  console.log('\n🔍 Listing existing tables...');
  
  const client = new Client(config);
  
  try {
    await client.connect();
    
    const result = await client.query(`
      SELECT schemaname, tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `);
    
    console.log(`📋 Found ${result.rows.length} tables in public schema:`);
    result.rows.forEach(row => {
      console.log(`   📄 ${row.schemaname}.${row.tablename}`);
    });
    
    await client.end();
    return result.rows;
    
  } catch (err) {
    console.error('❌ Failed to list tables:', err.message);
    return [];
  }
}

async function executeMigrationFile(filePath) {
  console.log(`\n🔄 Executing migration: ${path.basename(filePath)}`);
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Migration file not found: ${filePath}`);
    return false;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  console.log(`📝 Content length: ${content.length} characters`);
  
  const client = new Client(config);
  
  try {
    await client.connect();
    
    // Execute the migration as a single transaction
    await client.query('BEGIN');
    
    try {
      await client.query(content);
      await client.query('COMMIT');
      
      console.log(`✅ Migration executed successfully: ${path.basename(filePath)}`);
      return true;
      
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`❌ Migration failed: ${path.basename(filePath)}`, err.message);
      return false;
    }
    
  } catch (err) {
    console.error(`❌ Database connection failed for ${path.basename(filePath)}:`, err.message);
    return false;
  } finally {
    await client.end();
  }
}

async function main() {
  console.log('🚀 Starting Direct PostgreSQL Migration');
  console.log('=' .repeat(50));
  
  // Check if password is provided
  if (!process.env.SUPABASE_DB_PASSWORD) {
    console.error('❌ Database password not provided');
    console.error('   Please set SUPABASE_DB_PASSWORD environment variable');
    console.error('   You can find this in your Supabase project settings');
    process.exit(1);
  }
  
  // Test connection first
  const connectionOk = await testDirectConnection();
  if (!connectionOk) {
    console.error('❌ Cannot proceed without database connection');
    process.exit(1);
  }
  
  // List existing tables
  await listExistingTables();
  
  // Get all migration files
  const migrationsDir = path.join(__dirname, '../supabase/migrations');
  
  if (!fs.existsSync(migrationsDir)) {
    console.error(`❌ Migrations directory not found: ${migrationsDir}`);
    process.exit(1);
  }
  
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort()
    .map(file => path.join(migrationsDir, file));
  
  console.log(`\n📁 Found ${migrationFiles.length} migration files to execute:`);
  migrationFiles.forEach((file, i) => {
    console.log(`   ${i + 1}. ${path.basename(file)}`);
  });
  
  let successful = 0;
  let failed = 0;
  
  // Execute each migration
  for (const file of migrationFiles) {
    const success = await executeMigrationFile(file);
    if (success) {
      successful++;
    } else {
      failed++;
    }
  }
  
  // Final report
  console.log('\n' + '=' .repeat(50));
  console.log('📊 MIGRATION EXECUTION REPORT');
  console.log('=' .repeat(50));
  console.log(`✅ Successful migrations: ${successful}/${migrationFiles.length}`);
  console.log(`❌ Failed migrations: ${failed}/${migrationFiles.length}`);
  
  if (failed === 0) {
    console.log('\n🎉 All migrations executed successfully!');
    
    // List tables after migration
    await listExistingTables();
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