# Supabase Admin Authentication Implementation

## Overview

This document describes the implementation of the new Supabase-based admin authentication system using Netlify Edge Functions.

## Implementation Summary

### Files Created/Modified

1. **`/netlify/edge-functions/admin-auth.js`** - New Supabase-based edge function
2. **`/static/admin/login.html`** - Updated to use new endpoint
3. **`/netlify.toml`** - Updated with edge function configuration
4. **`/tests/admin-auth-test.html`** - Test interface for the new auth system

### Key Features

#### 1. Supabase Integration
- **URL**: `https://tdmzayzkqyegvfgxlolj.supabase.co`
- **Service Key**: Configured for admin operations
- **Anonymous Key**: Used for authentication requests

#### 2. Edge Function (`admin-auth.js`)
- **Path**: `/api/admin-auth`
- **Method**: POST
- **CORS**: Properly configured for cross-origin requests
- **Authentication Flow**:
  1. Validates email/password format
  2. Authenticates with Supabase Auth
  3. Verifies admin role
  4. Returns JWT tokens and user info
  5. Logs authentication attempts

#### 3. Enhanced Security
- Input validation and sanitization
- Rate limiting considerations
- Admin role verification
- Comprehensive error handling
- Authentication attempt logging

#### 4. Error Handling
- Specific error messages for different failure scenarios
- Network error detection and guidance
- Configuration validation
- Detailed logging for debugging

### API Endpoint Details

#### Request Format
```json
POST /api/admin-auth
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "your-secure-password"
}
```

#### Success Response
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "...",
  "user": {
    "id": "uuid",
    "email": "admin@example.com",
    "role": "admin"
  },
  "expiresIn": 3600,
  "tokenType": "Bearer",
  "processingTime": "150ms",
  "timestamp": "2025-08-24T..."
}
```

#### Error Response
```json
{
  "success": false,
  "error": "Invalid email or password",
  "timestamp": "2025-08-24T..."
}
```

### Configuration Updates

#### netlify.toml Changes
```toml
# Edge function configuration
[[edge_functions]]
  function = "admin-auth"
  path = "/api/admin-auth"

# Redirect rule
[[redirects]]
  from = "/api/admin-auth"
  to = "/.netlify/edge-functions/admin-auth"
  status = 200
  force = true
  headers = {X-Forwarded-For = ":client_ip"}
```

#### Login Form Updates
- Updated API endpoint from `/api/auth/login` to `/api/admin-auth`
- Enhanced error handling for Supabase-specific responses
- Improved user feedback during authentication

### Testing

#### Test Interface
- **File**: `/tests/admin-auth-test.html`
- **Features**:
  - Interactive login testing
  - Connection testing
  - Detailed response analysis
  - Error diagnosis and suggestions

#### Manual Testing Steps
1. Open `/tests/admin-auth-test.html` in browser
2. Enter valid Supabase user credentials
3. Click "Test Login" to verify authentication
4. Use "Test Connection" to verify endpoint accessibility

### Supabase Configuration Requirements

#### Auth Users Setup
Users must be created in Supabase with:
```sql
-- Create admin user
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at)
VALUES ('admin@example.com', crypt('your-password', gen_salt('bf')), NOW());

-- Or use Supabase Dashboard to create users
```

#### Admin Role Verification
The function checks for admin privileges through:
1. User metadata: `user_metadata.role = 'admin'`
2. App metadata: `app_metadata.role = 'admin'`
3. Profile table: `profiles.role = 'admin'`
4. Email-based detection (for initial setup)

### Environment Variables (Optional)
While the credentials are currently hardcoded for simplicity, you can use environment variables:

```bash
SUPABASE_URL=https://tdmzayzkqyegvfgxlolj.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Deployment

#### Netlify Deployment
1. Commit all changes to your repository
2. Push to your connected Git repository
3. Netlify will automatically deploy the edge function
4. Test the `/api/admin-auth` endpoint

#### Local Development
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Start local development server
netlify dev

# Test locally
curl -X POST http://localhost:8888/api/admin-auth \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"your-password"}'
```

### Troubleshooting

#### Common Issues

1. **401 Unauthorized**
   - Check if user exists in Supabase auth.users
   - Verify email/password combination
   - Ensure email is confirmed

2. **403 Forbidden**
   - User exists but lacks admin privileges
   - Add admin role to user profile or metadata

3. **500 Internal Server Error**
   - Check Supabase credentials
   - Verify Supabase project is active
   - Check edge function logs in Netlify

4. **CORS Errors**
   - Edge function includes proper CORS headers
   - Check browser network tab for details

#### Debugging
- Use `/tests/admin-auth-test.html` for interactive testing
- Check Netlify function logs in dashboard
- Monitor Supabase auth logs
- Use browser developer tools network tab

### Security Considerations

1. **Credentials**: Consider moving to environment variables for production
2. **Rate Limiting**: Implement rate limiting for authentication attempts
3. **Logging**: Ensure sensitive data is not logged
4. **Token Management**: Implement proper token refresh logic
5. **HTTPS**: Always use HTTPS in production

### Next Steps

1. Set up actual admin user in Supabase
2. Test the authentication flow end-to-end
3. Implement token refresh mechanism
4. Add rate limiting and additional security measures
5. Create admin dashboard integration

## Integration with Admin Login Form

The admin login form at `/admin/login.html` now automatically uses the new Supabase-based authentication endpoint. The form will:

1. Send credentials to `/api/admin-auth`
2. Handle Supabase-specific responses
3. Store JWT tokens for session management
4. Redirect to dashboard on successful authentication

This provides a seamless integration with the existing admin interface while leveraging Supabase's robust authentication infrastructure.