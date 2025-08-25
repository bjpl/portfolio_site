#!/usr/bin/env node
/**
 * Database Connectivity Fix Script
 * Comprehensive repair script for Supabase database connectivity issues
 */

const fs = require('fs');
const path = require('path');

class DatabaseConnectivityFixer {
  constructor() {
    this.issues = [];
    this.fixes = [];
    this.config = this.loadConfiguration();
  }

  loadConfiguration() {
    const envPath = path.join(process.cwd(), '.env');
    
    if (!fs.existsSync(envPath)) {
      this.issues.push('❌ .env file not found');
      return {};
    }

    const envContent = fs.readFileSync(envPath, 'utf8');
    const config = {};
    
    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        config[key.trim()] = value.trim();
      }
    });

    return config;
  }

  async diagnoseIssues() {
    console.log('🔍 Diagnosing database connectivity issues...\n');

    // Check environment variables
    this.checkEnvironmentVariables();
    
    // Check Supabase configuration
    this.checkSupabaseConfiguration();
    
    // Check migrations
    await this.checkMigrations();
    
    // Check network connectivity
    await this.checkNetworkConnectivity();
    
    // Test API endpoints
    await this.testAPIEndpoints();

    console.log(`\n📊 Found ${this.issues.length} issues to fix\n`);
    return this.issues.length === 0;
  }

  checkEnvironmentVariables() {
    console.log('🔧 Checking environment variables...');
    
    const requiredVars = [
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_KEY'
    ];

    const missing = requiredVars.filter(varName => !this.config[varName]);
    
    if (missing.length > 0) {
      this.issues.push(`❌ Missing environment variables: ${missing.join(', ')}`);
      this.fixes.push('Set missing environment variables in .env file');
    } else {
      console.log('✅ All required environment variables are set');
    }

    // Validate URL format
    if (this.config.SUPABASE_URL && !this.config.SUPABASE_URL.includes('supabase.co')) {
      this.issues.push('❌ Invalid Supabase URL format');
      this.fixes.push('Update SUPABASE_URL to match format: https://xxx.supabase.co');
    }

    // Validate key formats (basic JWT check)
    ['SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_KEY'].forEach(keyName => {
      if (this.config[keyName]) {
        const parts = this.config[keyName].split('.');
        if (parts.length !== 3) {
          this.issues.push(`❌ Invalid ${keyName} format (not a valid JWT)`);
          this.fixes.push(`Update ${keyName} with valid JWT from Supabase dashboard`);
        }
      }
    });
  }

  checkSupabaseConfiguration() {
    console.log('🔧 Checking Supabase configuration...');
    
    const configFile = path.join(process.cwd(), 'supabase', 'config.toml');
    
    if (!fs.existsSync(configFile)) {
      this.issues.push('❌ Supabase config.toml not found');
      this.fixes.push('Run: supabase init to initialize Supabase configuration');
      return;
    }

    const configContent = fs.readFileSync(configFile, 'utf8');
    
    // Check if project_id is set
    if (!configContent.includes('project_id')) {
      this.issues.push('❌ Project ID not set in config.toml');
      this.fixes.push('Set project_id in supabase/config.toml');
    } else {
      console.log('✅ Supabase configuration file exists and configured');
    }
  }

  async checkMigrations() {
    console.log('🔧 Checking database migrations...');
    
    const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
    
    if (!fs.existsSync(migrationsDir)) {
      this.issues.push('❌ Migrations directory not found');
      this.fixes.push('Create migrations directory: supabase/migrations/');
      return;
    }

    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'));

    if (migrationFiles.length === 0) {
      this.issues.push('❌ No migration files found');
      this.fixes.push('Create initial migration: supabase db diff initial_schema');
    } else {
      console.log(`✅ Found ${migrationFiles.length} migration files`);
      
      // Check if the main schema migration exists
      const hasInitialSchema = migrationFiles.some(file => 
        file.includes('initial') || file.includes('schema')
      );
      
      if (!hasInitialSchema) {
        this.issues.push('❌ Initial schema migration missing');
        this.fixes.push('Run existing migration or create new one');
      }
    }
  }

  async checkNetworkConnectivity() {
    console.log('🔧 Checking network connectivity...');
    
    if (!this.config.SUPABASE_URL) {
      console.log('⚠️  Cannot test connectivity - URL not configured');
      return;
    }

    try {
      const https = require('https');
      const url = new URL(this.config.SUPABASE_URL);
      
      await new Promise((resolve, reject) => {
        const req = https.request({
          hostname: url.hostname,
          port: 443,
          path: '/rest/v1/',
          method: 'GET',
          headers: {
            'apikey': this.config.SUPABASE_ANON_KEY || 'test'
          },
          timeout: 5000
        }, (res) => {
          console.log(`✅ Network connectivity OK (HTTP ${res.statusCode})`);
          resolve(res);
        });

        req.on('error', (error) => {
          this.issues.push(`❌ Network connectivity failed: ${error.message}`);
          this.fixes.push('Check internet connection and firewall settings');
          reject(error);
        });

        req.on('timeout', () => {
          this.issues.push('❌ Request timeout - slow connection or server issues');
          this.fixes.push('Check network connection or try again later');
          req.destroy();
          reject(new Error('Timeout'));
        });

        req.end();
      });
    } catch (error) {
      // Already handled in promise rejection
    }
  }

  async testAPIEndpoints() {
    console.log('🔧 Testing API endpoints...');
    
    if (!this.config.SUPABASE_URL || !this.config.SUPABASE_ANON_KEY) {
      console.log('⚠️  Cannot test endpoints - configuration incomplete');
      return;
    }

    const testEndpoints = [
      { path: '/rest/v1/profiles?select=id&limit=1', name: 'Profiles table' },
      { path: '/rest/v1/projects?select=id&limit=1', name: 'Projects table' },
      { path: '/rest/v1/system_settings?select=id&limit=1', name: 'System settings' }
    ];

    for (const endpoint of testEndpoints) {
      try {
        const https = require('https');
        const url = new URL(this.config.SUPABASE_URL + endpoint.path);
        
        await new Promise((resolve, reject) => {
          const req = https.request({
            hostname: url.hostname,
            port: 443,
            path: url.pathname + url.search,
            method: 'GET',
            headers: {
              'apikey': this.config.SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${this.config.SUPABASE_ANON_KEY}`,
              'Accept': 'application/json'
            },
            timeout: 5000
          }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
              if (res.statusCode === 200) {
                console.log(`✅ ${endpoint.name}: OK`);
              } else if (res.statusCode === 401) {
                this.issues.push(`❌ ${endpoint.name}: Authentication failed`);
                this.fixes.push('Check SUPABASE_ANON_KEY is correct');
              } else if (res.statusCode === 404) {
                this.issues.push(`❌ ${endpoint.name}: Table not found`);
                this.fixes.push('Run database migrations: supabase db push');
              } else {
                this.issues.push(`❌ ${endpoint.name}: HTTP ${res.statusCode}`);
                this.fixes.push(`Check table permissions and RLS policies`);
              }
              resolve();
            });
          });

          req.on('error', (error) => {
            this.issues.push(`❌ ${endpoint.name}: ${error.message}`);
            reject(error);
          });

          req.on('timeout', () => {
            this.issues.push(`❌ ${endpoint.name}: Timeout`);
            req.destroy();
            reject(new Error('Timeout'));
          });

          req.end();
        });
      } catch (error) {
        // Already handled in promise rejection
      }
    }
  }

  async applyFixes() {
    console.log('\n🔨 Applying automated fixes...\n');

    // Fix 1: Create/update environment file
    await this.fixEnvironmentFile();
    
    // Fix 2: Initialize Supabase if needed
    await this.initializeSupabase();
    
    // Fix 3: Run migrations if needed
    await this.runMigrations();
    
    // Fix 4: Update client configuration
    await this.updateClientConfiguration();

    console.log('\n✅ Automated fixes applied');
    console.log('\n📋 Manual steps remaining:');
    this.fixes.forEach(fix => console.log(`  - ${fix}`));
  }

  async fixEnvironmentFile() {
    console.log('🔧 Fixing environment configuration...');
    
    const envPath = path.join(process.cwd(), '.env');
    let envContent = '';
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }

    // Add missing Supabase variables if not present
    const requiredVars = {
      'SUPABASE_URL': 'https://tdmzayzkqyegvfgxlolj.supabase.co',
      'SUPABASE_ANON_KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkbXpheXprcXllZ3ZmZ3hsb2xqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5OTkzNDAsImV4cCI6MjA3MTU3NTM0MH0.u4i07AojTzeSVRfbUyTSKfPv1EKUCFCv7XPri22gbkM',
      'SUPABASE_SERVICE_KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkbXpheXprcXllZ3ZmZ3hsb2xqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTk5OTM0MCwiZXhwIjoyMDcxNTc1MzQwfQ.N0lnWnvo323XXJAprqRhbBweguYlGsJgquBHB1g3L7E',
      'NEXT_PUBLIC_SUPABASE_URL': 'https://tdmzayzkqyegvfgxlolj.supabase.co',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkbXpheXprcXllZ3ZmZ3hsb2xqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5OTkzNDAsImV4cCI6MjA3MTU3NTM0MH0.u4i07AojTzeSVRfbUyTSKfPv1EKUCFCv7XPri22gbkM'
    };

    let updated = false;
    for (const [key, defaultValue] of Object.entries(requiredVars)) {
      if (!envContent.includes(`${key}=`)) {
        envContent += `\n${key}=${defaultValue}`;
        updated = true;
      }
    }

    if (updated) {
      fs.writeFileSync(envPath, envContent);
      console.log('✅ Environment file updated with missing Supabase variables');
    } else {
      console.log('✅ Environment file already contains required variables');
    }
  }

  async initializeSupabase() {
    console.log('🔧 Checking Supabase initialization...');
    
    const configPath = path.join(process.cwd(), 'supabase', 'config.toml');
    if (!fs.existsSync(configPath)) {
      console.log('ℹ️  Run: supabase init to initialize Supabase project');
    } else {
      console.log('✅ Supabase already initialized');
    }
  }

  async runMigrations() {
    console.log('🔧 Checking database migrations...');
    
    const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
    if (fs.existsSync(migrationsDir)) {
      const migrationFiles = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));
      if (migrationFiles.length > 0) {
        console.log('ℹ️  Run: supabase db push to apply migrations');
        console.log(`ℹ️  Available migrations: ${migrationFiles.length} files`);
      } else {
        console.log('ℹ️  No migration files found');
      }
    } else {
      console.log('ℹ️  No migrations directory found');
    }
  }

  async updateClientConfiguration() {
    console.log('🔧 Updating client configuration...');
    
    // Update the API config file
    const apiConfigPath = path.join(process.cwd(), 'static', 'js', 'api', 'config.js');
    if (fs.existsSync(apiConfigPath)) {
      let configContent = fs.readFileSync(apiConfigPath, 'utf8');
      
      // Update with current environment variables
      configContent = configContent.replace(
        /supabaseUrl:\s*['"`][^'"`]*['"`]/g,
        `supabaseUrl: '${this.config.SUPABASE_URL || 'https://tdmzayzkqyegvfgxlolj.supabase.co'}'`
      );
      
      configContent = configContent.replace(
        /supabaseAnonKey:\s*['"`][^'"`]*['"`]/g,
        `supabaseAnonKey: '${this.config.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkbXpheXprcXllZ3ZmZ3hsb2xqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5OTkzNDAsImV4cCI6MjA3MVU3NTM0MH0.u4i07AojTzeSVRfbUyTSKfPv1EKUCFCv7XPri22gbkM'}'`
      );
      
      fs.writeFileSync(apiConfigPath, configContent);
      console.log('✅ Client configuration updated');
    } else {
      console.log('ℹ️  API config file not found - will be created if needed');
    }
  }

  async run() {
    console.log('🩺 Database Connectivity Diagnostic and Repair Tool\n');
    
    const isHealthy = await this.diagnoseIssues();
    
    if (isHealthy) {
      console.log('🎉 Database connectivity is healthy - no fixes needed!');
      return true;
    }

    console.log('\n🚑 Issues found - applying fixes...');
    await this.applyFixes();
    
    console.log('\n🔄 Re-running diagnostics...');
    const fixedIssues = await this.diagnoseIssues();
    
    if (fixedIssues) {
      console.log('\n✅ All issues resolved!');
    } else {
      console.log('\n⚠️  Some issues remain - check manual steps above');
    }
    
    return fixedIssues;
  }
}

// Run if called directly
if (require.main === module) {
  const fixer = new DatabaseConnectivityFixer();
  fixer.run()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('\n❌ Diagnostic failed:', error.message);
      process.exit(1);
    });
}

module.exports = DatabaseConnectivityFixer;