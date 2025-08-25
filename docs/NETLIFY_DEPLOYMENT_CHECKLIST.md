# Netlify Deployment Checklist

## Pre-Deployment Setup

### 1. Environment Variables Configuration
**Location**: Netlify Dashboard → Site Settings → Environment Variables

#### Required Variables ✅
- [ ] `JWT_SECRET` - 256-bit random string for JWT token signing
- [ ] `JWT_REFRESH_SECRET` - Different 256-bit string for refresh tokens
- [ ] `SESSION_SECRET` - Random string for session encryption
- [ ] `ADMIN_USERNAME` - Admin dashboard username
- [ ] `ADMIN_EMAIL` - Admin email address
- [ ] `ADMIN_PASSWORD_HASH` - Bcrypt hashed password (12+ rounds)
- [ ] `SUPABASE_SERVICE_KEY` - Service role key from Supabase dashboard

#### Optional Variables 🔧
- [ ] `SMTP_HOST` - Email server hostname (e.g., smtp.gmail.com)
- [ ] `SMTP_USER` - Email username
- [ ] `SMTP_PASS` - Email password/app-specific password
- [ ] `SENTRY_DSN` - Error tracking URL (for monitoring)
- [ ] `GOOGLE_ANALYTICS_ID` - Google Analytics tracking ID

### 2. Supabase Configuration
**Location**: Supabase Dashboard → Settings

#### Database Setup ✅
- [ ] Database created and accessible
- [ ] Service role key copied to Netlify environment variables
- [ ] Database tables created (if needed)
- [ ] Row Level Security (RLS) policies configured
- [ ] API keys verified (anon key vs service key)

### 3. Domain Configuration
**Location**: Netlify Dashboard → Domain Settings

#### DNS Setup ✅
- [ ] Custom domain configured (if applicable)
- [ ] DNS records pointing to Netlify
- [ ] SSL certificate provisioned
- [ ] HTTPS redirect enabled
- [ ] WWW redirect configured (if needed)

## Build Configuration Verification

### 1. netlify.toml Validation
**File**: `netlify.toml`

#### Build Settings ✅
- [ ] Hugo version matches local development
- [ ] Node.js version compatible with functions
- [ ] Build command includes cleanup and optimization
- [ ] Publish directory set to "public"
- [ ] Environment variables properly referenced

#### Functions Configuration ✅
- [ ] Functions directory set to "netlify/functions"
- [ ] Node bundler set to "esbuild"
- [ ] Function timeouts configured appropriately
- [ ] Edge functions properly mapped

#### Security Headers ✅
- [ ] HTTPS Strict Transport Security (HSTS) enabled
- [ ] Content Security Policy (CSP) configured
- [ ] X-Frame-Options set to DENY
- [ ] Cross-Origin policies configured
- [ ] Permissions-Policy restrictive

### 2. Asset Optimization
#### Caching Strategy ✅
- [ ] Static assets cached for 1 year
- [ ] CSS files cached with revalidation
- [ ] Admin panel cache-busting enabled
- [ ] Image formats optimized (WebP, AVIF)

## Deployment Process

### 1. Pre-Deploy Testing
**Run Locally**:
```bash
# Build the site locally
npm run build

# Test functions locally
netlify dev

# Run comprehensive tests
npm run test

# Check for security vulnerabilities
npm audit
```

#### Local Testing Checklist ✅
- [ ] Site builds without errors
- [ ] All pages load correctly
- [ ] Admin panel accessible
- [ ] API endpoints respond
- [ ] Contact form works (if enabled)
- [ ] Authentication flow functional

### 2. Deploy to Netlify

#### Via Git Integration ✅
- [ ] Repository connected to Netlify
- [ ] Branch settings configured
- [ ] Auto-deploy enabled for main branch
- [ ] Build notifications configured

#### Manual Deploy (Alternative)
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build the site
npm run build

