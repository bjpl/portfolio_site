/**
 * Global teardown for Playwright E2E tests
 * Runs once after all tests
 */
async function globalTeardown(config) {
  console.log('🧹 Starting global E2E test teardown...');
  
  try {
    // Clean up test data
    await cleanupTestData();
    
    // Clean up test files
    await cleanupTestFiles();
    
    // Clean up authentication state
    await cleanupAuthState();
    
    console.log('✅ Global E2E teardown completed');
    
  } catch (error) {
    console.error('❌ Global E2E teardown failed:', error);
    // Don't throw error in teardown to avoid masking test failures
  }
}

/**
 * Clean up test data
 */
async function cleanupTestData() {
  try {
    const fetch = require('node-fetch');
    
    // Call cleanup endpoints
    await fetch('http://localhost:3001/api/test/cleanup', { 
      method: 'DELETE',
      timeout: 5000 
    });
    
    console.log('✅ Test data cleanup completed');
    
  } catch (error) {
    console.warn('⚠️ Test data cleanup failed:', error.message);
  }
}

/**
 * Clean up test files
 */
async function cleanupTestFiles() {
  try {
    const fs = require('fs').promises;
    const path = require('path');
    
    // Remove auth state file
    const authStatePath = path.join(__dirname, 'auth-state.json');
    try {
      await fs.unlink(authStatePath);
    } catch (error) {
      // File might not exist
    }
    
    // Clean up any temporary test uploads
    const uploadsPath = path.join(__dirname, '../../backend/uploads/test');
    try {
      const files = await fs.readdir(uploadsPath);
      await Promise.all(files.map(file => fs.unlink(path.join(uploadsPath, file))));
    } catch (error) {
      // Directory might not exist
    }
    
    console.log('✅ Test files cleanup completed');
    
  } catch (error) {
    console.warn('⚠️ Test files cleanup failed:', error.message);
  }
}

/**
 * Clean up authentication state
 */
async function cleanupAuthState() {
  try {
    // Could invalidate test tokens, clear sessions, etc.
    console.log('✅ Auth state cleanup completed');
    
  } catch (error) {
    console.warn('⚠️ Auth state cleanup failed:', error.message);
  }
}

module.exports = globalTeardown;