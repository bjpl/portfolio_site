/**
 * Authentication System Test Suite
 * Tests all authentication flows and emergency fallbacks
 */

class AuthTestSuite {
    constructor() {
        this.results = [];
        this.passed = 0;
        this.failed = 0;
    }

    /**
     * Run all authentication tests
     */
    async runAllTests() {
        console.log('🧪 Running Authentication Test Suite...');
        
        this.results = [];
        this.passed = 0;
        this.failed = 0;
        
        // Test 1: Check initialization
        await this.testInitialization();
        
        // Test 2: Test emergency fallback
        await this.testEmergencyFallback();
        
        // Test 3: Test token validation
        await this.testTokenValidation();
        
        // Test 4: Test session management
        await this.testSessionManagement();
        
        // Test 5: Test auth guard
        await this.testAuthGuard();
        
        // Display results
        this.displayResults();
        
        return {
            passed: this.passed,
            failed: this.failed,
            results: this.results
        };
    }

    /**
     * Test system initialization
     */
    async testInitialization() {
        const testName = 'System Initialization';
        
        try {
            // Check if UnifiedAuthManager exists and initialized
            const exists = !!window.UnifiedAuthManager;
            const initialized = window.UnifiedAuthManager?.initialized;
            
            if (exists && initialized) {
                this.addResult(testName, true, 'UnifiedAuthManager initialized successfully');
            } else {
                this.addResult(testName, false, `Manager exists: ${exists}, Initialized: ${initialized}`);
            }
        } catch (error) {
            this.addResult(testName, false, `Error: ${error.message}`);
        }
    }

    /**
     * Test emergency fallback authentication
     */
    async testEmergencyFallback() {
        const testName = 'Emergency Fallback Authentication';
        
        try {
            // Clear any existing session first
            await window.UnifiedAuthManager.clearSession();
            
            // Test admin login
            const result = await window.UnifiedAuthManager.authenticate('admin', 'portfolio2024!');
            
            if (result.success && result.method === 'fallback') {
                this.addResult(testName, true, 'Emergency admin login successful');
                
                // Test if user is properly authenticated
                const isAuth = window.UnifiedAuthManager.isAuthenticated();
                const user = window.UnifiedAuthManager.getCurrentUser();
                
                if (isAuth && user && user.username === 'admin') {
                    this.addResult(testName + ' - Session', true, 'Session properly established');
                } else {
                    this.addResult(testName + ' - Session', false, 'Session not properly established');
                }
                
                // Clean up
                await window.UnifiedAuthManager.clearSession();
                
            } else {
                this.addResult(testName, false, `Login failed: ${result.error || 'Unknown error'}`);
            }
        } catch (error) {
            this.addResult(testName, false, `Error: ${error.message}`);
        }
    }

    /**
     * Test token validation
     */
    async testTokenValidation() {
        const testName = 'Token Validation';
        
        try {
            // Clear session first
            await window.UnifiedAuthManager.clearSession();
            
            // Generate a test token
            const testUser = { id: 'test', username: 'test', email: 'test@test.com', role: 'user' };
            const token = window.UnifiedAuthManager.generateFallbackToken(testUser);
            
            if (token && token.split('.').length === 3) {
                this.addResult(testName + ' - Generation', true, 'Token generation successful');
                
                // Test token expiration check
                const isExpired = window.UnifiedAuthManager.isTokenExpired(token);
                
                if (!isExpired) {
                    this.addResult(testName + ' - Expiration', true, 'Token expiration check passed');
                } else {
                    this.addResult(testName + ' - Expiration', false, 'New token should not be expired');
                }
                
            } else {
                this.addResult(testName + ' - Generation', false, 'Token generation failed');
            }
        } catch (error) {
            this.addResult(testName, false, `Error: ${error.message}`);
        }
    }

