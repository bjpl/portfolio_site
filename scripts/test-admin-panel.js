#!/usr/bin/env node

/**
 * Comprehensive Admin Panel Test Script
 * Tests authentication, configuration, and JavaScript loading for admin panel debugging
 * 
 * Features:
 * - Supabase connection testing
 * - Authentication verification with brandon.lambert87@gmail.com
 * - Configuration validation
 * - JavaScript loading tests
 * - Comprehensive error reporting with solutions
 */

const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
    SUPABASE_URL: 'https://tdmzayzkqyegvfgxlolj.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkbXpheXprcXllZ3ZmZ3hsb2xqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5OTkzNDAsImV4cCI6MjA3MTU3NTM0MH0.u4i07AojTzeSVRfbUyTSKfPv1EKUCFCv7XPri22gbkM',
    TEST_EMAIL: 'brandon.lambert87@gmail.com',
    ADMIN_BASE_PATH: path.join(__dirname, '..', 'public', 'admin'),
    LOCAL_PORT: 3000,
    NETLIFY_URL: 'https://vocal-pony-24e3de.netlify.app'
};

// Test results tracking
const TestResults = {
    total: 0,
    passed: 0,
    failed: 0,
    warnings: 0,
    details: [],
    solutions: []
};

// Utility functions
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise(resolve => rl.question(query, resolve));

function logResult(testName, status, message = '', duration = 0, solution = '') {
    const timestamp = new Date().toISOString();
    const result = {
        test: testName,
        status,
        message,
        duration: `${duration}ms`,
        timestamp,
        solution
    };
    
    TestResults.details.push(result);
    TestResults.total++;
    
    const statusIcon = {
        'PASS': '✅',
        'FAIL': '❌',
        'WARN': '⚠️',
        'INFO': 'ℹ️'
    };
    
    console.log(`${statusIcon[status] || '🔍'} ${testName} - ${status} (${duration}ms)`);
    
    if (message) {
        console.log(`   ${message}`);
    }
    
    if (solution) {
        console.log(`   💡 Solution: ${solution}`);
        TestResults.solutions.push({ test: testName, solution });
    }
    
    switch (status) {
        case 'PASS':
            TestResults.passed++;
            break;
        case 'FAIL':
            TestResults.failed++;
            break;
        case 'WARN':
            TestResults.warnings++;
            break;
    }
}

async function runTest(testName, testFunction) {
    const startTime = Date.now();
    try {
        await testFunction();
        const duration = Date.now() - startTime;
        logResult(testName, 'PASS', 'Test completed successfully', duration);
    } catch (error) {
        const duration = Date.now() - startTime;
        logResult(testName, 'FAIL', error.message, duration, error.solution || '');
    }
}

// Test 1: Supabase Connection Test
async function testSupabaseConnection() {
    console.log('\n🔗 Testing Supabase Connection...');
    
    const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
    
    if (!supabase) {
        throw { 
            message: 'Failed to initialize Supabase client',
            solution: 'Check if @supabase/supabase-js is installed: npm install @supabase/supabase-js'
        };
    }
    
    // Test connection with a simple query
    const { data, error } = await supabase
        .from('test_connection')
        .select('*', { count: 'exact' })
        .limit(1);
    
    if (error && !['PGRST116', 'PGRST205'].includes(error.code)) {
        throw {
            message: `Connection failed: ${error.message}`,
            solution: 'Verify Supabase URL and API key. Check network connectivity.'
        };
    }
    
    console.log('   ✅ Supabase client initialized successfully');
    console.log(`   📡 URL: ${CONFIG.SUPABASE_URL}`);
    console.log(`   🔑 API Key: ${CONFIG.SUPABASE_ANON_KEY.substring(0, 20)}...`);
    
    if (error) {
        console.log(`   ℹ️ Database response: ${error.code} - Connection works, database setup needed`);
    }
    
    return supabase;
}

