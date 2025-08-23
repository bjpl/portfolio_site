const crypto = require('crypto');
const axios = require('axios');
const config = require('../../config');
const { User } = require('../../models/User');
const OAuthProvider = require('../models/OAuthProvider');
const TokenService = require('./TokenService');

class OAuthService {
  constructor() {
    this.providers = {
      github: {
        clientId: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        authUrl: 'https://github.com/login/oauth/authorize',
        tokenUrl: 'https://github.com/login/oauth/access_token',
        userUrl: 'https://api.github.com/user',
        emailUrl: 'https://api.github.com/user/emails',
        scopes: ['user:email', 'read:user']
      },
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        userUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
        scopes: ['openid', 'email', 'profile']
      }
    };
  }

  /**
   * Generate OAuth authorization URL
   */
  getAuthorizationUrl(provider, redirectUri, state = null) {
    const providerConfig = this.providers[provider];
    if (!providerConfig) {
      throw new Error(`Unsupported OAuth provider: ${provider}`);
    }

    const authState = state || crypto.randomBytes(32).toString('hex');
    const params = new URLSearchParams({
      client_id: providerConfig.clientId,
      redirect_uri: redirectUri,
      scope: providerConfig.scopes.join(' '),
      state: authState,
      response_type: 'code'
    });

    // Provider-specific parameters
    if (provider === 'google') {
      params.append('access_type', 'offline');
      params.append('prompt', 'consent');
    }

    return {
      url: `${providerConfig.authUrl}?${params.toString()}`,
      state: authState
    };
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(provider, code, redirectUri) {
    const providerConfig = this.providers[provider];
    if (!providerConfig) {
      throw new Error(`Unsupported OAuth provider: ${provider}`);
    }

    try {
      const response = await axios.post(providerConfig.tokenUrl, {
        client_id: providerConfig.clientId,
        client_secret: providerConfig.clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      }, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return response.data;
    } catch (error) {
      throw new Error(`Failed to exchange code for tokens: ${error.response?.data?.error_description || error.message}`);
    }
  }

  /**
   * Get user profile from OAuth provider
   */
  async getUserProfile(provider, accessToken) {
    const providerConfig = this.providers[provider];
    if (!providerConfig) {
      throw new Error(`Unsupported OAuth provider: ${provider}`);
    }

    try {
      const headers = {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'Portfolio-Auth/1.0'
      };

      // Get user profile
      const userResponse = await axios.get(providerConfig.userUrl, { headers });
      let userData = userResponse.data;

      // GitHub specific: get primary email if not in profile
      if (provider === 'github' && !userData.email) {
        const emailResponse = await axios.get(providerConfig.emailUrl, { headers });
        const primaryEmail = emailResponse.data.find(email => email.primary && email.verified);
        userData.email = primaryEmail?.email;
      }

      return this.normalizeUserProfile(provider, userData);
    } catch (error) {
      throw new Error(`Failed to get user profile: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Normalize user profile across providers
   */
  normalizeUserProfile(provider, rawProfile) {
    const baseProfile = {
      providerId: String(rawProfile.id),
      email: rawProfile.email,
      displayName: rawProfile.name || rawProfile.login,
      avatar: rawProfile.avatar_url || rawProfile.picture,
      profileData: rawProfile
    };

    switch (provider) {
      case 'github':
        return {
          ...baseProfile,
          username: rawProfile.login,
          bio: rawProfile.bio,
          website: rawProfile.blog,
          location: rawProfile.location
        };
      
      case 'google':
        return {
          ...baseProfile,
          firstName: rawProfile.given_name,
          lastName: rawProfile.family_name,
          locale: rawProfile.locale,
          emailVerified: rawProfile.verified_email
        };
      
      default:
        return baseProfile;
    }
  }

  /**
   * Handle OAuth login/register flow
   */
  async handleOAuthCallback(provider, code, redirectUri, deviceInfo = {}) {
    try {
      // Exchange code for tokens
      const tokens = await this.exchangeCodeForTokens(provider, code, redirectUri);
      
      // Get user profile
      const profile = await this.getUserProfile(provider, tokens.access_token);
      
      // Check if provider is already linked
      const existingProvider = await OAuthProvider.findByProvider(provider, profile.providerId);
      
      if (existingProvider) {
        // Update existing provider tokens
        await existingProvider.updateTokens(
          tokens.access_token,
          tokens.refresh_token,
          tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null
        );

        const user = existingProvider.user;
        if (!user.isActive) {
          throw new Error('Account is deactivated');
        }

        // Generate auth tokens
        const accessToken = TokenService.generateAccessToken({
          id: user.id,
          email: user.email,
          role: user.role,
          username: user.username
        });

        const refreshToken = await TokenService.generateRefreshToken(user.id, {
          ...deviceInfo,
          loginMethod: 'oauth',
          provider
        });

        return {
          user: user.toJSON(),
          accessToken,
          refreshToken: refreshToken.token,
          isNewUser: false
        };
      }

      // Check if user exists by email
      let user = null;
      if (profile.email) {
        user = await User.findByEmail(profile.email);
      }

      if (user) {
        // Link OAuth provider to existing user
        await OAuthProvider.linkProvider(user.id, {
          provider,
          providerId: profile.providerId,
          email: profile.email,
          displayName: profile.displayName,
          avatar: profile.avatar,
          profileData: profile.profileData,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          tokenExpiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null
        });

        // Generate auth tokens
        const accessToken = TokenService.generateAccessToken({
          id: user.id,
          email: user.email,
          role: user.role,
          username: user.username
        });

        const refreshToken = await TokenService.generateRefreshToken(user.id, {
          ...deviceInfo,
          loginMethod: 'oauth',
          provider
        });

        return {
          user: user.toJSON(),
          accessToken,
          refreshToken: refreshToken.token,
          isNewUser: false,
          linkedProvider: true
        };
      }

      // Create new user
      if (!profile.email) {
        throw new Error('Email is required for registration');
      }

      // Generate username from profile
      let username = profile.username || 
                    profile.displayName?.toLowerCase().replace(/\s+/g, '_') ||
                    profile.email.split('@')[0];
      
      // Ensure username is unique
      let uniqueUsername = username;
      let counter = 1;
      while (await User.findByUsername(uniqueUsername)) {
        uniqueUsername = `${username}_${counter}`;
        counter++;
      }

      // Create user
      user = await User.create({
        username: uniqueUsername,
        email: profile.email,
        password: crypto.randomBytes(32).toString('hex'), // Random password for OAuth users
        firstName: profile.firstName || profile.displayName?.split(' ')[0] || '',
        lastName: profile.lastName || profile.displayName?.split(' ').slice(1).join(' ') || '',
        avatar: profile.avatar,
        bio: profile.bio,
        website: profile.website,
        isEmailVerified: profile.emailVerified || false,
        role: 'viewer'
      });

      // Link OAuth provider
      await OAuthProvider.linkProvider(user.id, {
        provider,
        providerId: profile.providerId,
        email: profile.email,
        displayName: profile.displayName,
        avatar: profile.avatar,
        profileData: profile.profileData,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null
      });

      // Generate auth tokens
      const accessToken = TokenService.generateAccessToken({
        id: user.id,
        email: user.email,
        role: user.role,
        username: user.username
      });

      const refreshToken = await TokenService.generateRefreshToken(user.id, {
        ...deviceInfo,
        loginMethod: 'oauth',
        provider,
        isNewUser: true
      });

      return {
        user: user.toJSON(),
        accessToken,
        refreshToken: refreshToken.token,
        isNewUser: true
      };

    } catch (error) {
      throw new Error(`OAuth callback failed: ${error.message}`);
    }
  }

  /**
   * Link OAuth provider to existing user
   */
  async linkProvider(userId, provider, code, redirectUri) {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Check if provider is already linked
      const existing = await OAuthProvider.findOne({
        where: { userId, provider }
      });

      if (existing) {
        throw new Error('Provider already linked to this account');
      }

      // Exchange code for tokens
      const tokens = await this.exchangeCodeForTokens(provider, code, redirectUri);
      
      // Get user profile
      const profile = await this.getUserProfile(provider, tokens.access_token);

      // Check if this OAuth account is already linked to another user
      const existingProvider = await OAuthProvider.findByProvider(provider, profile.providerId);
      if (existingProvider) {
        throw new Error('This OAuth account is already linked to another user');
      }

      // Link provider
      await OAuthProvider.linkProvider(userId, {
        provider,
        providerId: profile.providerId,
        email: profile.email,
        displayName: profile.displayName,
        avatar: profile.avatar,
        profileData: profile.profileData,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null
      });

      return {
        success: true,
        message: 'OAuth provider linked successfully',
        provider: {
          provider,
          displayName: profile.displayName,
          email: profile.email
        }
      };

    } catch (error) {
      throw new Error(`Failed to link OAuth provider: ${error.message}`);
    }
  }

  /**
   * Unlink OAuth provider
   */
  async unlinkProvider(userId, provider) {
    try {
      // Check if user has password or other OAuth providers
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const otherProviders = await OAuthProvider.count({
        where: {
          userId,
          provider: { [OAuthProvider.sequelize.Sequelize.Op.ne]: provider },
          isActive: true
        }
      });

      // If user has no password and this is the only OAuth provider, prevent unlinking
      if (!user.password && otherProviders === 0) {
        throw new Error('Cannot unlink the only authentication method. Please set a password first.');
      }

      return await OAuthProvider.unlinkProvider(userId, provider);
    } catch (error) {
      throw new Error(`Failed to unlink OAuth provider: ${error.message}`);
    }
  }

  /**
   * Get user's connected providers
   */
  async getUserProviders(userId) {
    try {
      return await OAuthProvider.getUserProviders(userId);
    } catch (error) {
      throw new Error(`Failed to get user providers: ${error.message}`);
    }
  }

  /**
   * Refresh OAuth tokens
   */
  async refreshOAuthTokens(userId, provider) {
    try {
      const oauthProvider = await OAuthProvider.findOne({
        where: { userId, provider, isActive: true }
      });

      if (!oauthProvider || !oauthProvider.refreshToken) {
        throw new Error('OAuth provider not found or no refresh token available');
      }

      const providerConfig = this.providers[provider];
      if (!providerConfig) {
        throw new Error(`Unsupported OAuth provider: ${provider}`);
      }

      const response = await axios.post(providerConfig.tokenUrl, {
        client_id: providerConfig.clientId,
        client_secret: providerConfig.clientSecret,
        refresh_token: oauthProvider.refreshToken,
        grant_type: 'refresh_token'
      }, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const tokens = response.data;
      
      await oauthProvider.updateTokens(
        tokens.access_token,
        tokens.refresh_token || oauthProvider.refreshToken, // Keep existing if no new one
        tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null
      );

      return {
        success: true,
        message: 'OAuth tokens refreshed successfully'
      };

    } catch (error) {
      throw new Error(`Failed to refresh OAuth tokens: ${error.message}`);
    }
  }
}

module.exports = new OAuthService();