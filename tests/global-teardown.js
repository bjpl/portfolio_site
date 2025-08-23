const path = require('path');
const fs = require('fs');

/**
 * Global teardown that runs once after all tests
 * This is executed in a separate Node.js process
 */
module.exports = async () => {
  console.log('🧹 Running global test teardown...');
  
  try {
    // Clean up test database
    const { sequelize } = require('../backend/src/models');
    
    if (sequelize) {
      try {
        await sequelize.close();
        console.log('✓ Test database connection closed');
      } catch (error) {
        console.warn('⚠️  Error closing database connection:', error.message);
      }
    }
    
  } catch (error) {
    // Database modules may not be available in teardown
    console.log('ℹ️  Database teardown skipped');
  }
  
  // Clean up test files and directories
  const cleanupPaths = [
    path.join(__dirname, '../uploads/test'),
    path.join(__dirname, '../content/test'),
    path.join(__dirname, '../logs/test'),
    path.join(__dirname, '../certs/test'),
    path.join(__dirname, '../.env.test')
  ];
  
  for (const cleanupPath of cleanupPaths) {
    try {
      if (fs.existsSync(cleanupPath)) {
        if (fs.statSync(cleanupPath).isDirectory()) {
          fs.rmSync(cleanupPath, { recursive: true, force: true });
          console.log(`✓ Removed test directory: ${path.basename(cleanupPath)}`);
        } else {
          fs.unlinkSync(cleanupPath);
          console.log(`✓ Removed test file: ${path.basename(cleanupPath)}`);
        }
      }
    } catch (error) {
      console.warn(`⚠️  Error cleaning up ${cleanupPath}:`, error.message);
    }
  }
  
  // Clean up test fixtures (optional, keep for debugging)
  const fixturesPath = path.join(__dirname, 'fixtures');
  if (process.env.CLEANUP_FIXTURES === 'true' && fs.existsSync(fixturesPath)) {
    try {
      fs.rmSync(fixturesPath, { recursive: true, force: true });
      console.log('✓ Removed test fixtures');
    } catch (error) {
      console.warn('⚠️  Error removing test fixtures:', error.message);
    }
  }
  
  // Clean up Jest cache (optional)
  if (process.env.CLEANUP_CACHE === 'true') {
    const cacheDir = path.join(__dirname, '../node_modules/.cache/jest');
    if (fs.existsSync(cacheDir)) {
      try {
        fs.rmSync(cacheDir, { recursive: true, force: true });
        console.log('✓ Removed Jest cache');
      } catch (error) {
        console.warn('⚠️  Error removing Jest cache:', error.message);
      }
    }
  }
  
  // Clean up temporary files
  const tempDirs = [
    path.join(__dirname, '../tmp'),
    path.join(__dirname, '../temp'),
    path.join(__dirname, '../.tmp')
  ];
  
  for (const tempDir of tempDirs) {
    if (fs.existsSync(tempDir)) {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
        console.log(`✓ Removed temporary directory: ${path.basename(tempDir)}`);
      } catch (error) {
        console.warn(`⚠️  Error removing ${tempDir}:`, error.message);
      }
    }
  }
  
  // Log test summary if available
  const coverageDir = path.join(__dirname, '../coverage');
  if (fs.existsSync(coverageDir)) {
    console.log('📄 Test coverage reports generated in coverage/');
    
    // Check for coverage summary
    const coverageSummaryPath = path.join(coverageDir, 'coverage-summary.json');
    if (fs.existsSync(coverageSummaryPath)) {
      try {
        const summary = JSON.parse(fs.readFileSync(coverageSummaryPath, 'utf8'));
        const total = summary.total;
        
        console.log('📈 Test Coverage Summary:');
        console.log(`   Lines: ${total.lines.pct}%`);
        console.log(`   Functions: ${total.functions.pct}%`);
        console.log(`   Branches: ${total.branches.pct}%`);
        console.log(`   Statements: ${total.statements.pct}%`);
        
      } catch (error) {
        console.warn('⚠️  Error reading coverage summary:', error.message);
      }
    }
  }
  
  // Final cleanup verification
  console.log('🔍 Final cleanup verification:');
  
  const checkPaths = [
    path.join(__dirname, '../uploads/test'),
    path.join(__dirname, '../content/test'),
    path.join(__dirname, '../logs/test')
  ];
  
  let cleanupComplete = true;
  for (const checkPath of checkPaths) {
    if (fs.existsSync(checkPath)) {
      console.warn(`⚠️  Warning: ${checkPath} still exists`);
      cleanupComplete = false;
    }
  }
  
  if (cleanupComplete) {
    console.log('✅ All test artifacts cleaned up successfully');
  } else {
    console.log('⚠️  Some test artifacts may still exist');
  }
  
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
    console.log('✓ Garbage collection triggered');
  }
  
  console.log('✅ Global test teardown complete');
};
