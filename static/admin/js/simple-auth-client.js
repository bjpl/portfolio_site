// Simple Authentication Client
class SimpleAuth {
  constructor() {
    this.baseUrl = window.location.origin;
    this.token = localStorage.getItem('auth-token');
  }

  async login(username, password) {
    try {
      const response = await fetch(`${this.baseUrl}/.netlify/functions/simple-auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Store token and user data
        localStorage.setItem('auth-token', data.token);
        localStorage.setItem('user-data', JSON.stringify(data.user));
        return { success: true, user: data.user };
      } else {
        return { success: false, error: data.error || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error' };
    }
  }

  logout() {
    localStorage.removeItem('auth-token');
    localStorage.removeItem('user-data');
    window.location.href = '/admin/simple-login.html';
  }

  isAuthenticated() {
    return !!this.token;
  }

  getUser() {
    const userData = localStorage.getItem('user-data');
    return userData ? JSON.parse(userData) : null;
  }

  redirectToDashboard() {
    window.location.href = '/admin/dashboard.html';
  }

  checkAuth() {
    if (!this.isAuthenticated()) {
      window.location.href = '/admin/simple-login.html';
      return false;
    }
    return true;
  }
}

// Global auth instance
window.simpleAuth = new SimpleAuth();

// Login form handler
async function handleLogin(event) {
  event.preventDefault();
  
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const errorDiv = document.getElementById('error-message');
  const loginBtn = document.getElementById('login-btn');

  // Clear previous errors
  errorDiv.style.display = 'none';
  loginBtn.disabled = true;
  loginBtn.textContent = 'Logging in...';

  try {
    const result = await window.simpleAuth.login(username, password);
    
    if (result.success) {
      // Success - redirect to dashboard
      window.simpleAuth.redirectToDashboard();
    } else {
      // Show error
      errorDiv.textContent = result.error;
      errorDiv.style.display = 'block';
    }
  } catch (error) {
    errorDiv.textContent = 'An unexpected error occurred';
    errorDiv.style.display = 'block';
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = 'Login';
  }
}

// Auto-redirect if already authenticated
document.addEventListener('DOMContentLoaded', function() {
  if (window.location.pathname.includes('simple-login.html') && window.simpleAuth.isAuthenticated()) {
    window.simpleAuth.redirectToDashboard();
  }
});