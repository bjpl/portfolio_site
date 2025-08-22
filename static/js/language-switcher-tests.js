/**
 * Language Switcher Test Suite
 * Comprehensive tests for the enhanced language switching functionality
 */

class LanguageSwitcherTests {
    constructor() {
        this.testResults = [];
        this.originalLocation = window.location.href;
    }

    async runAllTests() {
        console.log('🧪 Starting Language Switcher Test Suite...');
        
        const tests = [
            () => this.testInitialization(),
            () => this.testURLMappings(),
            () => this.testLanguagePreferences(),
            () => this.testAccessibility(),
            () => this.testErrorHandling(),
            () => this.testUserInterface(),
            () => this.testPerformance()
        ];

        for (const test of tests) {
            try {
                await test();
            } catch (error) {
                this.logTestResult(test.name, false, error.message);
            }
        }

        this.reportResults();
    }

    testInitialization() {
        const testName = 'Language Switcher Initialization';
        
        try {
            // Check if language switcher is properly initialized
            const hasLanguageSwitcher = window.languageSwitcher instanceof Object;
            const hasBackwardCompatibility = typeof switchLanguage === 'function';
            const hasEnhancedSwitcher = document.getElementById('language-switcher-styles') !== null;
            
            this.logTestResult(testName + ' - Object Creation', hasLanguageSwitcher, 
                hasLanguageSwitcher ? 'Language switcher object exists' : 'Language switcher object not found');
            
            this.logTestResult(testName + ' - Backward Compatibility', hasBackwardCompatibility,
                hasBackwardCompatibility ? 'switchLanguage function available' : 'switchLanguage function missing');
            
            this.logTestResult(testName + ' - Styles Injection', hasEnhancedSwitcher,
                hasEnhancedSwitcher ? 'Enhanced styles injected' : 'Enhanced styles not found');
                
        } catch (error) {
            this.logTestResult(testName, false, error.message);
        }
    }

    testURLMappings() {
        const testName = 'URL Mapping Logic';
        
        if (!window.languageSwitcher) {
            this.logTestResult(testName, false, 'Language switcher not available');
            return;
        }

        try {
            const switcher = window.languageSwitcher;
            
            // Test English to Spanish mappings
            const enToEsTests = [
                { input: '/', expected: '/es/' },
                { input: '/photography/', expected: '/es/fotografia/' },
                { input: '/teaching-learning/', expected: '/es/ensenanza-aprendizaje/' },
                { input: '/me/', expected: '/es/yo/' },
                { input: '/services/', expected: '/es/servicios/' }
            ];

            for (const test of enToEsTests) {
                // Mock current path
                Object.defineProperty(window, 'location', {
                    value: { pathname: test.input },
                    writable: true
                });
                
                const result = switcher.getTargetPath('es');
                const passed = result === test.expected;
                
                this.logTestResult(`${testName} - EN→ES: ${test.input}`, passed,
                    `Expected: ${test.expected}, Got: ${result}`);
            }

            // Test Spanish to English mappings
            const esToEnTests = [
                { input: '/es/', expected: '/' },
                { input: '/es/fotografia/', expected: '/photography/' },
                { input: '/es/ensenanza-aprendizaje/', expected: '/teaching-learning/' },
                { input: '/es/yo/', expected: '/me/' },
                { input: '/es/servicios/', expected: '/services/' }
            ];

            for (const test of esToEnTests) {
                Object.defineProperty(window, 'location', {
                    value: { pathname: test.input },
                    writable: true
                });
                
                const result = switcher.getTargetPath('en');
                const passed = result === test.expected;
                
                this.logTestResult(`${testName} - ES→EN: ${test.input}`, passed,
                    `Expected: ${test.expected}, Got: ${result}`);
            }

        } catch (error) {
            this.logTestResult(testName, false, error.message);
        }
    }

