# Client Configuration Files

## Overview
This directory contains browser-safe configuration files that work in all client-side contexts.

## Files

### client-config.js
- **Primary configuration file** - ALWAYS loads first
- Contains hardcoded Supabase credentials for browsers
- Provides immediate configuration availability
- Creates multiple compatibility layers:
  - `window.CLIENT_CONFIG` - Primary configuration object
  - `window.SUPABASE_CONFIG` - Legacy compatibility
  - `window.ENV` - Environment variable simulation

### Loading Order (CRITICAL)
1. **client-config.js** - Must load FIRST before any other configuration
2. Other legacy configuration files (supabase-config.js, etc.)
3. API and authentication scripts

## Browser Compatibility
- Works in all modern browsers
- No dependency on Node.js process.env
- No dependency on build tools or bundlers
- Immediately available on window object

## Usage in HTML
```html
<!-- MUST be first script tag in <head> -->
<script src="/js/config/client-config.js"></script>

<!-- Then other scripts can safely use configuration -->
<script src="/js/api/config.js"></script>
<script src="/js/auth/client-auth.js"></script>
```

## Configuration Access
```javascript
// Primary access method (recommended)
const config = window.CLIENT_CONFIG;

// Legacy compatibility access
const supabase = window.SUPABASE_CONFIG;
const env = window.ENV;

// Direct access to specific values
const url = window.CLIENT_CONFIG.SUPABASE_URL;
const key = window.CLIENT_CONFIG.SUPABASE_ANON_KEY;
```

## Environment Detection
The configuration automatically detects:
- Development vs Production environment
- Localhost vs deployed environment  
- Feature flags based on environment

## Security Notes
- Supabase anonymous key is safe to expose in client-side code
- URL and key are the same values used in environment files
- No sensitive server-side credentials are included