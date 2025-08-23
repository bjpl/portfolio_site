# Scripts Directory

This directory contains reusable utility scripts for the portfolio site.

## Available Scripts

### Database and Setup Scripts

- **`init-db.sql`** - Database initialization script for setting up initial schema
- **`setup-production.js`** - Production environment setup and validation
- **`setup-production-demo.js`** - Demo production environment for testing

### Testing and Validation Scripts

- **`test-runner.js`** - Comprehensive test runner for all test suites
- **`test-api-production.js`** - API endpoint testing for production environment
- **`test-universal-config.js`** - Configuration validation across environments
- **`verify-netlify-functions.js`** - Netlify Functions deployment verification

### Backup and Maintenance Scripts

- **`backup.sh`** - Database and content backup utility script

### Documentation Files

- **`deploy-check.md`** - Deployment checklist and verification steps

## Usage

### Running Scripts

```bash
# Node.js scripts
node scripts/script-name.js

# Shell scripts  
bash scripts/script-name.sh
```

### Common Workflows

1. **Initial Setup**: `node scripts/setup-production.js`
2. **Testing**: `node scripts/test-runner.js`
3. **Backup**: `bash scripts/backup.sh`
4. **Verification**: `node scripts/verify-netlify-functions.js`

## Script Maintenance

- Keep scripts focused on single responsibilities
- Add proper error handling and logging
- Include usage documentation in script headers
- Remove one-time deployment scripts after use
- Test scripts in isolated environments before production use

## Notes

- All scripts should be environment-agnostic where possible
- Use relative paths and avoid hardcoded values
- Include appropriate exit codes for CI/CD integration