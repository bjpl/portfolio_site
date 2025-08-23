/**
 * Realtime Features Initialization
 * Central initialization and configuration for all realtime features
 */

import { realtimeSubscriptions } from './subscriptions.js';
import { wsManager } from './websocket-manager.js';
import { uiUpdates } from './ui-updates.js';

class RealtimeManager {
  constructor() {
    this.isInitialized = false;
    this.config = {
      // Default configuration
      supabase: {
        url: null,
        anonKey: null
      },
      features: {
        comments: true,
        blogPosts: true,
        contactForms: true,
        presence: true,
        analytics: true
      },
      ui: {
        notifications: true,
        counters: true,
        presence: true,
        activityFeed: true
      },
      reconnection: {
        maxAttempts: 5,
        baseDelay: 1000,
        maxDelay: 30000
      }
    };
  }

  /**
   * Initialize all realtime features
   */
  async init(userConfig = {}) {
    if (this.isInitialized) {
      console.warn('Realtime manager already initialized');
      return;
    }

    try {
      // Merge user configuration
      this.config = this.mergeConfig(this.config, userConfig);

      console.log('Initializing realtime features with config:', this.config);

      // Initialize components in order
      await this.initializeUI();
      await this.initializeWebSocketManager();
      await this.initializeSubscriptions();
      await this.setupGlobalEventHandlers();
      await this.setupAuthIntegration();

      this.isInitialized = true;
      
      // Dispatch initialization complete event
      window.dispatchEvent(new CustomEvent('realtime:initialized', {
        detail: { config: this.config }
      }));

      console.log('Realtime features initialized successfully');
      
      // Show success notification
      if (this.config.ui.notifications) {
        uiUpdates.showNotification({
          type: 'success',
          title: 'Live Features Enabled',
          message: 'Real-time updates are now active',
          duration: 3000
        });
      }

    } catch (error) {
      console.error('Failed to initialize realtime features:', error);
      
      // Show error notification
      uiUpdates.showNotification({
        type: 'error',
        title: 'Connection Failed',
        message: 'Some live features may not work properly',
        duration: 5000
      });
      
      throw error;
    }
  }

  /**
   * Initialize UI components
   */
  async initializeUI() {
    if (!this.config.ui.notifications) return;

    // UI is auto-initialized in ui-updates.js
    console.log('UI components initialized');
  }

  /**
   * Initialize WebSocket manager
   */
  async initializeWebSocketManager() {
    // WebSocket manager is auto-initialized
    console.log('WebSocket manager initialized');
  }

  /**
   * Initialize realtime subscriptions
   */
  async initializeSubscriptions() {
    if (!realtimeSubscriptions.isInitialized) {
      await realtimeSubscriptions.init();
    }
  }

  /**
   * Setup global event handlers
   */
  async setupGlobalEventHandlers() {
    // Network status monitoring
    window.addEventListener('online', () => {
      this.handleNetworkOnline();
    });

    window.addEventListener('offline', () => {
      this.handleNetworkOffline();
    });

    // Page visibility changes
    document.addEventListener('visibilitychange', () => {
      this.handleVisibilityChange();
    });

    // Custom realtime events
    this.setupCustomEventHandlers();

    console.log('Global event handlers setup complete');
  }

  /**
   * Setup custom event handlers
   */
  setupCustomEventHandlers() {
    // Connection status events
    window.addEventListener('ws:connection:open', (e) => {
      this.handleConnectionOpen(e.detail);
    });

    window.addEventListener('ws:connection:close', (e) => {
      this.handleConnectionClose(e.detail);
    });

    window.addEventListener('ws:connection:error', (e) => {
      this.handleConnectionError(e.detail);
    });

    // Realtime data events
    window.addEventListener('realtime:newComment', (e) => {
      this.handleNewComment(e.detail);
    });

    window.addEventListener('realtime:newContactForm', (e) => {
      this.handleNewContactForm(e.detail);
    });

    window.addEventListener('realtime:presenceSync', (e) => {
      this.handlePresenceSync(e.detail);
    });
  }

  /**
   * Setup authentication integration
   */
  async setupAuthIntegration() {
    // Check if auth manager exists
    if (window.authManager) {
      // Listen for auth state changes
      window.authManager.onAuthStateChange = (user) => {
        this.handleAuthStateChange(user);
      };

      // Get current user
      const currentUser = window.authManager.getCurrentUser();
      if (currentUser) {
        this.handleAuthStateChange(currentUser);
      }
    }

    // Listen for auth events
    window.addEventListener('auth:login', (e) => {
      this.handleAuthLogin(e.detail);
    });

    window.addEventListener('auth:logout', (e) => {
      this.handleAuthLogout();
    });

    console.log('Authentication integration setup complete');
  }

