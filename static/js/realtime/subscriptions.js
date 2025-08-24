/**
 * Supabase Realtime Subscriptions Manager
 * Handles all realtime subscriptions for the portfolio site
 */

import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js';
import { wsManager } from './websocket-manager.js';
import { uiUpdates } from './ui-updates.js';

class RealtimeSubscriptions {
  constructor() {
    this.supabase = null;
    this.subscriptions = new Map();
    this.isInitialized = false;
    this.retryCount = 0;
    this.maxRetries = 3;
  }

  /**
   * Initialize Supabase client and setup subscriptions
   */
  async init() {
    try {
      const config = await this.getSupabaseConfig();
      this.supabase = createClient(config.url, config.anonKey, {
        realtime: {
          params: {
            eventsPerSecond: 10
          }
        }
      });

      await this.setupSubscriptions();
      this.isInitialized = true;
      console.log('Realtime subscriptions initialized');
    } catch (error) {
      console.error('Failed to initialize realtime subscriptions:', error);
      this.scheduleRetry();
    }
  }

  /**
   * Get Supabase configuration from environment
   */
  async getSupabaseConfig() {
    // Production Supabase configuration
    return {
      url: window.ENV?.SUPABASE_URL || 'https://tdmzayzkqyegvfgxlolj.supabase.co',
      anonKey: window.ENV?.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkbXpheXprcXllZ3ZmZ3hsb2xqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5OTkzNDAsImV4cCI6MjA3MTU3NTM0MH0.u4i07AojTzeSVRfbUyTSKfPv1EKUCFCv7XPri22gbkM'
    };
  }

  /**
   * Setup all realtime subscriptions
   */
  async setupSubscriptions() {
    await Promise.all([
      this.subscribeToComments(),
      this.subscribeToBlogPosts(),
      this.subscribeToContactForms(),
      this.subscribeToUserPresence(),
      this.subscribeToAnalytics()
    ]);
  }

