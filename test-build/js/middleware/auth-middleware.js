/**
 * Authentication Middleware for Route Protection
 * Provides client-side route protection and auth guards
 */

class AuthMiddleware {
  constructor(authService) {
    this.auth = authService;
    this.protectedRoutes = new Set();
    this.roleBasedRoutes = new Map();
    this.permissionBasedRoutes = new Map();
    this.redirectPath = '/login.html';
    this.adminPath = '/admin/';
    
    this.init();
  }

  /**
   * Initialize middleware
   */
  init() {
    // Set up default protected routes
    this.addProtectedRoute('/admin/');
    this.addProtectedRoute('/admin/dashboard.html');
    this.addProtectedRoute('/admin/posts/');
    this.addProtectedRoute('/admin/users/');
    this.addProtectedRoute('/admin/settings/');
    
    // Set up role-based routes
    this.addRoleBasedRoute('/admin/', ['admin', 'super_admin']);
    this.addRoleBasedRoute('/admin/users/', ['admin', 'super_admin']);
    this.addRoleBasedRoute('/admin/settings/', ['super_admin']);
    
    // Set up permission-based routes
    this.addPermissionBasedRoute('/admin/posts/', ['write:posts']);
    this.addPermissionBasedRoute('/admin/media/', ['manage:media']);

    // Listen for auth state changes
    this.auth.on('login', () => this.onAuthStateChange());
    this.auth.on('logout', () => this.onAuthStateChange());
    this.auth.on('sessionRestored', () => this.onAuthStateChange());
    this.auth.on('tokenExpired', () => this.onTokenExpired());

    // Set up route monitoring
    this.setupRouteMonitoring();
    
    // Initial route check
    this.checkCurrentRoute();
  }

  /**
   * Add protected route
   * @param {string} route - Route path or pattern
   */
  addProtectedRoute(route) {
    this.protectedRoutes.add(route);
  }

  /**
   * Remove protected route
   * @param {string} route - Route path or pattern
   */
  removeProtectedRoute(route) {
    this.protectedRoutes.delete(route);
  }

  /**
   * Add role-based route
   * @param {string} route - Route path
   * @param {Array} allowedRoles - Array of allowed roles
   */
  addRoleBasedRoute(route, allowedRoles) {
    this.roleBasedRoutes.set(route, allowedRoles);
  }

  /**
   * Add permission-based route
   * @param {string} route - Route path
   * @param {Array} requiredPermissions - Array of required permissions
   */
  addPermissionBasedRoute(route, requiredPermissions) {
    this.permissionBasedRoutes.set(route, requiredPermissions);
  }

  /**
   * Check if current route requires authentication
   * @returns {boolean} True if route is protected
   */
  isCurrentRouteProtected() {
    const currentPath = window.location.pathname;
    return this.isRouteProtected(currentPath);
  }

