// Admin Dashboard JavaScript
const API_BASE = 'http://localhost:3333/api';
let ws = null;
let authToken = localStorage.getItem('auth_token');

// API Helper class
class API {
  static async request(endpoint, options = {}) {
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
      },
      ...options,
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, config);
      
      if (response.status === 401) {
        adminDashboard.handleUnauthorized();
        return null;
      }

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      adminDashboard.showNotification(`API Error: ${error.message}`, 'error');
      throw error;
    }
  }

  static get(endpoint) { return this.request(endpoint); }
  static post(endpoint, body) { return this.request(endpoint, { method: 'POST', body }); }
  static put(endpoint, body) { return this.request(endpoint, { method: 'PUT', body }); }
  static delete(endpoint) { return this.request(endpoint, { method: 'DELETE' }); }
}

// Main Dashboard Class
class AdminDashboard {
  constructor() {
    this.currentSection = 'overview';
    this.contentCache = new Map();
    this.isServerRunning = false;
  }

  async init() {
    this.checkAuthentication();
    this.initEventListeners();
    this.initWebSocket();
    await this.loadDashboardData();
    this.startPeriodicUpdates();
  }

  checkAuthentication() {
    if (!authToken) {
      this.showLoginForm();
      return false;
    }
    return true;
  }

  showLoginForm() {
    const loginModal = document.createElement('div');
    loginModal.className = 'modal';
    loginModal.innerHTML = `
      <div class="modal-content">
        <h2>Admin Login</h2>
        <form id="login-form">
          <div class="form-group">
            <label for="email">Email:</label>
            <input type="email" id="email" required>
          </div>
          <div class="form-group">
            <label for="password">Password:</label>
            <input type="password" id="password" required>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">Login</button>
          </div>
        </form>
      </div>
    `;
    
    document.body.appendChild(loginModal);
    
    document.getElementById('login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleLogin(e.target);
    });
  }

  async handleLogin(form) {
    const formData = new FormData(form);
    const credentials = {
      email: formData.get('email'),
      password: formData.get('password'),
    };

    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (response.ok) {
        authToken = data.accessToken;
        localStorage.setItem('auth_token', authToken);
        localStorage.setItem('refresh_token', data.refreshToken);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        document.querySelector('.modal').remove();
        await this.loadDashboardData();
        this.showNotification('Logged in successfully!', 'success');
      } else {
        this.showNotification(data.error || 'Login failed', 'error');
      }
    } catch (error) {
      this.showNotification('Login error: ' + error.message, 'error');
    }
  }

  handleUnauthorized() {
    authToken = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    this.showLoginForm();
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('show');
    }, 100);
    
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  initEventListeners() {
    // Logout button
    document.addEventListener('click', (e) => {
      if (e.target.matches('[data-action="logout"]')) {
        this.logout();
      }
    });
  }

  async logout() {
    try {
      await API.post('/auth/logout', { 
        refreshToken: localStorage.getItem('refresh_token') 
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.handleUnauthorized();
    }
  }

  async loadDashboardData() {
    if (!authToken) return;

    try {
      await Promise.all([
        this.loadStats(),
        this.loadRecentContent(),
        this.checkServerStatus(),
      ]);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  }

  async loadStats() {
    try {
      const stats = await API.get('/dashboard/stats');
      if (stats) {
        this.updateStatsDisplay(stats);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }

  updateStatsDisplay(stats) {
    const updates = [
      ['total-content', stats.totalContent || 0],
      ['drafts-count', stats.draftsCount || 0],
      ['published-count', stats.publishedCount || 0],
      ['media-count', stats.mediaCount || 0],
    ];

    updates.forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = value;
      }
    });
  }

  async loadRecentContent() {
    try {
      const content = await API.get('/content/recent');
      if (content) {
        this.displayRecentContent(content);
      }
    } catch (error) {
      console.error('Failed to load recent content:', error);
    }
  }

  displayRecentContent(content) {
    const container = document.getElementById('recent-content-list');
    if (!container) return;

    container.innerHTML = content.map(item => `
      <div class="content-item">
        <div class="content-info">
          <h4>${item.title}</h4>
          <p>${item.section} • ${new Date(item.date).toLocaleDateString()}</p>
        </div>
        <div class="content-actions">
          <button class="btn btn-sm" onclick="adminDashboard.editContent('${item.id}')">Edit</button>
          <button class="btn btn-sm btn-danger" onclick="adminDashboard.deleteContent('${item.id}')">Delete</button>
        </div>
      </div>
    `).join('');
  }

  async buildSite(startServer = false) {
    try {
      this.showNotification('Building site...', 'info');
      
      const result = await API.post('/dev/build', { startServer });
      
      if (result) {
        this.showNotification('Site built successfully!', 'success');
        if (startServer) {
          this.isServerRunning = true;
          this.updateServerStatus(true);
        }
      }
    } catch (error) {
      this.showNotification('Build failed: ' + error.message, 'error');
    }
  }

  async stopServer() {
    try {
      await API.post('/dev/stop');
      this.isServerRunning = false;
      this.updateServerStatus(false);
      this.showNotification('Server stopped', 'info');
    } catch (error) {
      this.showNotification('Failed to stop server: ' + error.message, 'error');
    }
  }

  updateServerStatus(isRunning) {
    const statusElement = document.getElementById('server-status');
    if (statusElement) {
      statusElement.className = `server-status ${isRunning ? 'running' : 'stopped'}`;
      statusElement.textContent = isRunning ? 'Running' : 'Stopped';
    }
  }

  async checkServerStatus() {
    try {
      const status = await API.get('/dev/status');
      if (status) {
        this.isServerRunning = status.running;
        this.updateServerStatus(status.running);
      }
    } catch (error) {
      console.error('Failed to check server status:', error);
    }
  }

  startPeriodicUpdates() {
    // Update stats every 30 seconds
    setInterval(() => {
      if (authToken) {
        this.loadStats();
      }
    }, 30000);

    // Check server status every 10 seconds
    setInterval(() => {
      if (authToken) {
        this.checkServerStatus();
      }
    }, 10000);
  }

  // Content management methods
  async editContent(contentId) {
    // Implementation for content editing
    console.log('Edit content:', contentId);
  }

  async deleteContent(contentId) {
    if (confirm('Are you sure you want to delete this content?')) {
      try {
        await API.delete(`/content/${contentId}`);
        this.showNotification('Content deleted successfully', 'success');
        await this.loadRecentContent();
      } catch (error) {
        this.showNotification('Failed to delete content: ' + error.message, 'error');
      }
    }
  }
}

// Global instance
const adminDashboard = new AdminDashboard();

// Legacy WebSocket functions (keeping for compatibility)
adminDashboard.initWebSocket = function() {
  ws = new WebSocket('ws://localhost:3333');
  
  ws.onopen = () => {
    console.log('WebSocket connected');
    this.updateConnectionStatus('connected');
    // Authenticate WebSocket if we have a token
    if (authToken) {
      ws.send(JSON.stringify({
        type: 'authenticate',
        token: authToken
      }));
    }
  };
  
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    this.handleWebSocketMessage(data);
  };
  
  ws.onclose = () => {
    console.log('WebSocket disconnected');
    this.updateConnectionStatus('disconnected');
    // Reconnect after 3 seconds
    setTimeout(() => this.initWebSocket(), 3000);
  };
  
  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
    this.updateConnectionStatus('error');
  };
};

