/**
 * Hugo Integration Client
 * Provides live preview, build status monitoring, and real-time updates
 */
class HugoIntegrationClient {
  constructor(options = {}) {
    this.options = {
      wsUrl: options.wsUrl || `ws://${window.location.hostname}:3001`,
      apiUrl: options.apiUrl || '/api/hugo',
      autoConnect: options.autoConnect !== false,
      reconnectInterval: options.reconnectInterval || 3000,
      maxReconnectAttempts: options.maxReconnectAttempts || 10,
      ...options
    };

    this.ws = null;
    this.reconnectAttempts = 0;
    this.isConnected = false;
    this.listeners = new Map();
    this.buildStatus = null;
    this.previewWindow = null;

    // Initialize UI elements
    this.initializeUI();

    // Auto-connect if enabled
    if (this.options.autoConnect) {
      this.connect();
    }

    // Set up page visibility handling
    this.setupVisibilityHandling();
  }

  /**
   * Initialize UI elements for Hugo integration
   */
  initializeUI() {
    // Create status indicator
    this.createStatusIndicator();
    
    // Create build notifications container
    this.createNotificationContainer();
    
    // Create preview controls
    this.createPreviewControls();
  }

  /**
   * Create build status indicator
   */
  createStatusIndicator() {
    // Only create if not already exists
    if (document.getElementById('hugo-status-indicator')) return;

    const indicator = document.createElement('div');
    indicator.id = 'hugo-status-indicator';
    indicator.className = 'hugo-status-indicator';
    indicator.innerHTML = `
      <div class="status-dot" id="hugo-status-dot"></div>
      <div class="status-text" id="hugo-status-text">Connecting...</div>
      <div class="build-info" id="hugo-build-info"></div>
    `;
    
    // Add styles
    const styles = document.createElement('style');
    styles.textContent = `
      .hugo-status-indicator {
        position: fixed;
        top: 10px;
        right: 10px;
        background: rgba(255, 255, 255, 0.95);
        border: 1px solid #ddd;
        border-radius: 8px;
        padding: 8px 12px;
        font-size: 12px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        display: flex;
        align-items: center;
        gap: 6px;
        z-index: 10000;
        backdrop-filter: blur(10px);
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        transition: all 0.3s ease;
      }
      
      .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #ccc;
        transition: background-color 0.3s ease;
      }
      
      .status-dot.connected { background: #4CAF50; }
      .status-dot.building { background: #FF9800; animation: pulse 1s infinite; }
      .status-dot.error { background: #f44336; }
      .status-dot.disconnected { background: #ccc; }
      
      @keyframes pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.7; transform: scale(1.1); }
      }
      
      .status-text {
        font-weight: 500;
        color: #333;
      }
      
      .build-info {
        font-size: 11px;
        color: #666;
        margin-left: 4px;
      }
      
      .hugo-status-indicator:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      }
      
      @media (max-width: 768px) {
        .hugo-status-indicator {
          position: relative;
          top: auto;
          right: auto;
          margin: 10px auto;
          display: inline-flex;
        }
      }
    `;
    
    document.head.appendChild(styles);
    document.body.appendChild(indicator);
    
    this.statusIndicator = indicator;
  }

  /**
   * Create notification container for build alerts
   */
  createNotificationContainer() {
    if (document.getElementById('hugo-notifications')) return;

    const container = document.createElement('div');
    container.id = 'hugo-notifications';
    container.className = 'hugo-notifications';
    
    const styles = document.createElement('style');
    styles.textContent = `
      .hugo-notifications {
        position: fixed;
        top: 60px;
        right: 10px;
        z-index: 10001;
        max-width: 350px;
      }
      
      .hugo-notification {
        background: white;
        border-left: 4px solid #4CAF50;
        border-radius: 4px;
        padding: 12px 16px;
        margin-bottom: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        animation: slideIn 0.3s ease-out;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 13px;
      }
      
      .hugo-notification.error { border-left-color: #f44336; }
      .hugo-notification.warning { border-left-color: #FF9800; }
      .hugo-notification.building { border-left-color: #2196F3; }
      
      .hugo-notification .title {
        font-weight: 600;
        margin-bottom: 4px;
        color: #333;
      }
      
      .hugo-notification .message {
        color: #666;
        line-height: 1.4;
      }
      
      .hugo-notification .meta {
        font-size: 11px;
        color: #999;
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px solid #eee;
      }
      
      .hugo-notification .close {
        float: right;
        background: none;
        border: none;
        font-size: 18px;
        cursor: pointer;
        padding: 0;
        margin-left: 8px;
        color: #999;
      }
      
      .hugo-notification .close:hover {
        color: #333;
      }
      
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      
      @media (max-width: 768px) {
        .hugo-notifications {
          left: 10px;
          right: 10px;
          max-width: none;
        }
      }
    `;
    
    document.head.appendChild(styles);
    document.body.appendChild(container);
    
    this.notificationContainer = container;
  }

