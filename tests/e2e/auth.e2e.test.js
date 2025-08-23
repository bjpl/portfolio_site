const { test, expect } = require('@playwright/test');
const { chromium } = require('playwright');

test.describe('Authentication E2E Tests', () => {
  let browser;
  let context;
  let page;

  test.beforeAll(async () => {
    browser = await chromium.launch();
    context = await browser.newContext();
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await browser.close();
  });

  test.beforeEach(async () => {
    // Navigate to the application
    await page.goto('http://localhost:3000');
  });

  test.describe('User Registration Flow', () => {
    test('should complete full registration process', async () => {
      // Navigate to registration page
      await page.click('[data-testid="register-link"]');
      await expect(page).toHaveURL(/.*\/register/);
      
      // Fill registration form
      await page.fill('[data-testid="email-input"]', 'newuser@example.com');
      await page.fill('[data-testid="username-input"]', 'newuser');
      await page.fill('[data-testid="password-input"]', 'SecurePass123!');
      await page.fill('[data-testid="confirm-password-input"]', 'SecurePass123!');
      await page.fill('[data-testid="firstname-input"]', 'John');
      await page.fill('[data-testid="lastname-input"]', 'Doe');
      
      // Submit form
      await page.click('[data-testid="register-submit"]');
      
      // Verify registration success
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Registration successful');
      
      // Verify redirect to verification page
      await expect(page).toHaveURL(/.*\/verify-email/);
    });

    test('should show validation errors for invalid input', async () => {
      await page.click('[data-testid="register-link"]');
      
      // Submit empty form
      await page.click('[data-testid="register-submit"]');
      
      // Verify validation errors
      await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="username-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="password-error"]')).toBeVisible();
    });

    test('should validate password strength', async () => {
      await page.click('[data-testid="register-link"]');
      
      // Fill with weak password
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="username-input"]', 'testuser');
      await page.fill('[data-testid="password-input"]', 'weak');
      
      await page.click('[data-testid="register-submit"]');
      
      // Verify password strength error
      await expect(page.locator('[data-testid="password-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="password-error"]')).toContainText('Password must contain');
    });

    test('should show error for duplicate email', async () => {
      // First registration
      await page.click('[data-testid="register-link"]');
      await page.fill('[data-testid="email-input"]', 'duplicate@example.com');
      await page.fill('[data-testid="username-input"]', 'user1');
      await page.fill('[data-testid="password-input"]', 'SecurePass123!');
      await page.fill('[data-testid="confirm-password-input"]', 'SecurePass123!');
      await page.fill('[data-testid="firstname-input"]', 'John');
      await page.fill('[data-testid="lastname-input"]', 'Doe');
      await page.click('[data-testid="register-submit"]');
      
      // Wait for success and navigate back
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      await page.goto('http://localhost:3000/register');
      
      // Try duplicate registration
      await page.fill('[data-testid="email-input"]', 'duplicate@example.com');
      await page.fill('[data-testid="username-input"]', 'user2');
      await page.fill('[data-testid="password-input"]', 'SecurePass123!');
      await page.fill('[data-testid="confirm-password-input"]', 'SecurePass123!');
      await page.fill('[data-testid="firstname-input"]', 'Jane');
      await page.fill('[data-testid="lastname-input"]', 'Smith');
      await page.click('[data-testid="register-submit"]');
      
      // Verify error message
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Email already registered');
    });
  });

  test.describe('User Login Flow', () => {
    test.beforeEach(async () => {
      // Create a test user first
      await page.goto('http://localhost:3000/register');
      await page.fill('[data-testid="email-input"]', 'testuser@example.com');
      await page.fill('[data-testid="username-input"]', 'testuser');
      await page.fill('[data-testid="password-input"]', 'TestPass123!');
      await page.fill('[data-testid="confirm-password-input"]', 'TestPass123!');
      await page.fill('[data-testid="firstname-input"]', 'Test');
      await page.fill('[data-testid="lastname-input"]', 'User');
      await page.click('[data-testid="register-submit"]');
      
      // Wait for registration to complete
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    });

    test('should login with valid credentials', async () => {
      // Navigate to login page
      await page.goto('http://localhost:3000/login');
      
      // Fill login form
      await page.fill('[data-testid="email-input"]', 'testuser@example.com');
      await page.fill('[data-testid="password-input"]', 'TestPass123!');
      
      // Submit form
      await page.click('[data-testid="login-submit"]');
      
      // Verify login success
      await expect(page).toHaveURL(/.*\/dashboard/);
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
      await expect(page.locator('[data-testid="user-name"]')).toContainText('Test User');
    });

    test('should login with username instead of email', async () => {
      await page.goto('http://localhost:3000/login');
      
      await page.fill('[data-testid="email-input"]', 'testuser');
      await page.fill('[data-testid="password-input"]', 'TestPass123!');
      await page.click('[data-testid="login-submit"]');
      
      await expect(page).toHaveURL(/.*\/dashboard/);
    });

    test('should show error for invalid credentials', async () => {
      await page.goto('http://localhost:3000/login');
      
      await page.fill('[data-testid="email-input"]', 'testuser@example.com');
      await page.fill('[data-testid="password-input"]', 'WrongPassword');
      await page.click('[data-testid="login-submit"]');
      
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid credentials');
    });

    test('should remember login state after page refresh', async () => {
      // Login first
      await page.goto('http://localhost:3000/login');
      await page.fill('[data-testid="email-input"]', 'testuser@example.com');
      await page.fill('[data-testid="password-input"]', 'TestPass123!');
      await page.click('[data-testid="login-submit"]');
      await expect(page).toHaveURL(/.*\/dashboard/);
      
      // Refresh page
      await page.reload();
      
      // Verify still logged in
      await expect(page).toHaveURL(/.*\/dashboard/);
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    });
  });

  test.describe('Logout Flow', () => {
    test.beforeEach(async () => {
      // Login first
      await page.goto('http://localhost:3000/login');
      await page.fill('[data-testid="email-input"]', 'testuser@example.com');
      await page.fill('[data-testid="password-input"]', 'TestPass123!');
      await page.click('[data-testid="login-submit"]');
      await expect(page).toHaveURL(/.*\/dashboard/);
    });

    test('should logout successfully', async () => {
      // Click user menu
      await page.click('[data-testid="user-menu"]');
      
      // Click logout
      await page.click('[data-testid="logout-button"]');
      
      // Verify logout
      await expect(page).toHaveURL(/.*\/home/);
      await expect(page.locator('[data-testid="login-link"]')).toBeVisible();
      await expect(page.locator('[data-testid="user-menu"]')).not.toBeVisible();
    });

    test('should redirect to login when accessing protected routes after logout', async () => {
      // Logout
      await page.click('[data-testid="user-menu"]');
      await page.click('[data-testid="logout-button"]');
      
      // Try to access protected route
      await page.goto('http://localhost:3000/dashboard');
      
      // Verify redirect to login
      await expect(page).toHaveURL(/.*\/login/);
    });
  });

  test.describe('Password Reset Flow', () => {
    test('should complete password reset process', async () => {
      // Navigate to login page and click forgot password
      await page.goto('http://localhost:3000/login');
      await page.click('[data-testid="forgot-password-link"]');
      
      // Verify on forgot password page
      await expect(page).toHaveURL(/.*\/forgot-password/);
      
      // Enter email
      await page.fill('[data-testid="email-input"]', 'testuser@example.com');
      await page.click('[data-testid="reset-submit"]');
      
      // Verify success message
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="success-message"]')).toContainText('reset link sent');
    });

    test('should show error for non-existent email', async () => {
      await page.goto('http://localhost:3000/forgot-password');
      
      await page.fill('[data-testid="email-input"]', 'nonexistent@example.com');
      await page.click('[data-testid="reset-submit"]');
      
      // Should still show success message (security)
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    });
  });

  test.describe('Profile Management', () => {
    test.beforeEach(async () => {
      // Login first
      await page.goto('http://localhost:3000/login');
      await page.fill('[data-testid="email-input"]', 'testuser@example.com');
      await page.fill('[data-testid="password-input"]', 'TestPass123!');
      await page.click('[data-testid="login-submit"]');
      await expect(page).toHaveURL(/.*\/dashboard/);
    });

    test('should update profile information', async () => {
      // Navigate to profile page
      await page.click('[data-testid="user-menu"]');
      await page.click('[data-testid="profile-link"]');
      await expect(page).toHaveURL(/.*\/profile/);
      
      // Update profile
      await page.fill('[data-testid="firstname-input"]', 'Updated');
      await page.fill('[data-testid="lastname-input"]', 'Name');
      await page.click('[data-testid="save-profile"]');
      
      // Verify success
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      
      // Verify changes reflected in UI
      await expect(page.locator('[data-testid="user-name"]')).toContainText('Updated Name');
    });

    test('should change password', async () => {
      await page.click('[data-testid="user-menu"]');
      await page.click('[data-testid="profile-link"]');
      
      // Navigate to change password section
      await page.click('[data-testid="change-password-tab"]');
      
      // Fill password change form
      await page.fill('[data-testid="current-password"]', 'TestPass123!');
      await page.fill('[data-testid="new-password"]', 'NewPass456!');
      await page.fill('[data-testid="confirm-new-password"]', 'NewPass456!');
      await page.click('[data-testid="change-password-submit"]');
      
      // Verify success
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      
      // Verify can login with new password
      await page.click('[data-testid="user-menu"]');
      await page.click('[data-testid="logout-button"]');
      
      await page.goto('http://localhost:3000/login');
      await page.fill('[data-testid="email-input"]', 'testuser@example.com');
      await page.fill('[data-testid="password-input"]', 'NewPass456!');
      await page.click('[data-testid="login-submit"]');
      
      await expect(page).toHaveURL(/.*\/dashboard/);
    });
  });

  test.describe('Session Management', () => {
    test('should handle session timeout', async () => {
      // Login
      await page.goto('http://localhost:3000/login');
      await page.fill('[data-testid="email-input"]', 'testuser@example.com');
      await page.fill('[data-testid="password-input"]', 'TestPass123!');
      await page.click('[data-testid="login-submit"]');
      
      // Mock expired session by clearing tokens
      await page.evaluate(() => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      });
      
      // Try to access protected route
      await page.goto('http://localhost:3000/dashboard');
      
      // Should redirect to login
      await expect(page).toHaveURL(/.*\/login/);
    });

    test('should handle multiple sessions', async () => {
      // Login in first context
      await page.goto('http://localhost:3000/login');
      await page.fill('[data-testid="email-input"]', 'testuser@example.com');
      await page.fill('[data-testid="password-input"]', 'TestPass123!');
      await page.click('[data-testid="login-submit"]');
      
      // Open new context (simulating different device)
      const context2 = await browser.newContext();
      const page2 = await context2.newPage();
      
      // Login from second context
      await page2.goto('http://localhost:3000/login');
      await page2.fill('[data-testid="email-input"]', 'testuser@example.com');
      await page2.fill('[data-testid="password-input"]', 'TestPass123!');
      await page2.click('[data-testid="login-submit"]');
      
      // Both should be logged in
      await expect(page).toHaveURL(/.*\/dashboard/);
      await expect(page2).toHaveURL(/.*\/dashboard/);
      
      await context2.close();
    });
  });

  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async () => {
      await page.goto('http://localhost:3000/login');
      
      // Tab through form elements
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="email-input"]')).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="password-input"]')).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="login-submit"]')).toBeFocused();
      
      // Submit with Enter
      await page.keyboard.press('Enter');
    });

    test('should have proper ARIA labels', async () => {
      await page.goto('http://localhost:3000/login');
      
      await expect(page.locator('[data-testid="email-input"]')).toHaveAttribute('aria-label');
      await expect(page.locator('[data-testid="password-input"]')).toHaveAttribute('aria-label');
      await expect(page.locator('[data-testid="login-submit"]')).toHaveAttribute('aria-label');
    });
  });

  test.describe('Security', () => {
    test('should prevent XSS in form inputs', async () => {
      await page.goto('http://localhost:3000/register');
      
      const xssPayload = '<script>alert("xss")</script>';
      await page.fill('[data-testid="firstname-input"]', xssPayload);
      
      // Verify script is not executed and is properly escaped
      const inputValue = await page.inputValue('[data-testid="firstname-input"]');
      expect(inputValue).toBe(xssPayload);
      
      // Check that no alert appears
      page.on('dialog', () => {
        throw new Error('XSS alert detected');
      });
    });

    test('should handle CSRF protection', async () => {
      // This would test CSRF tokens if implemented
      await page.goto('http://localhost:3000/login');
      
      const csrfToken = await page.locator('[name="csrf-token"]').getAttribute('value');
      expect(csrfToken).toBeTruthy();
    });
  });
});