  /**
   * Handle network coming online
   */
  handleNetworkOnline() {
    console.log('Network is online, attempting to reconnect...');
    
    if (this.config.ui.notifications) {
      uiUpdates.showNotification({
        type: 'success',
        title: 'Connection Restored',
        message: 'Network connection restored, reconnecting...',
        duration: 3000
      });
    }

    // Attempt to reconnect subscriptions
    setTimeout(() => {
      realtimeSubscriptions.reconnect();
    }, 1000);
  }

  /**
   * Handle network going offline
   */
  handleNetworkOffline() {
    console.log('Network is offline');
    
    if (this.config.ui.notifications) {
      uiUpdates.showNotification({
        type: 'warning',
        title: 'Connection Lost',
        message: 'Network connection lost. Will reconnect automatically.',
        duration: 5000
      });
    }
  }

  /**
   * Handle page visibility changes
   */
  handleVisibilityChange() {
    if (document.visibilityState === 'visible') {
      console.log('Page visible, checking connections...');
      this.checkAndReconnect();
    } else {
      console.log('Page hidden, reducing activity...');
    }
  }

  /**
   * Handle WebSocket connection open
   */
  handleConnectionOpen(detail) {
    console.log('WebSocket connection opened:', detail);
    
    if (this.config.ui.notifications) {
      uiUpdates.showConnectionStatus('connected');
    }
  }

  /**
   * Handle WebSocket connection close
   */
  handleConnectionClose(detail) {
    console.log('WebSocket connection closed:', detail);
    
    if (this.config.ui.notifications) {
      uiUpdates.showConnectionStatus('disconnected');
    }
  }

  /**
   * Handle WebSocket connection error
   */
  handleConnectionError(detail) {
    console.error('WebSocket connection error:', detail);
    
    if (this.config.ui.notifications) {
      uiUpdates.showNotification({
        type: 'error',
        title: 'Connection Error',
        message: 'Connection error occurred. Attempting to reconnect...',
        duration: 5000
      });
    }
  }

  /**
   * Handle new comment
   */
  handleNewComment(detail) {
    console.log('New comment received:', detail);
    
    // Dispatch to analytics
    this.trackEvent('comment_received', {
      post_id: detail.comment.post_id,
      author: detail.comment.author_name
    });
  }

  /**
   * Handle new contact form
   */
  handleNewContactForm(detail) {
    console.log('New contact form received:', detail);
    
    // Dispatch to analytics
    this.trackEvent('contact_form_received', {
      name: detail.submission.name,
      subject: detail.submission.subject
    });
  }

  /**
   * Handle presence sync
   */
  handlePresenceSync(detail) {
    console.log('Presence sync:', detail);
    
    // Track user presence
    this.trackEvent('presence_sync', {
      active_users: detail.activeUsers
    });
  }

  /**
   * Handle authentication state change
   */
  handleAuthStateChange(user) {
    console.log('Auth state changed:', user);
    
    if (user) {
      // User logged in, update presence
      this.updateUserPresence(user);
      
      // Enable admin features if admin user
      if (this.isAdminUser(user)) {
        this.enableAdminFeatures();
      }
    } else {
      // User logged out, clean up
      this.cleanupUserSession();
    }
  }

  /**
   * Handle user login
   */
  handleAuthLogin(user) {
    console.log('User logged in:', user);
    
    if (this.config.ui.notifications) {
      uiUpdates.showNotification({
        type: 'success',
        title: 'Welcome Back',
        message: `Hello ${user.name || user.email}! Live features are active.`,
        duration: 4000
      });
    }

    // Reconnect with user context
    this.reconnectWithUser(user);
  }

  /**
   * Handle user logout
   */
  handleAuthLogout() {
    console.log('User logged out');
    
    if (this.config.ui.notifications) {
      uiUpdates.showNotification({
        type: 'info',
        title: 'Logged Out',
        message: 'You have been logged out. Some features may be limited.',
        duration: 3000
      });
    }

    // Switch to anonymous mode
    this.switchToAnonymousMode();
  }

  /**
   * Update user presence
   */
  updateUserPresence(user) {
    // This would update the user's presence in the realtime system
    const presenceData = {
      user_id: user.id || user.email,
      name: user.name,
      avatar: user.avatar_url,
      page: window.location.pathname,
      online_at: new Date().toISOString()
    };

    // Update presence via subscriptions
    window.dispatchEvent(new CustomEvent('presence:update', {
      detail: presenceData
    }));
  }

  /**
   * Check if user is admin
   */
  isAdminUser(user) {
    return user && (
      user.role === 'admin' || 
      user.email === 'admin@example.com' ||
      user.permissions?.includes('admin')
    );
  }

