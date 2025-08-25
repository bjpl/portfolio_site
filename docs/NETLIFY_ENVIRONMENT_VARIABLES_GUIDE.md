# Netlify Environment Variables Configuration Guide

## Overview

This guide provides comprehensive documentation for setting up environment variables in your Netlify deployment. Environment variables are split between build-time variables (in `netlify.toml`) and runtime secrets (in Netlify dashboard).

## Build-Time Variables (netlify.toml)

These variables are safe to include in version control as they don't contain secrets:

### Core Build Environment
```toml
[build.environment]
  # Hugo Configuration
  HUGO_VERSION = "0.121.0"
  HUGO_ENV = "production"
  HUGO_CACHEDIR = "/opt/build/cache/hugo"
  
  # Node.js Configuration
  NODE_VERSION = "18"
  NODE_ENV = "production"
  
  # Go Configuration (for Hugo)
  GO_VERSION = "1.21"
  
  # Build Identification
  BUILD_ID = "2025-08-25-unified-env-config"
  
  # Site URLs (Public)
  VITE_API_URL = "/api"
  VITE_SITE_URL = "https://vocal-pony-24e3de.netlify.app"
  API_BASE_URL = "https://vocal-pony-24e3de.netlify.app/api"
  SITE_URL = "https://vocal-pony-24e3de.netlify.app"
  
  # Netlify Functions
  NETLIFY_FUNCTIONS_URL = "https://vocal-pony-24e3de.netlify.app/.netlify/functions"
  
  # CORS (Public)
  CORS_ORIGIN = "https://vocal-pony-24e3de.netlify.app"
  ALLOWED_ORIGINS = "https://vocal-pony-24e3de.netlify.app"
  
  # Supabase Public Keys (Safe for client-side)
  NEXT_PUBLIC_SUPABASE_URL = "https://tdmzayzkqyegvfgxlolj.supabase.co"
  SUPABASE_URL = "https://tdmzayzkqyegvfgxlolj.supabase.co"
  
  # Feature Flags
  ENABLE_ANALYTICS = "true"
  ENABLE_CONTACT_FORM = "true"
  ENABLE_SEARCH = "true"
  ENABLE_BLOG = "true"
  DEBUG = "false"
  MAINTENANCE_MODE = "false"
  
  # Performance
  COMPRESSION_ENABLED = "true"
  CACHE_TTL = "300"
```

## Runtime Secrets (Netlify Dashboard)

⚠️ **CRITICAL**: These must be set via Netlify Dashboard → Site Settings → Environment Variables

### 1. Authentication & Security (REQUIRED)

#### JWT Configuration
```bash
# JWT Secret for token signing (256-bit random string)
JWT_SECRET=your-super-secure-256-bit-random-string-here

# JWT Refresh Secret (different from JWT_SECRET)
JWT_REFRESH_SECRET=different-256-bit-random-string-for-refresh-tokens

# Session Secret for cookie encryption
SESSION_SECRET=another-random-string-for-sessions
```

**How to generate secure secrets:**
```bash
# Using OpenSSL (recommended)
openssl rand -hex 32

# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Using online generator (less secure)
# Visit: https://www.allkeysgenerator.com/Random/Security-Encryption-Key-Generator.aspx
```

#### Admin Credentials
```bash
# Admin username for dashboard access
ADMIN_USERNAME=your-admin-username

# Admin email address
ADMIN_EMAIL=admin@yourdomain.com

# Bcrypt hashed admin password (never store plain text)
ADMIN_PASSWORD_HASH=$2b$12$your-bcrypt-hashed-password-here
```

**How to generate password hash:**
```javascript
// In Node.js console
const bcrypt = require('bcryptjs');
const hash = bcrypt.hashSync('your-password', 12);
console.log(hash);
```

### 2. Database & Supabase (REQUIRED)

#### Supabase Service Key
```bash
# Service role key from Supabase dashboard (starts with 'eyJ')
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Database password (if using direct DB connection)
SUPABASE_DB_PASSWORD=your-supabase-database-password
```

**Where to find Supabase keys:**
1. Go to Supabase Dashboard → Settings → API
2. Copy "service_role" key (not anon key)
3. Copy database password from Settings → Database

### 3. Email Configuration (OPTIONAL)

```bash
# SMTP Server Settings
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password

# Alternative providers:
# SendGrid: SMTP_HOST=smtp.sendgrid.net
# Mailgun: SMTP_HOST=smtp.mailgun.org
# AWS SES: SMTP_HOST=email-smtp.us-east-1.amazonaws.com
```

### 4. Monitoring & Analytics (OPTIONAL)

```bash
# Error Tracking
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id

# Google Analytics
GOOGLE_ANALYTICS_ID=GA-XXXXXXXXX-X
```

