# Netlify Environment Variables Configuration

This document provides the complete configuration guide for environment variables on Netlify deployment.

## 🚀 Quick Setup

### Required Environment Variables

Copy these variables to your Netlify site dashboard under **Site Settings > Environment Variables**:

```bash
# =============================================================================
# CORE APPLICATION SETTINGS
# =============================================================================

NODE_ENV=production
HUGO_ENV=production

# Site Configuration
NEXT_PUBLIC_SITE_URL=https://your-site-name.netlify.app
NEXT_PUBLIC_API_URL=https://your-site-name.netlify.app/api
NEXT_PUBLIC_NODE_ENV=production

# =============================================================================
# SUPABASE CONFIGURATION
# =============================================================================

# Client-side (safe for browser)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key-here

# Server-side (keep secret!)
SUPABASE_SERVICE_KEY=your-supabase-service-role-key-here
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key-here

# =============================================================================
# AUTH0 CONFIGURATION
# =============================================================================

AUTH0_SECRET=your-auth0-secret-32-chars-minimum
AUTH0_BASE_URL=https://your-site-name.netlify.app
AUTH0_ISSUER_BASE_URL=https://your-auth0-tenant.auth0.com
AUTH0_CLIENT_ID=your-auth0-client-id
AUTH0_CLIENT_SECRET=your-auth0-client-secret
AUTH0_AUDIENCE=your-auth0-api-identifier
AUTH0_DOMAIN=your-auth0-tenant.auth0.com
AUTH0_REDIRECT_URI=https://your-site-name.netlify.app/api/auth/callback
AUTH0_POST_LOGOUT_REDIRECT_URI=https://your-site-name.netlify.app

# =============================================================================
# NEXTAUTH CONFIGURATION
# =============================================================================

NEXTAUTH_SECRET=your-nextauth-secret-32-chars-minimum
NEXTAUTH_URL=https://your-site-name.netlify.app

# =============================================================================
# SECURITY & JWT
# =============================================================================

JWT_SECRET=your-jwt-secret-32-chars-minimum
JWT_EXPIRY=7d
SESSION_SECRET=your-session-secret-32-chars-minimum

# =============================================================================
# NETLIFY SPECIFIC
# =============================================================================

# Build Configuration
NETLIFY_SITE_ID=your-netlify-site-id
HUGO_VERSION=0.121.0
NODE_VERSION=18

# Functions Configuration
NEXT_PUBLIC_NETLIFY_FUNCTIONS_URL=/.netlify/functions
NEXT_PUBLIC_API_BASE_URL=/api

# =============================================================================
# EMAIL CONFIGURATION (Optional)
# =============================================================================

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-gmail-app-password
FROM_EMAIL=noreply@your-domain.com
CONTACT_EMAIL=contact@your-domain.com

# =============================================================================
# EXTERNAL APIS (Optional)
# =============================================================================

# AI Services
ANTHROPIC_API_KEY=your-anthropic-api-key
OPENAI_API_KEY=your-openai-api-key

# Social Media
GITHUB_TOKEN=your-github-token
GITHUB_CLIENT_ID=your-github-oauth-client-id
GITHUB_CLIENT_SECRET=your-github-oauth-client-secret

# =============================================================================
# RATE LIMITING & SECURITY
# =============================================================================

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
CORS_ORIGIN=https://your-site-name.netlify.app

# =============================================================================
# MONITORING (Optional)
# =============================================================================

SENTRY_DSN=your-sentry-dsn-url
GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
```

## 🔧 Netlify Dashboard Configuration

### Step-by-Step Setup

1. **Login to Netlify** and navigate to your site dashboard
2. **Go to Site Settings** → **Environment Variables**
3. **Click "Add a variable"** for each variable above
4. **Set the key and value** according to the table below
5. **Click "Create variable"** to save

### Variable Configuration Table

| Variable | Value | Notes |
|----------|-------|-------|
| `NODE_ENV` | `production` | Required for production build |
| `NEXT_PUBLIC_SITE_URL` | `https://your-site.netlify.app` | Replace with your Netlify URL |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | From Supabase dashboard |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key | From Supabase dashboard |
| `SUPABASE_SERVICE_KEY` | Your Supabase service role key | ⚠️ Keep secret! |
| `AUTH0_SECRET` | Generate 32+ char secret | Use crypto.randomBytes(32) |
| `AUTH0_CLIENT_ID` | From Auth0 dashboard | Application settings |
| `AUTH0_CLIENT_SECRET` | From Auth0 dashboard | ⚠️ Keep secret! |
| `NEXTAUTH_SECRET` | Generate 32+ char secret | Different from AUTH0_SECRET |

## 🛠️ Service Configuration

### Supabase Setup

