#!/usr/bin/env node

/**
 * Netlify Build Script for Next.js Portfolio Site
 * Ensures proper build configuration and optimization for Netlify deployment
 */

import { execSync } from 'child_process';
import { existsSync, writeFileSync } from 'fs';
import path from 'path';

const PROJECT_ROOT = process.cwd();

console.log('🚀 Starting Netlify build for Next.js portfolio...');

// Set Node.js version compatibility
process.env.NODE_OPTIONS = '--max-old-space-size=4096';

// Ensure we're using the right build command
try {
  console.log('📦 Installing dependencies...');
  execSync('npm ci --prefer-offline --no-audit', { stdio: 'inherit' });

  console.log('🔨 Building Next.js application...');
  execSync('npm run build', { stdio: 'inherit' });

  console.log('✅ Build completed successfully!');

  // Create a _redirects file for Netlify (fallback if netlify.toml doesn't work)
  const redirectsContent = `
# Admin panel redirects
/admin /admin/dashboard 301
/admin/ /admin/dashboard 301

# Legacy Hugo redirects
/make/* /writing/:splat 301
/learn/* /tools/:splat 301
/teaching-learning/* /teaching/:splat 301

# API routes
/api/* /.netlify/functions/:splat 200

# SPA fallback
/* /index.html 200
`;

  writeFileSync(path.join(PROJECT_ROOT, '.next/_redirects'), redirectsContent.trim());
  console.log('📝 Created _redirects file for Netlify routing');

  console.log('🎉 Netlify build completed successfully!');

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}