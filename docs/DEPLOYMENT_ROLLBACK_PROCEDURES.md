# Deployment Rollback Procedures

## Overview

This document provides comprehensive procedures for rolling back deployments in case of issues during or after deployment to Netlify.

## Pre-Deployment Backup

### 1. Database Backup
```bash
# Export current database state
supabase db dump --linked > backup_$(date +%Y%m%d_%H%M%S).sql

# Or via direct connection
pg_dump "postgresql://[user]:[pass]@[host]:5432/[db]" > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 2. Environment Configuration Backup
```bash
# Backup current Netlify environment variables
netlify env:list > env_backup_$(date +%Y%m%d_%H%M%S).txt

# Backup local environment files
cp .env.production .env.production.backup
cp netlify.toml netlify.toml.backup
```

### 3. Git State Backup
```bash
# Tag current stable state
git tag "stable-$(date +%Y%m%d_%H%M%S)"
git push origin "stable-$(date +%Y%m%d_%H%M%S)"

# Create backup branch
git branch "backup-$(date +%Y%m%d_%H%M%S)"
git push origin "backup-$(date +%Y%m%d_%H%M%S)"
```

## Rollback Scenarios

### Scenario 1: Build Failure

**Issue**: Build fails during deployment
**Cause**: Configuration errors, missing dependencies, or code issues

**Quick Rollback**:
```bash
# 1. Revert to last known good commit
git log --oneline -10  # Find last good commit
git reset --hard [COMMIT_HASH]
git push --force-with-lease origin main

# 2. Trigger rebuild
netlify deploy --prod --build
```

**Alternative - Netlify UI**:
1. Go to Netlify Dashboard → Site → Deploys
2. Find last successful deploy
3. Click "Restore deploy"

### Scenario 2: Environment Variable Issues

**Issue**: Site loads but functionality broken due to env vars
**Cause**: Missing or incorrect environment variables

**Rollback**:
```bash
# 1. Restore environment variables
netlify env:import env_backup_[TIMESTAMP].txt

# 2. Or restore specific variables
netlify env:set SUPABASE_URL "https://tdmzayzkqyegvfgxlolj.supabase.co"
netlify env:set JWT_SECRET "[previous_jwt_secret]"

# 3. Redeploy
netlify deploy --prod --build
```

### Scenario 3: Database Issues

**Issue**: Database connectivity or schema issues
**Cause**: Migration failures, connection problems

**Rollback**:
```bash
# 1. Restore database from backup
psql "postgresql://[user]:[pass]@[host]:5432/[db]" < backup_[TIMESTAMP].sql

# 2. Or reset specific migrations
supabase migration down --count 1  # Roll back last migration
supabase db reset --linked         # Full reset (DESTRUCTIVE)

# 3. Verify connectivity
node tests/comprehensive-database-test.js
```

### Scenario 4: Admin Panel Issues

**Issue**: Admin panel not loading or authentication failing
**Cause**: Config issues, cache problems, or authentication failures

**Rollback**:
```bash
# 1. Clear admin cache busting
git checkout HEAD~1 -- static/admin/
git commit -m "Rollback admin panel changes"

# 2. Reset admin authentication
node scripts/reset-admin-password.js

# 3. Test admin panel
node scripts/test-admin-panel.js
```

### Scenario 5: Complete Site Failure

**Issue**: Entire site is down or severely broken
**Cause**: Major configuration or code issues

**Emergency Rollback**:
```bash
# 1. Immediate rollback to stable tag
git reset --hard stable-[TIMESTAMP]
git push --force-with-lease origin main

# 2. Restore all environment variables
netlify env:import env_backup_[TIMESTAMP].txt

# 3. Force redeploy
netlify deploy --prod --build --force

# 4. Verify site health
curl https://vocal-pony-24e3de.netlify.app/api/health
```

## Rollback Verification Checklist

After any rollback, verify these components:

### 1. Site Accessibility
- [ ] Main site loads: `https://vocal-pony-24e3de.netlify.app`
- [ ] Admin panel loads: `https://vocal-pony-24e3de.netlify.app/admin`
- [ ] API endpoints respond: `https://vocal-pony-24e3de.netlify.app/api/health`

### 2. Database Connectivity
```bash
# Run comprehensive test
node tests/comprehensive-database-test.js

# Check specific functionality
curl https://vocal-pony-24e3de.netlify.app/api/health
```

### 3. Admin Panel Functionality
```bash
# Test admin authentication
node scripts/test-admin-panel.js

# Verify admin login manually
open https://vocal-pony-24e3de.netlify.app/admin
```

### 4. Performance Check
```bash
# Check site performance
curl -w "%{time_total}\n" -o /dev/null -s https://vocal-pony-24e3de.netlify.app

# Verify build performance
netlify build --dry-run
```

## Prevention Strategies

### 1. Staging Environment
```bash
# Deploy to staging first
netlify deploy --alias=staging

# Test on staging
curl https://staging--vocal-pony-24e3de.netlify.app/api/health

# Only deploy to production after staging verification
netlify deploy --prod
```

### 2. Gradual Rollout
```bash
# Deploy with percentage rollout
netlify deploy --prod --split-test-percentage=10

# Monitor for issues, then increase
netlify deploy --prod --split-test-percentage=50
netlify deploy --prod --split-test-percentage=100
```

### 3. Automated Testing
```bash
# Run all tests before deployment
npm test
node tests/comprehensive-database-test.js
node tests/integration_validation_test.js

# Only deploy if all tests pass
if [ $? -eq 0 ]; then
  netlify deploy --prod --build
fi
```

## Emergency Contacts & Resources

### Netlify Support
- Dashboard: https://app.netlify.com/sites/vocal-pony-24e3de
- Support: https://www.netlify.com/support/
- Status Page: https://www.netlifystatus.com/

### Supabase Support
- Dashboard: https://supabase.com/dashboard/project/tdmzayzkqyegvfgxlolj
- Status: https://status.supabase.com/
- Docs: https://supabase.com/docs

### Critical File Locations
- Deployment config: `netlify.toml`
- Environment vars: `.env.production`
- Admin panel: `static/admin/`
- Database functions: `netlify/functions/`
- Backup scripts: `scripts/backup.sh`

## Quick Recovery Commands

### One-Line Site Recovery
```bash
git reset --hard stable-$(git tag --sort=-creatordate | head -1) && git push --force-with-lease origin main && netlify deploy --prod --build
```

### One-Line Environment Recovery
```bash
netlify env:import env_backup_$(ls -t env_backup_*.txt | head -1) && netlify deploy --prod
```

### One-Line Database Recovery
```bash
psql "postgresql://[CONNECTION_STRING]" < $(ls -t backup_*.sql | head -1)
```

---

**Remember**: Always test rollback procedures in a staging environment first. Keep recent backups and document any custom recovery procedures specific to your use case.