// Handle WebSocket messages
adminDashboard.handleWebSocketMessage = function(data) {
  switch(data.type) {
    case 'authenticated':
      console.log('WebSocket authenticated');
      // Subscribe to channels
      ws.send(JSON.stringify({
        type: 'subscribe',
        channels: ['build', 'content']
      }));
      break;
    case 'build-update':
      this.updateBuildStatus(data.data);
      break;
    case 'content-changed':
      this.refreshContentList();
      break;
  }
};

// Update connection status indicator
adminDashboard.updateConnectionStatus = function(status) {
  const indicator = document.getElementById('connection-status');
  if (indicator) {
    indicator.className = `connection-status ${status}`;
    indicator.textContent = status === 'connected' ? '🟢 Connected' : 
                           status === 'error' ? '🔴 Error' : '🟡 Connecting...';
  }
};

// Update build status
adminDashboard.updateBuildStatus = function(buildData) {
  const statusElement = document.getElementById('build-status');
  if (statusElement) {
    statusElement.textContent = buildData.status;
    statusElement.className = `build-status ${buildData.status}`;
  }
  
  if (buildData.status === 'completed') {
    this.showNotification('Build completed successfully!', 'success');
  } else if (buildData.status === 'failed') {
    this.showNotification('Build failed: ' + buildData.error, 'error');
  }
};

