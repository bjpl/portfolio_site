/**
 * Authentication Forms Handler
 * Manages login, signup, and password reset forms with validation
 */

class AuthForms {
  constructor(auth) {
    this.auth = auth || window.supabaseAuth;
    this.forms = {};
    this.validators = {};
    
    this.init();
  }

  /**
   * Initialize form handlers
   */
  init() {
    this.setupEventListeners();
    this.setupValidators();
    this.setupFormStates();
  }

  /**
   * Set up event listeners for all auth forms
   */
  setupEventListeners() {
    document.addEventListener('DOMContentLoaded', () => {
      // Login form
      this.initForm('login', {
        submitHandler: this.handleLogin.bind(this),
        fields: ['email', 'password', 'remember']
      });

      // Signup form
      this.initForm('signup', {
        submitHandler: this.handleSignup.bind(this),
        fields: ['email', 'password', 'confirmPassword', 'firstName', 'lastName']
      });

      // Password reset form
      this.initForm('reset-password', {
        submitHandler: this.handlePasswordReset.bind(this),
        fields: ['email']
      });

      // Change password form
      this.initForm('change-password', {
        submitHandler: this.handlePasswordChange.bind(this),
        fields: ['currentPassword', 'newPassword', 'confirmNewPassword']
      });

      // OAuth buttons
      this.setupOAuthButtons();

      // Form toggles
      this.setupFormToggles();
    });
  }

