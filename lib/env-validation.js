/**
 * Environment Variable Validation and Type Checking
 * Validates required environment variables and ensures proper configuration
 */

import { config } from 'dotenv';

// Load environment variables
config();

/**
 * Environment variable schema with validation rules
 */
const ENV_SCHEMA = {
  // Core Application
  NODE_ENV: {
    required: true,
    type: 'string',
    values: ['development', 'staging', 'production', 'test'],
    description: 'Application environment'
  },
  
  // Site Configuration
  NEXT_PUBLIC_SITE_URL: {
    required: true,
    type: 'url',
    description: 'Public site URL (exposed to client)'
  },
  NEXT_PUBLIC_API_URL: {
    required: false,
    type: 'url',
    description: 'API base URL (exposed to client)'
  },
  
  // Supabase Configuration
  NEXT_PUBLIC_SUPABASE_URL: {
    required: true,
    type: 'url',
    description: 'Supabase project URL (exposed to client)',
    validate: (value) => value.includes('.supabase.co')
  },
  NEXT_PUBLIC_SUPABASE_ANON_KEY: {
    required: true,
    type: 'jwt',
    description: 'Supabase anonymous key (exposed to client)',
    minLength: 100
  },
  SUPABASE_SERVICE_KEY: {
    required: true,
    type: 'jwt',
    description: 'Supabase service role key (SERVER ONLY)',
    minLength: 100,
    secret: true
  },
  SUPABASE_SERVICE_ROLE_KEY: {
    required: false,
    type: 'jwt',
    description: 'Alternative name for service role key',
    minLength: 100,
    secret: true
  },
  
  // Authentication
  AUTH0_SECRET: {
    required: true,
    type: 'string',
    description: 'Auth0 secret key',
    minLength: 32,
    secret: true
  },
  AUTH0_BASE_URL: {
    required: true,
    type: 'url',
    description: 'Auth0 base URL'
  },
  AUTH0_ISSUER_BASE_URL: {
    required: true,
    type: 'url',
    description: 'Auth0 issuer URL',
    validate: (value) => value.includes('auth0.com')
  },
  AUTH0_CLIENT_ID: {
    required: true,
    type: 'string',
    description: 'Auth0 client ID',
    minLength: 10
  },
  AUTH0_CLIENT_SECRET: {
    required: true,
    type: 'string',
    description: 'Auth0 client secret',
    minLength: 32,
    secret: true
  },
  AUTH0_AUDIENCE: {
    required: false,
    type: 'string',
    description: 'Auth0 API audience'
  },
  
  // NextAuth
  NEXTAUTH_SECRET: {
    required: true,
    type: 'string',
    description: 'NextAuth secret key',
    minLength: 32,
    secret: true
  },
  NEXTAUTH_URL: {
    required: true,
    type: 'url',
    description: 'NextAuth URL'
  },
  
  // JWT Configuration
  JWT_SECRET: {
    required: false,
    type: 'string',
    description: 'JWT secret key',
    minLength: 32,
    secret: true
  },
  
  // External APIs
  ANTHROPIC_API_KEY: {
    required: false,
    type: 'string',
    description: 'Anthropic API key',
    validate: (value) => !value || value.startsWith('sk-ant-'),
    secret: true
  },
  OPENAI_API_KEY: {
    required: false,
    type: 'string',
    description: 'OpenAI API key',
    validate: (value) => !value || value.startsWith('sk-'),
    secret: true
  },
  
  // OAuth Providers
  GITHUB_CLIENT_ID: {
    required: false,
    type: 'string',
    description: 'GitHub OAuth client ID'
  },
  GITHUB_CLIENT_SECRET: {
    required: false,
    type: 'string',
    description: 'GitHub OAuth client secret',
    secret: true
  },
  
  // Email Configuration
  SMTP_HOST: {
    required: false,
    type: 'string',
    description: 'SMTP server host'
  },
  SMTP_PORT: {
    required: false,
    type: 'number',
    description: 'SMTP server port',
    min: 1,
    max: 65535
  },
  SMTP_USER: {
    required: false,
    type: 'email',
    description: 'SMTP username'
  },
  SMTP_PASS: {
    required: false,
    type: 'string',
    description: 'SMTP password',
    secret: true
  },
  
  // Security
  RATE_LIMIT_WINDOW_MS: {
    required: false,
    type: 'number',
    description: 'Rate limit window in milliseconds',
    default: 900000
  },
  RATE_LIMIT_MAX_REQUESTS: {
    required: false,
    type: 'number',
    description: 'Maximum requests per window',
    default: 100
  }
};