// Refresh content list
adminDashboard.refreshContentList = function() {
  this.loadRecentContent();
  this.loadStats();
};

// Legacy function compatibility
function showSection(section) {
  adminDashboard.currentSection = section;
  console.log('Switching to section:', section);
  // Here you would implement section switching logic
}

function stopServer() {
  adminDashboard.stopServer();
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  adminDashboard.init();
});

// Export for global access
window.adminDashboard = adminDashboard;

// Initialize WebSocket connection
function initWebSocket() {
  ws = new WebSocket('ws://localhost:3333');
  
  ws.onopen = () => {
    console.log('WebSocket connected');
    updateConnectionStatus('connected');
  };
  
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    handleWebSocketMessage(data);
  };
  
  ws.onclose = () => {
    console.log('WebSocket disconnected');
    updateConnectionStatus('disconnected');
    // Reconnect after 3 seconds
    setTimeout(initWebSocket, 3000);
  };
  
  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
    updateConnectionStatus('error');
  };
}

// Handle WebSocket messages
function handleWebSocketMessage(data) {
  switch(data.type) {
    case 'build-update':
      updateBuildStatus(data.data);
      break;
    case 'content-changed':
      refreshContentList();
      break;
  }
}

// Update connection status indicator
function updateConnectionStatus(status) {
  const indicator = document.getElementById('connection-status');
  if (indicator) {
    indicator.className = `connection-status ${status}`;
    indicator.textContent = status;
  }
}

// Load dashboard stats
async function loadDashboardStats() {
  try {
    const response = await fetch(`${API_BASE}/dashboard/stats`);
    const data = await response.json();
    
    updateStatsDisplay(data);
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

// Update stats display
function updateStatsDisplay(data) {
  // Update content stats
  if (data.content) {
    document.getElementById('total-content').textContent = data.content.total;
    document.getElementById('drafts-count').textContent = data.content.drafts;
    document.getElementById('published-count').textContent = data.content.published;
    document.getElementById('en-content').textContent = data.content.byLanguage.en;
    document.getElementById('es-content').textContent = data.content.byLanguage.es;
  }
  
  // Update storage stats
  if (data.storage) {
    document.getElementById('total-files').textContent = data.storage.total.count;
    document.getElementById('storage-size').textContent = formatBytes(data.storage.total.size);
    document.getElementById('images-count').textContent = data.storage.images.count;
    document.getElementById('pdfs-count').textContent = data.storage.pdfs.count;
    document.getElementById('videos-count').textContent = data.storage.videos.count;
  }
}

// Create new content
async function createContent() {
  const form = document.getElementById('create-content-form');
  const formData = new FormData(form);
  
  const data = {
    section: formData.get('section'),
    subsection: formData.get('subsection'),
    title: formData.get('title'),
    language: formData.get('language')
  };
  
  try {
    const response = await fetch(`${API_BASE}/dashboard/content`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    const result = await response.json();
    
    if (result.success) {
      showNotification('Content created successfully!', 'success');
      form.reset();
      refreshContentList();
    } else {
      showNotification('Error creating content: ' + result.error, 'error');
    }
  } catch (error) {
    showNotification('Error: ' + error.message, 'error');
  }
}

// Build site
async function buildSite(draft = false) {
  try {
    const response = await fetch(`${API_BASE}/dashboard/build`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ draft })
    });
    
    const result = await response.json();
    
    if (result.success) {
      showNotification('Build started successfully!', 'success');
      updateBuildStatus({ status: 'building', message: 'Building site...' });
    } else {
      showNotification('Build failed: ' + result.error, 'error');
    }
  } catch (error) {
    showNotification('Error: ' + error.message, 'error');
  }
}