# Deploy to production
netlify deploy --prod
```

### 3. Post-Deploy Verification

#### Immediate Checks ✅
- [ ] Site loads at production URL
- [ ] No 404 errors on main pages
- [ ] Admin panel accessible (/admin)
- [ ] API health check passes (/api/health)
- [ ] Security headers present (check with online tools)

#### Functional Testing ✅
- [ ] Admin login works with configured credentials
- [ ] Authentication tokens generated correctly
- [ ] Database connections established
- [ ] Email functionality works (if configured)
- [ ] Form submissions processed

## Production Testing

### 1. Performance Testing
**Tools**: Lighthouse, PageSpeed Insights, GTmetrix

#### Performance Metrics ✅
- [ ] First Contentful Paint < 2s
- [ ] Largest Contentful Paint < 2.5s
- [ ] Cumulative Layout Shift < 0.1
- [ ] First Input Delay < 100ms
- [ ] Overall Performance Score > 90

### 2. Security Testing
**Tools**: Security Headers, SSL Labs

#### Security Checklist ✅
- [ ] SSL/TLS certificate valid (A+ rating)
- [ ] Security headers properly configured
- [ ] No mixed content warnings
- [ ] Admin routes protected
- [ ] API endpoints secured
- [ ] No sensitive data exposed in client code

### 3. SEO Testing
**Tools**: Google Search Console, Screaming Frog

#### SEO Checklist ✅
- [ ] Sitemap.xml accessible
- [ ] Robots.txt configured
- [ ] Meta tags present on all pages
- [ ] Structured data implemented
- [ ] Page titles and descriptions optimized

## Monitoring Setup

### 1. Error Tracking
**Tool**: Sentry (if configured)

#### Monitoring Checklist ✅
- [ ] Sentry DSN configured in environment variables
- [ ] Error notifications set up
- [ ] Performance monitoring enabled
- [ ] Alert thresholds configured

### 2. Analytics
**Tool**: Google Analytics (if configured)

#### Analytics Setup ✅
- [ ] Google Analytics ID configured
- [ ] Tracking code implemented
- [ ] Goals and conversions set up
- [ ] Privacy policy updated

### 3. Uptime Monitoring
**Tools**: Pingdom, UptimeRobot, or similar

#### Uptime Monitoring ✅
- [ ] Main site URL monitored
- [ ] API health endpoint monitored
- [ ] Admin panel availability tracked
- [ ] Alert notifications configured

## Maintenance Schedule

### Weekly Tasks
- [ ] Review build logs for errors
- [ ] Check function execution times
- [ ] Monitor SSL certificate expiration
- [ ] Review security headers status

### Monthly Tasks
- [ ] Update dependencies
- [ ] Review environment variables
- [ ] Check performance metrics
- [ ] Analyze error logs

### Quarterly Tasks
- [ ] Rotate JWT secrets
- [ ] Update admin passwords
- [ ] Review security policies
- [ ] Conduct security audit

## Troubleshooting Guide

### Common Build Issues

#### Hugo Build Failures
```bash
# Issue: Hugo version mismatch
# Solution: Update HUGO_VERSION in netlify.toml
HUGO_VERSION = "0.121.0"

# Issue: Missing themes or content
# Check: Ensure all submodules are updated
git submodule update --init --recursive
```

#### Function Deployment Issues
```bash
# Issue: Function timeout
# Solution: Increase timeout in netlify.toml
[functions."function-name"]
  timeout = 30

# Issue: Missing dependencies
# Check: netlify/functions/package.json includes all required packages
```

### Runtime Issues

#### Authentication Problems
```bash
# Issue: Admin login fails
# Check: Environment variables in Netlify dashboard
- ADMIN_USERNAME set correctly
- ADMIN_PASSWORD_HASH is valid bcrypt hash
- JWT_SECRET is properly configured

# Issue: Token verification fails
# Check: JWT_SECRET matches between functions
```

#### API Connectivity Issues
```bash
# Issue: Supabase connection fails
# Check: SUPABASE_SERVICE_KEY is service_role key (not anon)
# Verify: Supabase project is not paused

# Issue: CORS errors
# Check: CORS_ORIGIN matches site URL
```

### Performance Issues

#### Slow Build Times
```bash
# Solution: Enable Hugo caching
HUGO_CACHEDIR = "/opt/build/cache/hugo"

# Solution: Use esbuild for functions
[functions]
  node_bundler = "esbuild"
```

#### Slow Page Loads
```bash
# Check: Asset optimization enabled
# Verify: CDN caching working correctly
# Review: Image optimization settings
```

## Emergency Procedures

### Site Down
1. Check Netlify status page
2. Review recent deployments
3. Revert to last working deploy if needed
4. Check DNS settings
5. Verify SSL certificate status

### Security Incident
1. Immediately rotate all secrets
2. Check access logs for unusual activity
3. Update admin credentials
4. Review security headers
5. Consider temporary maintenance mode

### Data Breach
1. Secure all systems immediately
2. Rotate all API keys and secrets
3. Notify relevant parties
4. Document incident
5. Implement additional security measures

## Success Criteria

### Deployment Successful When:
- [ ] Site loads without errors
- [ ] All tests pass
- [ ] Security headers configured
- [ ] Performance metrics meet targets
- [ ] Admin functionality works
- [ ] API endpoints respond correctly
- [ ] SSL certificate valid
- [ ] Error monitoring active

### Ready for Production When:
- [ ] All checklist items completed
- [ ] Stakeholder approval received
- [ ] Backup procedures tested
- [ ] Monitoring alerts configured
- [ ] Documentation updated
- [ ] Team notified of deployment

## Post-Launch Tasks

### Immediate (First 24 hours)
- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Verify all functionality
- [ ] Review access logs
- [ ] Test backup procedures

### Short-term (First week)
- [ ] Set up monitoring alerts
- [ ] Configure automated backups
- [ ] Document any issues encountered
- [ ] Plan first maintenance window
- [ ] Gather user feedback

### Long-term (First month)
- [ ] Performance optimization review
- [ ] Security posture assessment
- [ ] User experience analysis
- [ ] Cost optimization review
- [ ] Feature enhancement planning

This comprehensive checklist ensures a secure, performant, and maintainable Netlify deployment.