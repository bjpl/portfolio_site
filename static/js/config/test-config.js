/**
 * Configuration Test Script
 * Tests that all configuration is loading properly
 */

(function testConfiguration() {
  console.log('🧪 Testing configuration system...');
  
  // Test Supabase Config
  setTimeout(() => {
    console.log('\n📋 SUPABASE CONFIGURATION TEST:');
    if (window.SUPABASE_CONFIG) {
      console.log('✅ window.SUPABASE_CONFIG exists');
      console.log('🔗 URL:', window.SUPABASE_CONFIG.url);
      console.log('🔑 Has Anon Key:', !!window.SUPABASE_CONFIG.anonKey);
      console.log('🔑 Valid Anon Key:', window.SUPABASE_CONFIG.anonKey && !window.SUPABASE_CONFIG.anonKey.includes('{{'));
      
      if (window.validateSupabaseConfig) {
        const isValid = window.validateSupabaseConfig();
        console.log('✅ Configuration Valid:', isValid);
      }
    } else {
      console.error('❌ window.SUPABASE_CONFIG not found');
    }
    
    // Test API Config
    console.log('\n🌐 API CONFIGURATION TEST:');
    if (window.apiConfig) {
      console.log('✅ window.apiConfig exists');
      console.log('🌍 Environment:', window.apiConfig.config.environment);
      console.log('🔗 Supabase URL:', window.apiConfig.getSupabaseUrl());
      console.log('🔑 Has Anon Key:', !!window.apiConfig.getSupabaseAnonKey());
      
      const validation = window.apiConfig.validate();
      console.log('✅ Validation Result:', validation.valid);
      if (!validation.valid) {
        console.log('❌ Issues:', validation.issues);
      }
      console.log('🏗️ Supabase Configured:', validation.supabase.configured);
    } else {
      console.error('❌ window.apiConfig not found');
    }
    
    // Environment Detection Test
    console.log('\n🌍 ENVIRONMENT DETECTION TEST:');
    console.log('🌐 Hostname:', window.location.hostname);
    console.log('🔗 Is Netlify:', window.location.hostname.includes('netlify'));
    console.log('🏠 Is Local:', window.location.hostname.includes('localhost'));
    
    console.log('\n🎉 Configuration test completed!');
  }, 500);
})();