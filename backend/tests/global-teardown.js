// Global test teardown - runs once after all test suites
module.exports = async () => {
  console.log('🧹 Global test teardown completed');
  console.log('All test suites finished');
  
  // Force exit if needed (some async operations might keep Node running)
  if (process.env.FORCE_EXIT) {
    process.exit(0);
  }
};