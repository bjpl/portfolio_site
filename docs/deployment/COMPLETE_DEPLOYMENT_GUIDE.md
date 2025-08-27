# Complete Deployment Guide

## Overview

This comprehensive guide covers the entire deployment process for the portfolio site, including multiple deployment platforms, CI/CD setup, monitoring, and maintenance procedures.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Platform-Specific Deployment](#platform-specific-deployment)
4. [CI/CD Configuration](#cicd-configuration)
5. [Domain and DNS Setup](#domain-and-dns-setup)
6. [Security Configuration](#security-configuration)
7. [Performance Optimization](#performance-optimization)
8. [Monitoring Setup](#monitoring-setup)
9. [Post-Deployment Validation](#post-deployment-validation)
10. [Maintenance and Updates](#maintenance-and-updates)
11. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements
- Node.js 18 or higher
- Hugo 0.121.0 or higher
- Git (latest version)
- npm or yarn package manager

### Accounts Required
- GitHub account (for repository and CI/CD)
- Netlify account OR Vercel account
- Domain registrar account (if using custom domain)
- Supabase account (for backend services)
- Optional: Cloudflare account (for CDN and security)

### Environment Variables
Copy the template and set up your environment variables:
```bash
cp config/deployment/environment-variables.env .env.production
# Edit .env.production with your actual values
```

## Environment Setup

### Local Development Setup
```bash
# Clone repository
git clone https://github.com/yourusername/portfolio-site.git
cd portfolio-site

# Install dependencies
npm install

# Set up environment variables
cp config/deployment/environment-variables.env .env.local
# Edit .env.local with development values

# Run development server
npm run dev
```

### Build Test
```bash
# Test production build locally
npm run build:production

# Serve locally to test
npx serve public/

# Run pre-deployment validation
npm run validate:pre-deploy
```

## Platform-Specific Deployment

### Option 1: Netlify Deployment

#### Automatic Deployment (Recommended)
1. Connect GitHub repository to Netlify
2. Configure build settings:
   - Build command: `npm run build:production`
   - Publish directory: `public`
   - Node version: `18`

3. Set environment variables in Netlify dashboard
4. Deploy automatically on push to main branch

#### Manual Deployment
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy to production
netlify deploy --prod --dir=public
```

#### Netlify Configuration
The `netlify.toml` file is already configured with:
- Build settings
- Environment variables
- Security headers
- Redirects and rewrites
- Function configurations

### Option 2: Vercel Deployment

#### Automatic Deployment (Recommended)
1. Connect GitHub repository to Vercel
2. Import project with these settings:
   - Framework: Other
   - Build command: `npm run build:production`
   - Output directory: `public`
   - Install command: `npm ci`

3. Set environment variables in Vercel dashboard
4. Deploy automatically on push to main branch

#### Manual Deployment
```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod
```

#### Vercel Configuration
The `vercel.json` file includes:
- Build configuration
- Function settings
- Security headers
- Rewrites and redirects
- Caching rules

### Option 3: Traditional Hosting

#### Build and Deploy
```bash
# Build for production
npm run build:production

# Upload public/ directory to your hosting provider
# via FTP, SFTP, or hosting provider's deployment tools
```

#### Server Configuration
For traditional hosting, ensure your server:
- Serves static files from `public/` directory
- Has proper MIME types configured
- Implements security headers (see security section)
- Handles SPA routing (if applicable)

## CI/CD Configuration

### GitHub Actions Setup
The CI/CD pipeline (`.github/workflows/ci-cd.yml`) includes:

1. **Test Suite**
   - Unit tests
   - Integration tests
   - Type checking
   - Linting

2. **Security Scanning**
   - Dependency audit
   - CodeQL analysis
   - Security best practices validation

3. **Build Process**
   - Hugo build with optimization
   - Asset optimization
   - Bundle analysis

4. **Quality Checks**
   - Accessibility testing
   - Performance testing (Lighthouse)
   - End-to-end testing

5. **Deployment**
   - Preview deployments for PRs
   - Staging deployment (develop branch)
   - Production deployment (main branch)

### Required Secrets
Set these secrets in GitHub repository settings:

```
# Deployment
NETLIFY_AUTH_TOKEN=your-netlify-token
NETLIFY_SITE_ID=your-site-id
VERCEL_TOKEN=your-vercel-token

# Backend Services
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Monitoring
CODECOV_TOKEN=your-codecov-token
LHCI_GITHUB_APP_TOKEN=your-lighthouse-token

# Notifications
SLACK_WEBHOOK_URL=your-slack-webhook
DISCORD_WEBHOOK_URL=your-discord-webhook

# Production
PRODUCTION_URL=https://your-domain.com
ROLLBACK_TOKEN=your-rollback-token
```

## Domain and DNS Setup

### Custom Domain Configuration
See [DOMAIN_DNS_CONFIGURATION.md](./DOMAIN_DNS_CONFIGURATION.md) for detailed DNS setup.

#### Quick Setup for Netlify
```
# DNS Records
Type: A
Host: @
Value: 75.2.60.5

Type: CNAME
Host: www
Value: your-site.netlify.app
```

#### Quick Setup for Vercel
```
# DNS Records
Type: A
Host: @
Value: 76.76.19.61

Type: CNAME
Host: www
Value: cname.vercel-dns.com
```

### SSL Certificate
Both Netlify and Vercel provide automatic SSL certificates:
- Let's Encrypt certificates
- Automatic renewal
- Force HTTPS redirect

## Security Configuration

### Security Headers
Both `netlify.toml` and `vercel.json` include comprehensive security headers:

```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Content-Security-Policy: [comprehensive policy]
Referrer-Policy: strict-origin-when-cross-origin
```

### Content Security Policy (CSP)
The CSP is configured to:
- Allow self-hosted resources
- Permit necessary inline styles/scripts
- Block dangerous content sources
- Enable secure third-party integrations

### Additional Security
- Admin panel cache busting
- API endpoint protection
- Rate limiting on contact forms
- CORS configuration

## Performance Optimization

### Build Optimization
The build process includes:
- Asset minification (CSS, JS)
- Image optimization
- WebP generation
- Cache busting
- Service Worker generation
- Bundle analysis

### Caching Strategy
```
# Static Assets
CSS/JS: Cache for 1 year with versioning
Images: Cache for 1 year
HTML: Cache for 1 hour with revalidation

# Admin Panel
No caching - always fresh content

# API Endpoints
Short-term caching with revalidation
```

### CDN Configuration
If using Cloudflare:
- Enable Auto Minify
- Configure Page Rules for static assets
- Enable Rocket Loader for JS optimization
- Set up Browser Cache TTL

## Monitoring Setup

### Health Monitoring
Use the monitoring script:
```bash
# Run health checks
node scripts/deployment/monitoring.js health

# Run full monitoring suite
node scripts/deployment/monitoring.js full
```

### Uptime Monitoring
Set up external uptime monitoring:
- UptimeRobot (free tier available)
- Pingdom
- StatusCake
- Built-in platform monitoring

### Error Tracking
Configure error tracking service:
- Sentry (recommended)
- LogRocket
- Rollbar
- Platform-native error tracking

### Performance Monitoring
- Google PageSpeed Insights
- GTmetrix
- WebPageTest
- Lighthouse CI (included in pipeline)

## Post-Deployment Validation

### Automated Validation
The deployment pipeline includes:
- Health check endpoints
- Performance validation
- Security header verification
- Accessibility compliance

### Manual Validation Checklist
```
☐ Site loads correctly
☐ All pages accessible
☐ Contact form working
☐ Admin panel accessible (if applicable)
☐ Mobile responsiveness
☐ Cross-browser compatibility
☐ SSL certificate valid
☐ Performance metrics acceptable
☐ SEO meta tags present
☐ Analytics tracking active
```

### Post-Deployment Script
```bash
# Run post-deployment validation
npm run test:deployment:post $PRODUCTION_URL

# Check specific endpoints
npm run validate:deployment
```

## Maintenance and Updates

### Regular Maintenance Tasks
1. **Dependencies**
   ```bash
   # Update dependencies monthly
   npm update
   npm audit fix
   ```

2. **Hugo Updates**
   ```bash
   # Update Hugo version in CI/CD and local development
   # Test thoroughly before deploying
   ```

3. **Content Updates**
   - Use admin panel for content management
   - Test content changes in staging
   - Monitor for broken links

4. **Performance Monitoring**
   ```bash
   # Weekly performance checks
   node scripts/deployment/monitoring.js performance
   
   # Monthly full optimization
   node scripts/deployment/build-optimizer.js full
   ```

### Backup Procedures
1. **Content Backup**
   - Supabase automatic backups
   - Weekly manual exports
   - Version control for content files

2. **Configuration Backup**
   - Environment variables documented
   - DNS settings documented
   - Deployment configurations in version control

### Update Procedures
1. **Development**
   ```bash
   git checkout develop
   git pull origin develop
   # Make changes
   git add .
   git commit -m "Description of changes"
   git push origin develop
   ```

2. **Staging Deployment**
   - Automatic deployment to staging
   - Test all functionality
   - Performance validation

3. **Production Deployment**
   ```bash
   git checkout main
   git merge develop
   git push origin main
   ```

### Rollback Procedures
If issues are detected:
```bash
# Quick rollback using script
node scripts/deployment/rollback.js rollback 1 "Issue description"

# Manual rollback via platform dashboard
# - Netlify: Deploys section → Previous deploy → Publish
# - Vercel: Deployments section → Previous deployment → Promote
```

## Troubleshooting

### Common Issues

#### Build Failures
```bash
# Check build logs in platform dashboard
# Common causes:
# - Environment variable issues
# - Dependency problems
# - Hugo version mismatch
# - Node.js version incompatibility

# Debug locally
npm run build:production
```

#### DNS Issues
```bash
# Check DNS propagation
nslookup your-domain.com
dig your-domain.com

# Clear local DNS cache
# Windows: ipconfig /flushdns
# macOS: sudo dscacheutil -flushcache
# Linux: sudo systemctl restart systemd-resolved
```

#### SSL Certificate Issues
```bash
# Check certificate status
openssl s_client -connect your-domain.com:443 -servername your-domain.com

# Force SSL renewal (platform-specific)
# Usually automatic - contact support if issues persist
```

#### Performance Issues
```bash
# Run performance analysis
node scripts/deployment/build-optimizer.js analyze

# Check monitoring metrics
node scripts/deployment/monitoring.js performance

# Optimize assets
node scripts/deployment/build-optimizer.js full
```

### Getting Help
1. Check platform documentation:
   - [Netlify Docs](https://docs.netlify.com/)
   - [Vercel Docs](https://vercel.com/docs)
   - [Hugo Docs](https://gohugo.io/documentation/)

2. Community resources:
   - GitHub Issues
   - Platform community forums
   - Stack Overflow

3. Support channels:
   - Platform support (paid plans)
   - GitHub repository issues
   - Documentation repository

## Success Metrics

### Performance Targets
- Page load time: < 3 seconds
- Lighthouse Performance score: > 80
- First Contentful Paint: < 1.5 seconds
- Cumulative Layout Shift: < 0.1

### Reliability Targets
- Uptime: > 99.9%
- Build success rate: > 95%
- Deployment time: < 5 minutes
- Zero-downtime deployments

### Security Targets
- SSL rating: A+
- Security headers: All present
- Vulnerability scan: No high/critical issues
- Regular security updates

This deployment guide ensures a robust, secure, and performant deployment of your portfolio site. Follow the checklist and procedures to maintain high availability and excellent user experience.