// Test 2: Authentication Test with brandon.lambert87@gmail.com
async function testAuthentication(supabase) {
    console.log('\n🔐 Testing Authentication...');
    
    const email = CONFIG.TEST_EMAIL;
    let password;
    
    // Try to get password from environment or prompt
    if (process.env.ADMIN_PASSWORD) {
        password = process.env.ADMIN_PASSWORD;
        console.log('   Using password from environment variable');
    } else {
        password = await question(`Enter password for ${email}: `);
    }
    
    if (!password) {
        throw {
            message: 'Password is required for authentication test',
            solution: 'Set ADMIN_PASSWORD environment variable or enter password when prompted'
        };
    }
    
    // Test sign in
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });
    
    if (error) {
        let solution = '';
        
        if (error.message.includes('Invalid login credentials')) {
            solution = 'Verify password is correct. If forgotten, reset it in Supabase Auth dashboard.';
        } else if (error.message.includes('Email not confirmed')) {
            solution = 'Check email and confirm account, or set email confirmation to false in Supabase Auth settings.';
        } else if (error.message.includes('Too many requests')) {
            solution = 'Wait a few minutes before trying again. Rate limiting is active.';
        } else {
            solution = 'Check Supabase Auth configuration and user setup.';
        }
        
        throw {
            message: `Authentication failed: ${error.message}`,
            solution
        };
    }
    
    console.log('   ✅ Authentication successful!');
    console.log(`   👤 User: ${data.user.email}`);
    console.log(`   🆔 ID: ${data.user.id}`);
    console.log(`   📅 Created: ${new Date(data.user.created_at).toLocaleDateString()}`);
    
    // Test session details
    if (data.session) {
        console.log(`   🔒 Access Token: ${data.session.access_token.substring(0, 30)}...`);
        console.log(`   ⏰ Expires: ${new Date(data.session.expires_at * 1000).toLocaleString()}`);
    }
    
    // Check for admin profile/role
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();
    
    if (profileError) {
        if (profileError.code === 'PGRST116') {
            console.log('   ⚠️ No profiles table found');
            logResult('Profile Check', 'WARN', 'Profiles table missing', 0, 'Create profiles table or check if using different auth schema');
        } else {
            console.log(`   ⚠️ Profile check error: ${profileError.message}`);
        }
    } else if (profile) {
        console.log(`   ✅ Profile found: ${profile.username || profile.full_name || 'Unnamed'}`);
        
        if (profile.role === 'admin') {
            console.log('   🎉 Admin role confirmed!');
        } else {
            console.log(`   ⚠️ User role: ${profile.role || 'none'} (not admin)`);
        }
    }
    
    // Clean up - sign out
    await supabase.auth.signOut();
    console.log('   🚪 Signed out successfully');
    
    return data.user;
}

// Test 3: Configuration Validation
async function testConfiguration() {
    console.log('\n⚙️ Testing Configuration...');
    
    // Test admin directory structure
    if (!fs.existsSync(CONFIG.ADMIN_BASE_PATH)) {
        throw {
            message: `Admin directory not found: ${CONFIG.ADMIN_BASE_PATH}`,
            solution: 'Ensure admin panel files are in the correct location: public/admin/'
        };
    }
    
    console.log(`   ✅ Admin directory found: ${CONFIG.ADMIN_BASE_PATH}`);
    
    // Check key files
    const requiredFiles = [
        'index.html',
        'login.html',
        'dashboard.html',
        'js/auth-manager.js',
        'js/config.js'
    ];
    
    const missingFiles = [];
    const foundFiles = [];
    
    for (const file of requiredFiles) {
        const filePath = path.join(CONFIG.ADMIN_BASE_PATH, file);
        if (fs.existsSync(filePath)) {
            foundFiles.push(file);
            console.log(`   ✅ Found: ${file}`);
        } else {
            missingFiles.push(file);
            console.log(`   ❌ Missing: ${file}`);
        }
    }
    
    if (missingFiles.length > 0) {
        throw {
            message: `Missing required files: ${missingFiles.join(', ')}`,
            solution: 'Restore missing admin panel files from backup or repository'
        };
    }
    
    // Check JavaScript configuration files
    const jsConfigPath = path.join(CONFIG.ADMIN_BASE_PATH, 'js', 'config.js');
    if (fs.existsSync(jsConfigPath)) {
        const configContent = fs.readFileSync(jsConfigPath, 'utf8');
        
        // Check for Supabase configuration
        if (configContent.includes('tdmzayzkqyegvfgxlolj.supabase.co')) {
            console.log('   ✅ Supabase URL found in config');
        } else {
            console.log('   ⚠️ Supabase URL not found in config');
        }
        
        // Check for API key
        if (configContent.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9')) {
            console.log('   ✅ Supabase API key found in config');
        } else {
            console.log('   ⚠️ Supabase API key not found in config');
        }
    }
}