  /**
   * Enable admin features
   */
  enableAdminFeatures() {
    console.log('Enabling admin features...');
    
    // Enable admin-specific subscriptions
    this.config.features.contactForms = true;
    this.config.features.analytics = true;
    
    // Show admin notification
    if (this.config.ui.notifications) {
      uiUpdates.showNotification({
        type: 'info',
        title: 'Admin Mode Active',
        message: 'Admin features have been enabled.',
        duration: 3000
      });
    }
  }

  /**
   * Clean up user session
   */
  cleanupUserSession() {
    // Clean up any user-specific subscriptions or data
    console.log('Cleaning up user session...');
  }

  /**
   * Reconnect with user context
   */
  async reconnectWithUser(user) {
    try {
      await realtimeSubscriptions.reconnect();
      this.updateUserPresence(user);
    } catch (error) {
      console.error('Failed to reconnect with user context:', error);
    }
  }

  /**
   * Switch to anonymous mode
   */
  switchToAnonymousMode() {
    // Disable admin features
    this.config.features.contactForms = false;
    this.config.features.analytics = false;
    
    // Update presence as anonymous
    this.updateUserPresence({ id: 'anonymous', name: 'Anonymous' });
  }

  /**
   * Check connections and reconnect if needed
   */
  async checkAndReconnect() {
    if (!this.isInitialized) return;

    try {
      const status = realtimeSubscriptions.getSubscriptionStatus();
      const hasDisconnectedChannels = Object.values(status).some(
        state => state === 'closed' || state === 'error'
      );

      if (hasDisconnectedChannels) {
        console.log('Found disconnected channels, reconnecting...');
        await realtimeSubscriptions.reconnect();
      }
    } catch (error) {
      console.error('Error checking connections:', error);
    }
  }

  /**
   * Track analytics events
   */
  trackEvent(eventName, data = {}) {
    // This would integrate with your analytics system
    console.log('Tracking event:', eventName, data);
    
    // Dispatch custom event for analytics
    window.dispatchEvent(new CustomEvent('analytics:track', {
      detail: { event: eventName, data }
    }));
  }

  /**
   * Merge configuration objects
   */
  mergeConfig(defaultConfig, userConfig) {
    const merged = { ...defaultConfig };
    
    for (const key in userConfig) {
      if (typeof userConfig[key] === 'object' && !Array.isArray(userConfig[key])) {
        merged[key] = { ...defaultConfig[key], ...userConfig[key] };
      } else {
        merged[key] = userConfig[key];
      }
    }
    
    return merged;
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig) {
    this.config = this.mergeConfig(this.config, newConfig);
    
    // Dispatch config updated event
    window.dispatchEvent(new CustomEvent('realtime:config-updated', {
      detail: { config: this.config }
    }));
  }

  /**
   * Get connection status
   */
  getConnectionStatus() {
    if (!this.isInitialized) return 'not-initialized';
    
    return realtimeSubscriptions.isInitialized ? 'connected' : 'disconnected';
  }

  /**
   * Get subscription status
   */
  getSubscriptionStatus() {
    if (!this.isInitialized) return {};
    
    return realtimeSubscriptions.getSubscriptionStatus();
  }

  /**
   * Get WebSocket manager status
   */
  getWebSocketStatus() {
    return wsManager.getAllConnectionStatuses();
  }

  /**
   * Shutdown all realtime features
   */
  async shutdown() {
    console.log('Shutting down realtime features...');
    
    try {
      // Unsubscribe from all channels
      await realtimeSubscriptions.unsubscribeAll();
      
      // Close WebSocket connections
      wsManager.cleanupConnections();
      
      // Clear UI
      uiUpdates.cleanup();
      
      this.isInitialized = false;
      
      // Dispatch shutdown event
      window.dispatchEvent(new CustomEvent('realtime:shutdown'));
      
      console.log('Realtime features shut down successfully');
      
    } catch (error) {
      console.error('Error during shutdown:', error);
    }
  }

  /**
   * Restart realtime features
   */
  async restart(newConfig = {}) {
    await this.shutdown();
    await this.init(newConfig);
  }
}

// Create singleton instance
export const realtimeManager = new RealtimeManager();

// Auto-initialize on DOM ready if not in admin dashboard
document.addEventListener('DOMContentLoaded', () => {
  // Don't auto-initialize in admin dashboard
  if (window.location.pathname.includes('/admin/')) {
    console.log('Admin dashboard detected, skipping auto-initialization');
    return;
  }

  // Auto-initialize with default config
  realtimeManager.init().catch(error => {
    console.error('Auto-initialization failed:', error);
  });
});

// Global access
window.realtimeManager = realtimeManager;

// Export for ES modules
export default realtimeManager;