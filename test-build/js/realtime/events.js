/**
 * Realtime Event Types and Constants
 * Centralized event definitions and utilities for realtime features
 */

// Event type constants
export const REALTIME_EVENTS = {
  // Connection events
  CONNECTION_OPEN: 'realtime:connection:open',
  CONNECTION_CLOSE: 'realtime:connection:close',
  CONNECTION_ERROR: 'realtime:connection:error',
  CONNECTION_RECONNECT: 'realtime:connection:reconnect',
  
  // Subscription events
  SUBSCRIPTION_READY: 'realtime:subscription:ready',
  SUBSCRIPTION_ERROR: 'realtime:subscription:error',
  SUBSCRIPTION_CLOSED: 'realtime:subscription:closed',
  
  // Data events
  NEW_COMMENT: 'realtime:newComment',
  COMMENT_UPDATED: 'realtime:commentUpdated',
  COMMENT_DELETED: 'realtime:commentDeleted',
  
  NEW_BLOG_POST: 'realtime:newBlogPost',
  BLOG_POST_UPDATED: 'realtime:blogPostUpdated',
  BLOG_POST_DELETED: 'realtime:blogPostDeleted',
  
  NEW_CONTACT_FORM: 'realtime:newContactForm',
  CONTACT_FORM_UPDATED: 'realtime:contactFormUpdated',
  
  // Presence events
  USER_JOINED: 'realtime:userJoined',
  USER_LEFT: 'realtime:userLeft',
  PRESENCE_SYNC: 'realtime:presenceSync',
  PRESENCE_UPDATE: 'realtime:presenceUpdate',
  
  // Analytics events
  ANALYTICS_UPDATE: 'realtime:analyticsUpdate',
  SESSION_UPDATE: 'realtime:sessionUpdate',
  PAGE_VIEW: 'realtime:pageView',
  
  // System events
  INITIALIZED: 'realtime:initialized',
  CONFIG_UPDATED: 'realtime:config-updated',
  SHUTDOWN: 'realtime:shutdown',
  ERROR: 'realtime:error'
};

// WebSocket event constants
export const WEBSOCKET_EVENTS = {
  CONNECTION_OPEN: 'ws:connection:open',
  CONNECTION_CLOSE: 'ws:connection:close',
  CONNECTION_ERROR: 'ws:connection:error',
  CONNECTION_MESSAGE: 'ws:connection:message',
  
  CHANNEL_SUBSCRIBED: 'ws:channel:subscribed',
  CHANNEL_UNSUBSCRIBED: 'ws:channel:unsubscribed',
  CHANNEL_MESSAGE: 'ws:channel:message',
  CHANNEL_ERROR: 'ws:channel:error'
};

// Channel names
export const CHANNELS = {
  COMMENTS: 'comments-channel',
  BLOG_POSTS: 'blog-posts-channel',
  CONTACT_FORMS: 'contact-forms-channel',
  PRESENCE: 'presence-channel',
  ANALYTICS: 'analytics-channel',
  SYSTEM: 'system-channel'
};

// Message types
export const MESSAGE_TYPES = {
  HEARTBEAT: 'heartbeat',
  HEARTBEAT_RESPONSE: 'heartbeat_response',
  SUBSCRIBE: 'subscribe',
  UNSUBSCRIBE: 'unsubscribe',
  CHANNEL_MESSAGE: 'channel_message',
  SYSTEM_MESSAGE: 'system_message',
  ERROR: 'error'
};

// Status constants
export const STATUS = {
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  ERROR: 'error',
  CLOSED: 'closed',
  SUBSCRIBING: 'subscribing',
  SUBSCRIBED: 'subscribed',
  UNSUBSCRIBED: 'unsubscribed'
};

// Error types
export const ERROR_TYPES = {
  CONNECTION_FAILED: 'connection_failed',
  SUBSCRIPTION_FAILED: 'subscription_failed',
  MESSAGE_FAILED: 'message_failed',
  AUTHENTICATION_FAILED: 'authentication_failed',
  NETWORK_ERROR: 'network_error',
  TIMEOUT: 'timeout',
  UNKNOWN: 'unknown'
};

// Notification types
export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
};

/**
 * Event dispatcher utility class
 */
export class RealtimeEventDispatcher {
  constructor() {
    this.listeners = new Map();
  }

  /**
   * Add event listener
   */
  on(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    
    this.listeners.get(eventType).add(callback);
    
    // Return unsubscribe function
    return () => {
      this.off(eventType, callback);
    };
  }

  /**
   * Remove event listener
   */
  off(eventType, callback) {
    if (this.listeners.has(eventType)) {
      this.listeners.get(eventType).delete(callback);
    }
  }

