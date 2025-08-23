/**
 * Authentication UI Components
 * Provides login/register forms and user interface elements
 */

class AuthUI {
  constructor(authService) {
    this.auth = authService;
    this.elements = {};
    this.forms = {};
    
    this.init();
  }

  /**
   * Initialize UI components
   */
  init() {
    // Listen for auth events
    this.auth.on('login', (user) => this.onLogin(user));
    this.auth.on('logout', (user) => this.onLogout(user));
    this.auth.on('sessionRestored', (user) => this.onSessionRestored(user));
    this.auth.on('loginError', (error) => this.onLoginError(error));

    // Initialize UI when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initializeUI());
    } else {
      this.initializeUI();
    }
  }

  /**
   * Initialize UI elements
   */
  initializeUI() {
    this.createLoginForm();
    this.createRegisterForm();
    this.createUserMenu();
    this.updateUIState();
  }

  /**
   * Create login form
   */
  createLoginForm() {
    const loginContainer = document.getElementById('login-form-container');
    if (!loginContainer) return;

    const loginForm = document.createElement('form');
    loginForm.id = 'auth-login-form';
    loginForm.className = 'auth-form';
    loginForm.innerHTML = `
      <div class="auth-form-header">
        <h2>Login</h2>
        <p>Sign in to access the CMS</p>
      </div>
      
      <div class="auth-form-body">
        <div class="form-group">
          <label for="login-username">Username</label>
          <input type="text" id="login-username" name="username" required 
                 autocomplete="username" placeholder="Enter your username">
          <div class="form-error" id="username-error"></div>
        </div>
        
        <div class="form-group">
          <label for="login-password">Password</label>
          <div class="password-input-container">
            <input type="password" id="login-password" name="password" required 
                   autocomplete="current-password" placeholder="Enter your password">
            <button type="button" class="password-toggle" id="login-password-toggle">
              <span class="show-password">👁️</span>
              <span class="hide-password" style="display: none;">🙈</span>
            </button>
          </div>
          <div class="form-error" id="password-error"></div>
        </div>
        
        <div class="form-group">
          <label class="checkbox-container">
            <input type="checkbox" id="remember-login" name="remember">
            <span class="checkmark"></span>
            Remember me
          </label>
        </div>
        
        <div class="form-actions">
          <button type="submit" class="btn btn-primary btn-full" id="login-submit">
            <span class="button-text">Sign In</span>
            <span class="button-loading" style="display: none;">
              <span class="spinner"></span>
              Signing in...
            </span>
          </button>
        </div>
        
        <div class="form-footer">
          <p>Don't have an account? <a href="#" id="show-register">Create one</a></p>
          <p><a href="#" id="forgot-password">Forgot password?</a></p>
        </div>
      </div>
      
      <div class="auth-form-alerts">
        <div class="alert alert-error" id="login-error-alert" style="display: none;"></div>
        <div class="alert alert-success" id="login-success-alert" style="display: none;"></div>
      </div>
    `;

    loginContainer.appendChild(loginForm);

    // Set up form handlers
    this.setupLoginFormHandlers(loginForm);
    this.forms.login = loginForm;
  }

  /**
   * Create register form
   */
  createRegisterForm() {
    const registerContainer = document.getElementById('register-form-container');
    if (!registerContainer) return;

    const registerForm = document.createElement('form');
    registerForm.id = 'auth-register-form';
    registerForm.className = 'auth-form';
    registerForm.style.display = 'none';
    registerForm.innerHTML = `
      <div class="auth-form-header">
        <h2>Create Account</h2>
        <p>Register for CMS access</p>
      </div>
      
      <div class="auth-form-body">
        <div class="form-group">
          <label for="register-username">Username</label>
          <input type="text" id="register-username" name="username" required 
                 autocomplete="username" placeholder="Choose a username" 
                 minlength="3" maxlength="50">
          <div class="form-error" id="register-username-error"></div>
        </div>
        
        <div class="form-group">
          <label for="register-email">Email</label>
          <input type="email" id="register-email" name="email" required 
                 autocomplete="email" placeholder="Enter your email">
          <div class="form-error" id="register-email-error"></div>
        </div>
        
        <div class="form-group">
          <label for="register-password">Password</label>
          <div class="password-input-container">
            <input type="password" id="register-password" name="password" required 
                   autocomplete="new-password" placeholder="Create a password" 
                   minlength="8">
            <button type="button" class="password-toggle" id="register-password-toggle">
              <span class="show-password">👁️</span>
              <span class="hide-password" style="display: none;">🙈</span>
            </button>
          </div>
          <div class="password-strength" id="password-strength"></div>
          <div class="form-error" id="register-password-error"></div>
        </div>
        
        <div class="form-group">
          <label for="register-confirm-password">Confirm Password</label>
          <div class="password-input-container">
            <input type="password" id="register-confirm-password" name="confirmPassword" required 
                   autocomplete="new-password" placeholder="Confirm your password">
            <button type="button" class="password-toggle" id="register-confirm-password-toggle">
              <span class="show-password">👁️</span>
              <span class="hide-password" style="display: none;">🙈</span>
            </button>
          </div>
          <div class="form-error" id="register-confirm-password-error"></div>
        </div>
        
        <div class="form-group">
          <label for="register-role">Role</label>
          <select id="register-role" name="role" required>
            <option value="user">User</option>
            <option value="editor">Editor</option>
            <option value="admin">Administrator</option>
          </select>
          <div class="form-error" id="register-role-error"></div>
        </div>
        
        <div class="form-actions">
          <button type="submit" class="btn btn-primary btn-full" id="register-submit">
            <span class="button-text">Create Account</span>
            <span class="button-loading" style="display: none;">
              <span class="spinner"></span>
              Creating account...
            </span>
          </button>
        </div>
        
        <div class="form-footer">
          <p>Already have an account? <a href="#" id="show-login">Sign in</a></p>
        </div>
      </div>
      
      <div class="auth-form-alerts">
        <div class="alert alert-error" id="register-error-alert" style="display: none;"></div>
        <div class="alert alert-success" id="register-success-alert" style="display: none;"></div>
      </div>
    `;

    registerContainer.appendChild(registerForm);

    // Set up form handlers
    this.setupRegisterFormHandlers(registerForm);
    this.forms.register = registerForm;
  }

  /**
   * Create user menu
   */
  createUserMenu() {
    const userMenuContainer = document.getElementById('user-menu-container');
    if (!userMenuContainer) return;

    const userMenu = document.createElement('div');
    userMenu.id = 'auth-user-menu';
    userMenu.className = 'user-menu';
    userMenu.innerHTML = `
      <div class="user-menu-trigger" id="user-menu-trigger">
        <div class="user-avatar" id="user-avatar">
          <span class="avatar-placeholder">U</span>
        </div>
        <div class="user-info">
          <span class="user-name" id="user-name">User</span>
          <span class="user-role" id="user-role">Role</span>
        </div>
        <div class="dropdown-arrow">▼</div>
      </div>
      
      <div class="user-menu-dropdown" id="user-menu-dropdown" style="display: none;">
        <div class="menu-header">
          <div class="user-details">
            <div class="user-avatar-large" id="user-avatar-large">
              <span class="avatar-placeholder-large">U</span>
            </div>
            <div class="user-details-info">
              <div class="user-name-large" id="user-name-large">User</div>
              <div class="user-email" id="user-email">user@example.com</div>
              <div class="user-role-large" id="user-role-large">Role</div>
            </div>
          </div>
        </div>
        
        <div class="menu-items">
          <a href="/admin/profile/" class="menu-item" id="menu-profile">
            <span class="menu-icon">👤</span>
            Profile
          </a>
          <a href="/admin/dashboard/" class="menu-item" id="menu-dashboard">
            <span class="menu-icon">📊</span>
            Dashboard
          </a>
          <a href="/admin/settings/" class="menu-item" id="menu-settings">
            <span class="menu-icon">⚙️</span>
            Settings
          </a>
          <div class="menu-divider"></div>
          <button class="menu-item menu-button" id="menu-logout">
            <span class="menu-icon">🚪</span>
            Logout
          </button>
        </div>
      </div>
    `;

    userMenuContainer.appendChild(userMenu);

    // Set up user menu handlers
    this.setupUserMenuHandlers(userMenu);
    this.elements.userMenu = userMenu;
  }

  /**
   * Set up login form handlers
   */
  setupLoginFormHandlers(form) {
    const usernameInput = form.querySelector('#login-username');
    const passwordInput = form.querySelector('#login-password');
    const passwordToggle = form.querySelector('#login-password-toggle');
    const submitButton = form.querySelector('#login-submit');
    const showRegisterLink = form.querySelector('#show-register');

    // Password toggle
    passwordToggle.addEventListener('click', () => {
      this.togglePasswordVisibility(passwordInput, passwordToggle);
    });

    // Form submission
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleLogin(form);
    });

    // Show register form
    showRegisterLink.addEventListener('click', (e) => {
      e.preventDefault();
      this.showRegisterForm();
    });

    // Real-time validation
    usernameInput.addEventListener('input', () => {
      this.validateUsername(usernameInput.value, 'username-error');
    });

    passwordInput.addEventListener('input', () => {
      this.validatePassword(passwordInput.value, 'password-error');
    });

    // Handle return URL
    this.handleReturnUrl();
  }

  /**
   * Set up register form handlers
   */
  setupRegisterFormHandlers(form) {
    const usernameInput = form.querySelector('#register-username');
    const emailInput = form.querySelector('#register-email');
    const passwordInput = form.querySelector('#register-password');
    const confirmPasswordInput = form.querySelector('#register-confirm-password');
    const roleSelect = form.querySelector('#register-role');
    const showLoginLink = form.querySelector('#show-login');

    // Password toggles
    const passwordToggles = form.querySelectorAll('.password-toggle');
    passwordToggles.forEach(toggle => {
      toggle.addEventListener('click', () => {
        const input = toggle.parentElement.querySelector('input');
        this.togglePasswordVisibility(input, toggle);
      });
    });

    // Form submission
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleRegister(form);
    });

    // Show login form
    showLoginLink.addEventListener('click', (e) => {
      e.preventDefault();
      this.showLoginForm();
    });

    // Real-time validation
    usernameInput.addEventListener('input', () => {
      this.validateUsername(usernameInput.value, 'register-username-error');
    });

    emailInput.addEventListener('input', () => {
      this.validateEmail(emailInput.value, 'register-email-error');
    });

    passwordInput.addEventListener('input', () => {
      this.validatePassword(passwordInput.value, 'register-password-error');
      this.showPasswordStrength(passwordInput.value);
      if (confirmPasswordInput.value) {
        this.validatePasswordConfirmation(passwordInput.value, confirmPasswordInput.value, 'register-confirm-password-error');
      }
    });

    confirmPasswordInput.addEventListener('input', () => {
      this.validatePasswordConfirmation(passwordInput.value, confirmPasswordInput.value, 'register-confirm-password-error');
    });
  }

  /**
   * Set up user menu handlers
   */
  setupUserMenuHandlers(menu) {
    const menuTrigger = menu.querySelector('#user-menu-trigger');
    const menuDropdown = menu.querySelector('#user-menu-dropdown');
    const logoutButton = menu.querySelector('#menu-logout');

    // Menu toggle
    menuTrigger.addEventListener('click', () => {
      const isVisible = menuDropdown.style.display !== 'none';
      menuDropdown.style.display = isVisible ? 'none' : 'block';
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!menu.contains(e.target)) {
        menuDropdown.style.display = 'none';
      }
    });

    // Logout handler
    logoutButton.addEventListener('click', async () => {
      await this.handleLogout();
    });
  }

  /**
   * Handle login form submission
   */
  async handleLogin(form) {
    const formData = new FormData(form);
    const username = formData.get('username');
    const password = formData.get('password');

    // Clear previous errors
    this.clearFormErrors(form);
    this.setFormLoading(form, true);

    try {
      const result = await this.auth.login(username, password);
      
      if (result.success) {
        this.showAlert('login-success-alert', 'Login successful! Redirecting...', 'success');
        
        // Redirect after short delay
        setTimeout(() => {
          this.redirectAfterLogin();
        }, 1000);
      }
    } catch (error) {
      this.showAlert('login-error-alert', error.message, 'error');
      this.setFormLoading(form, false);
    }
  }

  /**
   * Handle register form submission
   */
  async handleRegister(form) {
    const formData = new FormData(form);
    const username = formData.get('username');
    const email = formData.get('email');
    const password = formData.get('password');
    const confirmPassword = formData.get('confirmPassword');
    const role = formData.get('role');

    // Validate passwords match
    if (password !== confirmPassword) {
      this.showFormError('register-confirm-password-error', 'Passwords do not match');
      return;
    }

    // Clear previous errors
    this.clearFormErrors(form);
    this.setFormLoading(form, true);

    try {
      const success = await this.auth.register(username, password, email, role);
      
      if (success) {
        this.showAlert('register-success-alert', 'Account created successfully! You can now login.', 'success');
        
        // Switch to login form after delay
        setTimeout(() => {
          this.showLoginForm();
        }, 2000);
      }
    } catch (error) {
      this.showAlert('register-error-alert', error.message, 'error');
      this.setFormLoading(form, false);
    }
  }

  /**
   * Handle logout
   */
  async handleLogout() {
    try {
      await this.auth.logout();
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  /**
   * Toggle password visibility
   */
  togglePasswordVisibility(input, toggle) {
    const showIcon = toggle.querySelector('.show-password');
    const hideIcon = toggle.querySelector('.hide-password');
    
    if (input.type === 'password') {
      input.type = 'text';
      showIcon.style.display = 'none';
      hideIcon.style.display = 'inline';
    } else {
      input.type = 'password';
      showIcon.style.display = 'inline';
      hideIcon.style.display = 'none';
    }
  }

  /**
   * Validate username
   */
  validateUsername(username, errorElementId) {
    const errorElement = document.getElementById(errorElementId);
    if (!errorElement) return true;

    if (!username) {
      this.showFormError(errorElementId, 'Username is required');
      return false;
    }

    if (username.length < 3) {
      this.showFormError(errorElementId, 'Username must be at least 3 characters');
      return false;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      this.showFormError(errorElementId, 'Username can only contain letters, numbers, and underscores');
      return false;
    }

    this.clearFormError(errorElementId);
    return true;
  }

  /**
   * Validate email
   */
  validateEmail(email, errorElementId) {
    const errorElement = document.getElementById(errorElementId);
    if (!errorElement) return true;

    if (!email) {
      this.showFormError(errorElementId, 'Email is required');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      this.showFormError(errorElementId, 'Please enter a valid email address');
      return false;
    }

    this.clearFormError(errorElementId);
    return true;
  }

  /**
   * Validate password
   */
  validatePassword(password, errorElementId) {
    const errorElement = document.getElementById(errorElementId);
    if (!errorElement) return true;

    if (!password) {
      this.showFormError(errorElementId, 'Password is required');
      return false;
    }

    if (password.length < 8) {
      this.showFormError(errorElementId, 'Password must be at least 8 characters');
      return false;
    }

    this.clearFormError(errorElementId);
    return true;
  }

  /**
   * Validate password confirmation
   */
  validatePasswordConfirmation(password, confirmPassword, errorElementId) {
    const errorElement = document.getElementById(errorElementId);
    if (!errorElement) return true;

    if (!confirmPassword) {
      this.showFormError(errorElementId, 'Please confirm your password');
      return false;
    }

    if (password !== confirmPassword) {
      this.showFormError(errorElementId, 'Passwords do not match');
      return false;
    }

    this.clearFormError(errorElementId);
    return true;
  }

  /**
   * Show password strength indicator
   */
  showPasswordStrength(password) {
    const strengthElement = document.getElementById('password-strength');
    if (!strengthElement) return;

    const strength = this.calculatePasswordStrength(password);
    
    strengthElement.innerHTML = `
      <div class="strength-meter">
        <div class="strength-bar strength-${strength.level}"></div>
      </div>
      <div class="strength-text">${strength.text}</div>
    `;
  }

  /**
   * Calculate password strength
   */
  calculatePasswordStrength(password) {
    let score = 0;
    let feedback = [];

    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    const levels = ['weak', 'fair', 'good', 'strong'];
    const texts = ['Weak', 'Fair', 'Good', 'Strong'];
    
    const level = Math.min(Math.floor(score / 2), 3);
    
    return {
      level: levels[level],
      text: texts[level],
      score: score
    };
  }

  /**
   * Show form error
   */
  showFormError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.style.display = 'block';
    }
  }

  /**
   * Clear form error
   */
  clearFormError(elementId) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
      errorElement.textContent = '';
      errorElement.style.display = 'none';
    }
  }

  /**
   * Clear all form errors
   */
  clearFormErrors(form) {
    const errorElements = form.querySelectorAll('.form-error');
    errorElements.forEach(element => {
      element.textContent = '';
      element.style.display = 'none';
    });

    const alerts = form.querySelectorAll('.alert');
    alerts.forEach(alert => {
      alert.style.display = 'none';
    });
  }

  /**
   * Set form loading state
   */
  setFormLoading(form, isLoading) {
    const submitButton = form.querySelector('button[type="submit"]');
    const buttonText = submitButton.querySelector('.button-text');
    const buttonLoading = submitButton.querySelector('.button-loading');

    if (isLoading) {
      submitButton.disabled = true;
      buttonText.style.display = 'none';
      buttonLoading.style.display = 'inline-flex';
    } else {
      submitButton.disabled = false;
      buttonText.style.display = 'inline';
      buttonLoading.style.display = 'none';
    }
  }

  /**
   * Show alert message
   */
  showAlert(elementId, message, type) {
    const alertElement = document.getElementById(elementId);
    if (alertElement) {
      alertElement.textContent = message;
      alertElement.className = `alert alert-${type}`;
      alertElement.style.display = 'block';

      // Auto-hide success alerts
      if (type === 'success') {
        setTimeout(() => {
          alertElement.style.display = 'none';
        }, 5000);
      }
    }
  }

  /**
   * Show login form
   */
  showLoginForm() {
    if (this.forms.login) {
      this.forms.login.style.display = 'block';
    }
    if (this.forms.register) {
      this.forms.register.style.display = 'none';
    }
  }

  /**
   * Show register form
   */
  showRegisterForm() {
    if (this.forms.login) {
      this.forms.login.style.display = 'none';
    }
    if (this.forms.register) {
      this.forms.register.style.display = 'block';
    }
  }

  /**
   * Handle return URL after login
   */
  handleReturnUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    this.returnUrl = urlParams.get('returnTo') || '/admin/';
  }

  /**
   * Redirect after successful login
   */
  redirectAfterLogin() {
    window.location.href = this.returnUrl || '/admin/';
  }

  /**
   * Update UI state based on authentication
   */
  updateUIState() {
    const user = this.auth.getCurrentUser();
    
    if (user) {
      this.updateUserMenuUI(user);
      this.showAuthenticatedState();
    } else {
      this.showUnauthenticatedState();
    }
  }

  /**
   * Update user menu UI
   */
  updateUserMenuUI(user) {
    if (!this.elements.userMenu) return;

    const userName = this.elements.userMenu.querySelector('#user-name');
    const userRole = this.elements.userMenu.querySelector('#user-role');
    const userNameLarge = this.elements.userMenu.querySelector('#user-name-large');
    const userEmail = this.elements.userMenu.querySelector('#user-email');
    const userRoleLarge = this.elements.userMenu.querySelector('#user-role-large');
    const userAvatar = this.elements.userMenu.querySelector('#user-avatar .avatar-placeholder');
    const userAvatarLarge = this.elements.userMenu.querySelector('#user-avatar-large .avatar-placeholder-large');

    if (userName) userName.textContent = user.profile?.displayName || user.username;
    if (userRole) userRole.textContent = user.role;
    if (userNameLarge) userNameLarge.textContent = user.profile?.displayName || user.username;
    if (userEmail) userEmail.textContent = user.email;
    if (userRoleLarge) userRoleLarge.textContent = user.role;
    
    const initials = (user.profile?.displayName || user.username).charAt(0).toUpperCase();
    if (userAvatar) userAvatar.textContent = initials;
    if (userAvatarLarge) userAvatarLarge.textContent = initials;
  }

  /**
   * Show authenticated state
   */
  showAuthenticatedState() {
    const loginElements = document.querySelectorAll('.auth-login-only');
    const loggedOutElements = document.querySelectorAll('.auth-logged-out-only');
    const loggedInElements = document.querySelectorAll('.auth-logged-in-only');

    loginElements.forEach(el => el.style.display = 'none');
    loggedOutElements.forEach(el => el.style.display = 'none');
    loggedInElements.forEach(el => el.style.display = 'block');
  }

  /**
   * Show unauthenticated state
   */
  showUnauthenticatedState() {
    const loginElements = document.querySelectorAll('.auth-login-only');
    const loggedOutElements = document.querySelectorAll('.auth-logged-out-only');
    const loggedInElements = document.querySelectorAll('.auth-logged-in-only');

    loginElements.forEach(el => el.style.display = 'block');
    loggedOutElements.forEach(el => el.style.display = 'block');
    loggedInElements.forEach(el => el.style.display = 'none');
  }

  /**
   * Event handlers for authentication state changes
   */
  onLogin(user) {
    console.log('User logged in:', user);
    this.updateUIState();
  }

  onLogout(user) {
    console.log('User logged out');
    this.updateUIState();
  }

  onSessionRestored(user) {
    console.log('Session restored for user:', user);
    this.updateUIState();
  }

  onLoginError(error) {
    console.error('Login error:', error);
  }
}

// Global auth UI instance
let authUI = null;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  if (typeof AuthService !== 'undefined' && window.authService) {
    authUI = new AuthUI(window.authService);
    window.authUI = authUI;
  }
});

// Export for use in other modules
window.AuthUI = AuthUI;

export default AuthUI;