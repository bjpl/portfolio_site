/**
 * API Demo Interface
 * Interactive demonstration of the Universal API system
 */

class APIDemoInterface {
  constructor() {
    this.isVisible = false;
    this.createInterface();
    this.setupKeyboardShortcuts();
  }

  /**
   * Create the demo interface
   */
  createInterface() {
    const demo = document.createElement('div');
    demo.id = 'api-demo-interface';
    demo.className = 'api-demo-interface';
    demo.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 400px;
      max-height: 600px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.3);
      z-index: 10003;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: none;
      overflow: hidden;
      transform: translateY(20px) scale(0.95);
      opacity: 0;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    `;

    demo.innerHTML = this.createDemoHTML();
    document.body.appendChild(demo);
    
    this.setupEventListeners(demo);
    this.addStyles();
  }

  /**
   * Create the demo HTML content
   */
  createDemoHTML() {
    return `
      <div class="demo-header">
        <h3>🚀 Universal API Demo</h3>
        <button class="demo-close" onclick="window.apiDemo.toggle()">×</button>
      </div>
      
      <div class="demo-content">
        <div class="demo-section">
          <h4>📊 Current Status</h4>
          <div id="api-status" class="status-display">Loading...</div>
        </div>
        
        <div class="demo-section">
          <h4>🔧 Actions</h4>
          <div class="demo-buttons">
            <button onclick="window.apiDemo.testHealth()" class="demo-btn">Health Check</button>
            <button onclick="window.apiDemo.testBlog()" class="demo-btn">Load Blog</button>
            <button onclick="window.apiDemo.testProjects()" class="demo-btn">Load Projects</button>
            <button onclick="window.apiDemo.testContact()" class="demo-btn">Test Contact</button>
          </div>
        </div>
        
        <div class="demo-section">
          <h4>🎭 Mode Controls</h4>
          <div class="demo-buttons">
            <button onclick="window.apiDemo.switchMode('auto')" class="demo-btn">Auto Mode</button>
            <button onclick="window.apiDemo.switchMode('demo')" class="demo-btn demo">Demo Mode</button>
            <button onclick="window.apiDemo.switchMode('local')" class="demo-btn">Local Mode</button>
          </div>
        </div>
        
        <div class="demo-section">
          <h4>🛠️ Utilities</h4>
          <div class="demo-buttons">
            <button onclick="window.apiDemo.clearCache()" class="demo-btn">Clear Cache</button>
            <button onclick="window.apiDemo.exportMetrics()" class="demo-btn">Export Metrics</button>
            <button onclick="window.apiDemo.showMonitor()" class="demo-btn">Show Monitor</button>
          </div>
        </div>
        
        <div class="demo-section">
          <h4>📝 Response Log</h4>
          <div id="response-log" class="response-log"></div>
        </div>
      </div>
      
      <div class="demo-footer">
        <small>Press <kbd>Ctrl+Shift+D</kbd> to toggle • <kbd>Ctrl+Shift+M</kbd> for monitor</small>
      </div>
    `;
  }

  /**
   * Add CSS styles
   */
  addStyles() {
    if (document.getElementById('api-demo-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'api-demo-styles';
    style.textContent = `
      .api-demo-interface.visible {
        display: block !important;
        transform: translateY(0) scale(1);
        opacity: 1;
      }
      
