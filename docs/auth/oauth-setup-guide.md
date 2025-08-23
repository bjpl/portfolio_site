# OAuth Provider Setup Guide

This guide explains how to configure OAuth authentication providers with Supabase for your portfolio site.

## Overview

The authentication system supports the following OAuth providers:
- GitHub
- Google
- Discord
- Twitter

## Prerequisites

1. Active Supabase project
2. Domain configured in Supabase Auth settings
3. Environment variables properly set

## Provider Setup Instructions

### GitHub OAuth Setup

#### 1. Create GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in the application details:
   - **Application name**: Your Portfolio Site
   - **Homepage URL**: `https://your-domain.netlify.app`
   - **Authorization callback URL**: `https://your-supabase-project.supabase.co/auth/v1/callback`
4. Click "Register application"
5. Note down your `Client ID` and generate a `Client Secret`

#### 2. Configure in Supabase

1. Go to your Supabase Dashboard
2. Navigate to **Authentication > Providers**
3. Find **GitHub** and click configure
4. Enable GitHub provider
5. Enter your `Client ID` and `Client Secret`
6. Set the redirect URL to: `https://your-domain.netlify.app/auth/callback`

### Google OAuth Setup

#### 1. Create Google OAuth Client

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google+ API
4. Go to **Credentials** > **Create Credentials** > **OAuth client ID**
5. Choose **Web application**
6. Add authorized origins:
   - `https://your-domain.netlify.app`
   - `https://your-supabase-project.supabase.co`
7. Add authorized redirect URIs:
   - `https://your-supabase-project.supabase.co/auth/v1/callback`
8. Note down your `Client ID` and `Client Secret`

#### 2. Configure in Supabase

1. Go to your Supabase Dashboard
2. Navigate to **Authentication > Providers**
3. Find **Google** and click configure
4. Enable Google provider
5. Enter your `Client ID` and `Client Secret`
6. Set the redirect URL to: `https://your-domain.netlify.app/auth/callback`

### Discord OAuth Setup

#### 1. Create Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Enter application name and create
4. Go to **OAuth2** section
5. Add redirect URI: `https://your-supabase-project.supabase.co/auth/v1/callback`
6. Note down your `Client ID` and `Client Secret`

#### 2. Configure in Supabase

1. Go to your Supabase Dashboard
2. Navigate to **Authentication > Providers**
3. Find **Discord** and click configure
4. Enable Discord provider
5. Enter your `Client ID` and `Client Secret`
6. Set the redirect URL to: `https://your-domain.netlify.app/auth/callback`

### Twitter OAuth Setup

#### 1. Create Twitter App

1. Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Create a new project/app
3. Go to app settings
4. Set up OAuth 1.0a settings
5. Add callback URL: `https://your-supabase-project.supabase.co/auth/v1/callback`
6. Note down your `API Key` and `API Secret Key`

#### 2. Configure in Supabase

1. Go to your Supabase Dashboard
2. Navigate to **Authentication > Providers**
3. Find **Twitter** and click configure
4. Enable Twitter provider
5. Enter your `API Key` and `API Secret Key`
6. Set the redirect URL to: `https://your-domain.netlify.app/auth/callback`

## Environment Variables

Add the following environment variables to your Netlify site:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key

# Site Configuration
URL=https://your-domain.netlify.app
SITE_URL=https://your-domain.netlify.app
```

## Callback URL Handling

### Frontend Callback Handler

Create a callback page at `/auth/callback` to handle OAuth returns:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Authentication</title>
</head>
<body>
    <div id="auth-callback">
        <p>Processing authentication...</p>
    </div>

    <script src="/js/auth/supabase-auth.js"></script>
    <script>
        (async function() {
            const urlParams = new URLSearchParams(window.location.search);
            const code = urlParams.get('code');
            const state = urlParams.get('state');
            const error = urlParams.get('error');

            try {
                if (error) {
                    throw new Error(`OAuth error: ${error}`);
                }

                if (code) {
                    const result = await supabaseAuth.handleOAuthCallback(code, state);
                    
                    if (result.user) {
                        // Redirect to intended page or dashboard
                        const redirectTo = supabaseAuth.getAuthRedirect() || '/admin';
                        window.location.href = redirectTo;
                    }
                } else {
                    throw new Error('No authorization code received');
                }
            } catch (error) {
                console.error('OAuth callback error:', error);
                
                // Show error message
                document.getElementById('auth-callback').innerHTML = `
                    <div class="error">
                        <h2>Authentication Failed</h2>
                        <p>${error.message}</p>
                        <a href="/login">Try Again</a>
                    </div>
                `;
            }
        })();
    </script>
</body>
</html>
```

