# Environment Setup Guide

This guide covers the complete environment variable configuration for the Portfolio Site, including security best practices and deployment-specific setup.

## 🚨 Critical Security Rules

### Environment Variable Naming Convention

1. **Client-side variables** (exposed to browser): Use `NEXT_PUBLIC_` prefix
2. **Server-side secrets** (keep private): NEVER use `NEXT_PUBLIC_` prefix
3. **Database credentials**: Always server-side only
4. **API keys**: Always server-side only (unless specifically meant for client-side use)

### ❌ Security Anti-Patterns

```bash
# NEVER DO THIS - Exposes secrets to browser
NEXT_PUBLIC_SUPABASE_SERVICE_KEY=your-secret-key
NEXT_PUBLIC_JWT_SECRET=your-jwt-secret
NEXT_PUBLIC_DATABASE_PASSWORD=your-password
```

### ✅ Correct Patterns

```bash
# Client-side (safe for browser)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SITE_URL=https://your-domain.com

# Server-side (keep secret)
SUPABASE_SERVICE_KEY=your-service-key
JWT_SECRET=your-jwt-secret
AUTH0_CLIENT_SECRET=your-auth0-secret
```

## 📋 Required Environment Variables

### Core Application Settings

| Variable | Required | Type | Description | Example |
|----------|----------|------|-------------|---------|
| `NODE_ENV` | ✅ | string | Application environment | `production` |
| `NEXT_PUBLIC_SITE_URL` | ✅ | URL | Public site URL | `https://your-domain.com` |
| `NEXT_PUBLIC_API_URL` | ⚪ | URL | API base URL | `https://your-domain.com/api` |

### Supabase Configuration

| Variable | Required | Type | Description | Example |
|----------|----------|------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | URL | Supabase project URL (client-safe) | `https://abc123.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | JWT | Supabase anonymous key (client-safe) | `eyJhbGciOiJIUz...` |
| `SUPABASE_SERVICE_KEY` | ✅ | JWT | Service role key (SERVER ONLY) | `eyJhbGciOiJIUz...` |

### Authentication (Auth0)

| Variable | Required | Type | Description | Example |
|----------|----------|------|-------------|---------|
| `AUTH0_SECRET` | ✅ | string | Auth0 secret (32+ chars) | `your-32-char-secret` |
| `AUTH0_BASE_URL` | ✅ | URL | Application base URL | `https://your-domain.com` |
| `AUTH0_ISSUER_BASE_URL` | ✅ | URL | Auth0 tenant URL | `https://tenant.auth0.com` |
| `AUTH0_CLIENT_ID` | ✅ | string | Auth0 application client ID | `abc123xyz` |
| `AUTH0_CLIENT_SECRET` | ✅ | string | Auth0 client secret | `secret-key` |
| `AUTH0_AUDIENCE` | ⚪ | string | Auth0 API audience | `https://api.your-domain.com` |

### NextAuth Configuration

| Variable | Required | Type | Description | Example |
|----------|----------|------|-------------|---------|
| `NEXTAUTH_SECRET` | ✅ | string | NextAuth secret (32+ chars) | `your-32-char-secret` |
| `NEXTAUTH_URL` | ✅ | URL | Application URL for NextAuth | `https://your-domain.com` |

### Email Configuration (Optional)

| Variable | Required | Type | Description | Example |
|----------|----------|------|-------------|---------|
| `SMTP_HOST` | ⚪ | string | SMTP server host | `smtp.gmail.com` |
| `SMTP_PORT` | ⚪ | number | SMTP server port | `587` |
| `SMTP_USER` | ⚪ | email | SMTP username | `user@gmail.com` |
| `SMTP_PASS` | ⚪ | string | SMTP password/app password | `app-password` |

### External APIs (Optional)

| Variable | Required | Type | Description | Example |
|----------|----------|------|-------------|---------|
| `ANTHROPIC_API_KEY` | ⚪ | string | Anthropic/Claude API key | `sk-ant-...` |
| `OPENAI_API_KEY` | ⚪ | string | OpenAI API key | `sk-...` |
| `GITHUB_TOKEN` | ⚪ | string | GitHub personal access token | `ghp_...` |

## 🚀 Environment Setup Steps

### 1. Development Setup

```bash
# 1. Copy the example file
cp .env.example .env

# 2. Generate secure secrets
npm run env:generate

# 3. Configure your services (Supabase, Auth0, etc.)
# Edit .env with your actual credentials

# 4. Validate your configuration
npm run env:validate

# 5. Test the setup
npm run dev
```