  /**
   * Initialize individual form
   */
  initForm(formName, config) {
    const form = document.getElementById(`${formName}-form`);
    if (!form) return;

    this.forms[formName] = {
      element: form,
      fields: {},
      config
    };

    // Get form fields
    config.fields.forEach(fieldName => {
      const field = form.querySelector(`[name="${fieldName}"]`);
      if (field) {
        this.forms[formName].fields[fieldName] = field;
        
        // Add validation listeners
        field.addEventListener('blur', () => this.validateField(formName, fieldName));
        field.addEventListener('input', () => this.clearFieldError(formName, fieldName));
      }
    });

    // Add submit handler
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleFormSubmit(formName);
    });
  }

  /**
   * Handle form submission
   */
  async handleFormSubmit(formName) {
    const form = this.forms[formName];
    if (!form) return;

    try {
      // Validate all fields
      const isValid = this.validateForm(formName);
      if (!isValid) return;

      // Show loading state
      this.setFormLoading(formName, true);

      // Call form-specific handler
      await form.config.submitHandler();

    } catch (error) {
      this.showFormError(formName, error.message);
    } finally {
      this.setFormLoading(formName, false);
    }
  }

  /**
   * Handle login form submission
   */
  async handleLogin() {
    const form = this.forms.login;
    const email = form.fields.email.value;
    const password = form.fields.password.value;
    const remember = form.fields.remember?.checked || false;

    try {
      const result = await this.auth.signIn(email, password, remember);
      
      this.showFormSuccess('login', 'Login successful! Redirecting...');
      
      // Redirect after short delay
      setTimeout(() => {
        const redirectTo = this.auth.getAuthRedirect() || '/admin';
        window.location.href = redirectTo;
      }, 1000);

    } catch (error) {
      let message = 'Login failed. Please try again.';
      
      switch (error.code) {
        case 'INVALID_CREDENTIALS':
          message = 'Invalid email or password.';
          break;
        case 'EMAIL_NOT_CONFIRMED':
          message = 'Please confirm your email address before logging in.';
          this.showResendConfirmation(email);
          break;
        case 'TOO_MANY_REQUESTS':
          message = 'Too many login attempts. Please try again later.';
          break;
        case 'USER_NOT_FOUND':
          message = 'No account found with this email address.';
          break;
      }
      
      throw new Error(message);
    }
  }

  /**
   * Handle signup form submission
   */
  async handleSignup() {
    const form = this.forms.signup;
    const email = form.fields.email.value;
    const password = form.fields.password.value;
    const firstName = form.fields.firstName?.value || '';
    const lastName = form.fields.lastName?.value || '';

    const userData = {
      name: `${firstName} ${lastName}`.trim(),
      firstName,
      lastName
    };

    try {
      const result = await this.auth.signUp(email, password, userData);
      
      this.showFormSuccess('signup', 'Account created! Please check your email for verification.');
      
      // Clear form
      this.clearForm('signup');
      
      // Show email verification message
      this.showEmailVerificationMessage(email);

    } catch (error) {
      let message = 'Account creation failed. Please try again.';
      
      switch (error.code) {
        case 'USER_ALREADY_EXISTS':
          message = 'An account with this email already exists.';
          break;
        case 'INVALID_EMAIL':
          message = 'Please enter a valid email address.';
          break;
        case 'WEAK_PASSWORD':
          message = 'Password is too weak. Please choose a stronger password.';
          break;
        case 'TOO_MANY_REQUESTS':
          message = 'Too many signup attempts. Please try again later.';
          break;
      }
      
      throw new Error(message);
    }
  }

  /**
   * Handle password reset form submission
   */
  async handlePasswordReset() {
    const form = this.forms['reset-password'];
    const email = form.fields.email.value;

    try {
      await this.auth.resetPassword(email);
      
      this.showFormSuccess('reset-password', 'Password reset email sent! Please check your inbox.');
      this.clearForm('reset-password');

    } catch (error) {
      let message = 'Failed to send password reset email.';
      
      switch (error.code) {
        case 'USER_NOT_FOUND':
          message = 'No account found with this email address.';
          break;
        case 'INVALID_EMAIL':
          message = 'Please enter a valid email address.';
          break;
        case 'TOO_MANY_REQUESTS':
          message = 'Too many reset requests. Please try again later.';
          break;
      }
      
      throw new Error(message);
    }
  }

  /**
   * Handle password change form submission
   */
  async handlePasswordChange() {
    const form = this.forms['change-password'];
    const newPassword = form.fields.newPassword.value;

    try {
      await this.auth.changePassword(newPassword);
      
      this.showFormSuccess('change-password', 'Password changed successfully!');
      this.clearForm('change-password');

    } catch (error) {
      let message = 'Failed to change password.';
      
      switch (error.code) {
        case 'WEAK_PASSWORD':
          message = 'New password is too weak. Please choose a stronger password.';
          break;
        case 'SAME_PASSWORD':
          message = 'New password must be different from current password.';
          break;
        case 'SESSION_EXPIRED':
          message = 'Your session has expired. Please log in again.';
          break;
      }
      
      throw new Error(message);
    }
  }

  /**
   * Set up field validators
   */
  setupValidators() {
    this.validators = {
      email: {
        required: true,
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        message: 'Please enter a valid email address'
      },
      password: {
        required: true,
        minLength: 8,
        pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        message: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character'
      },
      confirmPassword: {
        required: true,
        matches: 'password',
        message: 'Passwords do not match'
      },
      confirmNewPassword: {
        required: true,
        matches: 'newPassword',
        message: 'Passwords do not match'
      },
      firstName: {
        required: false,
        minLength: 1,
        message: 'Please enter your first name'
      },
      lastName: {
        required: false,
        minLength: 1,
        message: 'Please enter your last name'
      }
    };
  }

  /**
   * Validate individual field
   */
  validateField(formName, fieldName) {
    const form = this.forms[formName];
    const field = form.fields[fieldName];
    const validator = this.validators[fieldName];
    
    if (!field || !validator) return true;

    const value = field.value.trim();
    
    // Required validation
    if (validator.required && !value) {
      this.showFieldError(formName, fieldName, `${this.getFieldLabel(fieldName)} is required`);
      return false;
    }
    
    // Skip other validations if field is empty and not required
    if (!value && !validator.required) {
      this.clearFieldError(formName, fieldName);
      return true;
    }

    // Pattern validation
    if (validator.pattern && !validator.pattern.test(value)) {
      this.showFieldError(formName, fieldName, validator.message);
      return false;
    }

    // Min length validation
    if (validator.minLength && value.length < validator.minLength) {
      this.showFieldError(formName, fieldName, `${this.getFieldLabel(fieldName)} must be at least ${validator.minLength} characters`);
      return false;
    }

    // Matches validation (for password confirmation)
    if (validator.matches) {
      const matchField = form.fields[validator.matches];
      if (matchField && value !== matchField.value.trim()) {
        this.showFieldError(formName, fieldName, validator.message);
        return false;
      }
    }

    this.clearFieldError(formName, fieldName);
    return true;
  }

  /**
   * Validate entire form
   */
  validateForm(formName) {
    const form = this.forms[formName];
    if (!form) return false;

    let isValid = true;

    Object.keys(form.fields).forEach(fieldName => {
      if (!this.validateField(formName, fieldName)) {
        isValid = false;
      }
    });

    return isValid;
  }

  /**
   * Show field error
   */
  showFieldError(formName, fieldName, message) {
    const form = this.forms[formName];
    const field = form.fields[fieldName];
    
    // Add error class to field
    field.classList.add('error');
    
    // Find or create error message element
    let errorElement = field.parentNode.querySelector('.field-error');
    if (!errorElement) {
      errorElement = document.createElement('div');
      errorElement.className = 'field-error';
      field.parentNode.appendChild(errorElement);
    }
    
    errorElement.textContent = message;
    errorElement.style.display = 'block';
  }

  /**
   * Clear field error
   */
  clearFieldError(formName, fieldName) {
    const form = this.forms[formName];
    const field = form.fields[fieldName];
    
    field.classList.remove('error');
    
    const errorElement = field.parentNode.querySelector('.field-error');
    if (errorElement) {
      errorElement.style.display = 'none';
    }
  }

  /**
   * Show form-level error
   */
  showFormError(formName, message) {
    const form = this.forms[formName];
    let errorElement = form.element.querySelector('.form-error');
    
    if (!errorElement) {
      errorElement = document.createElement('div');
      errorElement.className = 'form-error';
      form.element.insertBefore(errorElement, form.element.firstChild);
    }
    
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    
    // Scroll to error
    errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /**
   * Show form-level success
   */
  showFormSuccess(formName, message) {
    const form = this.forms[formName];
    let successElement = form.element.querySelector('.form-success');
    
    if (!successElement) {
      successElement = document.createElement('div');
      successElement.className = 'form-success';
      form.element.insertBefore(successElement, form.element.firstChild);
    }
    
    successElement.textContent = message;
    successElement.style.display = 'block';
    
    // Hide any existing errors
    const errorElement = form.element.querySelector('.form-error');
    if (errorElement) {
      errorElement.style.display = 'none';
    }
  }

  /**
   * Set form loading state
   */
  setFormLoading(formName, isLoading) {
    const form = this.forms[formName];
    const submitButton = form.element.querySelector('[type="submit"]');
    
    if (isLoading) {
      submitButton.disabled = true;
      submitButton.textContent = submitButton.dataset.loadingText || 'Loading...';
      form.element.classList.add('loading');
    } else {
      submitButton.disabled = false;
      submitButton.textContent = submitButton.dataset.originalText || submitButton.textContent;
      form.element.classList.remove('loading');
    }
  }

  /**
   * Clear form
   */
  clearForm(formName) {
    const form = this.forms[formName];
    
    // Clear field values
    Object.values(form.fields).forEach(field => {
      field.value = '';
      field.checked = false;
    });
    
    // Clear errors
    form.element.querySelectorAll('.field-error, .form-error').forEach(el => {
      el.style.display = 'none';
    });
    
    // Remove error classes
    form.element.querySelectorAll('.error').forEach(el => {
      el.classList.remove('error');
    });
  }

  /**
   * Set up OAuth buttons
   */
  setupOAuthButtons() {
    document.querySelectorAll('[data-oauth-provider]').forEach(button => {
      button.addEventListener('click', async (e) => {
        e.preventDefault();
        
        const provider = button.dataset.oauthProvider;
        const redirectTo = button.dataset.redirectTo;
        
        try {
          button.disabled = true;
          button.textContent = 'Redirecting...';
          
          await this.auth.signInWithOAuth(provider, redirectTo);
        } catch (error) {
          console.error('OAuth error:', error);
          alert(`Failed to sign in with ${provider}. Please try again.`);
          
          button.disabled = false;
          button.textContent = button.dataset.originalText || `Sign in with ${provider}`;
        }
      });
    });
  }

  /**
   * Set up form toggle links
   */
  setupFormToggles() {
    document.querySelectorAll('[data-toggle-form]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        
        const targetForm = link.dataset.toggleForm;
        const currentForm = link.closest('.auth-form');
        
        if (currentForm) {
          currentForm.style.display = 'none';
        }
        
        const targetElement = document.getElementById(`${targetForm}-form`)?.closest('.auth-form');
        if (targetElement) {
          targetElement.style.display = 'block';
        }
      });
    });
  }

  /**
   * Set up initial form states
   */
  setupFormStates() {
    // Store original button text for loading states
    document.querySelectorAll('[type="submit"]').forEach(button => {
      button.dataset.originalText = button.textContent;
    });
  }

  /**
   * Get field label for error messages
   */
  getFieldLabel(fieldName) {
    const labels = {
      email: 'Email',
      password: 'Password',
      confirmPassword: 'Password confirmation',
      newPassword: 'New password',
      confirmNewPassword: 'New password confirmation',
      currentPassword: 'Current password',
      firstName: 'First name',
      lastName: 'Last name'
    };
    
    return labels[fieldName] || fieldName;
  }

  /**
   * Show resend confirmation option
   */
  showResendConfirmation(email) {
    const resendHtml = `
      <div class="resend-confirmation">
        <p>Need to resend confirmation email?</p>
        <button type="button" class="btn-link" onclick="authForms.resendConfirmation('${email}')">
          Resend confirmation email
        </button>
      </div>
    `;
    
    const loginForm = this.forms.login?.element;
    if (loginForm && !loginForm.querySelector('.resend-confirmation')) {
      loginForm.insertAdjacentHTML('beforeend', resendHtml);
    }
  }

  /**
   * Resend confirmation email
   */
  async resendConfirmation(email) {
    try {
      await this.auth.resendConfirmation(email);
      alert('Confirmation email sent successfully!');
    } catch (error) {
      alert('Failed to send confirmation email. Please try again.');
    }
  }

  /**
   * Show email verification message
   */
  showEmailVerificationMessage(email) {
    const messageHtml = `
      <div class="email-verification-message">
        <h3>Check Your Email</h3>
        <p>We've sent a verification email to <strong>${email}</strong></p>
        <p>Please click the verification link in the email to activate your account.</p>
        <button type="button" class="btn-secondary" onclick="authForms.resendConfirmation('${email}')">
          Didn't receive the email? Resend
        </button>
      </div>
    `;
    
    // Replace signup form with message
    const signupForm = document.querySelector('.auth-form[data-form="signup"]');
    if (signupForm) {
      signupForm.innerHTML = messageHtml;
    }
  }
}

// Initialize auth forms when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.authForms = new AuthForms();
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AuthForms;
}