// Test 4: JavaScript Loading Test
async function testJavaScriptLoading() {
    console.log('\n🔧 Testing JavaScript Loading...');
    
    const jsFiles = [
        'js/auth-manager.js',
        'js/config.js',
        'js/utils.js',
        'js/api-config.js'
    ];
    
    for (const jsFile of jsFiles) {
        const filePath = path.join(CONFIG.ADMIN_BASE_PATH, jsFile);
        
        if (!fs.existsSync(filePath)) {
            console.log(`   ❌ Missing: ${jsFile}`);
            continue;
        }
        
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            
            // Basic syntax validation
            if (content.length === 0) {
                throw new Error('File is empty');
            }
            
            // Check for common JavaScript patterns
            const hasValidJS = content.includes('function') || 
                             content.includes('=>') || 
                             content.includes('const') || 
                             content.includes('var') || 
                             content.includes('let');
            
            if (!hasValidJS) {
                throw new Error('File does not contain valid JavaScript patterns');
            }
            
            // Check for common errors
            const errors = [];
            
            if (content.includes('console.error') && !content.includes('catch')) {
                errors.push('Contains console.error without error handling');
            }
            
            if (content.includes('fetch(') && !content.includes('.catch')) {
                errors.push('Contains fetch without error handling');
            }
            
            console.log(`   ✅ ${jsFile} - Valid (${Math.round(content.length / 1024)}KB)`);
            
            if (errors.length > 0) {
                console.log(`   ⚠️ Warnings: ${errors.join(', ')}`);
            }
            
        } catch (error) {
            console.log(`   ❌ ${jsFile} - Invalid: ${error.message}`);
        }
    }
}

// Test 5: Network Connectivity Test
async function testNetworkConnectivity() {
    console.log('\n🌐 Testing Network Connectivity...');
    
    const endpoints = [
        { name: 'Supabase API', url: CONFIG.SUPABASE_URL },
        { name: 'Local Backend', url: `http://localhost:${CONFIG.LOCAL_PORT}` },
        { name: 'Netlify Site', url: CONFIG.NETLIFY_URL }
    ];
    
    for (const endpoint of endpoints) {
        try {
            const startTime = Date.now();
            const isHttps = endpoint.url.startsWith('https://');
            const protocol = isHttps ? https : http;
            
            await new Promise((resolve, reject) => {
                const req = protocol.get(endpoint.url, (res) => {
                    const duration = Date.now() - startTime;
                    console.log(`   ✅ ${endpoint.name} - Status: ${res.statusCode} (${duration}ms)`);
                    resolve();
                });
                
                req.setTimeout(5000);
                req.on('error', reject);
                req.on('timeout', () => reject(new Error('Request timeout')));
            });
            
        } catch (error) {
            const duration = Date.now() - startTime;
            console.log(`   ❌ ${endpoint.name} - ${error.message} (${duration}ms)`);
            
            if (endpoint.name === 'Local Backend') {
                console.log(`   💡 Start local server: cd backend && npm start`);
            }
        }
    }
}

// Test 6: Environment Detection
async function testEnvironmentDetection() {
    console.log('\n🔍 Detecting Environment...');
    
    const hostname = 'localhost'; // Since this is a Node.js script
    const isProduction = process.env.NODE_ENV === 'production';
    const isNetlify = process.env.NETLIFY === 'true';
    
    console.log(`   🖥️ Hostname: ${hostname}`);
    console.log(`   📦 Node ENV: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   🚀 Netlify: ${isNetlify ? 'Yes' : 'No'}`);
    console.log(`   📁 Working Dir: ${process.cwd()}`);
    console.log(`   📂 Admin Path: ${CONFIG.ADMIN_BASE_PATH}`);
    
    // Check for environment variables
    const envVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'NODE_ENV', 'NETLIFY'];
    
    console.log('\n   Environment Variables:');
    for (const envVar of envVars) {
        const value = process.env[envVar];
        if (value) {
            console.log(`   ✅ ${envVar}: ${envVar.includes('KEY') ? value.substring(0, 20) + '...' : value}`);
        } else {
            console.log(`   ❌ ${envVar}: Not set`);
        }
    }
}

// Test 7: Database Schema Check
async function testDatabaseSchema(supabase) {
    console.log('\n🗄️ Testing Database Schema...');
    
    const expectedTables = [
        'profiles',
        'posts', 
        'projects',
        'contacts',
        'messages',
        'settings'
    ];
    
    const existingTables = [];
    const missingTables = [];
    
    for (const table of expectedTables) {
        try {
            const { data, error } = await supabase
                .from(table)
                .select('*')
                .limit(1);
                
            if (!error || error.code === 'PGRST103') { // PGRST103 = no rows
                existingTables.push(table);
                console.log(`   ✅ Table exists: ${table}`);
            } else if (error.code === 'PGRST116') {
                missingTables.push(table);
                console.log(`   ❌ Table missing: ${table}`);
            } else {
                console.log(`   ⚠️ Table access issue: ${table} - ${error.message}`);
            }
        } catch (error) {
            console.log(`   ❌ Error checking table ${table}: ${error.message}`);
        }
    }
    
    console.log(`\n   📊 Schema Summary:`);
    console.log(`   - Found ${existingTables.length} tables`);
    console.log(`   - Missing ${missingTables.length} tables`);
    
    if (missingTables.length > 0) {
        console.log(`   💡 Run database migrations to create missing tables`);
        console.log(`   💡 Check: supabase/migrations/ folder for SQL scripts`);
    }
    
    return { existingTables, missingTables };
}

