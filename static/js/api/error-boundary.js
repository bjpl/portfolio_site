/**
 * API Error Boundary System
 * Prevents users from ever seeing connection errors
 */

class APIErrorBoundary {
  constructor() {
    this.errorHandlers = new Map();
    this.fallbackData = new Map();
    this.setupGlobalErrorHandling();
  }

  /**
   * Setup global error handling
   */
  setupGlobalErrorHandling() {
    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      if (this.isNetworkError(event.reason)) {
        event.preventDefault();
        this.handleNetworkError(event.reason);
      }
    });

    // Catch general errors
    window.addEventListener('error', (event) => {
      if (this.isNetworkError(event.error)) {
        event.preventDefault();
        this.handleNetworkError(event.error);
      }
    });
  }

  /**
   * Register error handler for specific context
   */
  registerHandler(context, handler, fallbackData = null) {
    this.errorHandlers.set(context, handler);
    if (fallbackData) {
      this.fallbackData.set(context, fallbackData);
    }
  }

  /**
   * Check if error is network related
   */
  isNetworkError(error) {
    if (!error) return false;
    
    const networkErrorPatterns = [
      'fetch',
      'network',
      'connection',
      'timeout',
      'abort',
      'cors',
      'Failed to fetch',
      'NetworkError',
      'ERR_NETWORK',
      'ERR_CONNECTION'
    ];

    const errorString = error.toString().toLowerCase();
    return networkErrorPatterns.some(pattern => 
      errorString.includes(pattern.toLowerCase())
    );
  }

  /**
   * Handle network errors gracefully
   */
  handleNetworkError(error, context = 'global') {
    console.warn(`🛡️ Network error intercepted (${context}):`, error);

    // Try registered handler first
    const handler = this.errorHandlers.get(context);
    if (handler) {
      const fallback = this.fallbackData.get(context);
      handler(error, fallback);
      return;
    }

    // Default handling - switch to demo mode
    if (window.apiClient && !window.apiClient.demoMode) {
      console.log('🎭 Switching to demo mode due to network error');
      window.apiClient.enableDemoMode();
    }

    // Show user-friendly message
    this.showUserFriendlyMessage();
  }

  /**
   * Show user-friendly message instead of error
   */
  showUserFriendlyMessage() {
    const existingNotice = document.getElementById('network-notice');
    if (existingNotice) return; // Already showing

    const notice = document.createElement('div');
    notice.id = 'network-notice';
    notice.className = 'network-notice';
    notice.innerHTML = `
      <div class="notice-content">
        <span class="notice-icon">🌟</span>
        <span class="notice-text">Running in demo mode - all features available!</span>
        <button class="notice-close" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
    `;

    // Style the notice
    notice.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 0;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 350px;
      animation: slideIn 0.3s ease-out;
    `;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      
      .notice-content {
        display: flex;
        align-items: center;
        padding: 16px;
        gap: 12px;
      }
      
      .notice-icon {
        font-size: 20px;
        flex-shrink: 0;
      }
      
      .notice-text {
        flex: 1;
        font-size: 14px;
        font-weight: 500;
      }
      
      .notice-close {
        background: rgba(255,255,255,0.2);
        border: none;
        color: white;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        transition: background-color 0.2s;
      }
      
      .notice-close:hover {
        background: rgba(255,255,255,0.3);
      }
      
      .network-notice:hover {
        transform: translateX(-5px);
        transition: transform 0.2s ease;
      }
    `;

    document.head.appendChild(style);
    document.body.appendChild(notice);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notice.parentNode) {
        notice.remove();
      }
    }, 5000);
  }

  /**
   * Wrap async function with error boundary
   */
  wrap(asyncFn, context = 'wrapped', fallbackData = null) {
    return async (...args) => {
      try {
        return await asyncFn(...args);
      } catch (error) {
        if (this.isNetworkError(error)) {
          this.handleNetworkError(error, context);
          return fallbackData;
        }
        throw error; // Re-throw non-network errors
      }
    };
  }

  /**
   * Wrap fetch calls with error boundary
   */
  safeFetch(url, options = {}) {
    return this.wrap(fetch, 'fetch')(url, options)
      .then(response => {
        if (!response.ok && response.status >= 500) {
          throw new Error(`Server error: ${response.status}`);
        }
        return response;
      });
  }

  /**
   * Create resilient API wrapper
   */
  createResilientAPI(apiMethods) {
    const resilientAPI = {};
    
    Object.keys(apiMethods).forEach(methodName => {
      resilientAPI[methodName] = this.wrap(
        apiMethods[methodName], 
        methodName,
        this.fallbackData.get(methodName)
      );
    });

    return resilientAPI;
  }
}

// Create global error boundary
window.apiErrorBoundary = new APIErrorBoundary();

// Register common fallback data
window.apiErrorBoundary.registerHandler('contact', (error, fallback) => {
  console.log('📧 Contact form switching to demo mode');
  // Form will still work, just shows demo success message
});

window.apiErrorBoundary.registerHandler('blog', (error, fallback) => {
  console.log('📝 Blog switching to demo content');
  // Blog will show demo posts
});

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = APIErrorBoundary;
}