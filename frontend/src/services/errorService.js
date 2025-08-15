/**
 * Error Service for centralized error handling and reporting
 */

class ErrorService {
  constructor() {
    this.errorQueue = [];
    this.isOnline = navigator.onLine;
    this.maxRetries = 3;
    this.retryDelay = 5000;

    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.flushErrorQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Global error handlers
    this.setupGlobalHandlers();
  }

  setupGlobalHandlers() {
    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.logError({
        error: event.reason,
        type: 'unhandled_promise_rejection',
        url: window.location.href,
        timestamp: new Date().toISOString()
      });
    });

    // Catch global errors
    window.addEventListener('error', (event) => {
      // Ignore script errors from third-party scripts
      if (event.message === 'Script error.' && !event.filename) {
        return;
      }

      this.logError({
        error: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        type: 'global_error',
        url: window.location.href,
        timestamp: new Date().toISOString()
      });
    });
  }

  /**
   * Log an error to the backend and external services
   */
  async logError(errorData) {
    // Add browser information
    const enrichedError = {
      ...errorData,
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      screen: {
        width: window.screen.width,
        height: window.screen.height
      },
      sessionId: this.getSessionId(),
      userId: this.getUserId(),
      environment: process.env.NODE_ENV,
      appVersion: process.env.REACT_APP_VERSION || 'unknown'
    };

    // Store in local storage for persistence
    this.storeErrorLocally(enrichedError);

    // Add to queue
    this.errorQueue.push(enrichedError);

    // Try to send immediately if online
    if (this.isOnline) {
      await this.sendError(enrichedError);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error logged:', enrichedError);
    }

    return enrichedError.errorId;
  }

  /**
   * Send error to backend API
   */
  async sendError(errorData, retryCount = 0) {
    try {
      const response = await fetch('/api/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(errorData)
      });

      if (!response.ok) {
        throw new Error(`Failed to log error: ${response.statusText}`);
      }

      // Remove from queue if successful
      this.errorQueue = this.errorQueue.filter(e => e.errorId !== errorData.errorId);
      
      // Remove from local storage
      this.removeErrorFromStorage(errorData.errorId);

      return await response.json();
    } catch (error) {
      console.error('Failed to send error to backend:', error);

      // Retry logic
      if (retryCount < this.maxRetries) {
        setTimeout(() => {
          this.sendError(errorData, retryCount + 1);
        }, this.retryDelay * Math.pow(2, retryCount)); // Exponential backoff
      }
    }
  }

  /**
   * Flush error queue (send all queued errors)
   */
  async flushErrorQueue() {
    const errors = [...this.errorQueue];
    
    for (const error of errors) {
      await this.sendError(error);
    }
  }

  /**
   * Store error in local storage
   */
  storeErrorLocally(errorData) {
    try {
      const storedErrors = this.getStoredErrors();
      storedErrors.push(errorData);
      
      // Keep only last 50 errors
      const recentErrors = storedErrors.slice(-50);
      
      localStorage.setItem('error_logs', JSON.stringify(recentErrors));
    } catch (e) {
      // Ignore local storage errors
      console.warn('Failed to store error locally:', e);
    }
  }

  /**
   * Get stored errors from local storage
   */
  getStoredErrors() {
    try {
      const stored = localStorage.getItem('error_logs');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  }

  /**
   * Remove error from local storage
   */
  removeErrorFromStorage(errorId) {
    try {
      const storedErrors = this.getStoredErrors();
      const filtered = storedErrors.filter(e => e.errorId !== errorId);
      localStorage.setItem('error_logs', JSON.stringify(filtered));
    } catch (e) {
      // Ignore local storage errors
    }
  }

  /**
   * Get or generate session ID
   */
  getSessionId() {
    let sessionId = sessionStorage.getItem('session_id');
    if (!sessionId) {
      sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('session_id', sessionId);
    }
    return sessionId;
  }

  /**
   * Get user ID from auth context
   */
  getUserId() {
    // This would typically come from your auth state/context
    const authData = localStorage.getItem('auth');
    if (authData) {
      try {
        const parsed = JSON.parse(authData);
        return parsed.userId || null;
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  /**
   * Get auth token
   */
  getAuthToken() {
    const authData = localStorage.getItem('auth');
    if (authData) {
      try {
        const parsed = JSON.parse(authData);
        return parsed.token || '';
      } catch (e) {
        return '';
      }
    }
    return '';
  }

  /**
   * Clear all error logs
   */
  clearErrorLogs() {
    this.errorQueue = [];
    localStorage.removeItem('error_logs');
  }

  /**
   * Get error statistics
   */
  getErrorStats() {
    const errors = this.getStoredErrors();
    const stats = {
      total: errors.length,
      byType: {},
      byPage: {},
      recent: errors.slice(-10)
    };

    errors.forEach(error => {
      // Count by type
      const type = error.type || 'unknown';
      stats.byType[type] = (stats.byType[type] || 0) + 1;

      // Count by page
      const page = error.url || 'unknown';
      stats.byPage[page] = (stats.byPage[page] || 0) + 1;
    });

    return stats;
  }
}

// Create singleton instance
const errorService = new ErrorService();

// Export functions
export const logError = (errorData) => errorService.logError(errorData);
export const clearErrorLogs = () => errorService.clearErrorLogs();
export const getErrorStats = () => errorService.getErrorStats();
export const flushErrorQueue = () => errorService.flushErrorQueue();

export default errorService;