## Environment Variable Setting Instructions

### Via Netlify Dashboard (Recommended)

1. **Navigate to Site Settings**
   - Go to [Netlify Dashboard](https://app.netlify.com)
   - Select your site
   - Click "Site settings" → "Environment variables"

2. **Add Variables**
   - Click "Add variable"
   - Enter variable name exactly as shown above
   - Enter variable value
   - Select "All deploy contexts" or specific contexts
   - Click "Save"

3. **Deploy Context Options**
   - **All deploy contexts**: Variable available everywhere
   - **Production**: Only production builds
   - **Deploy previews**: Only preview deployments
   - **Branch deploys**: Only branch deployments

### Via Netlify CLI (Alternative)

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Link to your site
netlify link

# Set environment variables
netlify env:set JWT_SECRET "your-secret-here"
netlify env:set ADMIN_USERNAME "your-username"
netlify env:set SUPABASE_SERVICE_KEY "your-service-key"

# List all environment variables
netlify env:list
```

## Security Best Practices

### 1. Secret Generation
- **Use cryptographically secure random generators**
- **Never reuse secrets across environments**
- **Minimum 256-bit entropy for JWT secrets**
- **Rotate secrets regularly (quarterly)**

### 2. Access Control
- **Never commit secrets to version control**
- **Use different secrets for staging/production**
- **Limit team member access to production secrets**
- **Use Netlify's audit logs to track changes**

### 3. Password Security
- **Always hash passwords with bcrypt (12+ rounds)**
- **Never store plain text passwords**
- **Use strong admin passwords (12+ characters)**
- **Consider 2FA for admin accounts**

## Environment Validation

### Build-Time Validation
Your `netlify.toml` includes these validation-friendly settings:
```toml
# Debug mode (should be false in production)
DEBUG = "false"

# Maintenance mode (should be false for live site)
MAINTENANCE_MODE = "false"

# Node environment (should be production)
NODE_ENV = "production"
```

### Runtime Validation Script
Create a validation function to check required variables:

```javascript
// netlify/functions/env-check.js
const requiredVars = [
  'JWT_SECRET',
  'SUPABASE_SERVICE_KEY',
  'ADMIN_USERNAME',
  'ADMIN_PASSWORD_HASH'
];

exports.handler = async (event, context) => {
  const missing = requiredVars.filter(var => !process.env[var]);
  
  if (missing.length > 0) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Missing environment variables',
        missing: missing
      })
    };
  }
  
  return {
    statusCode: 200,
    body: JSON.stringify({ status: 'All required variables present' })
  };
};
```

## Troubleshooting Common Issues

### Build Failures
```bash
# Issue: Hugo version mismatch
# Solution: Update HUGO_VERSION in netlify.toml

# Issue: Node.js compatibility
# Solution: Set NODE_VERSION = "18" or "20"
```

### Function Errors
```bash
# Issue: JWT_SECRET not found
# Check: Netlify Dashboard → Environment Variables → JWT_SECRET

# Issue: Supabase connection failed
# Check: SUPABASE_SERVICE_KEY is service_role key, not anon key
```

### Admin Panel Access
```bash
# Issue: Login failed
# Check: ADMIN_USERNAME, ADMIN_EMAIL, ADMIN_PASSWORD_HASH are set

# Issue: Hash verification failed
# Solution: Regenerate password hash with bcrypt
```

## Environment Variables Checklist

### Pre-Deployment Checklist
- [ ] All secrets generated with secure random methods
- [ ] JWT_SECRET set (32+ characters)
- [ ] JWT_REFRESH_SECRET set (different from JWT_SECRET)
- [ ] SESSION_SECRET set
- [ ] ADMIN_USERNAME set
- [ ] ADMIN_EMAIL set
- [ ] ADMIN_PASSWORD_HASH set (bcrypt hashed)
- [ ] SUPABASE_SERVICE_KEY set (service_role key)
- [ ] SMTP credentials set (if using contact forms)

### Post-Deployment Validation
- [ ] Visit `/api/env-check` to validate server variables
- [ ] Test admin login functionality
- [ ] Verify API endpoints respond correctly
- [ ] Check browser console for client-side variable issues
- [ ] Test contact form submission (if enabled)

## Variable Updates and Rotation

### Regular Maintenance Schedule
- **Monthly**: Review access logs and variable usage
- **Quarterly**: Rotate JWT secrets and admin passwords
- **As Needed**: Update API keys and service credentials
- **After Team Changes**: Rotate shared secrets

### Safe Secret Rotation Process
1. Generate new secret
2. Add new secret with temporary name
3. Update code to use new secret
4. Deploy and test
5. Remove old secret
6. Update documentation

This comprehensive approach ensures your Netlify deployment is secure, properly configured, and maintainable.