const crypto = require('crypto');
const fetch = require('node-fetch');
const config = require('../config');
const { User } = require('../models/User');
const authService = require('./authService');
const logger = require('../utils/logger');

class OAuthService {
  constructor() {
    this.providers = {
      google: {
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
        scope: 'openid email profile'
      },
      github: {
        authUrl: 'https://github.com/login/oauth/authorize',
        tokenUrl: 'https://github.com/login/oauth/access_token',
        userInfoUrl: 'https://api.github.com/user',
        scope: 'user:email'
      },
      microsoft: {
        authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
        tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
        scope: 'openid email profile'
      }
    };
  }

  /**
   * Generate OAuth authorization URL
   */
  generateAuthUrl(provider, redirectUri, state = null) {
    if (!this.providers[provider]) {
      throw new Error(`Unsupported OAuth provider: ${provider}`);
    }

    const providerConfig = this.providers[provider];
    const clientId = config.oauth[provider]?.clientId;
    
    if (!clientId) {
      throw new Error(`OAuth not configured for provider: ${provider}`);
    }

    // Generate state for CSRF protection
    const oauthState = state || crypto.randomBytes(32).toString('hex');
    
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: providerConfig.scope,
      state: oauthState
    });

    // Provider-specific parameters
    if (provider === 'microsoft') {
      params.append('response_mode', 'query');
    }

    const authUrl = `${providerConfig.authUrl}?${params.toString()}`;
    
    logger.audit('oauth_auth_url_generated', null, {
      provider,
      state: oauthState,
      redirectUri
    });

    return {
      authUrl,
      state: oauthState
    };
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(provider, code, redirectUri) {
    if (!this.providers[provider]) {
      throw new Error(`Unsupported OAuth provider: ${provider}`);
    }

    const providerConfig = this.providers[provider];
    const clientId = config.oauth[provider]?.clientId;
    const clientSecret = config.oauth[provider]?.clientSecret;
    
    if (!clientId || !clientSecret) {
      throw new Error(`OAuth not configured for provider: ${provider}`);
    }

    const tokenData = {
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri
    };

    // Provider-specific token request format
    let headers = { 'Accept': 'application/json' };
    let body;

    if (provider === 'github') {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(tokenData);
    } else {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      tokenData.grant_type = 'authorization_code';
      body = new URLSearchParams(tokenData).toString();
    }

    try {
      const response = await fetch(providerConfig.tokenUrl, {
        method: 'POST',
        headers,
        body
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Token exchange failed: ${errorData}`);
      }

      const tokenResponse = await response.json();
      
      logger.audit('oauth_token_exchange', null, {
        provider,
        success: true
      });

      return tokenResponse;
    } catch (error) {
      logger.error('OAuth token exchange failed', {
        provider,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get user information from OAuth provider
   */
  async getUserInfo(provider, accessToken) {
    if (!this.providers[provider]) {
      throw new Error(`Unsupported OAuth provider: ${provider}`);
    }

    const providerConfig = this.providers[provider];
    
    try {
      let userInfoUrl = providerConfig.userInfoUrl;
      let headers = {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      };

      // GitHub requires User-Agent header
      if (provider === 'github') {
        headers['User-Agent'] = 'Portfolio-Auth-App';
      }

      const response = await fetch(userInfoUrl, { headers });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch user info: ${response.statusText}`);
      }

      const userData = await response.json();
      
      // Normalize user data across providers
      const normalizedUser = this.normalizeUserData(provider, userData);
      
      // For GitHub, we need to fetch email separately if not public
      if (provider === 'github' && !normalizedUser.email) {
        normalizedUser.email = await this.getGitHubUserEmail(accessToken);
      }

      logger.audit('oauth_user_info_fetched', null, {
        provider,
        userId: normalizedUser.id,
        email: normalizedUser.email
      });

      return normalizedUser;
    } catch (error) {
      logger.error('OAuth user info fetch failed', {
        provider,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get GitHub user email (may be private)
   */
  async getGitHubUserEmail(accessToken) {
    try {
      const response = await fetch('https://api.github.com/user/emails', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'User-Agent': 'Portfolio-Auth-App'
        }
      });

      if (!response.ok) {
        return null;
      }

      const emails = await response.json();
      const primaryEmail = emails.find(email => email.primary && email.verified);
      
      return primaryEmail ? primaryEmail.email : null;
    } catch (error) {
      logger.error('Failed to fetch GitHub user email', error);
      return null;
    }
  }

  /**
   * Normalize user data from different providers
   */
  normalizeUserData(provider, userData) {
    switch (provider) {
      case 'google':
        return {
          id: userData.id,
          email: userData.email,
          name: userData.name,
          firstName: userData.given_name,
          lastName: userData.family_name,
          picture: userData.picture,
          verified: userData.verified_email
        };
      
      case 'github':
        return {
          id: userData.id.toString(),
          email: userData.email,
          name: userData.name || userData.login,
          firstName: userData.name ? userData.name.split(' ')[0] : userData.login,
          lastName: userData.name ? userData.name.split(' ').slice(1).join(' ') : '',
          picture: userData.avatar_url,
          username: userData.login,
          verified: true // GitHub emails are verified
        };
      
      case 'microsoft':
        return {
          id: userData.id,
          email: userData.mail || userData.userPrincipalName,
          name: userData.displayName,
          firstName: userData.givenName,
          lastName: userData.surname,
          picture: null, // Microsoft Graph photo requires separate call
          verified: true
        };
      
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  /**
   * Handle OAuth login/registration
   */
  async handleOAuthCallback(provider, code, redirectUri, state) {
    try {
      // Exchange code for token
      const tokenResponse = await this.exchangeCodeForToken(provider, code, redirectUri);
      
      // Get user info
      const oauthUser = await this.getUserInfo(provider, tokenResponse.access_token);
      
      if (!oauthUser.email) {
        throw new Error('OAuth provider did not return email address');
      }

      // Find or create user
      let user = await User.findOne({ 
        where: { email: oauthUser.email.toLowerCase() } 
      });

      if (user) {
        // Update OAuth info for existing user
        const oauthData = user.oauthProviders || {};
        oauthData[provider] = {
          id: oauthUser.id,
          email: oauthUser.email,
          name: oauthUser.name,
          picture: oauthUser.picture,
          connectedAt: new Date()
        };

        await user.update({
          oauthProviders: oauthData,
          lastLoginAt: new Date(),
          isEmailVerified: true // OAuth emails are verified
        });

        logger.audit('oauth_login', user.id, {
          provider,
          email: oauthUser.email
        });
      } else {
        // Create new user
        const oauthData = {};
        oauthData[provider] = {
          id: oauthUser.id,
          email: oauthUser.email,
          name: oauthUser.name,
          picture: oauthUser.picture,
          connectedAt: new Date()
        };

        user = await User.create({
          email: oauthUser.email.toLowerCase(),
          firstName: oauthUser.firstName,
          lastName: oauthUser.lastName,
          username: oauthUser.username || oauthUser.email.split('@')[0],
          isEmailVerified: true,
          oauthProviders: oauthData,
          role: 'viewer', // Default role
          registrationMethod: `oauth_${provider}`
        });

        logger.audit('oauth_registration', user.id, {
          provider,
          email: oauthUser.email
        });
      }

      // Generate JWT tokens
      const tokens = authService.generateTokens(user);
      
      return {
        user: authService.sanitizeUser(user),
        ...tokens,
        provider,
        isNewUser: !user.id // If user was just created
      };
    } catch (error) {
      logger.error('OAuth callback handling failed', {
        provider,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Link OAuth account to existing user
   */
  async linkOAuthAccount(userId, provider, code, redirectUri) {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Exchange code for token
      const tokenResponse = await this.exchangeCodeForToken(provider, code, redirectUri);
      
      // Get user info
      const oauthUser = await this.getUserInfo(provider, tokenResponse.access_token);
      
      // Check if this OAuth account is already linked to another user
      const existingUser = await User.findOne({
        where: {
          [`oauthProviders.${provider}.id`]: oauthUser.id
        }
      });

      if (existingUser && existingUser.id !== userId) {
        throw new Error('This OAuth account is already linked to another user');
      }

      // Link OAuth account
      const oauthData = user.oauthProviders || {};
      oauthData[provider] = {
        id: oauthUser.id,
        email: oauthUser.email,
        name: oauthUser.name,
        picture: oauthUser.picture,
        connectedAt: new Date()
      };

      await user.update({ oauthProviders: oauthData });

      logger.audit('oauth_account_linked', userId, {
        provider,
        oauthEmail: oauthUser.email
      });

      return {
        message: `${provider} account linked successfully`,
        provider,
        linkedAccount: {
          email: oauthUser.email,
          name: oauthUser.name
        }
      };
    } catch (error) {
      logger.error('OAuth account linking failed', {
        userId,
        provider,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Unlink OAuth account
   */
  async unlinkOAuthAccount(userId, provider) {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const oauthData = user.oauthProviders || {};
      
      if (!oauthData[provider]) {
        throw new Error(`${provider} account is not linked`);
      }

      // Ensure user has password or other OAuth providers
      const hasPassword = user.password && user.password.length > 0;
      const otherProviders = Object.keys(oauthData).filter(p => p !== provider);
      
      if (!hasPassword && otherProviders.length === 0) {
        throw new Error('Cannot unlink the only authentication method. Please set a password first.');
      }

      delete oauthData[provider];
      await user.update({ oauthProviders: oauthData });

      logger.audit('oauth_account_unlinked', userId, { provider });

      return {
        message: `${provider} account unlinked successfully`,
        provider
      };
    } catch (error) {
      logger.error('OAuth account unlinking failed', {
        userId,
        provider,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get linked OAuth accounts for user
   */
  async getLinkedAccounts(userId) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const oauthProviders = user.oauthProviders || {};
    const linkedAccounts = {};

    for (const [provider, data] of Object.entries(oauthProviders)) {
      linkedAccounts[provider] = {
        email: data.email,
        name: data.name,
        connectedAt: data.connectedAt
      };
    }

    return linkedAccounts;
  }
}

module.exports = new OAuthService();
