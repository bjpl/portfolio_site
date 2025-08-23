# Netlify Functions Configuration Guide

## Overview

This document describes the complete Netlify Functions setup for the portfolio site, including configuration, deployment, and testing procedures.

## Functions Structure

```
netlify/functions/
├── auth.js              # Main auth handler (legacy, handles /refresh)
├── auth-login.js        # Dedicated login endpoint
├── auth-logout.js       # Dedicated logout endpoint  
├── contact.js           # Contact form handler
├── health.js            # Health check endpoint
├── fallback.js          # Fallback for unmatched routes
├── package.json         # Dependencies
└── .env.example         # Environment variables template
```

## API Endpoints

### Working Endpoints

#### Direct Function Access
- `/.netlify/functions/health` - Health check
- `/.netlify/functions/contact` - Contact form submission
- `/.netlify/functions/auth` - Legacy auth handler
- `/.netlify/functions/auth-login` - Login endpoint
- `/.netlify/functions/auth-logout` - Logout endpoint

#### API Proxy Routes (via netlify.toml)
- `/api/health` → `/.netlify/functions/health`
- `/api/contact` → `/.netlify/functions/contact`  
- `/api/auth/login` → `/.netlify/functions/auth-login`
- `/api/auth/logout` → `/.netlify/functions/auth-logout`
- `/api/auth/refresh` → `/.netlify/functions/auth`

### Health Check

**GET** `/api/health` or `/.netlify/functions/health`

```json
{
  "status": "healthy",
  "timestamp": "2025-08-23T06:24:05.202Z",
  "environment": "production",
  "message": "Portfolio site API is running on Netlify Functions"
}
```

### Contact Form

**POST** `/api/contact` or `/.netlify/functions/contact`

Request Body:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "message": "Hello world"
}
```

Response:
```json
{
  "success": true,
  "message": "Thank you for your message! We will get back to you soon.",
  "timestamp": "2025-08-23T06:24:07.123Z"
}
```

### Authentication

#### Login
**POST** `/api/auth/login` or `/.netlify/functions/auth-login`

Request Body:
```json
{
  "emailOrUsername": "admin",
  "password": "password123"
}
```

Response:
```json
{
  "success": true,
  "user": {
    "username": "admin",
    "email": "admin@portfolio.com",
    "role": "admin"
  },
  "token": "eyJ1c2VyIjoia...",
  "refreshToken": "eyJ1c2VyIjoia..."
}
```

#### Logout
**POST** `/api/auth/logout` or `/.netlify/functions/auth-logout`

Response:
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

## Configuration Files

### netlify.toml

Key configuration sections:

```toml
[functions]
  directory = "netlify/functions"
  node_bundler = "esbuild"

# API Proxy Routes
[[redirects]]
  from = "/api/health"
  to = "/.netlify/functions/health"
  status = 200
  force = true

[[redirects]]
  from = "/api/auth/login"
  to = "/.netlify/functions/auth-login"
  status = 200
  force = true
  headers = {X-Forwarded-For = ":client_ip"}

[[redirects]]
  from = "/api/contact"
  to = "/.netlify/functions/contact"
  status = 200
  force = true
  headers = {X-Forwarded-For = ":client_ip"}
```

### package.json

```json
{
  "name": "netlify-functions",
  "version": "1.0.0",
  "description": "Serverless functions for portfolio site",
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "cors": "^2.8.5"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

## Environment Variables

### Production (Netlify Dashboard)

Set these in your Netlify site settings under "Environment variables":

```bash
# Required
NODE_ENV=production
SITE_URL=https://vocal-pony-24e3de.netlify.app

# Optional (for enhanced security)
JWT_SECRET=your-production-secret-key
ADMIN_PASSWORD_HASH=your-bcrypt-hashed-password
CORS_ORIGINS=https://vocal-pony-24e3de.netlify.app

# Contact form (optional)
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### Local Development

Copy `.env.example` to `.env` and configure:

```bash
cp netlify/functions/.env.example netlify/functions/.env
```

## Testing & Verification

### Manual Testing

Use curl to test endpoints:

```bash
# Health check
curl https://vocal-pony-24e3de.netlify.app/api/health

# Contact form
curl -X POST https://vocal-pony-24e3de.netlify.app/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","message":"Hello"}'

# Login
curl -X POST https://vocal-pony-24e3de.netlify.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"emailOrUsername":"admin","password":"password123"}'
```

### Automated Verification

Run the comprehensive test suite:

```bash
node scripts/verify-netlify-functions.js
```

This script tests all endpoints and provides detailed results.

## Security Features

### CORS Configuration
- All functions include proper CORS headers
- Origins are configurable via environment variables
- Supports both development and production domains

### Authentication
- Simple JWT-based authentication (demo implementation)
- Configurable credentials via environment variables
- Rate limiting ready (implement as needed)

### Input Validation
- All functions validate input data
- Proper error handling and status codes
- Sanitized error messages

## Troubleshooting

### Common Issues

1. **404 errors on API routes**
   - Check netlify.toml redirect configuration
   - Verify function files exist in netlify/functions/
   - Check function naming matches redirects

2. **CORS errors**
   - Verify Access-Control-Allow-Origin headers
   - Check preflight OPTIONS handling
   - Update allowed origins in environment variables

3. **Function timeouts**
   - Default timeout is 10 seconds
   - Configure longer timeouts in netlify.toml if needed
   - Optimize function code for performance

### Debugging

1. Check Netlify function logs in dashboard
2. Use verbose curl commands with `-v` flag
3. Run verification script for comprehensive testing
4. Check browser developer tools for client-side errors

## Deployment

### Automatic Deployment

Functions deploy automatically on git push to main branch via Netlify's GitHub integration.

### Manual Deployment

```bash
# Build and commit
hugo --minify --cleanDestinationDir --gc
git add .
git commit -m "Update functions"
git push origin main
```

### Build Configuration

Hugo build command in netlify.toml:
```toml
[build]
  command = "rm -rf public && hugo --minify --cleanDestinationDir --gc"
  publish = "public"
```

## Monitoring & Analytics

### Health Monitoring
- `/api/health` endpoint provides status checks
- Includes timestamp and environment information
- Can be extended with database connectivity checks

### Logging
- All functions include error logging
- Console.log statements appear in Netlify function logs
- Consider structured logging for production

## Future Enhancements

1. **Enhanced Authentication**
   - Integrate with Netlify Identity
   - Implement proper JWT with RS256
   - Add password hashing with bcrypt

2. **Database Integration**
   - Connect to external database (PostgreSQL, MongoDB)
   - Implement proper user management
   - Add data persistence for contact forms

3. **Email Integration**
   - SendGrid or Mailgun for contact forms
   - Email notifications for form submissions
   - Newsletter functionality

4. **Rate Limiting**
   - Implement per-IP rate limiting
   - DDoS protection
   - API quotas

5. **Caching**
   - Response caching for static data
   - Edge caching configuration
   - Cache invalidation strategies

## Support & Maintenance

- Functions are serverless and auto-scaling
- No server maintenance required
- Monitor function execution time and errors
- Update dependencies regularly for security

For questions or issues, check the Netlify Functions documentation at https://docs.netlify.com/functions/overview/