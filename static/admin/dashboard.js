// Admin Dashboard JavaScript
const API_BASE = 'http://localhost:3335/api';
let ws = null;

// API Helper class - now uses auth from auth.js
class API {
  static async request(endpoint, options = {}) {
    // Use auth manager from auth.js if available
    if (window.auth && window.auth.isAuthenticated()) {
      return window.auth.makeAuthenticatedRequest(`${API_BASE}${endpoint}`, options);
    }
    
    // Fallback to basic request
    const config = {
      headers: {
        'Content-Type': 'application/json',
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
    loadThemePreference(); // Load theme before anything else
    this.checkAuthentication();
    this.initEventListeners();
    this.initWebSocket();
    await this.loadDashboardData();
    this.startPeriodicUpdates();
    loadUserProfile(); // Load user profile data into sidebar
  }

  checkAuthentication() {
    if (!window.auth || !window.auth.isAuthenticated()) {
      window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.pathname);
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
    // This method is deprecated - auth.js handles authentication
    // Redirect to login page
    window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.pathname);
  }

  handleUnauthorized() {
    if (window.auth) {
      window.auth.clearAuth();
      window.auth.redirectToLogin();
    } else {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      localStorage.removeItem('adminRefreshToken');
      window.location.href = 'login.html';
    }
  }

  showNotification(message, type = 'info') {
    // Use Toast notification if available, fallback to old system
    if (window.Toast) {
      switch(type) {
        case 'success':
          Toast.success(message);
          break;
        case 'error':
          Toast.error(message);
          break;
        case 'warning':
          Toast.warning(message);
          break;
        default:
          Toast.info(message);
      }
    } else {
      // Fallback to old notification system
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
    if (!stats) return;

    // Update content stats
    const contentUpdates = [
      ['total-content', stats.content?.total || 0],
      ['drafts-count', stats.content?.drafts || 0],
      ['published-count', stats.content?.published || 0],
      ['total-files', stats.storage?.total?.count || 0],
    ];

    contentUpdates.forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = value;
      }
    });

    // Update storage size display
    const storageSizeElement = document.getElementById('storage-size');
    if (storageSizeElement && stats.storage?.total?.size) {
      storageSizeElement.textContent = this.formatBytes(stats.storage.total.size);
    }
  }

  formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  async loadRecentContent() {
    try {
      const content = await API.get('/dashboard/recent');
      if (content) {
        this.displayRecentContent(content);
      }
    } catch (error) {
      console.error('Failed to load recent content:', error);
      // Show placeholder content if API fails
      this.displayRecentContent([]);
    }
  }

  displayRecentContent(content) {
    const container = document.getElementById('recent-content-list');
    if (!container) return;

    if (!content || content.length === 0) {
      container.innerHTML = `
        <div class="content-item">
          <div class="content-info">
            <h4>No recent content</h4>
            <p>Create your first content to see it here</p>
          </div>
          <div class="content-actions">
            <button class="btn btn-sm btn-primary" onclick="adminDashboard.createContent()">Create Content</button>
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = content.map(item => `
      <div class="content-item">
        <div class="content-info">
          <h4>${item.title}</h4>
          <p>${item.section} • ${item.language.toUpperCase()} • ${new Date(item.date).toLocaleDateString()}</p>
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
  async createContent() {
    // Get form data
    const form = document.getElementById('create-content-form');
    if (!form) {
      this.showNotification('Content creation form not found', 'error');
      return;
    }

    const formData = new FormData(form);
    const data = {
      section: formData.get('section'),
      subsection: formData.get('subsection'),
      title: formData.get('title'),
      language: formData.get('language') || 'en'
    };

    // Validate required fields
    if (!data.section || !data.subsection || !data.title) {
      this.showNotification('Please fill in all required fields', 'error');
      return;
    }

    try {
      this.showNotification('Creating content...', 'info');
      const result = await API.post('/dashboard/content', data);
      
      if (result && result.success) {
        this.showNotification('Content created successfully!', 'success');
        form.reset();
        await this.loadRecentContent();
        await this.loadStats();
      } else {
        this.showNotification('Failed to create content: ' + (result?.error || 'Unknown error'), 'error');
      }
    } catch (error) {
      this.showNotification('Failed to create content: ' + error.message, 'error');
    }
  }

  async editContent(contentId) {
    // Implementation for content editing
    console.log('Edit content:', contentId);
    this.showNotification('Content editing will be implemented in the content editor', 'info');
  }

  async deleteContent(contentId) {
    if (confirm('Are you sure you want to delete this content?')) {
      try {
        await API.delete(`/content/${contentId}`);
        this.showNotification('Content deleted successfully', 'success');
        await this.loadRecentContent();
        await this.loadStats();
      } catch (error) {
        this.showNotification('Failed to delete content: ' + error.message, 'error');
      }
    }
  }

  async uploadFiles() {
    const input = document.getElementById('file-upload');
    if (!input || !input.files || input.files.length === 0) {
      this.showNotification('Please select files to upload', 'warning');
      return;
    }

    const formData = new FormData();
    for (let i = 0; i < input.files.length; i++) {
      formData.append('files', input.files[i]);
    }

    try {
      this.showNotification('Uploading files...', 'info');
      
      // Use direct fetch for file upload to handle FormData properly
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE}/dashboard/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const result = await response.json();

      if (response.ok && result.success) {
        this.showNotification(`Successfully uploaded ${result.files.length} file(s)!`, 'success');
        input.value = '';
        await this.loadStats(); // Refresh storage stats
      } else {
        this.showNotification('Upload failed: ' + (result.error || 'Unknown error'), 'error');
      }
    } catch (error) {
      this.showNotification('Upload failed: ' + error.message, 'error');
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

// Global functions for dashboard HTML
function handleLogout() {
  if (confirm('Are you sure you want to logout?')) {
    adminDashboard.logout();
  }
}

function toggleTheme() {
  // Simple theme toggle functionality
  const currentTheme = document.body.classList.contains('light-theme') ? 'light' : 'dark';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  
  if (newTheme === 'light') {
    document.body.classList.add('light-theme');
  } else {
    document.body.classList.remove('light-theme');
  }
  
  // Store preference
  localStorage.setItem('theme', newTheme);
  
  // Show notification
  adminDashboard.showNotification(`Switched to ${newTheme} theme`, 'info');
}

// Load user profile data
function loadUserProfile() {
  try {
    const userStr = localStorage.getItem('adminUser');
    if (userStr) {
      const user = JSON.parse(userStr);
      
      // Update user name and role in sidebar
      const userNameEl = document.getElementById('user-name');
      const userRoleEl = document.getElementById('user-role');
      
      if (userNameEl) {
        userNameEl.textContent = user.username || user.email || 'Admin User';
      }
      
      if (userRoleEl) {
        userRoleEl.textContent = user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Administrator';
      }
    }
  } catch (error) {
    console.error('Failed to load user profile:', error);
  }
}

// Load theme preference
function loadThemePreference() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'light') {
    document.body.classList.add('light-theme');
  }
}

// Export functions for use in HTML
window.adminDashboard = {
  createContent,
  buildSite,
  uploadFiles,
  deleteFile,
  refreshContentList,
  refreshFileList
};

// Export global functions
window.handleLogout = handleLogout;
window.toggleTheme = toggleTheme;