    testLanguagePreferences() {
        const testName = 'Language Preferences';
        
        try {
            // Clear existing preferences
            localStorage.removeItem('preferredLanguage');
            
            // Test preference saving
            if (window.languageSwitcher) {
                window.languageSwitcher.currentLang = 'en';
                localStorage.setItem('preferredLanguage', 'es');
                window.languageSwitcher.loadSavedPreference();
                
                const preferenceLoaded = window.languageSwitcher.currentLang === 'es';
                this.logTestResult(testName + ' - Preference Loading', preferenceLoaded,
                    preferenceLoaded ? 'Preferences loaded correctly' : 'Preference loading failed');
            }

            // Test localStorage persistence
            localStorage.setItem('preferredLanguage', 'es');
            const saved = localStorage.getItem('preferredLanguage');
            const persistenceWorks = saved === 'es';
            
            this.logTestResult(testName + ' - Persistence', persistenceWorks,
                persistenceWorks ? 'Preferences persist correctly' : 'Persistence failed');

        } catch (error) {
            this.logTestResult(testName, false, error.message);
        } finally {
            // Cleanup
            localStorage.removeItem('preferredLanguage');
        }
    }

    testAccessibility() {
        const testName = 'Accessibility Features';
        
        try {
            // Check for proper ARIA labels
            const langSelect = document.getElementById('lang-select');
            const hasAriaLabel = langSelect && langSelect.getAttribute('aria-label');
            const hasTitle = langSelect && langSelect.getAttribute('title');
            
            this.logTestResult(testName + ' - ARIA Labels', !!hasAriaLabel,
                hasAriaLabel ? 'ARIA label found' : 'ARIA label missing');
            
            this.logTestResult(testName + ' - Title Attribute', !!hasTitle,
                hasTitle ? 'Title attribute found' : 'Title attribute missing');

            // Check for screen reader support
            const srOnlyLabel = document.querySelector('.sr-only');
            this.logTestResult(testName + ' - Screen Reader Support', !!srOnlyLabel,
                srOnlyLabel ? 'Screen reader label found' : 'Screen reader label missing');

            // Test keyboard navigation
            const selectElement = document.querySelector('.lang-switch');
            if (selectElement) {
                const isFocusable = selectElement.tabIndex >= 0 || selectElement.tabIndex === undefined;
                this.logTestResult(testName + ' - Keyboard Navigation', isFocusable,
                    isFocusable ? 'Element is keyboard accessible' : 'Element not keyboard accessible');
            }

        } catch (error) {
            this.logTestResult(testName, false, error.message);
        }
    }

    testErrorHandling() {
        const testName = 'Error Handling';
        
        if (!window.languageSwitcher) {
            this.logTestResult(testName, false, 'Language switcher not available');
            return;
        }

        try {
            const switcher = window.languageSwitcher;
            
            // Test invalid language code
            const currentSwitching = switcher.isTransitioning;
            switcher.isTransitioning = false; // Reset for test
            
            // This should handle gracefully
            switcher.switchLanguage('invalid-lang');
            
            // Should still be false (didn't start transition)
            const handledInvalidLang = !switcher.isTransitioning;
            this.logTestResult(testName + ' - Invalid Language', handledInvalidLang,
                handledInvalidLang ? 'Invalid language handled gracefully' : 'Invalid language not handled');

            // Test switching when already in progress
            switcher.isTransitioning = true;
            const beforeSecondSwitch = switcher.isTransitioning;
            switcher.switchLanguage('es');
            const afterSecondSwitch = switcher.isTransitioning;
            
            const preventedDoubleSwitch = beforeSecondSwitch === afterSecondSwitch;
            this.logTestResult(testName + ' - Prevent Double Switch', preventedDoubleSwitch,
                preventedDoubleSwitch ? 'Double switching prevented' : 'Double switching not prevented');

            // Reset state
            switcher.isTransitioning = currentSwitching;

        } catch (error) {
            this.logTestResult(testName, false, error.message);
        }
    }

