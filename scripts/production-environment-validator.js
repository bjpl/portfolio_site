#!/usr/bin/env node

/**
 * Production Environment Validator
 * Validates all environment configurations for Hugo + Supabase + Auth0 deployment
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const chalk = require('chalk');

class ProductionValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.passed = 0;
    this.failed = 0;
  }

  log(message, type = 'info') {
    const colors = {
      info: chalk.blue,
      success: chalk.green,
      warning: chalk.yellow,
      error: chalk.red
    };
    
    console.log(`${colors[type]('●')} ${message}`);
  }

  async validate() {
    console.log(chalk.bold.blue('\n🔍 Production Environment Validation\n'));

    // Run all validation checks
    await this.validateRequiredFiles();
    await this.validateEnvironmentVariables();
    await this.validateNetlifyConfiguration();
    await this.validateSupabaseConfiguration();
    await this.validateAuth0Configuration();
    await this.validateBuildConfiguration();
    await this.validateSecurityConfiguration();
    await this.validateExternalDependencies();

    this.generateReport();
  }

  async validateRequiredFiles() {
    this.log('Validating required files...', 'info');

    const requiredFiles = [
      'package.json',
      'netlify.toml',
      'config/_default/hugo.yaml',
      'layouts/index.html',
      '.env.production',
      'static/admin/dashboard.html',
      'netlify/functions/health.js'
    ];

    for (const file of requiredFiles) {
      const filePath = path.join(process.cwd(), file);
      if (fs.existsSync(filePath)) {
        this.log(`✅ ${file} exists`, 'success');
        this.passed++;
      } else {
        this.log(`❌ ${file} missing`, 'error');
        this.errors.push(`Required file missing: ${file}`);
        this.failed++;
      }
    }
  }

  async validateEnvironmentVariables() {
    this.log('\nValidating environment variables...', 'info');

    // Load production env file
    const prodEnvPath = path.join(process.cwd(), '.env.production');
    if (fs.existsSync(prodEnvPath)) {
      const envContent = fs.readFileSync(prodEnvPath, 'utf8');
      const envVars = this.parseEnvFile(envContent);

      // Required public variables
      const requiredPublic = [
        'SITE_URL',
        'API_BASE_URL',
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        'NODE_ENV',
        'HUGO_ENV'
      ];

      // Variables that should be in Netlify Dashboard (secrets)
      const requiredSecrets = [
        'AUTH0_SECRET',
        'AUTH0_CLIENT_SECRET',
        'SUPABASE_SERVICE_KEY',
        'JWT_SECRET',
        'JWT_REFRESH_SECRET',
        'SESSION_SECRET'
      ];

      // Check required public variables
      for (const envVar of requiredPublic) {
        if (envVars[envVar]) {
          this.log(`✅ ${envVar} configured`, 'success');
          this.passed++;
        } else {
          this.log(`❌ ${envVar} missing`, 'error');
          this.errors.push(`Required environment variable missing: ${envVar}`);
          this.failed++;
        }
      }

      // Check that secrets are NOT in the file (should be in Netlify Dashboard)
      for (const secret of requiredSecrets) {
        if (envVars[secret] && envVars[secret] !== 'SET_IN_NETLIFY_DASHBOARD') {
          this.log(`⚠️  ${secret} should be in Netlify Dashboard, not in file`, 'warning');
          this.warnings.push(`Secret ${secret} should be set in Netlify Dashboard for security`);
        } else if (envVars[secret] === 'SET_IN_NETLIFY_DASHBOARD') {
          this.log(`✅ ${secret} properly configured for Netlify Dashboard`, 'success');
          this.passed++;
        } else {
          this.log(`⚠️  ${secret} not configured (should be in Netlify Dashboard)`, 'warning');
          this.warnings.push(`Remember to set ${secret} in Netlify Dashboard`);
        }
      }

      // Validate URLs
      if (envVars.SITE_URL) {
        if (this.isValidUrl(envVars.SITE_URL)) {
          this.log(`✅ SITE_URL is valid URL`, 'success');
          this.passed++;
        } else {
          this.log(`❌ SITE_URL is invalid`, 'error');
          this.errors.push('SITE_URL must be a valid URL');
          this.failed++;
        }
      }

      if (envVars.NEXT_PUBLIC_SUPABASE_URL) {
        if (this.isValidUrl(envVars.NEXT_PUBLIC_SUPABASE_URL) && 
            envVars.NEXT_PUBLIC_SUPABASE_URL.includes('supabase.co')) {
          this.log(`✅ NEXT_PUBLIC_SUPABASE_URL is valid Supabase URL`, 'success');
          this.passed++;
        } else {
          this.log(`❌ NEXT_PUBLIC_SUPABASE_URL is invalid`, 'error');
          this.errors.push('NEXT_PUBLIC_SUPABASE_URL must be a valid Supabase URL');
          this.failed++;
        }
      }
    }
  }

  async validateNetlifyConfiguration() {
    this.log('\nValidating Netlify configuration...', 'info');

    const netlifyTomlPath = path.join(process.cwd(), 'netlify.toml');
    if (fs.existsSync(netlifyTomlPath)) {
      const content = fs.readFileSync(netlifyTomlPath, 'utf8');

      // Check build command
      if (content.includes('command = "npm run build:production"')) {
        this.log(`✅ Build command configured correctly`, 'success');
        this.passed++;
      } else {
        this.log(`❌ Build command not set to production`, 'error');
        this.errors.push('Build command should be: npm run build:production');
        this.failed++;
      }

      // Check publish directory
      if (content.includes('publish = "public"')) {
        this.log(`✅ Publish directory configured correctly`, 'success');
        this.passed++;
      } else {
        this.log(`❌ Publish directory not set to public`, 'error');
        this.errors.push('Publish directory should be: public');
        this.failed++;
      }

      // Check Hugo version
      if (content.includes('HUGO_VERSION = "0.121.0"')) {
        this.log(`✅ Hugo version pinned correctly`, 'success');
        this.passed++;
      } else {
        this.log(`⚠️  Hugo version should be pinned`, 'warning');
        this.warnings.push('Consider pinning HUGO_VERSION in netlify.toml');
      }

      // Check security headers
      if (content.includes('Strict-Transport-Security') && 
          content.includes('Content-Security-Policy')) {
        this.log(`✅ Security headers configured`, 'success');
        this.passed++;
      } else {
        this.log(`❌ Security headers missing`, 'error');
        this.errors.push('Security headers are not properly configured');
        this.failed++;
      }

      // Check redirects for admin panel
      if (content.includes('/admin') && content.includes('dashboard.html')) {
        this.log(`✅ Admin panel redirects configured`, 'success');
        this.passed++;
      } else {
        this.log(`❌ Admin panel redirects missing`, 'error');
        this.errors.push('Admin panel redirects are not configured');
        this.failed++;
      }
    }
  }

  async validateSupabaseConfiguration() {
    this.log('\nValidating Supabase configuration...', 'info');

    // Check if Supabase utilities exist
    const supabaseUtilsPath = path.join(process.cwd(), 'netlify/functions/utils/supabase.js');
    if (fs.existsSync(supabaseUtilsPath)) {
      this.log(`✅ Supabase utility functions exist`, 'success');
      this.passed++;

      const content = fs.readFileSync(supabaseUtilsPath, 'utf8');
      
      // Check for proper import
      if (content.includes('@supabase/supabase-js')) {
        this.log(`✅ Supabase client properly imported`, 'success');
        this.passed++;
      } else {
        this.log(`❌ Supabase client not properly imported`, 'error');
        this.errors.push('Supabase client should be imported from @supabase/supabase-js');
        this.failed++;
      }

      // Check for environment variable usage
      if (content.includes('process.env.NEXT_PUBLIC_SUPABASE_URL') &&
          content.includes('process.env.SUPABASE_SERVICE_KEY')) {
        this.log(`✅ Environment variables used correctly`, 'success');
        this.passed++;
      } else {
        this.log(`❌ Environment variables not used correctly`, 'error');
        this.errors.push('Supabase configuration should use environment variables');
        this.failed++;
      }
    } else {
      this.log(`❌ Supabase utility functions missing`, 'error');
      this.errors.push('Create netlify/functions/utils/supabase.js');
      this.failed++;
    }

    // Check migrations
    const migrationsPath = path.join(process.cwd(), 'supabase/migrations');
    if (fs.existsSync(migrationsPath)) {
      const migrations = fs.readdirSync(migrationsPath);
      if (migrations.length > 0) {
        this.log(`✅ Database migrations exist (${migrations.length} files)`, 'success');
        this.passed++;
      } else {
        this.log(`⚠️  No database migrations found`, 'warning');
        this.warnings.push('Consider adding database migrations for version control');
      }
    }
  }

  async validateAuth0Configuration() {
    this.log('\nValidating Auth0 configuration...', 'info');

    // Check for Auth0 integration files
    const authFiles = [
      'netlify/functions/utils/auth0-config.js',
      'netlify/edge-functions/auth-middleware.js',
      'static/admin/js/auth-manager.js'
    ];

    let authFilesExist = 0;
    for (const file of authFiles) {
      const filePath = path.join(process.cwd(), file);
      if (fs.existsSync(filePath)) {
        this.log(`✅ ${file} exists`, 'success');
        authFilesExist++;
        this.passed++;
      } else {
        this.log(`⚠️  ${file} missing (needed for Auth0)`, 'warning');
        this.warnings.push(`Create ${file} for Auth0 integration`);
      }
    }

    if (authFilesExist === 0) {
      this.log(`⚠️  Auth0 integration not yet implemented`, 'warning');
      this.warnings.push('Auth0 integration files need to be created');
    } else if (authFilesExist === authFiles.length) {
      this.log(`✅ All Auth0 integration files present`, 'success');
      this.passed++;
    }
  }

  async validateBuildConfiguration() {
    this.log('\nValidating build configuration...', 'info');

    const packageJsonPath = path.join(process.cwd(), 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

      // Check build scripts
      const requiredScripts = [
        'build:production',
        'test:ci',
        'test:deployment:pre',
        'test:deployment:post'
      ];

      for (const script of requiredScripts) {
        if (packageJson.scripts && packageJson.scripts[script]) {
          this.log(`✅ ${script} script configured`, 'success');
          this.passed++;
        } else {
          this.log(`❌ ${script} script missing`, 'error');
          this.errors.push(`Add ${script} script to package.json`);
          this.failed++;
        }
      }

      // Check dependencies
      const requiredDeps = [
        '@supabase/supabase-js',
        'axios'
      ];

      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies
      };

      for (const dep of requiredDeps) {
        if (allDeps[dep]) {
          this.log(`✅ ${dep} dependency installed`, 'success');
          this.passed++;
        } else {
          this.log(`❌ ${dep} dependency missing`, 'error');
          this.errors.push(`Install ${dep} dependency`);
          this.failed++;
        }
      }
    }
  }

  async validateSecurityConfiguration() {
    this.log('\nValidating security configuration...', 'info');

    // Check for security middleware
    const securityMiddlewarePath = path.join(process.cwd(), 'netlify/functions/utils/security-middleware.js');
    if (fs.existsSync(securityMiddlewarePath)) {
      this.log(`✅ Security middleware exists`, 'success');
      this.passed++;

      const content = fs.readFileSync(securityMiddlewarePath, 'utf8');
      
      // Check for rate limiting
      if (content.includes('rate') && content.includes('limit')) {
        this.log(`✅ Rate limiting implemented`, 'success');
        this.passed++;
      } else {
        this.log(`⚠️  Rate limiting should be implemented`, 'warning');
        this.warnings.push('Consider implementing rate limiting in security middleware');
      }

      // Check for input sanitization
      if (content.includes('sanitize') || content.includes('validate')) {
        this.log(`✅ Input validation/sanitization present`, 'success');
        this.passed++;
      } else {
        this.log(`⚠️  Input validation/sanitization should be implemented`, 'warning');
        this.warnings.push('Implement input validation and sanitization');
      }
    } else {
      this.log(`❌ Security middleware missing`, 'error');
      this.errors.push('Create security middleware for protection');
      this.failed++;
    }

    // Check CSP in netlify.toml
    const netlifyTomlPath = path.join(process.cwd(), 'netlify.toml');
    if (fs.existsSync(netlifyTomlPath)) {
      const content = fs.readFileSync(netlifyTomlPath, 'utf8');
      
      if (content.includes('Content-Security-Policy')) {
        this.log(`✅ Content Security Policy configured`, 'success');
        this.passed++;

        // Check for unsafe-inline restrictions
        if (content.includes("'unsafe-inline'")) {
          this.log(`⚠️  CSP contains 'unsafe-inline' - consider tightening`, 'warning');
          this.warnings.push("Remove 'unsafe-inline' from CSP for better security");
        } else {
          this.log(`✅ CSP does not contain 'unsafe-inline'`, 'success');
          this.passed++;
        }
      } else {
        this.log(`❌ Content Security Policy not configured`, 'error');
        this.errors.push('Configure Content-Security-Policy header');
        this.failed++;
      }
    }
  }

  async validateExternalDependencies() {
    this.log('\nValidating external dependencies...', 'info');

    const dependencies = [
      {
        name: 'Supabase API',
        url: 'https://tdmzayzkqyegvfgxlolj.supabase.co'
      },
      {
        name: 'Netlify API',
        url: 'https://api.netlify.com/api/v1'
      }
    ];

    for (const dep of dependencies) {
      try {
        await this.checkUrl(dep.url);
        this.log(`✅ ${dep.name} accessible`, 'success');
        this.passed++;
      } catch (error) {
        this.log(`❌ ${dep.name} not accessible: ${error.message}`, 'error');
        this.errors.push(`Cannot reach ${dep.name}`);
        this.failed++;
      }
    }
  }

  parseEnvFile(content) {
    const envVars = {};
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          envVars[key.trim()] = valueParts.join('=').trim();
        }
      }
    }
    
    return envVars;
  }

  isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }

  checkUrl(url) {
    return new Promise((resolve, reject) => {
      const request = https.get(url, { timeout: 10000 }, (response) => {
        if (response.statusCode >= 200 && response.statusCode < 400) {
          resolve(response.statusCode);
        } else {
          reject(new Error(`HTTP ${response.statusCode}`));
        }
      });

      request.on('timeout', () => {
        request.destroy();
        reject(new Error('Request timeout'));
      });

      request.on('error', (error) => {
        reject(error);
      });
    });
  }

  generateReport() {
    console.log(chalk.bold.blue('\n📊 Validation Report\n'));

    // Summary
    const total = this.passed + this.failed;
    const successRate = total > 0 ? Math.round((this.passed / total) * 100) : 0;
    
    console.log(`${chalk.green('✅ Passed:')} ${this.passed}`);
    console.log(`${chalk.red('❌ Failed:')} ${this.failed}`);
    console.log(`${chalk.yellow('⚠️  Warnings:')} ${this.warnings.length}`);
    console.log(`${chalk.blue('📈 Success Rate:')} ${successRate}%\n`);

    // Errors
    if (this.errors.length > 0) {
      console.log(chalk.red.bold('🚨 Critical Issues:\n'));
      this.errors.forEach((error, index) => {
        console.log(`${chalk.red(`${index + 1}.`)} ${error}`);
      });
      console.log('');
    }

    // Warnings
    if (this.warnings.length > 0) {
      console.log(chalk.yellow.bold('⚠️  Recommendations:\n'));
      this.warnings.forEach((warning, index) => {
        console.log(`${chalk.yellow(`${index + 1}.`)} ${warning}`);
      });
      console.log('');
    }

    // Overall status
    if (this.failed === 0) {
      console.log(chalk.green.bold('🎉 Production environment is ready for deployment!'));
      
      if (this.warnings.length > 0) {
        console.log(chalk.yellow('Consider addressing the recommendations above for optimal security and performance.'));
      }
      
      process.exit(0);
    } else {
      console.log(chalk.red.bold('🚨 Production environment has critical issues that must be resolved before deployment.'));
      process.exit(1);
    }
  }
}

// CLI execution
if (require.main === module) {
  const validator = new ProductionValidator();
  validator.validate().catch((error) => {
    console.error(chalk.red('❌ Validation failed:'), error.message);
    process.exit(1);
  });
}

module.exports = ProductionValidator;