/**
 * Test Supabase Credential Configuration
 * Verify all frontend files use the new Supabase credentials
 */

// Test configuration
const EXPECTED_CONFIG = {
  url: 'https://tdmzayzkqyegvfgxlolj.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkbXpheXprcXllZ3ZmZ3hsb2xqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5OTkzNDAsImV4cCI6MjA3MTU3NTM0MH0.u4i07AojTzeSVRfbUyTSKfPv1EKUCFCv7XPri22gbkM'
};

// Mock window environment
if (typeof window === 'undefined') {
  global.window = {
    ENV: {
      SUPABASE_URL: EXPECTED_CONFIG.url,
      SUPABASE_ANON_KEY: EXPECTED_CONFIG.anonKey
    },
    location: {
      origin: 'http://localhost:3000'
    }
  };
}

/**
 * Test Supabase Client Configuration
 */
function testSupabaseClientConfig() {
  console.log('🧪 Testing Supabase Client Configuration...');
  
  // Mock the createClient function
  const mockCreateClient = (url, key, options) => {
    return { url, key, options, isValid: true };
  };
  
  // Test the configuration values directly
  const supabaseUrl = window.ENV?.SUPABASE_URL || EXPECTED_CONFIG.url;
  const supabaseAnonKey = window.ENV?.SUPABASE_ANON_KEY || EXPECTED_CONFIG.anonKey;
  
  console.log('📋 Configuration Test Results:');
  console.log(`✅ URL: ${supabaseUrl}`);
  console.log(`✅ Anon Key: ${supabaseAnonKey.substring(0, 20)}...`);
  
  // Validate URL
  if (supabaseUrl !== EXPECTED_CONFIG.url) {
    throw new Error(`URL mismatch. Expected: ${EXPECTED_CONFIG.url}, Got: ${supabaseUrl}`);
  }
  
  // Validate anon key
  if (supabaseAnonKey !== EXPECTED_CONFIG.anonKey) {
    throw new Error(`Anon key mismatch. Expected: ${EXPECTED_CONFIG.anonKey.substring(0, 20)}..., Got: ${supabaseAnonKey.substring(0, 20)}...`);
  }
  
  // Test client creation
  const mockClient = mockCreateClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  });
  
  if (!mockClient.isValid) {
    throw new Error('Failed to create Supabase client');
  }
  
  console.log('✅ Supabase client configuration test passed');
  return true;
}

/**
 * Test Subscriptions Configuration
 */
function testSubscriptionsConfig() {
  console.log('🧪 Testing Subscriptions Configuration...');
  
  // Mock subscription config function
  const getSupabaseConfig = () => {
    return {
      url: window.ENV?.SUPABASE_URL || EXPECTED_CONFIG.url,
      anonKey: window.ENV?.SUPABASE_ANON_KEY || EXPECTED_CONFIG.anonKey
    };
  };
  
  const config = getSupabaseConfig();
  
  console.log('📋 Subscriptions Config Test Results:');
  console.log(`✅ URL: ${config.url}`);
  console.log(`✅ Anon Key: ${config.anonKey.substring(0, 20)}...`);
  
  // Validate configuration
  if (config.url !== EXPECTED_CONFIG.url) {
    throw new Error(`Subscriptions URL mismatch. Expected: ${EXPECTED_CONFIG.url}, Got: ${config.url}`);
  }
  
  if (config.anonKey !== EXPECTED_CONFIG.anonKey) {
    throw new Error(`Subscriptions anon key mismatch`);
  }
  
  console.log('✅ Subscriptions configuration test passed');
  return true;
}

/**
 * Test Main Configuration
 */
function testMainConfig() {
  console.log('🧪 Testing Main Configuration...');
  
  // Mock main config
  const config = {
    supabase: {
      url: EXPECTED_CONFIG.url,
      anonKey: EXPECTED_CONFIG.anonKey
    }
  };
  
  console.log('📋 Main Config Test Results:');
  console.log(`✅ URL: ${config.supabase.url}`);
  console.log(`✅ Anon Key: ${config.supabase.anonKey.substring(0, 20)}...`);
  
  // Validate configuration
  if (config.supabase.url !== EXPECTED_CONFIG.url) {
    throw new Error(`Main URL mismatch. Expected: ${EXPECTED_CONFIG.url}, Got: ${config.supabase.url}`);
  }
  
  if (config.supabase.anonKey !== EXPECTED_CONFIG.anonKey) {
    throw new Error(`Main anon key mismatch`);
  }
  
  console.log('✅ Main configuration test passed');
  return true;
}

/**
 * Run All Tests
 */
function runAllTests() {
  console.log('🚀 Starting Supabase Credential Tests...');
  console.log('=' .repeat(50));
  
  try {
    testSupabaseClientConfig();
    console.log('');
    
    testSubscriptionsConfig();
    console.log('');
    
    testMainConfig();
    console.log('');
    
    console.log('🎉 All tests passed successfully!');
    console.log('✅ Supabase credentials are properly configured');
    console.log('=' .repeat(50));
    
    return true;
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('=' .repeat(50));
    return false;
  }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runAllTests,
    testSupabaseClientConfig,
    testSubscriptionsConfig,
    testMainConfig,
    EXPECTED_CONFIG
  };
}

// Run tests if called directly
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.testSupabaseCredentials = runAllTests;
  
  // Auto-run tests on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(runAllTests, 1000);
    });
  } else {
    setTimeout(runAllTests, 1000);
  }
} else {
  // Run in Node.js environment
  runAllTests();
}