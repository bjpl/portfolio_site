const { chromium } = require('@playwright/test');

/**
 * Global setup for Playwright E2E tests
 * Runs once before all tests
 */
async function globalSetup(config) {
  console.log('🚀 Starting global E2E test setup...');
  
  // Launch browser for setup
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Wait for application to be ready
    console.log('⏳ Waiting for application to be ready...');
    await page.goto(config.projects[0].use.baseURL || 'http://localhost:3000');
    
    // Perform any necessary authentication
    await setupAuthentication(page);
    
    // Setup test data
    await setupTestData(page);
    
    // Save authentication state
    await context.storageState({ path: 'tests/e2e/auth-state.json' });
    
    console.log('✅ Global E2E setup completed');
    
  } catch (error) {
    console.error('❌ Global E2E setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

/**
 * Setup authentication for tests
 */
async function setupAuthentication(page) {
  try {
    // Create test admin user
    await page.goto('/api/test/setup-admin', { waitUntil: 'networkidle' });
    
    // Login as admin
    await page.goto('/admin/login');
    await page.fill('[data-testid="username-input"]', 'admin');
    await page.fill('[data-testid="password-input"]', 'adminpass123');
    await page.click('[data-testid="login-submit"]');
    
    // Wait for successful login
    await page.waitForURL('**/admin/dashboard', { timeout: 10000 });
    
    console.log('✅ Authentication setup completed');
    
  } catch (error) {
    console.warn('⚠️ Authentication setup failed:', error.message);
    // Continue with tests even if auth setup fails
  }
}

/**
 * Setup test data
 */
async function setupTestData(page) {
  try {
    // Create test content
    await page.goto('/api/test/setup-content', { waitUntil: 'networkidle' });
    
    // Create test portfolio items
    await page.goto('/api/test/setup-portfolio', { waitUntil: 'networkidle' });
    
    console.log('✅ Test data setup completed');
    
  } catch (error) {
    console.warn('⚠️ Test data setup failed:', error.message);
    // Continue with tests even if data setup fails
  }
}

module.exports = globalSetup;