      .demo-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 15px 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .demo-header h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
      }
      
      .demo-close {
        background: rgba(255,255,255,0.2);
        border: none;
        color: white;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .demo-close:hover {
        background: rgba(255,255,255,0.3);
      }
      
      .demo-content {
        padding: 0;
        max-height: 480px;
        overflow-y: auto;
      }
      
      .demo-section {
        padding: 15px 20px;
        border-bottom: 1px solid #f0f0f0;
      }
      
      .demo-section:last-child {
        border-bottom: none;
      }
      
      .demo-section h4 {
        margin: 0 0 10px 0;
        font-size: 14px;
        font-weight: 600;
        color: #333;
      }
      
      .status-display {
        background: #f8f9fa;
        padding: 10px;
        border-radius: 6px;
        font-size: 12px;
        font-family: monospace;
        border-left: 3px solid #667eea;
      }
      
      .demo-buttons {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      
      .demo-btn {
        background: #667eea;
        color: white;
        border: none;
        padding: 8px 12px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 500;
        transition: all 0.2s;
      }
      
      .demo-btn:hover {
        background: #5a6fd8;
        transform: translateY(-1px);
      }
      
      .demo-btn.demo {
        background: #ff6b6b;
      }
      
      .demo-btn.demo:hover {
        background: #ff5252;
      }
      
      .response-log {
        background: #f8f9fa;
        border: 1px solid #e9ecef;
        border-radius: 6px;
        height: 120px;
        overflow-y: auto;
        font-size: 11px;
        font-family: monospace;
        padding: 8px;
        color: #495057;
      }
      
      .response-log .log-entry {
        margin-bottom: 4px;
        padding: 2px 4px;
        border-radius: 3px;
      }
      
      .response-log .log-success {
        background: #d4edda;
        color: #155724;
      }
      
      .response-log .log-error {
        background: #f8d7da;
        color: #721c24;
      }
      
      .response-log .log-info {
        background: #d1ecf1;
        color: #0c5460;
      }
      
      .demo-footer {
        background: #f8f9fa;
        padding: 10px 20px;
        font-size: 11px;
        color: #6c757d;
        text-align: center;
      }
      
      .demo-footer kbd {
        background: #e9ecef;
        padding: 2px 6px;
        border-radius: 3px;
        font-family: monospace;
        font-size: 10px;
      }
      
      @media (max-width: 768px) {
        .api-demo-interface {
          width: calc(100vw - 40px);
          bottom: 10px;
          right: 20px;
          left: 20px;
        }
      }
    `;
    
    document.head.appendChild(style);
  }

  /**
   * Setup event listeners
   */
  setupEventListeners(demo) {
    // Update status periodically
    setInterval(() => {
      this.updateStatus();
    }, 2000);
    
    // Initial status update
    setTimeout(() => this.updateStatus(), 500);
  }

  /**
   * Setup keyboard shortcuts
   */
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
      // Ctrl+Shift+D to toggle demo
      if (event.ctrlKey && event.shiftKey && event.key === 'D') {
        event.preventDefault();
        this.toggle();
      }
      
      // Ctrl+Shift+T to run tests
      if (event.ctrlKey && event.shiftKey && event.key === 'T') {
        event.preventDefault();
        this.runAllTests();
      }
    });
  }

  /**
   * Toggle interface visibility
   */
  toggle() {
    const demo = document.getElementById('api-demo-interface');
    this.isVisible = !this.isVisible;
    
    if (this.isVisible) {
      demo.style.display = 'block';
      setTimeout(() => demo.classList.add('visible'), 10);
    } else {
      demo.classList.remove('visible');
      setTimeout(() => demo.style.display = 'none', 300);
    }
  }

  /**
   * Update status display
   */
  updateStatus() {
    if (!this.isVisible) return;
    
    const statusEl = document.getElementById('api-status');
    if (!statusEl || !window.api) return;
    
    try {
      const status = window.api.system.status();
      statusEl.innerHTML = `
        <div><strong>Online:</strong> ${status.online ? '🟢' : '🔴'} ${status.online}</div>
        <div><strong>Mode:</strong> ${status.demoMode ? '🎭 Demo' : '🚀 Live'}</div>
        <div><strong>Endpoint:</strong> ${status.currentEndpoint || 'None'}</div>
        <div><strong>Cache:</strong> ${status.cacheSize || 0} entries</div>
        <div><strong>Health:</strong> ${JSON.stringify(status.healthStatus || {})}</div>
      `;
    } catch (error) {
      statusEl.innerHTML = `<div style="color: #dc3545;">Error: ${error.message}</div>`;
    }
  }

  /**
   * Log response to interface
   */
  logResponse(message, type = 'info') {
    const logEl = document.getElementById('response-log');
    if (!logEl) return;
    
    const entry = document.createElement('div');
    entry.className = `log-entry log-${type}`;
    entry.textContent = `${new Date().toLocaleTimeString()}: ${message}`;
    
    logEl.appendChild(entry);
    logEl.scrollTop = logEl.scrollHeight;
    
    // Keep only last 20 entries
    while (logEl.children.length > 20) {
      logEl.removeChild(logEl.firstChild);
    }
  }

  /**
   * Test health endpoint
   */
  async testHealth() {
    try {
      this.logResponse('Testing health endpoint...', 'info');
      const result = await window.api.health();
      this.logResponse(`Health: ${JSON.stringify(result)}`, 'success');
    } catch (error) {
      this.logResponse(`Health failed: ${error.message}`, 'error');
    }
  }

  /**
   * Test blog endpoint
   */
  async testBlog() {
    try {
      this.logResponse('Loading blog posts...', 'info');
      const result = await window.api.blog.list();
      this.logResponse(`Blog: ${result.posts?.length || 0} posts loaded`, 'success');
    } catch (error) {
      this.logResponse(`Blog failed: ${error.message}`, 'error');
    }
  }

  /**
   * Test projects endpoint
   */
  async testProjects() {
    try {
      this.logResponse('Loading projects...', 'info');
      const result = await window.api.projects.list();
      this.logResponse(`Projects: ${result.projects?.length || 0} projects loaded`, 'success');
    } catch (error) {
      this.logResponse(`Projects failed: ${error.message}`, 'error');
    }
  }

  /**
   * Test contact endpoint
   */
  async testContact() {
    try {
      this.logResponse('Testing contact form...', 'info');
      const result = await window.api.contact({
        name: 'Test User',
        email: 'test@example.com',
        message: 'This is a test message from the API demo'
      });
      this.logResponse(`Contact: ${result.message}`, 'success');
    } catch (error) {
      this.logResponse(`Contact failed: ${error.message}`, 'error');
    }
  }

  /**
   * Switch API mode
   */
  async switchMode(mode) {
    try {
      this.logResponse(`Switching to ${mode} mode...`, 'info');
      
      if (mode === 'demo') {
        await window.api.system.switchEndpoint('demo');
        this.logResponse('Demo mode activated', 'success');
      } else if (mode === 'local') {
        await window.api.system.switchEndpoint('local');
        this.logResponse('Local mode activated', 'success');
      } else if (mode === 'auto') {
        // Trigger endpoint detection
        if (window.apiClient) {
          await window.apiClient.findWorkingEndpoint();
          this.logResponse('Auto mode: best endpoint selected', 'success');
        }
      }
      
      setTimeout(() => this.updateStatus(), 500);
    } catch (error) {
      this.logResponse(`Mode switch failed: ${error.message}`, 'error');
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    try {
      window.api.system.clearCache();
      this.logResponse('Cache cleared successfully', 'success');
      this.updateStatus();
    } catch (error) {
      this.logResponse(`Clear cache failed: ${error.message}`, 'error');
    }
  }

  /**
   * Export metrics
   */
  exportMetrics() {
    try {
      const metrics = window.api.system.exportMetrics();
      const blob = new Blob([metrics], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `api-metrics-${Date.now()}.json`;
      a.click();
      
      URL.revokeObjectURL(url);
      this.logResponse('Metrics exported successfully', 'success');
    } catch (error) {
      this.logResponse(`Export failed: ${error.message}`, 'error');
    }
  }

  /**
   * Show monitor dashboard
   */
  showMonitor() {
    if (window.apiMonitor) {
      window.apiMonitor.toggleDashboard();
      this.logResponse('Monitor dashboard toggled', 'info');
    } else {
      this.logResponse('Monitor not available', 'error');
    }
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    this.logResponse('🧪 Running all tests...', 'info');
    
    const tests = [
      { name: 'Health', fn: () => this.testHealth() },
      { name: 'Blog', fn: () => this.testBlog() },
      { name: 'Projects', fn: () => this.testProjects() },
      { name: 'Contact', fn: () => this.testContact() }
    ];
    
    for (const test of tests) {
      await test.fn();
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    this.logResponse('🎉 All tests completed', 'success');
  }
}

// Initialize demo interface when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Wait for API to be available
  const initDemo = () => {
    if (window.api) {
      window.apiDemo = new APIDemoInterface();
      console.log('🎮 API Demo Interface loaded - Press Ctrl+Shift+D to open');
    } else {
      setTimeout(initDemo, 100);
    }
  };
  
  initDemo();
});

// Show floating demo button
document.addEventListener('DOMContentLoaded', () => {
  // Only show in development or with demo parameter
  const showDemoButton = !window.location.hostname.includes('netlify') || 
                        window.location.search.includes('demo=true');
  
  if (showDemoButton) {
    const button = document.createElement('button');
    button.innerHTML = '🚀';
    button.title = 'Open API Demo (Ctrl+Shift+D)';
    button.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 20px;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      cursor: pointer;
      font-size: 20px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      z-index: 10002;
      transition: all 0.3s ease;
    `;
    
    button.addEventListener('click', () => {
      if (window.apiDemo) {
        window.apiDemo.toggle();
      }
    });
    
    button.addEventListener('mouseenter', () => {
      button.style.transform = 'scale(1.1)';
      button.style.boxShadow = '0 6px 25px rgba(0,0,0,0.4)';
    });
    
    button.addEventListener('mouseleave', () => {
      button.style.transform = 'scale(1)';
      button.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
    });
    
    document.body.appendChild(button);
  }
});