### 2. Production Setup

```bash
# Validate production environment
npm run env:validate:production

# Check for security issues
npm run env:check
```

## 🔧 Environment Validation Commands

The project includes built-in environment validation:

```bash
# Basic validation
npm run env:validate

# Strict validation (treats warnings as errors)
npm run env:validate:strict

# Production validation
npm run env:validate:production

# Check environment setup
npm run env:check

# Generate missing variables
npm run env:generate

# Auto-fix issues where possible
npm run env:fix
```

## 🌐 Platform-Specific Configuration

### Netlify Deployment

Set these environment variables in your Netlify dashboard (`Site Settings > Environment Variables`):

```bash
# Core Variables
NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://your-netlify-site.netlify.app

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# Auth0
AUTH0_SECRET=your-32-char-secret
AUTH0_BASE_URL=https://your-netlify-site.netlify.app
AUTH0_ISSUER_BASE_URL=https://your-tenant.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret

# NextAuth
NEXTAUTH_SECRET=your-32-char-secret
NEXTAUTH_URL=https://your-netlify-site.netlify.app
```

### Vercel Deployment

Set these in your Vercel dashboard (`Project Settings > Environment Variables`):

```bash
# Same variables as Netlify, but update URLs:
NEXT_PUBLIC_SITE_URL=https://your-vercel-app.vercel.app
AUTH0_BASE_URL=https://your-vercel-app.vercel.app
NEXTAUTH_URL=https://your-vercel-app.vercel.app
```

### Local Development

Create a `.env.local` file (gitignored) for local overrides:

```bash
# Override for local development
NEXT_PUBLIC_SITE_URL=http://localhost:3000
AUTH0_BASE_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000

# Local-only secrets
JWT_SECRET=local-development-secret
```

## 🔒 Security Best Practices

### Secret Generation

Generate secure secrets using:

```bash
# 32-character secret
openssl rand -base64 32

# or using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# or using the validation tool
npm run env:generate
```

### Secret Rotation

1. **Development**: Rotate monthly
2. **Staging**: Rotate bi-weekly  
3. **Production**: Rotate weekly or after any security incident

### Environment Isolation

- **Never** use production secrets in development
- **Never** commit secrets to version control
- **Always** use different secrets for each environment
- **Always** validate environment before deployment

## 🐛 Troubleshooting

### Common Issues

1. **"Missing required environment variables"**
   ```bash
   # Fix: Generate and configure missing variables
   npm run env:generate
   npm run env:fix
   ```

2. **"NEXT_PUBLIC_ prefix on secrets detected"**
   ```bash
   # Fix: Remove NEXT_PUBLIC_ prefix from secret variables
   # Move secrets to server-side only variables
   ```

3. **"Environment validation failed"**
   ```bash
   # Fix: Check validation output and fix issues
   npm run env:validate:strict
   ```

4. **"Auth0 configuration invalid"**
   ```bash
   # Fix: Verify Auth0 app configuration matches environment variables
   # Check redirect URLs, audience, and domain settings
   ```

### Debug Commands

```bash
# Check which environment file is loaded
npm run env:check

# Validate specific environment
npm run env:validate -- --env=production

# See all environment variables (development only)
node -e "console.log(process.env)" | grep -E "(NEXT_PUBLIC_|AUTH0_|SUPABASE_)"
```

## 📚 Additional Resources

- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [Auth0 Next.js Integration](https://auth0.com/docs/quickstart/webapp/nextjs)
- [Supabase Environment Setup](https://supabase.com/docs/guides/getting-started/environment-setup)
- [Netlify Environment Variables](https://docs.netlify.com/environment-variables/overview/)

## ✅ Pre-Deployment Checklist

Before deploying to production:

- [ ] All required environment variables are set
- [ ] No hardcoded secrets in code
- [ ] No `NEXT_PUBLIC_` prefix on secrets
- [ ] Environment validation passes: `npm run env:validate:production`
- [ ] Security check passes: `npm run env:check`
- [ ] Auth0 redirect URLs updated for production domain
- [ ] Supabase URL whitelist updated for production domain
- [ ] CORS origins configured for production domain
- [ ] SSL certificates are valid
- [ ] All URLs use HTTPS in production

---

**Remember: Security is everyone's responsibility. When in doubt, keep it secret!** 🔐