  /**
   * Emit event
   */
  emit(eventType, data = {}) {
    if (this.listeners.has(eventType)) {
      this.listeners.get(eventType).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${eventType}:`, error);
        }
      });
    }
  }

  /**
   * Emit event once
   */
  once(eventType, callback) {
    const unsubscribe = this.on(eventType, (data) => {
      unsubscribe();
      callback(data);
    });
  }

  /**
   * Clear all listeners
   */
  clear() {
    this.listeners.clear();
  }

  /**
   * Get listener count for event type
   */
  getListenerCount(eventType) {
    return this.listeners.has(eventType) ? this.listeners.get(eventType).size : 0;
  }

  /**
   * Get all event types with listeners
   */
  getEventTypes() {
    return Array.from(this.listeners.keys());
  }
}

/**
 * Event data validators
 */
export const EventValidators = {
  /**
   * Validate comment event data
   */
  validateComment(data) {
    const required = ['id', 'content', 'author_name', 'post_id'];
    return required.every(field => data && data.hasOwnProperty(field));
  },

  /**
   * Validate blog post event data
   */
  validateBlogPost(data) {
    const required = ['id', 'title', 'status'];
    return required.every(field => data && data.hasOwnProperty(field));
  },

  /**
   * Validate contact form event data
   */
  validateContactForm(data) {
    const required = ['id', 'name', 'email', 'subject'];
    return required.every(field => data && data.hasOwnProperty(field));
  },

  /**
   * Validate presence data
   */
  validatePresence(data) {
    const required = ['user_id', 'online_at'];
    return required.every(field => data && data.hasOwnProperty(field));
  },

  /**
   * Validate analytics data
   */
  validateAnalytics(data) {
    return data && typeof data === 'object';
  }
};

/**
 * Event factory functions
 */
export const EventFactory = {
  /**
   * Create comment event
   */
  createCommentEvent(type, comment, oldComment = null) {
    return {
      type,
      timestamp: new Date().toISOString(),
      data: {
        comment,
        oldComment
      }
    };
  },

  /**
   * Create blog post event
   */
  createBlogPostEvent(type, post, oldPost = null) {
    return {
      type,
      timestamp: new Date().toISOString(),
      data: {
        post,
        oldPost
      }
    };
  },

  /**
   * Create contact form event
   */
  createContactFormEvent(type, submission) {
    return {
      type,
      timestamp: new Date().toISOString(),
      data: {
        submission
      }
    };
  },

  /**
   * Create presence event
   */
  createPresenceEvent(type, presenceData) {
    return {
      type,
      timestamp: new Date().toISOString(),
      data: presenceData
    };
  },

  /**
   * Create analytics event
   */
  createAnalyticsEvent(type, analyticsData) {
    return {
      type,
      timestamp: new Date().toISOString(),
      data: analyticsData
    };
  },

  /**
   * Create connection event
   */
  createConnectionEvent(type, connectionData) {
    return {
      type,
      timestamp: new Date().toISOString(),
      data: {
        ...connectionData,
        userAgent: navigator.userAgent,
        url: window.location.href
      }
    };
  },

  /**
   * Create error event
   */
  createErrorEvent(errorType, error, context = {}) {
    return {
      type: REALTIME_EVENTS.ERROR,
      timestamp: new Date().toISOString(),
      data: {
        errorType,
        message: error.message,
        stack: error.stack,
        context
      }
    };
  }
};

/**
 * Event utilities
 */
export const EventUtils = {
  /**
   * Debounce function for event handling
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  /**
   * Throttle function for event handling
   */
  throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  /**
   * Queue events for batch processing
   */
  createEventQueue(processor, batchSize = 10, flushInterval = 1000) {
    const queue = [];
    let timer = null;

    const flush = () => {
      if (queue.length > 0) {
        const batch = queue.splice(0, queue.length);
        processor(batch);
      }
      clearTimeout(timer);
      timer = null;
    };

    return {
      add: (event) => {
        queue.push(event);
        
        // Flush if batch size reached
        if (queue.length >= batchSize) {
          flush();
          return;
        }

        // Set flush timer if not already set
        if (!timer) {
          timer = setTimeout(flush, flushInterval);
        }
      },
      flush,
      size: () => queue.length
    };
  },

  /**
   * Serialize event for storage or transmission
   */
  serializeEvent(event) {
    try {
      return JSON.stringify(event);
    } catch (error) {
      console.error('Failed to serialize event:', error);
      return null;
    }
  },

  /**
   * Deserialize event from storage or transmission
   */
  deserializeEvent(serializedEvent) {
    try {
      return JSON.parse(serializedEvent);
    } catch (error) {
      console.error('Failed to deserialize event:', error);
      return null;
    }
  },

  /**
   * Filter events by type
   */
  filterEventsByType(events, eventType) {
    return events.filter(event => event.type === eventType);
  },

  /**
   * Filter events by time range
   */
  filterEventsByTimeRange(events, startTime, endTime) {
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    
    return events.filter(event => {
      const eventTime = new Date(event.timestamp).getTime();
      return eventTime >= start && eventTime <= end;
    });
  },

  /**
   * Group events by type
   */
  groupEventsByType(events) {
    return events.reduce((groups, event) => {
      const type = event.type;
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(event);
      return groups;
    }, {});
  },

  /**
   * Get event statistics
   */
  getEventStats(events) {
    const stats = {
      total: events.length,
      byType: {},
      timeRange: {
        start: null,
        end: null
      }
    };

    if (events.length === 0) return stats;

    // Count by type
    events.forEach(event => {
      if (!stats.byType[event.type]) {
        stats.byType[event.type] = 0;
      }
      stats.byType[event.type]++;
    });

    // Find time range
    const timestamps = events.map(event => new Date(event.timestamp).getTime()).sort();
    stats.timeRange.start = new Date(timestamps[0]).toISOString();
    stats.timeRange.end = new Date(timestamps[timestamps.length - 1]).toISOString();

    return stats;
  }
};

// Create global event dispatcher
export const globalEventDispatcher = new RealtimeEventDispatcher();

// Global access
window.RealtimeEvents = {
  REALTIME_EVENTS,
  WEBSOCKET_EVENTS,
  CHANNELS,
  MESSAGE_TYPES,
  STATUS,
  ERROR_TYPES,
  NOTIFICATION_TYPES,
  RealtimeEventDispatcher,
  EventValidators,
  EventFactory,
  EventUtils,
  globalEventDispatcher
};