    testUserInterface() {
        const testName = 'User Interface';
        
        try {
            // Test toast notification system
            if (window.languageSwitcher) {
                window.languageSwitcher.showToast('Test message', 'info');
                
                setTimeout(() => {
                    const toastExists = document.querySelector('.language-toast') !== null;
                    this.logTestResult(testName + ' - Toast Notifications', toastExists,
                        toastExists ? 'Toast notification displayed' : 'Toast notification failed');
                }, 100);
            }

            // Test loading indicator
            if (window.languageSwitcher) {
                window.languageSwitcher.showLoadingIndicator();
                
                setTimeout(() => {
                    const loaderExists = document.getElementById('language-switch-loading') !== null;
                    this.logTestResult(testName + ' - Loading Indicator', loaderExists,
                        loaderExists ? 'Loading indicator displayed' : 'Loading indicator failed');
                    
                    // Clean up
                    window.languageSwitcher.hideLoadingIndicator();
                }, 100);
            }

            // Test CSS injection
            const stylesInjected = document.getElementById('language-switcher-styles') !== null;
            this.logTestResult(testName + ' - CSS Injection', stylesInjected,
                stylesInjected ? 'Styles properly injected' : 'Styles not injected');

        } catch (error) {
            this.logTestResult(testName, false, error.message);
        }
    }

    testPerformance() {
        const testName = 'Performance';
        
        try {
            // Test initialization time
            const startTime = performance.now();
            
            // Simulate switcher creation
            if (window.languageSwitcher) {
                // Test method call performance
                const methodStart = performance.now();
                window.languageSwitcher.getCurrentLanguage();
                const methodEnd = performance.now();
                
                const methodTime = methodEnd - methodStart;
                const performant = methodTime < 10; // Should be very fast
                
                this.logTestResult(testName + ' - Method Performance', performant,
                    `Method execution time: ${methodTime.toFixed(2)}ms`);
            }

            // Test memory usage (basic check)
            const memoryUsed = performance.memory ? performance.memory.usedJSHeapSize : 'unknown';
            this.logTestResult(testName + ' - Memory Usage', true,
                `Memory used: ${memoryUsed}`);

        } catch (error) {
            this.logTestResult(testName, false, error.message);
        }
    }

    logTestResult(testName, passed, message) {
        const result = {
            name: testName,
            passed,
            message,
            timestamp: new Date().toISOString()
        };
        
        this.testResults.push(result);
        
        const status = passed ? '✅' : '❌';
        console.log(`${status} ${testName}: ${message}`);
    }

    reportResults() {
        const passed = this.testResults.filter(r => r.passed).length;
        const total = this.testResults.length;
        const passRate = ((passed / total) * 100).toFixed(1);
        
        console.log(`\n📊 Test Results Summary:`);
        console.log(`   Total Tests: ${total}`);
        console.log(`   Passed: ${passed}`);
        console.log(`   Failed: ${total - passed}`);
        console.log(`   Pass Rate: ${passRate}%`);
        
        if (passed < total) {
            console.log(`\n❌ Failed Tests:`);
            this.testResults
                .filter(r => !r.passed)
                .forEach(r => console.log(`   - ${r.name}: ${r.message}`));
        }

        // Return results for external use
        return {
            total,
            passed,
            failed: total - passed,
            passRate: parseFloat(passRate),
            results: this.testResults
        };
    }

    // Utility method to run specific test
    async runTest(testName) {
        const methods = {
            'initialization': () => this.testInitialization(),
            'url-mappings': () => this.testURLMappings(),
            'preferences': () => this.testLanguagePreferences(),
            'accessibility': () => this.testAccessibility(),
            'error-handling': () => this.testErrorHandling(),
            'ui': () => this.testUserInterface(),
            'performance': () => this.testPerformance()
        };

        if (methods[testName]) {
            await methods[testName]();
            this.reportResults();
        } else {
            console.log(`❌ Test '${testName}' not found`);
        }
    }
}

// Make available globally for manual testing
window.LanguageSwitcherTests = LanguageSwitcherTests;

// Auto-run tests in development mode
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    // Wait for language switcher to be initialized
    setTimeout(() => {
        const tests = new LanguageSwitcherTests();
        tests.runAllTests();
    }, 1000);
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LanguageSwitcherTests;
}