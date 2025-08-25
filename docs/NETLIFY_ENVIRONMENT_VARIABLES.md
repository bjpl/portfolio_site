# Netlify Environment Variables Configuration

## Required Netlify Environment Variables

### Security & Authentication (Set via Netlify Dashboard)
```bash
# JWT Configuration - Generate strong secrets
JWT_SECRET=your-super-long-jwt-secret-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-different-from-jwt
SESSION_SECRET=your-session-secret-min-32-chars

# Admin Credentials
ADMIN_USERNAME=your-admin-username
ADMIN_EMAIL=your-admin-email@domain.com
ADMIN_PASSWORD_HASH=your-bcrypt-hashed-password

# Supabase Backend Keys (NEVER expose in client-side code)
SUPABASE_SERVICE_KEY=your-supabase-service-role-key
SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Email Configuration (Optional)
```bash
# SMTP Settings (if using email features)
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
CONTACT_EMAIL=contact@yourdomain.com
FROM_EMAIL=noreply@yourdomain.com

# Alternative: SendGrid
SENDGRID_API_KEY=your-sendgrid-api-key
```

### Monitoring & Analytics (Optional)
```bash
# Error Tracking
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id

# Analytics
GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
```

### External Integrations (Optional)
```bash
# AI Services
ANTHROPIC_API_KEY=your-anthropic-api-key
OPENAI_API_KEY=your-openai-api-key

# Social Media
GITHUB_TOKEN=your-github-token
```

## How to Set Environment Variables in Netlify

### Via Netlify Dashboard:
1. Go to your site dashboard
2. Click "Site settings"
3. Click "Environment variables" in the sidebar
4. Click "Add variable" for each secret
5. Set the key and value, click "Save"

### Via Netlify CLI:
```bash
# Set individual variables
netlify env:set JWT_SECRET "your-jwt-secret-here"
netlify env:set ADMIN_PASSWORD_HASH "your-bcrypt-hash"

# Import from file (be careful with secrets!)
netlify env:import .env.production
```

## Environment Variable Validation

### Required for Basic Functionality:
- `SUPABASE_URL` (public, set in netlify.toml)
- `SUPABASE_ANON_KEY` (public, set in netlify.toml)
- `SUPABASE_SERVICE_KEY` (secret, set via dashboard)
- `JWT_SECRET` (secret, set via dashboard)
- `SESSION_SECRET` (secret, set via dashboard)

### Required for Admin Panel:
- `ADMIN_USERNAME` (secret)
- `ADMIN_EMAIL` (secret)
- `ADMIN_PASSWORD_HASH` (secret)

### Optional Features:
- Email: `SMTP_*` variables
- Analytics: `GOOGLE_ANALYTICS_ID`
- Monitoring: `SENTRY_DSN`

## Security Best Practices

1. **Never commit secrets to git**
2. **Use different secrets for each environment**
3. **Rotate secrets regularly**
4. **Use strong, unique secrets (32+ characters)**
5. **Set sensitive values only via Netlify dashboard**
6. **Use environment-specific prefixes for clarity**

## Testing Environment Variables

Create a test script to validate your configuration:

```javascript
// scripts/test-env-config.js
const requiredVars = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY', 
  'JWT_SECRET',
  'SESSION_SECRET'
];

requiredVars.forEach(varName => {
  if (!process.env[varName]) {
    console.error(`Missing required environment variable: ${varName}`);
    process.exit(1);
  }
});

console.log('✅ All required environment variables are set');
```

## Environment Variable Hierarchy

1. **Build-time variables** (netlify.toml) - Public, available during build
2. **Runtime secrets** (Netlify dashboard) - Private, available to functions
3. **Local development** (.env) - Development overrides

## Troubleshooting

### Common Issues:
1. **Build fails**: Check build-time variables in netlify.toml
2. **Functions fail**: Check runtime secrets in dashboard
3. **Client errors**: Verify public variables are accessible
4. **Auth fails**: Verify JWT secrets are set correctly

### Debug Commands:
```bash
# Check current environment variables
netlify env:list

# Test build locally with Netlify CLI
netlify build

# Test functions locally
netlify dev
```