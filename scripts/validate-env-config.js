#!/usr/bin/env node

/**
 * Environment Configuration Validation Script
 * Validates environment variables and configuration consistency
 * Usage: node scripts/validate-env-config.js [environment]
 */

const fs = require('fs');
const path = require('path');

class ConfigValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.info = [];
    this.environment = process.argv[2] || process.env.NODE_ENV || 'development';
  }

  // Required variables for basic functionality
  requiredVars = [
    'NODE_ENV',
    'HUGO_ENV', 
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY'
  ];

  // Required variables for admin functionality
  adminVars = [
    'ADMIN_USERNAME',
    'ADMIN_EMAIL',
    'ADMIN_PASSWORD_HASH',
    'JWT_SECRET',
    'SESSION_SECRET'
  ];

  // Environment-specific required variables
  environmentVars = {
    development: ['DEV_PORT', 'CMS_PORT'],
    production: ['CORS_ORIGIN', 'RATE_LIMIT_MAX_REQUESTS'],
    staging: ['CORS_ORIGIN']
  };

  // Security-sensitive variables that should be long/strong
  securityVars = {
    'JWT_SECRET': { minLength: 32, description: 'JWT signing secret' },
    'JWT_REFRESH_SECRET': { minLength: 32, description: 'JWT refresh secret' },
    'SESSION_SECRET': { minLength: 32, description: 'Session secret' },
    'ADMIN_PASSWORD_HASH': { minLength: 60, description: 'Bcrypt password hash' }
  };

  /**
   * Load environment variables from file
   */
  loadEnvFile(filePath) {
    if (!fs.existsSync(filePath)) {
      return {};
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const vars = {};
    
    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [key, ...valueParts] = trimmed.split('=');
        const value = valueParts.join('=').replace(/^["']|["']$/g, '');
        if (key && value) {
          vars[key] = value;
        }
      }
    });

    return vars;
  }

  /**
   * Get configuration from multiple sources
   */
  getConfiguration() {
    const config = {
      env: { ...process.env },
      files: {}
    };

    // Load from various .env files
    const envFiles = [
      '.env',
      '.env.local',
      `.env.${this.environment}`,
      '.env.example'
    ];

    envFiles.forEach(file => {
      const filePath = path.join(process.cwd(), file);
      config.files[file] = this.loadEnvFile(filePath);
    });

    return config;
  }

  /**
   * Validate required variables
   */
  validateRequired(config) {
    const envVars = { ...config.env, ...config.files['.env'] || {}, ...config.files[`.env.${this.environment}`] || {} };
    
    // Check core required variables
    this.requiredVars.forEach(varName => {
      if (!envVars[varName] || envVars[varName] === 'undefined') {
        this.errors.push(`Missing required variable: ${varName}`);
      } else {
        this.info.push(`✓ ${varName} is set`);
      }
    });

    // Check environment-specific variables
    const envSpecific = this.environmentVars[this.environment] || [];
    envSpecific.forEach(varName => {
      if (!envVars[varName]) {
        this.warnings.push(`Missing ${this.environment}-specific variable: ${varName}`);
      }
    });

    // Check admin variables (if admin features enabled)
    if (envVars.ENABLE_ADMIN_PANEL !== 'false') {
      this.adminVars.forEach(varName => {
        if (!envVars[varName]) {
          this.errors.push(`Missing admin variable: ${varName}`);
        }
      });
    }
  }

  /**
   * Validate security configuration
   */
  validateSecurity(config) {
    const envVars = { ...config.env, ...config.files['.env'] || {}, ...config.files[`.env.${this.environment}`] || {} };
    
    Object.entries(this.securityVars).forEach(([varName, requirements]) => {
      const value = envVars[varName];
      
      if (value) {
        if (value.length < requirements.minLength) {
          this.errors.push(`${varName} is too short (${value.length} chars, minimum ${requirements.minLength})`);
        }

        // Check for common weak values
        const weakValues = ['secret', 'password', 'changeme', 'dev', 'test'];
        if (weakValues.some(weak => value.toLowerCase().includes(weak))) {
          if (this.environment === 'production') {
            this.errors.push(`${varName} appears to use a weak/default value in production`);
          } else {
            this.warnings.push(`${varName} uses a weak value (OK for ${this.environment})`);
          }
        }
      }
    });

    // Check Supabase configuration
    const supabaseUrl = envVars.SUPABASE_URL;
    const supabaseKey = envVars.SUPABASE_ANON_KEY;

    if (supabaseUrl && !supabaseUrl.startsWith('https://')) {
      this.errors.push('SUPABASE_URL must use HTTPS');
    }

    if (supabaseKey && supabaseKey.length < 100) {
      this.errors.push('SUPABASE_ANON_KEY appears to be invalid (too short)');
    }

    // Check CORS configuration
    if (this.environment === 'production') {
      const corsOrigin = envVars.CORS_ORIGIN;
      if (corsOrigin && corsOrigin.includes('localhost')) {
        this.errors.push('CORS_ORIGIN includes localhost in production');
      }
    }
  }

  /**
   * Validate port configurations
   */
  validatePorts(config) {
    const envVars = { ...config.env, ...config.files['.env'] || {}, ...config.files[`.env.${this.environment}`] || {} };
    
    const portVars = ['DEV_PORT', 'CMS_PORT', 'BACKEND_PORT', 'WS_PORT', 'PORT'];
    const usedPorts = new Set();
    
    portVars.forEach(varName => {
      const port = envVars[varName];
      if (port) {
        const portNum = parseInt(port);
        if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
          this.errors.push(`Invalid port number for ${varName}: ${port}`);
        } else if (usedPorts.has(portNum)) {
          this.errors.push(`Port conflict: ${port} is used by multiple services`);
        } else {
          usedPorts.add(portNum);
        }
      }
    });
  }

  /**
   * Validate URL configurations
   */
  validateUrls(config) {
    const envVars = { ...config.env, ...config.files['.env'] || {}, ...config.files[`.env.${this.environment}`] || {} };
    
    const urlVars = ['SITE_URL', 'VITE_SITE_URL', 'SUPABASE_URL', 'HUGO_BASE_URL'];
    
    urlVars.forEach(varName => {
      const url = envVars[varName];
      if (url && url !== 'undefined') {
        try {
          new URL(url);
          this.info.push(`✓ ${varName} is a valid URL`);
        } catch (error) {
          this.errors.push(`Invalid URL for ${varName}: ${url}`);
        }
      }
    });
  }

  /**
   * Check for configuration consistency
   */
  validateConsistency(config) {
    const envVars = { ...config.env, ...config.files['.env'] || {}, ...config.files[`.env.${this.environment}`] || {} };
    
    // Check Supabase URL consistency
    const supabaseUrl = envVars.SUPABASE_URL;
    const publicSupabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
    
    if (supabaseUrl && publicSupabaseUrl && supabaseUrl !== publicSupabaseUrl) {
      this.warnings.push('SUPABASE_URL and NEXT_PUBLIC_SUPABASE_URL are different');
    }

    // Check site URL consistency
    const siteUrl = envVars.SITE_URL;
    const viteSiteUrl = envVars.VITE_SITE_URL;
    
    if (siteUrl && viteSiteUrl && siteUrl !== viteSiteUrl) {
      this.warnings.push('SITE_URL and VITE_SITE_URL are different');
    }

    // Check environment consistency
    const nodeEnv = envVars.NODE_ENV;
    const hugoEnv = envVars.HUGO_ENV;
    
    if (nodeEnv && hugoEnv && nodeEnv !== hugoEnv) {
      this.warnings.push(`NODE_ENV (${nodeEnv}) and HUGO_ENV (${hugoEnv}) are different`);
    }
  }

  /**
   * Run all validations
   */
  validate() {
    console.log(`🔍 Validating environment configuration for: ${this.environment}\n`);
    
    const config = this.getConfiguration();
    
    this.validateRequired(config);
    this.validateSecurity(config);
    this.validatePorts(config);
    this.validateUrls(config);
    this.validateConsistency(config);
    
    return this.generateReport();
  }

  /**
   * Generate validation report
   */
  generateReport() {
    console.log('📋 VALIDATION REPORT');
    console.log('='.repeat(50));
    
    if (this.errors.length > 0) {
      console.log(`\n❌ ERRORS (${this.errors.length}):`);
      this.errors.forEach(error => console.log(`   • ${error}`));
    }
    
    if (this.warnings.length > 0) {
      console.log(`\n⚠️  WARNINGS (${this.warnings.length}):`);
      this.warnings.forEach(warning => console.log(`   • ${warning}`));
    }
    
    if (this.info.length > 0) {
      console.log(`\n✅ VALID CONFIGURATIONS (${this.info.length}):`);
      this.info.forEach(info => console.log(`   • ${info}`));
    }
    
    console.log('\n' + '='.repeat(50));
    
    const isValid = this.errors.length === 0;
    const status = isValid ? '✅ VALID' : '❌ INVALID';
    console.log(`\n${status} - Environment: ${this.environment}`);
    
    if (!isValid) {
      console.log(`\n🔧 Fix ${this.errors.length} error(s) before proceeding`);
    }
    
    if (this.warnings.length > 0) {
      console.log(`\n⚠️  Review ${this.warnings.length} warning(s) for optimization`);
    }

    return {
      valid: isValid,
      errors: this.errors,
      warnings: this.warnings,
      info: this.info,
      environment: this.environment
    };
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new ConfigValidator();
  const result = validator.validate();
  process.exit(result.valid ? 0 : 1);
}

module.exports = ConfigValidator;