/**
 * Validation error types
 */
class ValidationError extends Error {
  constructor(message, field, value) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.value = value;
  }
}

/**
 * Type validators
 */
const typeValidators = {
  string: (value) => typeof value === 'string',
  number: (value) => !isNaN(parseInt(value)) && isFinite(parseInt(value)),
  boolean: (value) => ['true', 'false', '1', '0', 'yes', 'no'].includes(value.toLowerCase()),
  url: (value) => {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  },
  email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
  jwt: (value) => value.startsWith('eyJ') && value.split('.').length === 3
};

/**
 * Validate a single environment variable
 */
function validateEnvVar(key, schema, value) {
  const errors = [];
  
  // Check if required
  if (schema.required && (!value || value.trim() === '')) {
    errors.push(`${key} is required but not set`);
    return errors;
  }
  
  // Skip validation if not set and not required
  if (!value && !schema.required) {
    return errors;
  }
  
  // Type validation
  if (schema.type && !typeValidators[schema.type](value)) {
    errors.push(`${key} must be a valid ${schema.type}`);
  }
  
  // Length validation
  if (schema.minLength && value.length < schema.minLength) {
    errors.push(`${key} must be at least ${schema.minLength} characters long`);
  }
  
  if (schema.maxLength && value.length > schema.maxLength) {
    errors.push(`${key} must be at most ${schema.maxLength} characters long`);
  }
  
  // Number range validation
  if (schema.type === 'number') {
    const numValue = parseInt(value);
    if (schema.min !== undefined && numValue < schema.min) {
      errors.push(`${key} must be at least ${schema.min}`);
    }
    if (schema.max !== undefined && numValue > schema.max) {
      errors.push(`${key} must be at most ${schema.max}`);
    }
  }
  
  // Value validation
  if (schema.values && !schema.values.includes(value)) {
    errors.push(`${key} must be one of: ${schema.values.join(', ')}`);
  }
  
  // Custom validation
  if (schema.validate && !schema.validate(value)) {
    errors.push(`${key} failed custom validation`);
  }
  
  return errors;
}

/**
 * Check for dangerous patterns
 */
function checkSecurityIssues(env) {
  const issues = [];
  
  // Check for NEXT_PUBLIC_ prefix on secrets
  const dangerousPublicVars = Object.keys(env)
    .filter(key => key.startsWith('NEXT_PUBLIC_'))
    .filter(key => {
      const value = env[key];
      return (
        key.includes('SECRET') ||
        key.includes('KEY') && !key.includes('ANON') ||
        key.includes('PASSWORD') ||
        key.includes('TOKEN') && !key.includes('ACCESS_TOKEN') ||
        (value && value.length > 50 && (value.startsWith('sk-') || value.includes('secret')))
      );
    });
  
  if (dangerousPublicVars.length > 0) {
    issues.push({
      type: 'CRITICAL_SECURITY_ISSUE',
      message: `Potential secrets exposed with NEXT_PUBLIC_ prefix: ${dangerousPublicVars.join(', ')}`,
      fix: 'Remove NEXT_PUBLIC_ prefix from secret variables'
    });
  }
  
  // Check for hardcoded localhost URLs in production
  if (env.NODE_ENV === 'production') {
    const localhostVars = Object.keys(env)
      .filter(key => env[key] && env[key].includes('localhost'));
    
    if (localhostVars.length > 0) {
      issues.push({
        type: 'PRODUCTION_CONFIG_ERROR',
        message: `Localhost URLs found in production: ${localhostVars.join(', ')}`,
        fix: 'Update URLs to production domains'
      });
    }
  }
  
  // Check for weak secrets
  const secretKeys = Object.keys(ENV_SCHEMA)
    .filter(key => ENV_SCHEMA[key].secret)
    .filter(key => env[key]);
  
  secretKeys.forEach(key => {
    const value = env[key];
    if (value.length < 20) {
      issues.push({
        type: 'WEAK_SECRET',
        message: `${key} appears to be too short for security`,
        fix: 'Generate a longer, more secure secret'
      });
    }
  });
  
  return issues;
}

