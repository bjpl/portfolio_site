# ES Modules Compatibility Notes

## Overview
The project has been configured to use ES modules by adding `"type": "module"` to package.json. This enables the use of modern JavaScript import/export syntax and fixes compatibility issues with tools like claude-flow.

## Current Status
- ✅ **package.json**: Updated with `"type": "module"`
- ✅ **Clean script**: Updated to use `--input-type=module` flag
- ✅ **Hugo build**: Works correctly with ES modules configuration
- ✅ **claude-flow commands**: Now working properly

## CommonJS Files Still in Use
The following files still use CommonJS syntax (require/module.exports) but are working due to Node.js compatibility:

### Root Directory Files
- `content-tool.js` - Content management CLI tool
- `jest.config.js` - Jest testing configuration
- `playwright.config.js` - Playwright testing configuration
- `postcss.config.js` - PostCSS configuration
- `qa-test-suite.js` - QA testing suite
- `test-auth.js` - Authentication testing
- `test-integration.js` - Integration testing
- `test-setup.js` - Test setup configuration
- `vite.config.js` - Vite configuration
- `webpack.config.js` - Webpack configuration

### Backend Files
- All files in `backend/src/` directory use CommonJS
- All files in `supabase/lib/` directory use CommonJS
- Netlify functions use CommonJS
- Migration and script files use CommonJS

## Migration Strategy (Future)
When migrating CommonJS files to ES modules:

1. **Configuration files**: Can remain as CommonJS (.cjs extension) or convert to ES modules
2. **Server files**: Will need careful conversion from `require()` to `import` statements
3. **Netlify functions**: May need special handling due to Netlify's runtime requirements
4. **Scripts**: Can be converted individually or use `--input-type=module` flag

## Compatibility Notes
- Node.js with `"type": "module"` can still run CommonJS files
- Files with `.cjs` extension are treated as CommonJS regardless of package.json type
- Files with `.mjs` extension are always treated as ES modules
- Inline scripts in package.json need `--input-type=module` for ES syntax

## Testing Results
- ✅ Hugo build works correctly
- ✅ Clean script works with ES modules syntax
- ✅ claude-flow hooks and commands work properly
- ✅ CommonJS files renamed to .cjs extension work correctly
- ✅ Content tool accessible via content-tool.cjs
- ✅ Jest and Playwright configurations updated to use .cjs extensions

## Files Renamed for Compatibility
- `content-tool.js` → `content-tool.cjs`
- `jest.config.js` → `jest.config.cjs`  
- `playwright.config.js` → `playwright.config.cjs`
- `scripts/test-runner.js` → `scripts/test-runner.cjs`

## Package.json Script Updates
- Updated all Jest configuration references to use `.cjs` extension
- Updated test runner references to use `.cjs` extension
- Updated content-tool.bat to reference `.cjs` file

## Recommendations
1. Keep current configuration - it provides the best of both worlds
2. New files can use ES module syntax
3. Legacy files can remain as CommonJS until specific need to migrate
4. Consider gradual migration for maintenance benefits in the future