// Upload files
async function uploadFiles() {
  const input = document.getElementById('file-upload');
  const files = input.files;
  
  if (files.length === 0) {
    showNotification('Please select files to upload', 'warning');
    return;
  }
  
  const formData = new FormData();
  for (let i = 0; i < files.length; i++) {
    formData.append('files', files[i]);
  }
  
  try {
    const response = await fetch(`${API_BASE}/dashboard/upload`, {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    
    if (result.success) {
      showNotification(`${result.files.length} files uploaded successfully!`, 'success');
      input.value = '';
      refreshFileList();
    } else {
      showNotification('Upload failed: ' + result.error, 'error');
    }
  } catch (error) {
    showNotification('Error: ' + error.message, 'error');
  }
}

// Refresh content list
async function refreshContentList() {
  try {
    const response = await fetch(`${API_BASE}/dashboard/content`);
    const data = await response.json();
    
    displayContentList(data.files);
  } catch (error) {
    console.error('Error loading content:', error);
  }
}

// Refresh file list
async function refreshFileList() {
  try {
    const response = await fetch(`${API_BASE}/dashboard/files`);
    const data = await response.json();
    
    displayFileList(data.files);
  } catch (error) {
    console.error('Error loading files:', error);
  }
}

// Display content list
function displayContentList(files) {
  const container = document.getElementById('content-list');
  if (!container) return;
  
  container.innerHTML = files.map(file => `
    <div class="content-item">
      <span class="content-path">${file}</span>
      <div class="content-actions">
        <button onclick="editContent('${file}')">Edit</button>
        <button onclick="previewContent('${file}')">Preview</button>
      </div>
    </div>
  `).join('');
}

// Display file list
function displayFileList(files) {
  const container = document.getElementById('file-list');
  if (!container) return;
  
  container.innerHTML = files.map(file => `
    <div class="file-item">
      <span class="file-name">${file.name}</span>
      <span class="file-size">${formatBytes(file.size)}</span>
      <div class="file-actions">
        <a href="${file.url}" target="_blank">View</a>
        <button onclick="deleteFile('${file.path}')">Delete</button>
      </div>
    </div>
  `).join('');
}

// Delete file
async function deleteFile(path) {
  if (!confirm('Are you sure you want to delete this file?')) return;
  
  try {
    const response = await fetch(`${API_BASE}/dashboard/files/${encodeURIComponent(path)}`, {
      method: 'DELETE'
    });
    
    const result = await response.json();
    
    if (result.success) {
      showNotification('File deleted successfully!', 'success');
      refreshFileList();
    } else {
      showNotification('Delete failed: ' + result.error, 'error');
    }
  } catch (error) {
    showNotification('Error: ' + error.message, 'error');
  }
}

// Show notification
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);
  
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 3000);
}

// Format bytes to human readable
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  initWebSocket();
  loadDashboardStats();
  refreshContentList();
  refreshFileList();
  
  // Refresh stats every 30 seconds
  setInterval(loadDashboardStats, 30000);
});

// Export functions for use in HTML
window.adminDashboard = {
  createContent,
  buildSite,
  uploadFiles,
  deleteFile,
  refreshContentList,
  refreshFileList
};
