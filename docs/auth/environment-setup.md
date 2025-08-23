# Environment Setup Guide for Supabase Authentication

This guide explains how to set up the required environment variables for the Supabase authentication system.

## Required Environment Variables

### Core Supabase Configuration

```bash
# Supabase Project Settings (Required)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anonymous-public-api-key
SUPABASE_SERVICE_KEY=your-service-role-secret-key
```

### Site Configuration

```bash
# Site URL Configuration (Required)
URL=https://your-domain.netlify.app
SITE_URL=https://your-domain.netlify.app

# OAuth Redirect URL (Optional - defaults to ${URL}/auth/callback)
OAUTH_REDIRECT_URL=https://your-domain.netlify.app/auth/callback
```

### OAuth Provider Credentials (Optional)

```bash
# GitHub OAuth
GITHUB_CLIENT_ID=your-github-app-client-id
GITHUB_CLIENT_SECRET=your-github-app-client-secret

# Google OAuth
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret

# Discord OAuth
DISCORD_CLIENT_ID=your-discord-app-client-id
DISCORD_CLIENT_SECRET=your-discord-app-client-secret

# Twitter OAuth
TWITTER_CLIENT_ID=your-twitter-api-key
TWITTER_CLIENT_SECRET=your-twitter-api-secret-key
```

### Security Configuration (Optional)

```bash
# JWT Configuration
JWT_SECRET=your-jwt-secret-key-for-additional-tokens

# Session Configuration
SESSION_TIMEOUT=86400  # 24 hours in seconds
PASSWORD_MIN_LENGTH=8
MAX_FAILED_ATTEMPTS=5
LOCKOUT_DURATION=900   # 15 minutes in seconds

# Captcha (if using)
ENABLE_CAPTCHA=false
CAPTCHA_THRESHOLD=3
```

### Rate Limiting (Optional)

```bash
# General Rate Limiting
RATE_LIMIT_WINDOW=60000        # 1 minute in milliseconds
RATE_LIMIT_MAX_REQUESTS=100

# Auth-specific Rate Limiting
AUTH_RATE_LIMIT_WINDOW=900000  # 15 minutes in milliseconds
AUTH_RATE_LIMIT_MAX_REQUESTS=5

# Password Reset Rate Limiting
PASSWORD_RESET_RATE_LIMIT_WINDOW=3600000  # 1 hour in milliseconds
PASSWORD_RESET_RATE_LIMIT_MAX_REQUESTS=3
```

### Database Configuration (Optional)

```bash
# Database Connection Pool
DB_POOL_MIN=2
DB_POOL_MAX=10
DB_ACQUIRE_TIMEOUT=60000
DB_IDLE_TIMEOUT=30000
DB_QUERY_TIMEOUT=30000
```

### Logging Configuration (Optional)

```bash
# Logging Settings
LOG_LEVEL=info                    # debug, info, warn, error
ENABLE_CONSOLE_LOGGING=true
ENABLE_FILE_LOGGING=false
LOG_FILE=./logs/auth.log
LOG_REQUESTS=false
LOG_ERRORS=true
LOG_SQL_QUERIES=false
```

### CORS Configuration (Optional)

```bash
# Allowed Origins (comma-separated)
CORS_ORIGIN=https://your-domain.netlify.app,http://localhost:3000
```

## How to Get Supabase Credentials

### 1. Get Supabase URL and Keys

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **API**
4. Copy the following:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** key → `SUPABASE_ANON_KEY`
   - **service_role secret** key → `SUPABASE_SERVICE_KEY`

### 2. Configure Authentication Settings

1. In Supabase Dashboard, go to **Authentication** → **Settings**
2. Set **Site URL** to your domain: `https://your-domain.netlify.app`
3. Add **Redirect URLs**:
   - `https://your-domain.netlify.app/auth/callback`
   - `http://localhost:3000/auth/callback` (for development)

## Setting Environment Variables

### For Netlify

1. Go to your Netlify site dashboard
2. Navigate to **Site settings** → **Environment variables**
3. Add each environment variable:
   - **Key**: Variable name (e.g., `SUPABASE_URL`)
   - **Value**: Variable value
   - **Scopes**: Select appropriate scopes

### For Local Development

Create a `.env` file in your project root:

```bash
# .env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
URL=http://localhost:3000
```

**Important**: Add `.env` to your `.gitignore` file to avoid committing secrets.

### For Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Add environment variables
vercel env add SUPABASE_URL
vercel env add SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_KEY
```

### For Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Add environment variables
railway variables set SUPABASE_URL=https://your-project-id.supabase.co
railway variables set SUPABASE_ANON_KEY=your-anon-key
railway variables set SUPABASE_SERVICE_KEY=your-service-key
```

## Validation

The system automatically validates environment variables on startup. You'll see validation errors in the logs if any required variables are missing or invalid.

### Manual Validation

You can manually test your configuration:

```bash
# Create a test script
cat > test-env.js << EOF
const { validateConfig } = require('./netlify/functions/utils/supabase-config');

if (validateConfig()) {
  console.log('✅ Configuration is valid');
} else {
  console.log('❌ Configuration has errors');
}
EOF

# Run the test
node test-env.js
```

## Security Best Practices

### 1. Key Rotation

- Rotate service role keys regularly
- Use Supabase dashboard to generate new keys
- Update environment variables immediately after rotation