1. **Create Supabase Project**:
   - Go to [supabase.com](https://supabase.com)
   - Create new project
   - Copy URL and keys from Settings → API

2. **Configure RLS Policies**:
   - Enable Row Level Security
   - Add policies for your tables
   - Test with anon key

3. **Update Environment Variables**:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://abc123.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

### Auth0 Setup

1. **Create Auth0 Application**:
   - Go to [auth0.com](https://auth0.com)
   - Create new Single Page Application
   - Configure allowed callback URLs

2. **Configure Callback URLs**:
   ```
   https://your-site.netlify.app/api/auth/callback
   ```

3. **Configure Logout URLs**:
   ```
   https://your-site.netlify.app
   ```

4. **Update Environment Variables**:
   ```bash
   AUTH0_DOMAIN=your-tenant.auth0.com
   AUTH0_CLIENT_ID=abc123xyz
   AUTH0_CLIENT_SECRET=your-secret-key
   AUTH0_BASE_URL=https://your-site.netlify.app
   ```

## 🔒 Security Configuration

### Generate Secure Secrets

Use one of these methods to generate secure secrets:

```bash
# Method 1: OpenSSL
openssl rand -base64 32

# Method 2: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Method 3: Online generator (use with caution)
# https://generate-secret.vercel.app/32
```

### Critical Security Rules

1. **Never use `NEXT_PUBLIC_` for secrets**
2. **Use different secrets for each environment**
3. **Rotate secrets regularly**
4. **Verify HTTPS is enabled**
5. **Configure proper CORS origins**

## 🚀 Build Configuration

### Netlify Build Settings

Update your `netlify.toml`:

```toml
[build]
  command = "npm run build:production"
  functions = "netlify/functions"
  publish = "public"

[build.environment]
  NODE_VERSION = "18"
  HUGO_VERSION = "0.121.0"
  NODE_ENV = "production"
  HUGO_ENV = "production"

[functions]
  node_bundler = "esbuild"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    X-XSS-Protection = "1; mode=block"
    Strict-Transport-Security = "max-age=31536000; includeSubDomains"

[[redirects]]
  from = "/admin"
  to = "/admin/dashboard"
  status = 302

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200
```

## 🧪 Testing Configuration

### Pre-Deployment Testing

Before deploying, test your configuration:

```bash
# 1. Validate environment locally
npm run env:validate:production

# 2. Test build process
npm run build:production

# 3. Test auth flow
# Visit your site and test login/logout

# 4. Test API endpoints
curl https://your-site.netlify.app/api/health
```

### Environment Validation

Create a test deployment to validate your environment:

```bash
# Deploy to branch deploy first
git checkout -b test-environment
git push origin test-environment

# Check branch deploy URL for issues
# Fix any environment problems
# Merge to main when working
```

## 🐛 Troubleshooting

### Common Issues

1. **Build fails with "Missing environment variables"**
   ```
   Solution: Check all required variables are set in Netlify dashboard
   Verify spelling and case sensitivity
   ```

2. **Auth0 login redirects to localhost**
   ```
   Solution: Update AUTH0_BASE_URL to your Netlify URL
   Update Auth0 app callback URLs
   ```

3. **Supabase connection fails**
   ```
   Solution: Verify SUPABASE_URL and keys are correct
   Check Supabase project is not paused
   ```

4. **Functions not working**
   ```
   Solution: Check NETLIFY_FUNCTIONS_URL path
   Verify function deployment in Netlify dashboard
   ```

### Debug Commands

```bash
# Check environment in Netlify function
export function handler(event, context) {
  console.log('Environment check:', {
    NODE_ENV: process.env.NODE_ENV,
    SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing',
    AUTH0_DOMAIN: process.env.AUTH0_DOMAIN ? 'Set' : 'Missing'
  });
}
```

## 📊 Monitoring

### Environment Health Check

Add this to your monitoring:

```javascript
// netlify/functions/env-check.js
exports.handler = async (event, context) => {
  const requiredVars = [
    'NODE_ENV',
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_KEY',
    'AUTH0_CLIENT_ID'
  ];
  
  const missing = requiredVars.filter(key => !process.env[key]);
  
  return {
    statusCode: missing.length === 0 ? 200 : 500,
    body: JSON.stringify({
      status: missing.length === 0 ? 'healthy' : 'unhealthy',
      missing: missing,
      timestamp: new Date().toISOString()
    })
  };
};
```

## ✅ Deployment Checklist

Before going live:

- [ ] All environment variables configured in Netlify
- [ ] Auth0 callback URLs updated
- [ ] Supabase RLS policies configured
- [ ] CORS origins set correctly
- [ ] SSL certificate active
- [ ] Custom domain configured (if applicable)
- [ ] Build succeeds without errors
- [ ] All API endpoints respond correctly
- [ ] Authentication flow works end-to-end
- [ ] Environment validation passes

---

**Need help?** Check the [main environment setup guide](./ENVIRONMENT_SETUP_GUIDE.md) or create an issue in the repository.