  /**
   * Subscribe to new comment notifications
   */
  async subscribeToComments() {
    const channel = this.supabase
      .channel('comments-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments'
        },
        (payload) => this.handleNewComment(payload)
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'comments'
        },
        (payload) => this.handleCommentUpdate(payload)
      )
      .subscribe((status) => {
        console.log('Comments subscription status:', status);
        wsManager.updateChannelStatus('comments', status);
      });

    this.subscriptions.set('comments', channel);
  }

  /**
   * Subscribe to live blog post updates
   */
  async subscribeToBlogPosts() {
    const channel = this.supabase
      .channel('blog-posts-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'blog_posts'
        },
        (payload) => this.handleBlogPostChange(payload)
      )
      .subscribe((status) => {
        console.log('Blog posts subscription status:', status);
        wsManager.updateChannelStatus('blog-posts', status);
      });

    this.subscriptions.set('blog-posts', channel);
  }

  /**
   * Subscribe to contact form submissions (admin only)
   */
  async subscribeToContactForms() {
    if (!this.isAdmin()) return;

    const channel = this.supabase
      .channel('contact-forms-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'contact_submissions'
        },
        (payload) => this.handleNewContactForm(payload)
      )
      .subscribe((status) => {
        console.log('Contact forms subscription status:', status);
        wsManager.updateChannelStatus('contact-forms', status);
      });

    this.subscriptions.set('contact-forms', channel);
  }

  /**
   * Subscribe to user presence tracking
   */
  async subscribeToUserPresence() {
    const channel = this.supabase
      .channel('presence-channel')
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        this.handlePresenceSync(state);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        this.handleUserJoin(key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        this.handleUserLeave(key, leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const user = this.getCurrentUser();
          await channel.track({
            user_id: user?.id || 'anonymous',
            online_at: new Date().toISOString(),
            page: window.location.pathname
          });
        }
        wsManager.updateChannelStatus('presence', status);
      });

    this.subscriptions.set('presence', channel);
  }

  /**
   * Subscribe to analytics dashboard updates
   */
  async subscribeToAnalytics() {
    if (!this.isAdmin()) return;

    const channel = this.supabase
      .channel('analytics-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'page_views'
        },
        (payload) => this.handleAnalyticsUpdate(payload)
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_sessions'
        },
        (payload) => this.handleSessionUpdate(payload)
      )
      .subscribe((status) => {
        console.log('Analytics subscription status:', status);
        wsManager.updateChannelStatus('analytics', status);
      });

    this.subscriptions.set('analytics', channel);
  }

  /**
   * Handle new comment notifications
   */
  handleNewComment(payload) {
    const comment = payload.new;
    console.log('New comment received:', comment);

    // Update UI with new comment
    uiUpdates.addNewComment(comment);
    
    // Show notification
    uiUpdates.showNotification({
      type: 'info',
      title: 'New Comment',
      message: `${comment.author_name} commented on "${comment.post_title}"`,
      duration: 5000
    });

    // Update comment count
    uiUpdates.updateCommentCount(comment.post_id, 1);

    // Trigger custom event for other components
    this.dispatchCustomEvent('newComment', { comment });
  }

  /**
   * Handle comment updates (approval, editing, etc.)
   */
  handleCommentUpdate(payload) {
    const comment = payload.new;
    const oldComment = payload.old;
    
    console.log('Comment updated:', { old: oldComment, new: comment });

    // Update existing comment in UI
    uiUpdates.updateComment(comment);

    // Show approval notification if status changed
    if (oldComment.status !== comment.status && comment.status === 'approved') {
      uiUpdates.showNotification({
        type: 'success',
        title: 'Comment Approved',
        message: 'Your comment has been approved and is now visible.',
        duration: 3000
      });
    }

    this.dispatchCustomEvent('commentUpdated', { comment, oldComment });
  }

  /**
   * Handle blog post changes
   */
  handleBlogPostChange(payload) {
    const { eventType, new: newPost, old: oldPost } = payload;
    
    console.log('Blog post change:', eventType, newPost);

    switch (eventType) {
      case 'INSERT':
        uiUpdates.addNewBlogPost(newPost);
        uiUpdates.showNotification({
          type: 'info',
          title: 'New Blog Post',
          message: `New post: "${newPost.title}"`,
          duration: 5000
        });
        break;
      
      case 'UPDATE':
        uiUpdates.updateBlogPost(newPost, oldPost);
        if (oldPost.status !== newPost.status && newPost.status === 'published') {
          uiUpdates.showNotification({
            type: 'success',
            title: 'Post Published',
            message: `"${newPost.title}" is now live!`,
            duration: 5000
          });
        }
        break;
      
      case 'DELETE':
        uiUpdates.removeBlogPost(oldPost);
        break;
    }

    this.dispatchCustomEvent('blogPostChange', { eventType, newPost, oldPost });
  }

  /**
   * Handle new contact form submissions
   */
  handleNewContactForm(payload) {
    const submission = payload.new;
    
    console.log('New contact form submission:', submission);

    // Show admin notification
    uiUpdates.showNotification({
      type: 'warning',
      title: 'New Contact Form',
      message: `New message from ${submission.name}`,
      duration: 10000,
      persistent: true
    });

    // Update admin dashboard
    uiUpdates.addContactSubmission(submission);
    
    // Update counter
    uiUpdates.incrementCounter('pending-contacts');

    this.dispatchCustomEvent('newContactForm', { submission });
  }

  /**
   * Handle presence sync
   */
  handlePresenceSync(presenceState) {
    const users = Object.keys(presenceState);
    const activeUsers = users.length;

    console.log('Presence sync:', presenceState);
    
    uiUpdates.updateActiveUsers(activeUsers, presenceState);
    this.dispatchCustomEvent('presenceSync', { activeUsers, presenceState });
  }

  /**
   * Handle user joining
   */
  handleUserJoin(key, newPresences) {
    console.log('User joined:', key, newPresences);
    
    newPresences.forEach(presence => {
      uiUpdates.showUserJoined(presence);
    });

    this.dispatchCustomEvent('userJoined', { key, newPresences });
  }

  /**
   * Handle user leaving
   */
  handleUserLeave(key, leftPresences) {
    console.log('User left:', key, leftPresences);
    
    leftPresences.forEach(presence => {
      uiUpdates.showUserLeft(presence);
    });

    this.dispatchCustomEvent('userLeft', { key, leftPresences });
  }

  /**
   * Handle analytics updates
   */
  handleAnalyticsUpdate(payload) {
    const { eventType, new: newData, old: oldData } = payload;
    
    console.log('Analytics update:', eventType, newData);

    if (eventType === 'INSERT') {
      uiUpdates.updateAnalyticsDashboard(newData);
    }

    this.dispatchCustomEvent('analyticsUpdate', { eventType, newData, oldData });
  }

  /**
   * Handle session updates
   */
  handleSessionUpdate(payload) {
    const { eventType, new: newSession, old: oldSession } = payload;
    
    console.log('Session update:', eventType, newSession);

    uiUpdates.updateSessionCount(eventType, newSession);
    this.dispatchCustomEvent('sessionUpdate', { eventType, newSession, oldSession });
  }

  /**
   * Check if current user is admin
   */
  isAdmin() {
    const user = this.getCurrentUser();
    return user && (user.role === 'admin' || user.email === 'admin@example.com');
  }

  /**
   * Get current user from auth
   */
  getCurrentUser() {
    // Integration with existing auth system
    if (window.authManager && window.authManager.currentUser) {
      return window.authManager.currentUser;
    }
    return null;
  }

  /**
   * Dispatch custom events for other components to listen to
   */
  dispatchCustomEvent(type, detail) {
    const event = new CustomEvent(`realtime:${type}`, { detail });
    window.dispatchEvent(event);
  }

  /**
   * Schedule retry on connection failure
   */
  scheduleRetry() {
    if (this.retryCount >= this.maxRetries) {
      console.error('Max retries reached for realtime subscriptions');
      uiUpdates.showNotification({
        type: 'error',
        title: 'Connection Failed',
        message: 'Unable to establish realtime connection. Some features may not work.',
        duration: 10000,
        persistent: true
      });
      return;
    }

    const delay = Math.pow(2, this.retryCount) * 1000; // Exponential backoff
    this.retryCount++;

    console.log(`Retrying realtime connection in ${delay}ms (attempt ${this.retryCount})`);
    
    setTimeout(() => {
      this.init();
    }, delay);
  }

  /**
   * Unsubscribe from all channels
   */
  async unsubscribeAll() {
    const unsubscribePromises = Array.from(this.subscriptions.values()).map(
      channel => channel.unsubscribe()
    );
    
    await Promise.all(unsubscribePromises);
    this.subscriptions.clear();
    
    console.log('All realtime subscriptions unsubscribed');
  }

  /**
   * Get subscription status
   */
  getSubscriptionStatus() {
    const status = {};
    this.subscriptions.forEach((channel, name) => {
      status[name] = channel.state;
    });
    return status;
  }

  /**
   * Reconnect all subscriptions
   */
  async reconnect() {
    console.log('Reconnecting realtime subscriptions...');
    
    await this.unsubscribeAll();
    this.retryCount = 0;
    await this.init();
  }
}

// Create singleton instance
export const realtimeSubscriptions = new RealtimeSubscriptions();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  realtimeSubscriptions.init();
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && !realtimeSubscriptions.isInitialized) {
    realtimeSubscriptions.reconnect();
  }
});

// Global access
window.realtimeSubscriptions = realtimeSubscriptions;