### 2. Access Control

- Never expose service role keys in client-side code
- Use anon keys for client-side Supabase client
- Implement row-level security (RLS) in Supabase

### 3. Environment Separation

Use different Supabase projects for different environments:

- **Development**: Local/staging Supabase project
- **Production**: Production Supabase project

### 4. Variable Management

- Use a secrets management service for production
- Encrypt environment variables at rest
- Audit access to environment variables

## Common Issues and Solutions

### Issue: "Missing required environment variables"

**Solution**: Ensure all required variables are set and spelled correctly.

```bash
# Check current environment variables
echo $SUPABASE_URL
echo $SUPABASE_ANON_KEY
echo $SUPABASE_SERVICE_KEY
```

### Issue: "SUPABASE_URL must be a valid URL"

**Solution**: Ensure the URL is complete and starts with `https://`.

```bash
# Correct format
SUPABASE_URL=https://abcdef123456.supabase.co

# Incorrect formats
SUPABASE_URL=abcdef123456.supabase.co     # Missing protocol
SUPABASE_URL=https://supabase.co          # Missing project ID
```

### Issue: "Invalid or expired token"

**Solutions**:
1. Check that service role key is correct
2. Verify Supabase project is active
3. Ensure keys haven't been rotated

### Issue: OAuth not working

**Solutions**:
1. Verify OAuth provider credentials are set
2. Check redirect URLs in provider settings
3. Ensure Supabase Auth providers are configured

### Issue: CORS errors

**Solutions**:
1. Set correct `URL` environment variable
2. Configure site URL in Supabase Auth settings
3. Add development URLs to allowed origins

## Environment Variable Templates

### Minimal Setup (Development)

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
URL=http://localhost:3000
```

### Production Setup

```bash
# Core Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
URL=https://your-domain.netlify.app
NODE_ENV=production

# OAuth Providers
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Security
SESSION_TIMEOUT=86400
MAX_FAILED_ATTEMPTS=5
LOCKOUT_DURATION=900

# Rate Limiting
AUTH_RATE_LIMIT_MAX_REQUESTS=5
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=warn
ENABLE_CONSOLE_LOGGING=true
LOG_REQUESTS=false
LOG_ERRORS=true
```

### Full Configuration (All Options)

```bash
# Core Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# Site Configuration
URL=https://your-domain.netlify.app
SITE_URL=https://your-domain.netlify.app
OAUTH_REDIRECT_URL=https://your-domain.netlify.app/auth/callback

# OAuth Providers
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
DISCORD_CLIENT_ID=your-discord-client-id
DISCORD_CLIENT_SECRET=your-discord-client-secret
TWITTER_CLIENT_ID=your-twitter-api-key
TWITTER_CLIENT_SECRET=your-twitter-api-secret

# Security Configuration
JWT_SECRET=your-jwt-secret-for-additional-tokens
SESSION_TIMEOUT=86400
PASSWORD_MIN_LENGTH=8
MAX_FAILED_ATTEMPTS=5
LOCKOUT_DURATION=900
ENABLE_CAPTCHA=false
CAPTCHA_THRESHOLD=3

# Rate Limiting
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_WINDOW=900000
AUTH_RATE_LIMIT_MAX_REQUESTS=5
PASSWORD_RESET_RATE_LIMIT_WINDOW=3600000
PASSWORD_RESET_RATE_LIMIT_MAX_REQUESTS=3

# Database Configuration
DB_POOL_MIN=2
DB_POOL_MAX=10
DB_ACQUIRE_TIMEOUT=60000
DB_IDLE_TIMEOUT=30000
DB_QUERY_TIMEOUT=30000

# Logging Configuration
LOG_LEVEL=info
ENABLE_CONSOLE_LOGGING=true
ENABLE_FILE_LOGGING=false
LOG_FILE=./logs/auth.log
LOG_REQUESTS=false
LOG_ERRORS=true
LOG_SQL_QUERIES=false

# CORS Configuration
CORS_ORIGIN=https://your-domain.netlify.app,http://localhost:3000

# Environment
NODE_ENV=production
```

## Testing Configuration

Create a test endpoint to verify your configuration:

```javascript
// netlify/functions/test-config.js
const { getConfig, validateConfig } = require('./utils/supabase-config');

exports.handler = async (event, context) => {
  try {
    const isValid = validateConfig();
    const config = getConfig();
    
    // Don't expose sensitive data in production
    const safeConfig = {
      supabaseUrl: config.url,
      siteUrl: config.siteUrl,
      authProviders: Object.keys(config.auth.oauth.providers)
        .filter(provider => config.auth.oauth.providers[provider].enabled),
      rateLimit: config.rateLimit,
      environment: process.env.NODE_ENV
    };
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        valid: isValid,
        config: process.env.NODE_ENV === 'development' ? safeConfig : { environment: process.env.NODE_ENV }
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message })
    };
  }
};
```

Access the test endpoint: `https://your-site.netlify.app/.netlify/functions/test-config`

## Next Steps

1. Set up your environment variables
2. Configure OAuth providers (if needed)
3. Test authentication flow
4. Set up row-level security in Supabase
5. Configure user roles and permissions
6. Set up monitoring and logging

For additional help, refer to:
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Netlify Environment Variables](https://docs.netlify.com/environment-variables/overview/)
- [OAuth Setup Guide](./oauth-setup-guide.md)