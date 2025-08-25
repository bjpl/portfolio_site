# Environment Configuration Documentation

## Overview

This document provides comprehensive documentation for the portfolio site's environment configuration system. The system is designed to handle multiple environments (development, staging, production) with proper security, consistency, and ease of deployment.

## Architecture

### Configuration Hierarchy

1. **Environment Variables** (Highest Priority)
   - Netlify dashboard environment variables
   - System environment variables
   - Docker environment variables

2. **Environment Files** (Medium Priority)
   - `.env.local` (git-ignored, local overrides)
   - `.env.production` (production-specific settings)
   - `.env.staging` (staging-specific settings)
   - `.env` (development defaults)

3. **Build Configuration** (Lowest Priority)
   - `netlify.toml` (build-time variables)
   - `config.yaml` (Hugo configuration)
   - JavaScript config files (fallback values)

### File Structure

```
portfolio_site/
├── .env                          # Development environment
├── .env.production              # Production environment
├── .env.example                 # Template with all options
├── netlify.toml                 # Netlify build configuration
├── config/
│   └── environments/
│       ├── .env.unified         # Master template
│       ├── .env.production      # Deploy-specific production
│       └── .env.staging         # Deploy-specific staging
├── static/js/config/
│   ├── supabase-config.js       # Frontend Supabase config
│   └── api/
│       └── config.js            # API configuration manager
└── docs/
    ├── ENVIRONMENT_CONFIGURATION_ANALYSIS.md
    ├── NETLIFY_ENVIRONMENT_VARIABLES.md
    └── ENVIRONMENT_CONFIGURATION_DOCUMENTATION.md
```

## Configuration Categories

### 1. Core Application Settings

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `NODE_ENV` | Application environment | Yes | development |
| `HUGO_ENV` | Hugo environment | Yes | development |
| `APP_NAME` | Application name | No | Portfolio Site |
| `APP_VERSION` | Application version | No | 1.0.0 |
| `BUILD_ID` | Build identifier | No | auto-generated |

### 2. Server Configuration

| Variable | Description | Development | Production |
|----------|-------------|-------------|------------|
| `DEV_PORT` | Hugo development port | 1313 | N/A |
| `CMS_PORT` | CMS server port | 3334 | N/A |
| `BACKEND_PORT` | Backend API port | 3335 | N/A |
| `WS_PORT` | WebSocket port | 3001 | N/A |
| `HOST` | Server host | localhost | 0.0.0.0 |
| `PORT` | Production server port | N/A | 3333 |

### 3. Site Configuration

| Variable | Description | Example |
|----------|-------------|---------|
| `SITE_URL` | Primary site URL | https://yoursite.netlify.app |
| `VITE_SITE_URL` | Frontend site URL | https://yoursite.netlify.app |
| `VITE_API_URL` | API base URL | /api |
| `SITE_NAME` | Site display name | Your Portfolio |
| `SITE_DESCRIPTION` | Site description | Professional portfolio |

### 4. Supabase Configuration

#### Public Configuration (Safe for client-side)
| Variable | Description | Required |
|----------|-------------|----------|
| `SUPABASE_URL` | Supabase project URL | Yes |
| `SUPABASE_ANON_KEY` | Anonymous/public API key | Yes |
| `NEXT_PUBLIC_SUPABASE_URL` | Public URL for React/Next | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key | Yes |

#### Private Configuration (Server-side only)
| Variable | Description | Required | Security |
|----------|-------------|----------|----------|
| `SUPABASE_SERVICE_KEY` | Service role key | Yes | **SECRET** |
| `SUPABASE_DB_URL` | Direct DB connection | No | **SECRET** |
| `SUPABASE_JWT_SECRET` | JWT verification | No | **SECRET** |

### 5. Authentication & Security

| Variable | Description | Required | Security |
|----------|-------------|----------|----------|
| `JWT_SECRET` | JWT signing secret | Yes | **SECRET** |
| `JWT_REFRESH_SECRET` | Refresh token secret | Yes | **SECRET** |
| `SESSION_SECRET` | Session signing secret | Yes | **SECRET** |
| `ADMIN_USERNAME` | Admin username | Yes | **SECRET** |
| `ADMIN_EMAIL` | Admin email | Yes | **SECRET** |
| `ADMIN_PASSWORD_HASH` | Bcrypt password hash | Yes | **SECRET** |

### 6. Email Configuration

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `SMTP_HOST` | SMTP server | Optional | smtp.gmail.com |
| `SMTP_PORT` | SMTP port | Optional | 587 |
| `SMTP_USER` | SMTP username | Optional | your-email@gmail.com |
| `SMTP_PASS` | SMTP password | Optional | app-password |
| `FROM_EMAIL` | From address | Optional | noreply@domain.com |
| `CONTACT_EMAIL` | Contact address | Optional | contact@domain.com |

## Environment-Specific Configurations