  /**
   * Create preview controls
   */
  createPreviewControls() {
    // Only add to admin/editor pages
    if (!window.location.pathname.includes('/admin')) return;

    const controls = document.createElement('div');
    controls.id = 'hugo-preview-controls';
    controls.className = 'hugo-preview-controls';
    controls.innerHTML = `
      <button id="preview-btn" class="preview-btn">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
        </svg>
        Preview
      </button>
      <button id="build-btn" class="build-btn">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
        </svg>
        Build
      </button>
    `;
    
    const styles = document.createElement('style');
    styles.textContent = `
      .hugo-preview-controls {
        position: fixed;
        bottom: 20px;
        right: 20px;
        display: flex;
        gap: 8px;
        z-index: 10000;
      }
      
      .hugo-preview-controls button {
        background: #2196F3;
        color: white;
        border: none;
        border-radius: 6px;
        padding: 10px 16px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
        transition: all 0.2s ease;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      
      .hugo-preview-controls button:hover {
        background: #1976D2;
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(0,0,0,0.15);
      }
      
      .hugo-preview-controls button:disabled {
        background: #ccc;
        cursor: not-allowed;
        transform: none;
      }
      
      .preview-btn { background: #4CAF50; }
      .preview-btn:hover { background: #388E3C; }
      
      .build-btn { background: #FF9800; }
      .build-btn:hover { background: #F57C00; }
    `;
    
    document.head.appendChild(styles);
    document.body.appendChild(controls);
    
    // Add event listeners
    document.getElementById('preview-btn').addEventListener('click', () => {
      this.openPreview();
    });
    
    document.getElementById('build-btn').addEventListener('click', () => {
      this.triggerBuild();
    });
  }