/**
 * Main validation function
 */
export function validateEnvironment(options = {}) {
  const {
    strict = process.env.ENV_STRICT_MODE === 'true',
    includeOptional = true,
    env = process.env
  } = options;
  
  const results = {
    valid: true,
    errors: [],
    warnings: [],
    securityIssues: [],
    summary: {
      total: 0,
      required: 0,
      optional: 0,
      missing: 0,
      configured: 0
    }
  };
  
  // Validate each environment variable
  Object.entries(ENV_SCHEMA).forEach(([key, schema]) => {
    results.summary.total++;
    
    if (schema.required) {
      results.summary.required++;
    } else {
      results.summary.optional++;
    }
    
    const value = env[key];
    const errors = validateEnvVar(key, schema, value);
    
    if (value) {
      results.summary.configured++;
    } else if (schema.required) {
      results.summary.missing++;
    }
    
    errors.forEach(error => {
      if (schema.required || strict) {
        results.errors.push(error);
        results.valid = false;
      } else {
        results.warnings.push(error);
      }
    });
  });
  
  // Check for security issues
  results.securityIssues = checkSecurityIssues(env);
  if (results.securityIssues.some(issue => issue.type === 'CRITICAL_SECURITY_ISSUE')) {
    results.valid = false;
  }
  
  return results;
}

/**
 * Get environment variable with type conversion and validation
 */
export function getEnvVar(key, defaultValue = null, type = 'string') {
  const value = process.env[key];
  
  if (!value) {
    return defaultValue;
  }
  
  switch (type) {
    case 'number':
      return parseInt(value) || defaultValue;
    case 'boolean':
      return ['true', '1', 'yes'].includes(value.toLowerCase());
    case 'array':
      return value.split(',').map(item => item.trim());
    default:
      return value;
  }
}

/**
 * Print validation results
 */
export function printValidationResults(results) {
  console.log('\n🔍 Environment Variable Validation Results\n');
  
  // Summary
  console.log('📊 Summary:');
  console.log(`   Total variables: ${results.summary.total}`);
  console.log(`   Required: ${results.summary.required}`);
  console.log(`   Optional: ${results.summary.optional}`);
  console.log(`   Configured: ${results.summary.configured}`);
  console.log(`   Missing: ${results.summary.missing}`);
  
  // Status
  if (results.valid) {
    console.log('\n✅ Environment validation passed!');
  } else {
    console.log('\n❌ Environment validation failed!');
  }
  
  // Errors
  if (results.errors.length > 0) {
    console.log('\n🚨 Errors:');
    results.errors.forEach(error => {
      console.log(`   • ${error}`);
    });
  }
  
  // Warnings
  if (results.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    results.warnings.forEach(warning => {
      console.log(`   • ${warning}`);
    });
  }
  
  // Security Issues
  if (results.securityIssues.length > 0) {
    console.log('\n🔒 Security Issues:');
    results.securityIssues.forEach(issue => {
      console.log(`   ${issue.type === 'CRITICAL_SECURITY_ISSUE' ? '🚨' : '⚠️'} ${issue.message}`);
      console.log(`      Fix: ${issue.fix}`);
    });
  }
  
  console.log('');
}

/**
 * Validate environment on module load (in development)
 */
if (process.env.NODE_ENV === 'development' && process.env.ENV_VALIDATION_ENABLED !== 'false') {
  const results = validateEnvironment({ strict: false });
  
  if (!results.valid || results.securityIssues.length > 0) {
    printValidationResults(results);
    
    if (results.securityIssues.some(issue => issue.type === 'CRITICAL_SECURITY_ISSUE')) {
      console.error('🚨 CRITICAL SECURITY ISSUES DETECTED - Fix immediately!');
      process.exit(1);
    }
  }
}

export default {
  validateEnvironment,
  getEnvVar,
  printValidationResults,
  ENV_SCHEMA
};