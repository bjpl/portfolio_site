// User Management JavaScript
const API_BASE = 'http://localhost:3335/api';

class UserManagement {
  constructor() {
    this.users = [];
    this.stats = {};
    this.currentPage = 1;
    this.limit = 10;
  }

  async init() {
    this.checkAuthentication();
    await this.loadUserStats();
    await this.loadUsers();
    await this.loadRecentActivity();
    this.setupEventListeners();
  }

  checkAuthentication() {
    if (!window.auth || !window.auth.isAuthenticated()) {
      window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.pathname);
      return false;
    }
    return true;
  }

  setupEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('user-search');
    if (searchInput) {
      searchInput.addEventListener('input', this.debounce(() => {
        this.loadUsers();
      }, 300));
    }

    // Filter by role
    const roleFilter = document.getElementById('role-filter');
    if (roleFilter) {
      roleFilter.addEventListener('change', () => {
        this.loadUsers();
      });
    }

    // Filter by status
    const statusFilter = document.getElementById('status-filter');
    if (statusFilter) {
      statusFilter.addEventListener('change', () => {
        this.loadUsers();
      });
    }
  }

  async loadUserStats() {
    try {
      const stats = await this.makeRequest('/users/stats');
      if (stats) {
        this.updateStatsDisplay(stats);
      }
    } catch (error) {
      console.error('Failed to load user stats:', error);
    }
  }

  updateStatsDisplay(stats) {
    const updates = [
      ['total-users', stats.totalUsers || 0],
      ['active-users', stats.recentLogins || 0],
      ['admin-count', stats.adminCount || 0],
    ];

    updates.forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = value;
      }
    });

    // Update last login
    const lastLoginElement = document.getElementById('last-login');
    if (lastLoginElement && stats.lastLogin) {
      lastLoginElement.textContent = this.timeAgo(new Date(stats.lastLogin));
    }
  }

  async loadUsers() {
    try {
      const searchInput = document.getElementById('user-search');
      const roleFilter = document.getElementById('role-filter');
      const statusFilter = document.getElementById('status-filter');

      const params = new URLSearchParams({
        page: this.currentPage,
        limit: this.limit
      });

      if (searchInput?.value) {
        params.append('search', searchInput.value);
      }

      if (roleFilter?.value) {
        params.append('role', roleFilter.value);
      }

      if (statusFilter?.value) {
        params.append('active', statusFilter.value);
      }

      const response = await this.makeRequest(`/users?${params.toString()}`);
      if (response) {
        this.users = response.users;
        this.displayUsers(response.users);
        this.updatePagination(response.pagination);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
      this.displayUsers([]);
    }
  }

  displayUsers(users) {
    const container = document.getElementById('users-list');
    if (!container) return;

    if (!users || users.length === 0) {
      container.innerHTML = `
        <div class="content-item">
          <div class="content-info">
            <h4>No users found</h4>
            <p>No users match the current filters</p>
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = users.map(user => `
      <div class="content-item" data-user-id="${user.id}">
        <div class="content-info">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div class="user-avatar" style="width: 40px; height: 40px; font-size: 16px; background: ${this.getUserColor(user.role)};">
              ${user.firstName ? user.firstName.charAt(0).toUpperCase() : user.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <h4>${user.username}</h4>
              <p>${user.email} • ${this.capitalizeFirst(user.role)} • Last login: ${user.lastLoginAt ? this.timeAgo(new Date(user.lastLoginAt)) : 'Never'}</p>
            </div>
          </div>
        </div>
        <div class="content-actions">
          ${user.isActive ? 
            '<span class="badge badge-success">Active</span>' : 
            '<span style="color: var(--text-muted); font-size: 12px;">Inactive</span>'
          }
          <button class="btn btn-sm" onclick="userManagement.editUser(${user.id})">Edit</button>
          <button class="btn btn-sm ${user.isActive ? 'btn-danger' : 'btn-secondary'}" 
                  onclick="userManagement.toggleUserStatus(${user.id}, ${user.isActive})">
            ${user.isActive ? 'Disable' : 'Enable'}
          </button>
        </div>
      </div>
    `).join('');
  }

  getUserColor(role) {
    const colors = {
      admin: 'var(--primary)',
      editor: 'var(--secondary)',
      author: 'var(--warning)',
      viewer: 'var(--text-muted)'
    };
    return colors[role] || 'var(--text-muted)';
  }

  async loadRecentActivity() {
    try {
      const activity = await this.makeRequest('/users/activity?limit=10');
      if (activity) {
        this.displayRecentActivity(activity);
      }
    } catch (error) {
      console.error('Failed to load user activity:', error);
    }
  }

  displayRecentActivity(activities) {
    const container = document.getElementById('recent-activity-list');
    if (!container) return;

    if (!activities || activities.length === 0) {
      container.innerHTML = `
        <div class="content-item">
          <div class="content-info">
            <h4>No recent activity</h4>
            <p>No user activity to display</p>
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = activities.map(activity => `
      <div class="content-item">
        <div class="content-info">
          <h4>User Login</h4>
          <p>${activity.username} logged in • ${this.timeAgo(new Date(activity.lastLoginAt))}</p>
        </div>
        <div class="content-actions">
          <span class="badge badge-success">Login</span>
        </div>
      </div>
    `).join('');
  }

  async createUser() {
    const username = prompt('Enter username:');
    const email = prompt('Enter email:');
    const password = prompt('Enter password:');
    const role = prompt('Enter role (admin, editor, author, viewer):', 'author');

    if (!username || !email || !password) {
      this.showNotification('All fields are required', 'error');
      return;
    }

    try {
      await this.makeRequest('/users', {
        method: 'POST',
        body: { username, email, password, role }
      });

      this.showNotification('User created successfully', 'success');
      await this.loadUsers();
      await this.loadUserStats();
    } catch (error) {
      this.showNotification('Failed to create user: ' + error.message, 'error');
    }
  }

  async editUser(userId) {
    const user = this.users.find(u => u.id === userId);
    if (!user) return;

    const firstName = prompt('First Name:', user.firstName || '');
    const lastName = prompt('Last Name:', user.lastName || '');
    const role = prompt('Role (admin, editor, author, viewer):', user.role);

    try {
      await this.makeRequest(`/users/${userId}`, {
        method: 'PUT',
        body: { firstName, lastName, role }
      });

      this.showNotification('User updated successfully', 'success');
      await this.loadUsers();
      await this.loadUserStats();
    } catch (error) {
      this.showNotification('Failed to update user: ' + error.message, 'error');
    }
  }

  async toggleUserStatus(userId, isCurrentlyActive) {
    const action = isCurrentlyActive ? 'disable' : 'enable';
    
    if (!confirm(`Are you sure you want to ${action} this user?`)) {
      return;
    }

    try {
      await this.makeRequest(`/users/${userId}`, {
        method: 'PUT',
        body: { isActive: !isCurrentlyActive }
      });

      this.showNotification(`User ${action}d successfully`, 'success');
      await this.loadUsers();
      await this.loadUserStats();
    } catch (error) {
      this.showNotification(`Failed to ${action} user: ` + error.message, 'error');
    }
  }

  async resetUserPassword(userId) {
    const newPassword = prompt('Enter new password:');
    if (!newPassword) return;

    try {
      await this.makeRequest(`/users/${userId}/reset-password`, {
        method: 'POST',
        body: { newPassword }
      });

      this.showNotification('Password reset successfully', 'success');
    } catch (error) {
      this.showNotification('Failed to reset password: ' + error.message, 'error');
    }
  }

  updatePagination(pagination) {
    // Implementation for pagination controls
    console.log('Pagination:', pagination);
  }

  async makeRequest(endpoint, options = {}) {
    const token = localStorage.getItem('adminToken');
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      ...options
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, config);
      
      if (response.status === 401) {
        window.location.href = 'login.html';
        return null;
      }

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  showNotification(message, type = 'info') {
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
      alert(message);
    }
  }

  capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  timeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString();
  }

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
  }
}

// Global instance
const userManagement = new UserManagement();

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  userManagement.init();
});

// Global functions for HTML
function createUser() {
  userManagement.createUser();
}

function refreshUsers() {
  userManagement.loadUsers();
}

function handleLogout() {
  if (confirm('Are you sure you want to logout?')) {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    window.location.href = 'login.html';
  }
}

function toggleTheme() {
  document.body.classList.toggle('light-theme');
}