  /**
   * Connect to WebSocket server
   */
  connect() {
    try {
      this.ws = new WebSocket(this.options.wsUrl);
      
      this.ws.onopen = () => {
        console.log('🔌 Hugo integration connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.updateStatus('connected', 'Connected');
        this.emit('connected');
      };
      
      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };
      
      this.ws.onclose = () => {
        console.log('🔌 Hugo integration disconnected');
        this.isConnected = false;
        this.updateStatus('disconnected', 'Disconnected');
        this.emit('disconnected');
        this.scheduleReconnect();
      };
      
      this.ws.onerror = (error) => {
        console.error('Hugo integration WebSocket error:', error);
        this.updateStatus('error', 'Connection Error');
        this.emit('error', error);
      };
      
    } catch (error) {
      console.error('Failed to connect to Hugo integration:', error);
      this.updateStatus('error', 'Connection Failed');
      this.scheduleReconnect();
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  handleMessage(message) {
    const { type, data } = message;
    
    switch (type) {
      case 'status':
      case 'connected':
        this.buildStatus = data;
        this.updateBuildStatus(data);
        break;
        
      case 'buildStart':
        this.updateStatus('building', 'Building...');
        this.showNotification('Building', 'Hugo build started', 'building');
        break;
        
      case 'buildSuccess':
        this.updateStatus('connected', 'Build Complete');
        this.showNotification(
          'Build Complete', 
          `Built in ${data.buildTime}ms`, 
          'success',
          { buildTime: data.buildTime, warnings: data.warnings?.length || 0 }
        );
        break;
        
      case 'buildError':
        this.updateStatus('error', 'Build Failed');
        this.showNotification('Build Failed', data.error || 'Unknown error', 'error');
        break;
        
      case 'rebuild':
        this.showNotification(
          'Auto Rebuild', 
          `Rebuilt in ${data.buildTime || 'unknown'}ms`, 
          'success'
        );
        break;
        
      case 'fileChange':
        console.log(`📝 File changed: ${data.path}`);
        break;
        
      case 'serverStarted':
        this.showNotification(
          'Dev Server Started', 
          `Available at ${data.url}`, 
          'success'
        );
        break;
        
      case 'serverStopped':
        this.showNotification('Dev Server Stopped', '', 'warning');
        break;
        
      case 'error':
        this.showNotification('Error', data.error || 'Unknown error', 'error');
        break;
    }
    
    // Emit event for custom handlers
    this.emit(type, data);
  }

  /**
   * Update status indicator
   */
  updateStatus(status, text, buildInfo = '') {
    const dot = document.getElementById('hugo-status-dot');
    const textEl = document.getElementById('hugo-status-text');
    const infoEl = document.getElementById('hugo-build-info');
    
    if (dot) {
      dot.className = `status-dot ${status}`;
    }
    
    if (textEl) {
      textEl.textContent = text;
    }
    
    if (infoEl) {
      infoEl.textContent = buildInfo;
    }
  }

  /**
   * Update build status display
   */
  updateBuildStatus(status) {
    if (status.metrics) {
      const { averageBuildTime, totalBuilds, successfulBuilds } = status.metrics;
      const successRate = totalBuilds > 0 ? Math.round((successfulBuilds / totalBuilds) * 100) : 0;
      this.updateStatus(
        status.isBuilding ? 'building' : (status.status === 'success' ? 'connected' : 'error'),
        status.isBuilding ? 'Building...' : 'Ready',
        `${totalBuilds} builds, ${successRate}% success, ~${averageBuildTime}ms avg`
      );
    }
  }

  /**
   * Show notification
   */
  showNotification(title, message, type = 'info', meta = null) {
    if (!this.notificationContainer) return;

    const notification = document.createElement('div');
    notification.className = `hugo-notification ${type}`;
    notification.innerHTML = `
      <button class="close">&times;</button>
      <div class="title">${title}</div>
      <div class="message">${message}</div>
      ${meta ? `<div class="meta">
        ${meta.buildTime ? `Build time: ${meta.buildTime}ms` : ''}
        ${meta.warnings ? ` • ${meta.warnings} warnings` : ''}
      </div>` : ''}
    `;
    
    this.notificationContainer.appendChild(notification);
    
    // Add close handler
    notification.querySelector('.close').onclick = () => {
      notification.remove();
    };
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 5000);
  }

  /**
   * Trigger manual build
   */
  async triggerBuild(options = {}) {
    try {
      const response = await fetch(`${this.options.apiUrl}/build`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options)
      });
      
      const result = await response.json();
      
      if (result.success) {
        this.showNotification('Build Triggered', 'Manual build started', 'building');
      } else {
        this.showNotification('Build Failed', result.error || 'Unknown error', 'error');
      }
      
      return result;
    } catch (error) {
      this.showNotification('Build Error', error.message, 'error');
      throw error;
    }
  }

  /**
   * Open preview in new window
   */
  openPreview() {
    const previewUrl = `http://localhost:1313`;
    
    if (this.previewWindow && !this.previewWindow.closed) {
      this.previewWindow.focus();
      this.previewWindow.location.reload();
    } else {
      this.previewWindow = window.open(previewUrl, 'hugo-preview', 'width=1200,height=800');
    }
    
    this.showNotification('Preview Opened', 'Preview window opened', 'success');
  }

  /**
   * Schedule reconnection attempt
   */
  scheduleReconnect() {
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      this.updateStatus('error', 'Connection Failed');
      return;
    }
    
    this.reconnectAttempts++;
    this.updateStatus('disconnected', `Reconnecting... (${this.reconnectAttempts})`);
    
    setTimeout(() => {
      if (!this.isConnected) {
        this.connect();
      }
    }, this.options.reconnectInterval);
  }

  /**
   * Set up page visibility handling
   */
  setupVisibilityHandling() {
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && !this.isConnected) {
        this.connect();
      }
    });
  }

  /**
   * Add event listener
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
  }

  /**
   * Remove event listener
   */
  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  /**
   * Emit event to listeners
   */
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Disconnect and clean up
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.listeners.clear();
  }

  /**
   * Get current connection status
   */
  getStatus() {
    return {
      connected: this.isConnected,
      buildStatus: this.buildStatus,
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

// Initialize Hugo integration when page loads
document.addEventListener('DOMContentLoaded', () => {
  // Only initialize on admin pages or if explicitly enabled
  if (window.location.pathname.includes('/admin') || window.HUGO_INTEGRATION_ENABLED) {
    window.hugoIntegration = new HugoIntegrationClient();
    
    // Global access for debugging
    window.hugo = window.hugoIntegration;
  }
});