    /**
     * Test session management
     */
    async testSessionManagement() {
        const testName = 'Session Management';
        
        try {
            // Clear session
            await window.UnifiedAuthManager.clearSession();
            
            // Login
            const loginResult = await window.UnifiedAuthManager.authenticate('demo', 'demo123');
            
            if (loginResult.success) {
                // Check if session is stored
                const storedUser = window.UnifiedAuthManager.getStoredUser();
                const storedToken = window.UnifiedAuthManager.getStoredToken();
                
                if (storedUser && storedToken) {
                    this.addResult(testName + ' - Storage', true, 'Session data properly stored');
                    
                    // Test session restoration
                    window.UnifiedAuthManager.currentUser = null;
                    window.UnifiedAuthManager.authState = 'unauthenticated';
                    
                    await window.UnifiedAuthManager.restoreSession();
                    
                    if (window.UnifiedAuthManager.isAuthenticated()) {
                        this.addResult(testName + ' - Restoration', true, 'Session restoration successful');
                    } else {
                        this.addResult(testName + ' - Restoration', false, 'Session restoration failed');
                    }
                    
                } else {
                    this.addResult(testName + ' - Storage', false, 'Session data not stored');
                }
                
                // Clean up
                await window.UnifiedAuthManager.clearSession();
                
            } else {
                this.addResult(testName, false, 'Login failed for session test');
            }
        } catch (error) {
            this.addResult(testName, false, `Error: ${error.message}`);
        }
    }

    /**
     * Test authentication guard
     */
    async testAuthGuard() {
        const testName = 'Authentication Guard';
        
        try {
            // Check if AuthGuard exists
            const guardExists = !!window.AuthGuard;
            const guardInitialized = window.AuthGuard?.initialized;
            
            if (guardExists && guardInitialized) {
                this.addResult(testName + ' - Initialization', true, 'Auth guard properly initialized');
                
                // Test auth check (should fail without login)
                await window.UnifiedAuthManager.clearSession();
                const authCheck = window.AuthGuard.checkAuthentication();
                
                if (!authCheck) {
                    this.addResult(testName + ' - Protection', true, 'Auth guard properly blocks unauthenticated access');
                } else {
                    this.addResult(testName + ' - Protection', false, 'Auth guard should block unauthenticated access');
                }
                
            } else {
                this.addResult(testName + ' - Initialization', false, `Guard exists: ${guardExists}, Initialized: ${guardInitialized}`);
            }
        } catch (error) {
            this.addResult(testName, false, `Error: ${error.message}`);
        }
    }

    /**
     * Add test result
     */
    addResult(testName, passed, message) {
        this.results.push({
            test: testName,
            passed: passed,
            message: message,
            timestamp: new Date().toISOString()
        });
        
        if (passed) {
            this.passed++;
        } else {
            this.failed++;
        }
    }

    /**
     * Display test results
     */
    displayResults() {
        console.log('\n📊 Authentication Test Results:');
        console.log(`✅ Passed: ${this.passed}`);
        console.log(`❌ Failed: ${this.failed}`);
        console.log(`📈 Success Rate: ${Math.round((this.passed / (this.passed + this.failed)) * 100)}%`);
        
        console.log('\n📋 Detailed Results:');
        this.results.forEach((result, index) => {
            const icon = result.passed ? '✅' : '❌';
            console.log(`${icon} ${index + 1}. ${result.test}: ${result.message}`);
        });
        
        // Store results for debugging
        localStorage.setItem('auth_test_results', JSON.stringify({
            summary: {
                passed: this.passed,
                failed: this.failed,
                total: this.passed + this.failed,
                successRate: Math.round((this.passed / (this.passed + this.failed)) * 100)
            },
            details: this.results,
            timestamp: new Date().toISOString()
        }));
    }
}

// Make available globally
window.AuthTestSuite = AuthTestSuite;

// Auto-run tests if in development or if explicitly requested
if (window.location.hostname.includes('localhost') || 
    new URLSearchParams(window.location.search).has('runTests')) {
    
    // Wait for systems to initialize then run tests
    document.addEventListener('DOMContentLoaded', async () => {
        // Wait a bit for all systems to initialize
        setTimeout(async () => {
            const testSuite = new AuthTestSuite();
            await testSuite.runAllTests();
        }, 2000);
    });
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthTestSuite;
}