  /**
   * Check if specific route requires authentication
   * @param {string} path - Route path to check
   * @returns {boolean} True if route is protected
   */
  isRouteProtected(path) {
    for (const route of this.protectedRoutes) {
      if (this.matchRoute(path, route)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if current user can access current route
   * @returns {Object} Access result with status and reason
   */
  canAccessCurrentRoute() {
    const currentPath = window.location.pathname;
    return this.canAccessRoute(currentPath);
  }

  /**
   * Check if current user can access specific route
   * @param {string} path - Route path to check
   * @returns {Object} Access result
   */
  canAccessRoute(path) {
    // Check if route is protected
    if (!this.isRouteProtected(path)) {
      return { allowed: true, reason: 'public_route' };
    }

    // Check authentication
    if (!this.auth.isAuthenticated()) {
      return { allowed: false, reason: 'not_authenticated' };
    }

    // Check role-based access
    for (const [route, allowedRoles] of this.roleBasedRoutes) {
      if (this.matchRoute(path, route)) {
        const userRole = this.auth.getCurrentUser()?.role;
        if (!allowedRoles.includes(userRole)) {
          return { 
            allowed: false, 
            reason: 'insufficient_role',
            required: allowedRoles,
            current: userRole
          };
        }
      }
    }

    // Check permission-based access
    for (const [route, requiredPermissions] of this.permissionBasedRoutes) {
      if (this.matchRoute(path, route)) {
        for (const permission of requiredPermissions) {
          if (!this.auth.hasPermission(permission)) {
            return { 
              allowed: false, 
              reason: 'insufficient_permissions',
              required: requiredPermissions,
              missing: permission
            };
          }
        }
      }
    }

    return { allowed: true, reason: 'authorized' };
  }

  /**
   * Route matching with wildcard support
   * @param {string} currentPath - Current path
   * @param {string} routePattern - Route pattern to match
   * @returns {boolean} True if route matches
   */
  matchRoute(currentPath, routePattern) {
    // Exact match
    if (currentPath === routePattern) {
      return true;
    }

    // Directory match (ends with /)
    if (routePattern.endsWith('/') && currentPath.startsWith(routePattern)) {
      return true;
    }

    // Wildcard match
    if (routePattern.includes('*')) {
      const regex = new RegExp('^' + routePattern.replace(/\*/g, '.*') + '$');
      return regex.test(currentPath);
    }

    return false;
  }

  /**
   * Guard function for protecting routes
   * @param {Function} callback - Function to execute if authorized
   * @param {Object} options - Guard options
   */
  guard(callback, options = {}) {
    const access = this.canAccessCurrentRoute();
    
    if (!access.allowed) {
      this.handleUnauthorizedAccess(access, options);
      return false;
    }

    // Execute callback if authorized
    if (typeof callback === 'function') {
      callback();
    }
    
    return true;
  }

  /**
   * Admin guard - specifically for admin routes
   * @param {Function} callback - Function to execute if admin
   * @param {Object} options - Guard options
   */
  adminGuard(callback, options = {}) {
    if (!this.auth.isAuthenticated()) {
      this.redirectToLogin();
      return false;
    }

    if (!this.auth.isAdmin()) {
      this.showAccessDenied('Admin access required');
      return false;
    }

    if (typeof callback === 'function') {
      callback();
    }
    
    return true;
  }

  /**
   * Permission guard - check specific permission
   * @param {string|Array} permissions - Required permission(s)
   * @param {Function} callback - Function to execute if authorized
   * @param {Object} options - Guard options
   */
  permissionGuard(permissions, callback, options = {}) {
    if (!this.auth.isAuthenticated()) {
      this.redirectToLogin();
      return false;
    }

    const requiredPermissions = Array.isArray(permissions) ? permissions : [permissions];
    
    for (const permission of requiredPermissions) {
      if (!this.auth.hasPermission(permission)) {
        this.showAccessDenied(`Permission required: ${permission}`);
        return false;
      }
    }

    if (typeof callback === 'function') {
      callback();
    }
    
    return true;
  }

  /**
   * Role guard - check specific role
   * @param {string|Array} roles - Required role(s)
   * @param {Function} callback - Function to execute if authorized
   * @param {Object} options - Guard options
   */
  roleGuard(roles, callback, options = {}) {
    if (!this.auth.isAuthenticated()) {
      this.redirectToLogin();
      return false;
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    const userRole = this.auth.getCurrentUser()?.role;
    
    if (!allowedRoles.includes(userRole)) {
      this.showAccessDenied(`Role required: ${allowedRoles.join(' or ')}`);
      return false;
    }

    if (typeof callback === 'function') {
      callback();
    }
    
    return true;
  }

  /**
   * Handle unauthorized access attempts
   * @param {Object} accessResult - Result from canAccessRoute
   * @param {Object} options - Handler options
   */
  handleUnauthorizedAccess(accessResult, options = {}) {
    const { reason } = accessResult;
    
    switch (reason) {
      case 'not_authenticated':
        this.redirectToLogin();
        break;
        
      case 'insufficient_role':
        this.showAccessDenied(`Access denied. Required role: ${accessResult.required.join(' or ')}`);
        break;
        
      case 'insufficient_permissions':
        this.showAccessDenied(`Access denied. Missing permission: ${accessResult.missing}`);
        break;
        
      default:
        this.showAccessDenied('Access denied');
    }
  }

  /**
   * Redirect to login page
   * @param {string} returnUrl - URL to return to after login
   */
  redirectToLogin(returnUrl = null) {
    const returnTo = returnUrl || window.location.pathname;
    const loginUrl = `${this.redirectPath}?returnTo=${encodeURIComponent(returnTo)}`;
    
    // Show loading indicator
    this.showLoadingOverlay('Redirecting to login...');
    
    setTimeout(() => {
      window.location.href = loginUrl;
    }, 1000);
  }

  /**
   * Show access denied message
   * @param {string} message - Denial message
   */
  showAccessDenied(message = 'Access denied') {
    // Create modal overlay
    const modal = document.createElement('div');
    modal.className = 'auth-modal-overlay';
    modal.innerHTML = `
      <div class="auth-modal">
        <div class="auth-modal-header">
          <h3>Access Denied</h3>
        </div>
        <div class="auth-modal-body">
          <p>${message}</p>
          <p>Please contact an administrator if you believe this is an error.</p>
        </div>
        <div class="auth-modal-footer">
          <button class="btn btn-primary" onclick="history.back()">Go Back</button>
          <button class="btn btn-secondary" onclick="window.location.href='/'">Home</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (modal.parentNode) {
        modal.parentNode.removeChild(modal);
      }
    }, 5000);
  }

  /**
   * Show loading overlay
   * @param {string} message - Loading message
   */
  showLoadingOverlay(message = 'Loading...') {
    const existing = document.querySelector('.auth-loading-overlay');
    if (existing) {
      existing.remove();
    }

    const overlay = document.createElement('div');
    overlay.className = 'auth-loading-overlay';
    overlay.innerHTML = `
      <div class="auth-loading">
        <div class="auth-spinner"></div>
        <p>${message}</p>
      </div>
    `;

    document.body.appendChild(overlay);
  }

  /**
   * Set up route monitoring for SPA-like behavior
   */
  setupRouteMonitoring() {
    // Monitor popstate events (back/forward)
    window.addEventListener('popstate', () => {
      this.checkCurrentRoute();
    });

    // Monitor pushState/replaceState
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function(...args) {
      originalPushState.apply(this, args);
      setTimeout(() => this.checkCurrentRoute(), 0);
    }.bind(this);

    history.replaceState = function(...args) {
      originalReplaceState.apply(this, args);
      setTimeout(() => this.checkCurrentRoute(), 0);
    }.bind(this);

    // Monitor hash changes
    window.addEventListener('hashchange', () => {
      this.checkCurrentRoute();
    });
  }

  /**
   * Check current route authorization
   */
  checkCurrentRoute() {
    if (!this.isCurrentRouteProtected()) {
      return;
    }

    const access = this.canAccessCurrentRoute();
    if (!access.allowed) {
      this.handleUnauthorizedAccess(access);
    }
  }

  /**
   * Handle auth state changes
   */
  onAuthStateChange() {
    // Remove any existing overlays
    this.removeOverlays();
    
    // Re-check current route
    setTimeout(() => {
      this.checkCurrentRoute();
    }, 100);
  }

  /**
   * Handle token expiration
   */
  onTokenExpired() {
    this.showTokenExpiredMessage();
    setTimeout(() => {
      this.redirectToLogin();
    }, 3000);
  }

  /**
   * Show token expired message
   */
  showTokenExpiredMessage() {
    const modal = document.createElement('div');
    modal.className = 'auth-modal-overlay';
    modal.innerHTML = `
      <div class="auth-modal">
        <div class="auth-modal-header">
          <h3>Session Expired</h3>
        </div>
        <div class="auth-modal-body">
          <p>Your session has expired. You will be redirected to the login page.</p>
        </div>
        <div class="auth-modal-footer">
          <button class="btn btn-primary" onclick="window.location.href='${this.redirectPath}'">Login Now</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  }

  /**
   * Remove auth overlays
   */
  removeOverlays() {
    const overlays = document.querySelectorAll('.auth-modal-overlay, .auth-loading-overlay');
    overlays.forEach(overlay => overlay.remove());
  }

  /**
   * Create auth-protected link
   * @param {string} href - Link destination
   * @param {string} text - Link text
   * @param {Object} options - Link options
   * @returns {HTMLElement} Link element
   */
  createProtectedLink(href, text, options = {}) {
    const link = document.createElement('a');
    link.href = href;
    link.textContent = text;
    
    if (options.className) {
      link.className = options.className;
    }

    link.addEventListener('click', (e) => {
      const access = this.canAccessRoute(href);
      if (!access.allowed) {
        e.preventDefault();
        this.handleUnauthorizedAccess(access);
      }
    });

    return link;
  }

  /**
   * Get current user's navigation menu items based on permissions
   * @returns {Array} Array of allowed menu items
   */
  getAllowedMenuItems() {
    const user = this.auth.getCurrentUser();
    if (!user) {
      return [];
    }

    const menuItems = [
      {
        title: 'Dashboard',
        href: '/admin/dashboard.html',
        permission: 'access:admin'
      },
      {
        title: 'Posts',
        href: '/admin/posts/',
        permission: 'write:posts'
      },
      {
        title: 'Media',
        href: '/admin/media/',
        permission: 'manage:media'
      },
      {
        title: 'Users',
        href: '/admin/users/',
        permission: 'manage:users'
      },
      {
        title: 'Settings',
        href: '/admin/settings/',
        role: 'super_admin'
      }
    ];

    return menuItems.filter(item => {
      if (item.role) {
        return this.auth.hasRole(item.role);
      }
      if (item.permission) {
        return this.auth.hasPermission(item.permission);
      }
      return true;
    });
  }
}

// Global auth middleware instance
let authMiddleware = null;

// Initialize auth middleware when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  // Wait for AuthService to be available
  if (typeof AuthService !== 'undefined') {
    const authService = new AuthService();
    authMiddleware = new AuthMiddleware(authService);
    
    // Make middleware globally available
    window.authMiddleware = authMiddleware;
  }
});

// Export for use in other modules
window.AuthMiddleware = AuthMiddleware;

export default AuthMiddleware;