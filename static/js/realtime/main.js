/**
 * Main Realtime Features Entry Point
 * Simple import and initialization for all realtime functionality
 */

// Import all realtime modules
import { realtimeManager } from './realtime-init.js';
import { realtimeSubscriptions } from './subscriptions.js';
import { wsManager } from './websocket-manager.js';
import { uiUpdates } from './ui-updates.js';
import { realtimeDemo } from './demo-events.js';
import { REALTIME_EVENTS, globalEventDispatcher } from './events.js';

// Configuration based on environment
const config = {
  // Enable demo mode in development
  enableDemo: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
  
  // Supabase configuration (would come from environment in production)
  supabase: {
    url: 'https://your-project.supabase.co',
    anonKey: 'your-anon-key'
  },
  
  // Feature flags
  features: {
    comments: true,
    blogPosts: true,
    contactForms: true,
    presence: true,
    analytics: true
  },
  
  // UI preferences
  ui: {
    notifications: true,
    counters: true,
    presence: true,
    activityFeed: true
  }
};

/**
 * Initialize realtime features when DOM is ready
 */
document.addEventListener('DOMContentLoaded', async () => {
  try {
    console.log('Initializing realtime features...');
    
    // Initialize the main realtime manager
    await realtimeManager.init(config);
    
    // Start demo mode if enabled
    if (config.enableDemo) {
      console.log('Demo mode enabled - starting demo events');
      
      // Wait a bit for initialization to complete
      setTimeout(() => {
        realtimeDemo.start({
          commentInterval: 10000,  // Every 10 seconds
          presenceInterval: 15000, // Every 15 seconds
          contactInterval: 30000,  // Every 30 seconds
          blogInterval: 60000,     // Every minute
          analyticsInterval: 8000  // Every 8 seconds
        });
        
        // Show demo notification
        uiUpdates.showNotification({
          type: 'info',
          title: 'Demo Mode Active',
          message: 'Generating sample realtime events for demonstration',
          duration: 5000
        });
        
        // Add demo controls to page if in development
        addDemoControls();
        
      }, 3000);
    }
    
    console.log('Realtime features initialized successfully');
    
  } catch (error) {
    console.error('Failed to initialize realtime features:', error);
  }
});

/**
 * Add demo controls to the page for testing
 */
function addDemoControls() {
  // Only add in development
  if (!config.enableDemo) return;
  
  const controlsHtml = `
    <div id="demo-controls" style="
      position: fixed;
      bottom: 20px;
      left: 20px;
      background: white;
      border: 1px solid #ccc;
      border-radius: 8px;
      padding: 15px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      z-index: 9999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
    ">
      <div style="font-weight: bold; margin-bottom: 10px; color: #333;">
        🔴 Demo Controls
      </div>
      <div style="margin-bottom: 8px;">
        <button onclick="realtimeDemo.generateTestEvent('comment')" 
                style="background: #3b82f6; color: white; border: none; padding: 4px 8px; border-radius: 4px; margin-right: 5px; cursor: pointer;">
          New Comment
        </button>
        <button onclick="realtimeDemo.generateTestEvent('contact')" 
                style="background: #10b981; color: white; border: none; padding: 4px 8px; border-radius: 4px; margin-right: 5px; cursor: pointer;">
          Contact Form
        </button>
      </div>
      <div style="margin-bottom: 8px;">
        <button onclick="realtimeDemo.generateTestEvent('presence')" 
                style="background: #8b5cf6; color: white; border: none; padding: 4px 8px; border-radius: 4px; margin-right: 5px; cursor: pointer;">
          User Join/Leave
        </button>
        <button onclick="realtimeDemo.generateBurstEvents(5)" 
                style="background: #f59e0b; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer;">
          Burst Events
        </button>
      </div>
      <div style="margin-bottom: 8px;">
        <button onclick="toggleDemo()" id="demo-toggle"
                style="background: #ef4444; color: white; border: none; padding: 4px 8px; border-radius: 4px; margin-right: 5px; cursor: pointer;">
          Stop Demo
        </button>
        <button onclick="uiUpdates.clearAllNotifications()" 
                style="background: #6b7280; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer;">
          Clear Notifications
        </button>
      </div>
      <div style="font-size: 12px; color: #666; margin-top: 8px;">
        Events: <span id="event-counter">0</span>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', controlsHtml);
  
  // Add toggle function
  window.toggleDemo = () => {
    const button = document.getElementById('demo-toggle');
    const stats = realtimeDemo.getStats();
    
    if (stats.isRunning) {
      realtimeDemo.stop();
      button.textContent = 'Start Demo';
      button.style.background = '#10b981';
    } else {
      realtimeDemo.start();
      button.textContent = 'Stop Demo';
      button.style.background = '#ef4444';
    }
  };
  
  // Update event counter
  setInterval(() => {
    const counter = document.getElementById('event-counter');
    if (counter) {
      const stats = realtimeDemo.getStats();
      counter.textContent = stats.eventCount;
    }
  }, 1000);
}

/**
 * Global realtime status function
 */
window.getRealtimeStatus = () => {
  return {
    initialized: realtimeManager.isInitialized,
    connectionStatus: realtimeManager.getConnectionStatus(),
    subscriptionStatus: realtimeManager.getSubscriptionStatus(),
    websocketStatus: realtimeManager.getWebSocketStatus(),
    demoStats: config.enableDemo ? realtimeDemo.getStats() : null
  };
};

/**
 * Global realtime control functions
 */
window.realtimeControls = {
  restart: (newConfig) => realtimeManager.restart(newConfig),
  shutdown: () => realtimeManager.shutdown(),
  demo: {
    start: (options) => realtimeDemo.start(options),
    stop: () => realtimeDemo.stop(),
    generateEvent: (type) => realtimeDemo.generateTestEvent(type),
    stats: () => realtimeDemo.getStats()
  }
};

// Export for module usage
export {
  realtimeManager,
  realtimeSubscriptions,
  wsManager,
  uiUpdates,
  realtimeDemo,
  REALTIME_EVENTS,
  globalEventDispatcher,
  config
};

// Set global references
window.realtimeManager = realtimeManager;
window.realtimeSubscriptions = realtimeSubscriptions;
window.wsManager = wsManager;
window.uiUpdates = uiUpdates;
window.realtimeDemo = realtimeDemo;
window.REALTIME_EVENTS = REALTIME_EVENTS;