/**
 * Authentication System Initialization
 * Bootstraps the complete authentication system
 */

class AuthSystemInit {
  constructor() {
    this.authService = null;
    this.authMiddleware = null;
    this.authUI = null;
    this.isInitialized = false;
    
    this.init();
  }

  /**
   * Initialize the complete authentication system
   */
  async init() {
    try {
      // Wait for DOM to be ready
      await this.waitForDOM();
      
      // Load required dependencies
      await this.loadDependencies();
      
      // Initialize services in order
      await this.initializeServices();
      
      // Set up global access
      this.setupGlobalAccess();
      
      // Set up automatic route protection
      this.setupRouteProtection();
      
      // Set up global event listeners
      this.setupEventListeners();
      
      console.log('✅ Authentication system initialized successfully');
      this.isInitialized = true;
      
      // Emit initialization event
      this.emitEvent('auth:initialized', {
        authService: this.authService,
        authMiddleware: this.authMiddleware,
        authUI: this.authUI
      });
      
    } catch (error) {
      console.error('❌ Authentication system initialization failed:', error);
      throw error;
    }
  }

  /**
   * Wait for DOM to be ready
   */
  waitForDOM() {
    return new Promise((resolve) => {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', resolve);
      } else {
        resolve();
      }
    });
  }

  /**
   * Load required dependencies
   */
  async loadDependencies() {
    const requiredClasses = [
      'CryptoUtils',
      'StorageUtils', 
      'JWTUtils',
      'AuthService',
      'AuthMiddleware',
      'AuthUI'
    ];
    
    // Check if all required classes are available
    for (const className of requiredClasses) {
      if (typeof window[className] === 'undefined') {
        throw new Error(`Required class ${className} is not available`);
      }
    }
    
    console.log('✅ All authentication dependencies loaded');
  }

  /**
   * Initialize authentication services
   */
  async initializeServices() {
    // Initialize AuthService (core authentication)
    console.log('🔧 Initializing AuthService...');
    this.authService = new AuthService();
    await this.authService.init();
    
    // Initialize AuthMiddleware (route protection)
    console.log('🔧 Initializing AuthMiddleware...');
    this.authMiddleware = new AuthMiddleware(this.authService);
    
    // Initialize AuthUI (user interface) - only if we have UI containers
    console.log('🔧 Initializing AuthUI...');
    this.authUI = new AuthUI(this.authService);
    
    console.log('✅ All authentication services initialized');
  }

  /**
   * Set up global access to authentication services
   */
  setupGlobalAccess() {
    // Make services globally available
    window.authService = this.authService;
    window.authMiddleware = this.authMiddleware;
    window.authUI = this.authUI;
    window.authSystem = this;
    
    // Set up convenience methods
    window.isAuthenticated = () => this.authService.isAuthenticated();
    window.getCurrentUser = () => this.authService.getCurrentUser();
    window.hasPermission = (permission) => this.authService.hasPermission(permission);
    window.isAdmin = () => this.authService.isAdmin();
    
    // Set up auth guards
    window.authGuard = (callback, options) => this.authMiddleware.guard(callback, options);
    window.adminGuard = (callback, options) => this.authMiddleware.adminGuard(callback, options);
    window.permissionGuard = (permissions, callback, options) => 
      this.authMiddleware.permissionGuard(permissions, callback, options);
    
    console.log('✅ Global authentication methods available');
  }

  /**
   * Set up automatic route protection
   */
  setupRouteProtection() {
    // Add CSS classes to body based on auth state
    const updateBodyClasses = () => {
      const body = document.body;
      if (this.authService.isAuthenticated()) {
        body.classList.add('auth-authenticated');
        body.classList.remove('auth-unauthenticated');
      } else {
        body.classList.add('auth-unauthenticated');
        body.classList.remove('auth-authenticated');
      }
    };

    // Update classes on auth state changes
    this.authService.on('login', updateBodyClasses);
    this.authService.on('logout', updateBodyClasses);
    this.authService.on('sessionRestored', updateBodyClasses);
    
    // Initial class update
    updateBodyClasses();
    
    // Set up link protection for data-auth attributes
    this.setupLinkProtection();
    
    console.log('✅ Route protection enabled');
  }

  /**
   * Set up protection for links with data-auth attributes
   */
  setupLinkProtection() {
    document.addEventListener('click', (e) => {
      const link = e.target.closest('[data-auth]');
      if (!link) return;
      
      const authRequirement = link.dataset.auth;
      
      // Handle different auth requirements
      switch (authRequirement) {
        case 'required':
          if (!this.authService.isAuthenticated()) {
            e.preventDefault();
            this.authMiddleware.redirectToLogin();
          }
          break;
          
        case 'admin':
          if (!this.authService.isAdmin()) {
            e.preventDefault();
            this.authMiddleware.showAccessDenied('Admin access required');
          }
          break;
          
        default:
          // Check for specific permission
          if (authRequirement.startsWith('permission:')) {
            const permission = authRequirement.replace('permission:', '');
            if (!this.authService.hasPermission(permission)) {
              e.preventDefault();
              this.authMiddleware.showAccessDenied(`Permission required: ${permission}`);
            }
          } else if (authRequirement.startsWith('role:')) {
            const role = authRequirement.replace('role:', '');
            if (!this.authService.hasRole(role)) {
              e.preventDefault();
              this.authMiddleware.showAccessDenied(`Role required: ${role}`);
            }
          }
      }
    });
  }

  /**
   * Set up global event listeners
   */
  setupEventListeners() {
    // Handle browser tab visibility changes (pause/resume token refresh)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Tab is hidden, could pause some operations
        console.log('🔸 Tab hidden - auth operations may be paused');
      } else {
        // Tab is visible, resume operations
        console.log('🔸 Tab visible - resuming auth operations');
        // Check if token needs refresh
        if (this.authService.isAuthenticated()) {
          this.authService.refreshToken();
        }
      }
    });
    
    // Handle online/offline status
    window.addEventListener('online', () => {
      console.log('🔸 Connection restored');
      this.emitEvent('auth:online');
    });
    
    window.addEventListener('offline', () => {
      console.log('🔸 Connection lost - operating in offline mode');
      this.emitEvent('auth:offline');
    });
    
    // Handle beforeunload (page/tab closing)
    window.addEventListener('beforeunload', () => {
      // Could save session state or perform cleanup
      console.log('🔸 Page unloading - auth cleanup if needed');
    });
    
    console.log('✅ Global event listeners set up');
  }

  /**
   * Create default admin user (development helper)
   */
  async createDefaultAdmin() {
    try {
      await this.authService.register('admin', 'admin123!', 'admin@localhost', 'admin');
      console.log('✅ Default admin user created: admin / admin123!');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️ Default admin user already exists');
      } else {
        console.error('❌ Failed to create default admin user:', error);
      }
    }
  }

  /**
   * Get authentication status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      authenticated: this.authService?.isAuthenticated() || false,
      user: this.authService?.getCurrentUser() || null,
      services: {
        authService: !!this.authService,
        authMiddleware: !!this.authMiddleware,
        authUI: !!this.authUI
      }
    };
  }

  /**
   * Reinitialize authentication system
   */
  async reinitialize() {
    console.log('🔄 Reinitializing authentication system...');
    
    // Clear existing state
    this.authService = null;
    this.authMiddleware = null;
    this.authUI = null;
    this.isInitialized = false;
    
    // Clear global references
    delete window.authService;
    delete window.authMiddleware;
    delete window.authUI;
    delete window.authSystem;
    
    // Reinitialize
    await this.init();
  }

  /**
   * Emit custom events
   */
  emitEvent(eventName, data) {
    const event = new CustomEvent(eventName, {
      detail: data,
      bubbles: true,
      cancelable: true
    });
    
    document.dispatchEvent(event);
  }

  /**
   * Development helpers
   */
  dev = {
    createAdmin: () => this.createDefaultAdmin(),
    
    clearAllData: async () => {
      if (confirm('Clear all authentication data? This cannot be undone.')) {
        await this.authService.storage.clearAllData();
        console.log('🗑️ All authentication data cleared');
        location.reload();
      }
    },
    
    getStorageData: async () => {
      const data = {};
      const stores = ['credentials', 'sessions', 'users', 'settings'];
      
      for (const store of stores) {
        const transaction = this.authService.storage.db.transaction(store, 'readonly');
        const objectStore = transaction.objectStore(store);
        const request = objectStore.getAll();
        
        data[store] = await new Promise((resolve) => {
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => resolve([]);
        });
      }
      
      return data;
    },
    
    login: (username = 'admin', password = 'admin123!') => {
      return this.authService.login(username, password);
    },
    
    status: () => this.getStatus()
  };
}

// Global initialization
let authSystemInstance = null;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAuthSystem);
} else {
  initAuthSystem();
}

async function initAuthSystem() {
  try {
    authSystemInstance = new AuthSystemInit();
    console.log('🚀 Authentication system starting...');
  } catch (error) {
    console.error('💥 Failed to start authentication system:', error);
  }
}

// Make initialization available globally
window.AuthSystemInit = AuthSystemInit;
window.initAuthSystem = initAuthSystem;

// Development console helpers
if (typeof window !== 'undefined') {
  window.auth = {
    get status() {
      return authSystemInstance?.getStatus() || { initialized: false };
    },
    get dev() {
      return authSystemInstance?.dev || {};
    },
    reinit: () => authSystemInstance?.reinitialize()
  };
}

export default AuthSystemInit;