// Main test runner
async function runAllTests() {
    console.log('🧪 ADMIN PANEL COMPREHENSIVE TEST SUITE');
    console.log('==========================================');
    console.log(`🎯 Target Email: ${CONFIG.TEST_EMAIL}`);
    console.log(`🔗 Supabase URL: ${CONFIG.SUPABASE_URL}`);
    console.log(`📅 Timestamp: ${new Date().toISOString()}`);
    console.log('');
    
    const overallStartTime = Date.now();
    let supabase;
    
    try {
        // Run all tests
        supabase = await runTest('Supabase Connection', testSupabaseConnection);
        await runTest('Authentication Test', () => testAuthentication(supabase));
        await runTest('Configuration Validation', testConfiguration);
        await runTest('JavaScript Loading', testJavaScriptLoading);
        await runTest('Network Connectivity', testNetworkConnectivity);
        await runTest('Environment Detection', testEnvironmentDetection);
        await runTest('Database Schema', () => testDatabaseSchema(supabase));
        
    } catch (error) {
        console.error('❌ Critical test failure:', error.message);
    }
    
    const overallDuration = Date.now() - overallStartTime;
    
    // Generate comprehensive report
    console.log('\n📊 COMPREHENSIVE TEST RESULTS');
    console.log('==============================');
    console.log(`Total Tests: ${TestResults.total}`);
    console.log(`✅ Passed: ${TestResults.passed}`);
    console.log(`❌ Failed: ${TestResults.failed}`);
    console.log(`⚠️ Warnings: ${TestResults.warnings}`);
    console.log(`📈 Success Rate: ${((TestResults.passed / TestResults.total) * 100).toFixed(1)}%`);
    console.log(`⏱️ Total Duration: ${overallDuration}ms`);
    
    // Show failed tests with solutions
    if (TestResults.failed > 0) {
        console.log('\n❌ FAILED TESTS & SOLUTIONS:');
        console.log('============================');
        TestResults.details
            .filter(test => test.status === 'FAIL')
            .forEach((test, index) => {
                console.log(`${index + 1}. ${test.test}`);
                console.log(`   Problem: ${test.message}`);
                if (test.solution) {
                    console.log(`   Solution: ${test.solution}`);
                }
                console.log('');
            });
    }
    
    // Show actionable solutions
    if (TestResults.solutions.length > 0) {
        console.log('\n💡 RECOMMENDED ACTIONS:');
        console.log('======================');
        TestResults.solutions.forEach((item, index) => {
            console.log(`${index + 1}. ${item.solution}`);
        });
        console.log('');
    }
    
    // Environment-specific recommendations
    console.log('\n🎯 ENVIRONMENT-SPECIFIC RECOMMENDATIONS:');
    console.log('=======================================');
    
    if (process.env.NETLIFY) {
        console.log('📡 NETLIFY ENVIRONMENT:');
        console.log('- Ensure environment variables are set in Netlify dashboard');
        console.log('- Check Netlify Functions are deployed correctly');
        console.log('- Verify domain settings and redirects');
    } else {
        console.log('💻 LOCAL DEVELOPMENT:');
        console.log('- Start local backend: cd backend && npm start');
        console.log('- Run Hugo dev server: hugo server -D');
        console.log('- Check localhost ports are available');
    }
    
    console.log('\n🔧 DEBUGGING TIPS:');
    console.log('==================');
    console.log('1. Open browser dev tools (F12) when testing admin panel');
    console.log('2. Check Console tab for JavaScript errors');
    console.log('3. Check Network tab for failed API requests');
    console.log('4. Verify localStorage has authentication token');
    console.log('5. Test admin panel URL: /admin/login.html');
    console.log('');
    
    console.log('🏁 Test Suite Complete!');
    
    // Exit with appropriate code
    const exitCode = TestResults.failed === 0 ? 0 : 1;
    process.exit(exitCode);
}

// Error handling
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection:', reason);
    logResult('Unhandled Rejection', 'FAIL', reason.message || reason);
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    logResult('Uncaught Exception', 'FAIL', error.message);
    process.exit(1);
});

// Run the test suite if this script is executed directly
if (require.main === module) {
    runAllTests().catch((error) => {
        console.error('❌ Test suite failed:', error);
        process.exit(1);
    }).finally(() => {
        rl.close();
    });
}

module.exports = {
    runAllTests,
    testSupabaseConnection,
    testAuthentication,
    testConfiguration,
    testJavaScriptLoading,
    testNetworkConnectivity,
    testEnvironmentDetection,
    testDatabaseSchema,
    CONFIG
};