### Netlify Function Integration

The Supabase auth function automatically handles OAuth callbacks. The frontend just needs to:

1. Initiate OAuth with `supabaseAuth.signInWithOAuth('provider')`
2. Handle the callback on your callback page
3. Process the result with `supabaseAuth.handleOAuthCallback()`

## Profile Sync on Login

When users sign in via OAuth, their profile information is automatically synced:

```javascript
// Profile data available after OAuth login
{
  id: "user-uuid",
  email: "user@example.com",
  user_metadata: {
    name: "User Name",
    avatar_url: "https://avatar-url.com",
    provider: "github", // or google, discord, twitter
    provider_id: "123456789",
    // Provider-specific data
    full_name: "Full Name",
    picture: "https://picture-url.com"
  },
  app_metadata: {
    provider: "github",
    providers: ["github"],
    role: "user"
  }
}
```

## Security Considerations

### CORS Configuration

Ensure your Supabase project allows your domain:

1. Go to **Settings > API**
2. Add your domain to **CORS origins**:
   - `https://your-domain.netlify.app`
   - `http://localhost:3000` (for development)

### Rate Limiting

OAuth endpoints are automatically rate-limited:
- 5 requests per 15 minutes per IP for sensitive operations
- 100 requests per minute for general operations

### State Parameter

The OAuth flow uses state parameters to prevent CSRF attacks. This is handled automatically by the authentication system.

## Testing OAuth Integration

### Development Testing

1. Set up OAuth apps with localhost URLs
2. Update callback URLs to include development domains
3. Test each provider individually

### Production Testing

1. Verify all OAuth apps have production URLs
2. Test authentication flow end-to-end
3. Verify profile data synchronization
4. Test logout and cleanup

## Troubleshooting

### Common Issues

#### "Invalid Redirect URI"
- Verify callback URL matches exactly in provider settings
- Check for trailing slashes
- Ensure HTTPS in production

#### "Client ID not found"
- Double-check client ID and secret in Supabase
- Verify environment variables are set correctly

#### "Access Denied"
- User cancelled OAuth flow
- Application may be in development mode (Twitter/Discord)

#### "State Mismatch"
- CSRF protection triggered
- Clear browser cache and try again

### Debug Mode

Enable debug logging by setting:

```javascript
// Add to your auth initialization
window.supabaseAuth = new SupabaseAuth({
  debug: true
});
```

## Provider-Specific Notes

### GitHub
- Provides username, avatar, and public profile data
- Requires 'user:email' scope for email access

### Google
- Provides comprehensive profile information
- Respects Google account privacy settings

### Discord
- Provides username, discriminator, and avatar
- Limited profile information compared to other providers

### Twitter
- Profile data depends on account privacy settings
- May not provide email address

## Migration from Other Auth Systems

If migrating from another authentication system:

1. Export user data from current system
2. Create users in Supabase with matching UUIDs
3. Update user metadata with OAuth provider information
4. Test OAuth linking for existing users

## Advanced Configuration

### Custom Scopes

Request additional OAuth scopes by configuring provider settings:

```javascript
// Example: Request additional GitHub permissions
await supabaseAuth.signInWithOAuth('github', {
  scopes: 'user:email read:user'
});
```

### Provider-Specific Data

Access provider-specific data from user metadata:

```javascript
const user = supabaseAuth.currentUser;
const githubUsername = user.user_metadata?.user_name;
const googlePicture = user.user_metadata?.picture;
```

## Support

For additional help:
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Provider-specific documentation](https://supabase.com/docs/guides/auth/social-login)
- [Community Support](https://github.com/supabase/supabase/discussions)