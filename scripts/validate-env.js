#!/usr/bin/env node

/**
 * Environment Validation Script
 * Validates environment variables and provides detailed feedback
 */

import { validateEnvironment, printValidationResults } from '../lib/env-validation.js';
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';

// Command line arguments
const args = process.argv.slice(2);
const options = {
  strict: args.includes('--strict'),
  fix: args.includes('--fix'),
  generate: args.includes('--generate'),
  check: args.includes('--check'),
  environment: args.find(arg => arg.startsWith('--env='))?.split('=')[1] || 'development'
};

/**
 * Load environment file
 */
function loadEnvironment() {
  const envFiles = [
    `.env.${options.environment}.local`,
    `.env.${options.environment}`,
    '.env.local',
    '.env'
  ];
  
  for (const file of envFiles) {
    if (fs.existsSync(file)) {
      config({ path: file });
      console.log(`📁 Loaded environment from: ${file}`);
      return file;
    }
  }
  
  console.log('⚠️  No environment file found, using system environment');
  return null;
}

/**
 * Generate missing environment variables
 */
function generateMissingVars(results) {
  const missing = [];
  
  results.errors.forEach(error => {
    if (error.includes('is required but not set')) {
      const key = error.split(' ')[0];
      missing.push(key);
    }
  });
  
  if (missing.length === 0) {
    console.log('✅ No missing required variables to generate');
    return;
  }
  
  console.log('🔧 Generating missing environment variables...');
  
  const suggestions = [];
  missing.forEach(key => {
    let suggestion = '';
    
    switch (key) {
      case 'NEXTAUTH_SECRET':
      case 'AUTH0_SECRET':
      case 'JWT_SECRET':
        suggestion = generateSecureSecret(32);
        break;
      case 'NEXT_PUBLIC_SITE_URL':
        suggestion = 'https://your-domain.com';
        break;
      case 'NEXT_PUBLIC_SUPABASE_URL':
        suggestion = 'https://your-project-id.supabase.co';
        break;
      case 'AUTH0_BASE_URL':
      case 'NEXTAUTH_URL':
        suggestion = 'https://your-domain.com';
        break;
      case 'AUTH0_ISSUER_BASE_URL':
        suggestion = 'https://your-tenant.auth0.com';
        break;
      default:
        suggestion = 'your-value-here';
    }
    
    suggestions.push(`${key}=${suggestion}`);
  });
  
  console.log('\\n📝 Add these to your .env file:');
  console.log(suggestions.join('\\n'));
  
  if (options.fix) {
    const envFile = '.env';
    const content = suggestions.join('\\n') + '\\n';
    fs.appendFileSync(envFile, content);
    console.log(`\\n✅ Added missing variables to ${envFile}`);
  }
}

/**
 * Generate secure secret
 */
function generateSecureSecret(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Check environment setup
 */
function checkEnvironmentSetup() {
  console.log('🔍 Checking environment setup...');
  
  const checks = [
    {
      name: '.env file exists',
      check: () => fs.existsSync('.env'),
      fix: 'Copy .env.example to .env and configure values'
    },
    {
      name: '.env.example is up to date',
      check: () => {
        if (!fs.existsSync('.env.example')) return false;
        const exampleContent = fs.readFileSync('.env.example', 'utf8');
        return exampleContent.includes('NEXT_PUBLIC_') && exampleContent.includes('AUTH0_');
      },
      fix: 'Update .env.example with latest template'
    },
    {
      name: 'No secrets in NEXT_PUBLIC_ variables',
      check: () => {
        const publicVars = Object.keys(process.env)
          .filter(key => key.startsWith('NEXT_PUBLIC_'))
          .filter(key => key.includes('SECRET') || key.includes('PRIVATE'));
        return publicVars.length === 0;
      },
      fix: 'Remove NEXT_PUBLIC_ prefix from secret variables'
    },
    {
      name: 'Production URLs configured',
      check: () => {
        if (process.env.NODE_ENV !== 'production') return true;
        const urls = [process.env.NEXT_PUBLIC_SITE_URL, process.env.NEXTAUTH_URL];
        return urls.every(url => url && !url.includes('localhost'));
      },
      fix: 'Configure production URLs in environment variables'
    }
  ];
  
  let allPassed = true;
  
  checks.forEach(({ name, check, fix }) => {
    const passed = check();
    console.log(`   ${passed ? '✅' : '❌'} ${name}`);
    
    if (!passed) {
      console.log(`      Fix: ${fix}`);
      allPassed = false;
    }
  });
  
  return allPassed;
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Environment Validation Tool\\n');
  
  try {
    // Load environment
    loadEnvironment();
    
    // Run checks if requested
    if (options.check) {
      const setupOk = checkEnvironmentSetup();
      if (!setupOk) {
        process.exit(1);
      }
    }
    
    // Validate environment
    const results = validateEnvironment({
      strict: options.strict,
      includeOptional: true
    });
    
    // Print results
    printValidationResults(results);
    
    // Generate missing variables if requested
    if (options.generate) {
      generateMissingVars(results);
    }
    
    // Exit with appropriate code
    if (!results.valid) {
      console.log('💡 Run with --generate to create missing variables');
      console.log('💡 Run with --fix to automatically add them to .env');
      process.exit(1);
    }
    
    console.log('🎉 Environment validation completed successfully!');
    
  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    process.exit(1);
  }
}

// Show help
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Environment Validation Tool

Usage: npm run env:validate [options]

Options:
  --strict         Treat warnings as errors
  --fix            Automatically fix issues where possible
  --generate       Generate missing environment variables
  --check          Check environment setup
  --env=<env>      Specify environment (development, staging, production)
  --help, -h       Show this help message

Examples:
  npm run env:validate
  npm run env:validate -- --strict
  npm run env:validate -- --generate --fix
  npm run env:validate -- --env=production --strict
`);
  process.exit(0);
}

// Run main function
main();