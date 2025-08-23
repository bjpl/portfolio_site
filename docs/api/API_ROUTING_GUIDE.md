# API Routing Configuration Guide

## Overview
This guide documents the complete API routing configuration for the portfolio site deployed on Netlify at `vocal-pony-24e3de.netlify.app`.

## Production API Endpoints

### Base URL
- **Production**: `https://vocal-pony-24e3de.netlify.app/api`
- **Development**: `http://localhost:1313/api` or `http://localhost:3000/api`

### Available Endpoints

#### 1. Health Check
- **URL**: `GET /api/health`
- **Purpose**: Check API availability and status
- **Authentication**: None required
- **Response**: JSON with health status and timestamp

```bash
curl https://vocal-pony-24e3de.netlify.app/api/health
```

#### 2. Authentication API
- **Base URL**: `/api/auth`
- **Available routes**:
  - `POST /api/auth/login` - User login
  - `POST /api/auth/logout` - User logout
  - `POST /api/auth/refresh` - Refresh access token
  - `GET /api/auth/me` - Get current user info

```bash
# Login example
curl -X POST https://vocal-pony-24e3de.netlify.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"emailOrUsername":"admin","password":"password123"}'
```

#### 3. Contact Form
- **URL**: `POST /api/contact`
- **Purpose**: Handle contact form submissions
- **Authentication**: None required
- **Required fields**: name, email, message

```bash
curl -X POST https://vocal-pony-24e3de.netlify.app/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","message":"Hello!"}'
```

#### 4. Content Management
- **Base URL**: `/api/content`
- **Available routes**:
  - `GET /api/content/projects` - List all projects
  - `GET /api/content/projects/:id` - Get specific project
  - `POST /api/content/projects` - Create new project (auth required)
  - `PUT /api/content/projects/:id` - Update project (auth required)
  - `DELETE /api/content/projects/:id` - Delete project (auth required)
  - `GET /api/content/skills` - List all skills

#### 5. Environment Check
- **URL**: `GET /api/env-check`
- **Purpose**: Validate environment configuration
- **Response**: Complete environment and API status

#### 6. Fallback Handler
- **URL**: `/api/*` (any unmatched route)
- **Purpose**: Graceful error handling for undefined endpoints
- **Response**: Lists available endpoints with suggestions

## Netlify Functions Configuration

### Function Directory Structure
```
netlify/functions/
├── auth.js           # Authentication endpoints
├── contact.js        # Contact form handler
├── content.js        # Content management API
├── env-check.js      # Environment validation
├── fallback.js       # Unmatched route handler
├── health.js         # Health check endpoint
└── package.json      # Dependencies
```

### Deployment Configuration

#### netlify.toml Settings
```toml
[functions]
  directory = "netlify/functions"
  node_bundler = "esbuild"

# API Redirects
[[redirects]]
  from = "/api/health"
  to = "/.netlify/functions/health"
  status = 200
  force = true

[[redirects]]
  from = "/api/auth/*"
  to = "/.netlify/functions/auth"
  status = 200
  force = true

# ... more redirects
```

#### _redirects File
Located at `static/_redirects`:
```
# Health Check
/api/health         /.netlify/functions/health      200

# Authentication API Routes
/api/auth/login     /.netlify/functions/auth        200
/api/auth/logout    /.netlify/functions/auth        200
/api/auth/refresh   /.netlify/functions/auth        200

# ... more routes
```

## CORS Configuration

### Allowed Origins
- `https://vocal-pony-24e3de.netlify.app`
- `https://www.vocal-pony-24e3de.netlify.app`
- Development: `http://localhost:1313`, `http://localhost:3000`, `http://localhost:8888`

### Headers
All endpoints include proper CORS headers:
```javascript
headers: {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Credentials': 'true'
}
```

## Environment Variables

### Build Environment
```bash
HUGO_VERSION=0.121.0
HUGO_ENV=production
NODE_VERSION=18
VITE_API_URL=/api
VITE_SITE_URL=https://vocal-pony-24e3de.netlify.app
API_BASE_URL=https://vocal-pony-24e3de.netlify.app/api
NETLIFY_FUNCTIONS_URL=https://vocal-pony-24e3de.netlify.app/.netlify/functions
CORS_ORIGIN=https://vocal-pony-24e3de.netlify.app
NODE_ENV=production
```

## API Client Configuration

### Central API Config (JavaScript)
The site uses a centralized API configuration system located in `static/js/api-config-central.js`:

```javascript
// Auto-detects environment and configures endpoints
const api = window.apiConfig;

// Make authenticated requests
const response = await api.makeRequest('/auth/login', {
  method: 'POST',
  body: JSON.stringify({ emailOrUsername, password })
});

// Get endpoint URLs
const healthUrl = api.getURL('/health');
```

## Error Handling

### Standard Error Responses
All endpoints return consistent error responses:
```json
{
  "error": "Error message",
  "statusCode": 400,
  "timestamp": "2025-08-23T10:30:00.000Z"
}
```

### Fallback Behavior
When an API endpoint is not found:
1. Returns 404 with available endpoints list
2. Provides helpful suggestions based on the requested path
3. Lists both implemented and planned endpoints

## Testing API Endpoints

### Health Check Test
```bash
curl -v https://vocal-pony-24e3de.netlify.app/api/health
```

### Authentication Test
```bash
curl -X POST https://vocal-pony-24e3de.netlify.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"emailOrUsername":"admin","password":"password123"}'
```

### Environment Check
```bash
curl https://vocal-pony-24e3de.netlify.app/api/env-check
```

## Security Considerations

### Authentication
- Simple token-based authentication for demo purposes
- Tokens expire after 24 hours
- Production should use proper JWT implementation

### CORS
- Restricted to specific origins in production
- Development allows localhost origins
- Credentials supported for authenticated requests

### Rate Limiting
- Consider implementing rate limiting for production
- Netlify Functions have built-in timeout protection

## Deployment Checklist

- [x] Configure netlify.toml with proper redirects
- [x] Set up _redirects file for routing
- [x] Implement health check endpoint
- [x] Configure CORS for all endpoints
- [x] Set up authentication endpoints
- [x] Create fallback handler for unmatched routes
- [x] Configure environment variables
- [x] Test all API endpoints
- [x] Document API routes and usage
- [x] Verify domain-specific settings

## Troubleshooting

### Common Issues

1. **404 on API calls**: Check _redirects file and netlify.toml configuration
2. **CORS errors**: Verify allowed origins match your domain
3. **Function timeout**: Check function execution time (max 10s on free plan)
4. **Environment variables**: Use env-check endpoint to validate config

### Debug Commands
```bash
# Test function locally
netlify dev

# Check function logs
netlify functions:list
netlify functions:invoke health

# Deploy and test
netlify deploy --prod
```

## Future Enhancements

### Planned API Endpoints
- Portfolio content management
- Media upload handling  
- Advanced authentication (OAuth, 2FA)
- Analytics and tracking
- Search functionality

### Performance Optimizations
- Implement caching strategies
- Add request/response compression
- Optimize function cold starts
- Add CDN configuration

---

**Last Updated**: August 23, 2025  
**Version**: 2.0.0  
**Domain**: vocal-pony-24e3de.netlify.app