### Development (.env)
```bash
# Development optimized for speed and debugging
NODE_ENV=development
DEBUG=true
LOG_LEVEL=debug
BCRYPT_ROUNDS=4  # Faster hashing
RATE_LIMIT_MAX_REQUESTS=1000  # Relaxed limits
SITE_URL=http://localhost:1313
VITE_API_URL=http://localhost:3334/api
```

### Production (.env.production)
```bash
# Production optimized for security and performance
NODE_ENV=production
DEBUG=false
LOG_LEVEL=warn
BCRYPT_ROUNDS=12  # Strong hashing
RATE_LIMIT_MAX_REQUESTS=100  # Strict limits
SITE_URL=https://yoursite.netlify.app
VITE_API_URL=/api
```

### Staging (.env.staging)
```bash
# Staging balances debugging and production-like behavior
NODE_ENV=staging
DEBUG=true
LOG_LEVEL=info
BCRYPT_ROUNDS=10  # Medium hashing
RATE_LIMIT_MAX_REQUESTS=200  # Medium limits
SITE_URL=https://staging.yoursite.netlify.app
VITE_API_URL=/api
```

## Security Best Practices

### 1. Secret Management
- **Never commit secrets to version control**
- Use different secrets for each environment
- Generate cryptographically secure secrets (32+ characters)
- Rotate secrets regularly (quarterly recommended)
- Use hosting platform environment variables for production secrets

### 2. Environment Separation
- Keep development/staging/production completely separate
- Use different Supabase projects for each environment
- Use different email services/credentials for each environment
- Use different monitoring/analytics accounts

### 3. Access Control
- Limit who has access to production environment variables
- Use principle of least privilege for service accounts
- Enable audit logging for environment variable changes
- Use temporary/rotatable access tokens where possible

## Configuration Validation

### Required Variables Check
```javascript
// Essential variables that must be present
const requiredVars = [
  'NODE_ENV',
  'SUPABASE_URL', 
  'SUPABASE_ANON_KEY',
  'JWT_SECRET',
  'SESSION_SECRET'
];

// Admin-specific requirements
const adminVars = [
  'ADMIN_USERNAME',
  'ADMIN_EMAIL', 
  'ADMIN_PASSWORD_HASH'
];

// Email feature requirements (optional)
const emailVars = [
  'SMTP_HOST',
  'SMTP_USER',
  'SMTP_PASS'
];
```

### Configuration Testing
```bash
# Test environment configuration
npm run test:config

# Test Supabase connectivity
npm run test:supabase

# Test email configuration
npm run test:email

# Validate all environment variables
npm run validate:env
```

## Deployment Checklist

### Development Setup
- [ ] Copy `.env.example` to `.env`
- [ ] Set up Supabase project and copy credentials
- [ ] Generate development JWT secrets
- [ ] Configure local email (or disable)
- [ ] Test configuration with `npm run test:config`

### Production Setup
- [ ] Set up production Supabase project
- [ ] Generate strong production secrets (32+ characters)
- [ ] Hash admin password with bcrypt (12+ rounds)
- [ ] Configure production email service
- [ ] Set all secrets via Netlify dashboard
- [ ] Update CORS origins in Supabase dashboard
- [ ] Test deployment with staging environment first

### Staging Setup
- [ ] Set up staging Supabase project
- [ ] Generate staging secrets (different from production)
- [ ] Configure staging email service
- [ ] Set staging environment variables
- [ ] Test full deployment pipeline

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check build-time variables in `netlify.toml`
   - Verify Hugo version and Node.js version
   - Check for missing required build variables

2. **Function Errors**
   - Verify runtime secrets are set in Netlify dashboard
   - Check function logs for specific error messages
   - Validate JWT secrets and Supabase configuration

3. **Client-Side Errors**
   - Verify public variables are accessible to client
   - Check browser console for configuration errors
   - Validate Supabase URL and anonymous key

4. **Authentication Issues**
   - Verify admin credentials are set correctly
   - Check password hash generation
   - Validate JWT secret configuration

### Debug Commands
```bash
# List current Netlify environment variables
netlify env:list

# Test local development
netlify dev

# Build locally
netlify build

# Check configuration
node scripts/validate-config.js
```

## Migration Guide

### From Legacy Configuration
1. Backup existing environment files
2. Copy `.env.example` to your target environment file
3. Map legacy variables to new structure
4. Update any hardcoded configuration references
5. Test thoroughly in staging before production

### Adding New Variables
1. Add to `.env.example` with documentation
2. Add to validation scripts
3. Update this documentation
4. Add to deployment checklist
5. Communicate changes to team

## Support and Updates

### Keeping Configuration Updated
- Review configuration monthly
- Update documentation when adding new features
- Rotate secrets quarterly
- Monitor for security advisories affecting used services

### Getting Help
- Check troubleshooting section first
- Review Netlify build logs
- Check Supabase dashboard for connection issues
- Validate configuration with provided test scripts

This documentation should be reviewed and updated whenever the configuration system changes.