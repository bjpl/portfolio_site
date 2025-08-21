// Keyboard Navigation Accessibility Tests
// Tests focus management and keyboard interactions

class KeyboardNavigationTester {
  constructor() {
    this.results = [];
    this.focusableElements = [
      'a[href]',
      'button',
      'input',
      'textarea',
      'select',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ];
  }

  // Test theme toggle keyboard accessibility
  testThemeToggle() {
    const toggle = document.querySelector('.theme-toggle');
    const results = {
      element: 'Theme Toggle',
      tests: []
    };

    if (!toggle) {
      results.tests.push({
        test: 'Element exists',
        status: 'FAIL',
        message: 'Theme toggle element not found'
      });
      return results;
    }

    // Test 1: Can receive focus
    toggle.focus();
    const hasFocus = document.activeElement === toggle;
    results.tests.push({
      test: 'Can receive focus',
      status: hasFocus ? 'PASS' : 'FAIL',
      message: hasFocus ? 'Element can be focused' : 'Element cannot receive focus'
    });

    // Test 2: Has visible focus indicator
    const styles = getComputedStyle(toggle, ':focus');
    const hasOutline = styles.outline !== 'none' || 
                     styles.boxShadow !== 'none' || 
                     styles.backgroundColor !== getComputedStyle(toggle).backgroundColor;
    results.tests.push({
      test: 'Visible focus indicator',
      status: hasOutline ? 'PASS' : 'FAIL',
      message: hasOutline ? 'Focus indicator visible' : 'No visible focus indicator'
    });

    // Test 3: Keyboard activation
    let keyboardActivated = false;
    const originalClick = toggle.click;
    toggle.click = () => {
      keyboardActivated = true;
      originalClick.call(toggle);
    };

    // Simulate Enter key
    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
    toggle.dispatchEvent(enterEvent);
    
    // Simulate Space key
    const spaceEvent = new KeyboardEvent('keydown', { key: ' ' });
    toggle.dispatchEvent(spaceEvent);

    results.tests.push({
      test: 'Keyboard activation',
      status: keyboardActivated ? 'PASS' : 'FAIL',
      message: keyboardActivated ? 'Responds to keyboard' : 'No keyboard activation'
    });

    // Test 4: ARIA attributes
    const hasRole = toggle.hasAttribute('role');
    const hasLabel = toggle.hasAttribute('aria-label') || 
                    toggle.hasAttribute('aria-labelledby') ||
                    toggle.textContent.trim() !== '';
    
    results.tests.push({
      test: 'ARIA attributes',
      status: (hasRole || hasLabel) ? 'PASS' : 'FAIL',
      message: `Role: ${hasRole}, Label: ${hasLabel}`
    });

    return results;
  }

  // Test focus order and trap
  testFocusOrder() {
    const focusable = this.getAllFocusableElements();
    const results = {
      element: 'Focus Order',
      tests: []
    };

    // Test logical focus order
    let currentIndex = 0;
    focusable.forEach((element, index) => {
      element.focus();
      if (document.activeElement === element) {
        if (index === currentIndex) {
          currentIndex++;
        }
      }
    });

    results.tests.push({
      test: 'Logical focus order',
      status: currentIndex === focusable.length ? 'PASS' : 'FAIL',
      message: `${currentIndex}/${focusable.length} elements focusable in order`
    });

    // Test skip links
    const skipLink = document.querySelector('.skip-link');
    if (skipLink) {
      skipLink.focus();
      const isVisible = skipLink.offsetWidth > 0 && skipLink.offsetHeight > 0;
      results.tests.push({
        test: 'Skip link visibility on focus',
        status: isVisible ? 'PASS' : 'FAIL',
        message: isVisible ? 'Skip link visible when focused' : 'Skip link not visible'
      });
    }

    return results;
  }

  // Get all focusable elements
  getAllFocusableElements() {
    const selector = this.focusableElements.join(', ');
    return Array.from(document.querySelectorAll(selector))
      .filter(el => !el.disabled && !el.hidden && el.tabIndex !== -1);
  }

  // Test screen reader announcements
  testScreenReaderSupport() {
    const results = {
      element: 'Screen Reader Support',
      tests: []
    };

    // Check for live regions
    const liveRegions = document.querySelectorAll('[aria-live]');
    results.tests.push({
      test: 'Live regions present',
      status: liveRegions.length > 0 ? 'PASS' : 'INFO',
      message: `Found ${liveRegions.length} live regions`
    });

    // Check semantic HTML
    const semanticElements = ['main', 'nav', 'header', 'footer', 'section', 'article'];
    const hasSemantics = semanticElements.some(tag => document.querySelector(tag));
    results.tests.push({
      test: 'Semantic HTML structure',
      status: hasSemantics ? 'PASS' : 'FAIL',
      message: hasSemantics ? 'Semantic elements found' : 'No semantic elements'
    });

    // Check heading hierarchy
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    const levels = headings.map(h => parseInt(h.tagName.charAt(1)));
    let validHierarchy = true;
    
    for (let i = 1; i < levels.length; i++) {
      if (levels[i] > levels[i-1] + 1) {
        validHierarchy = false;
        break;
      }
    }

    results.tests.push({
      test: 'Heading hierarchy',
      status: validHierarchy ? 'PASS' : 'FAIL',
      message: validHierarchy ? 'Valid heading structure' : 'Invalid heading hierarchy'
    });

    return results;
  }

  // Run all tests
  runAllTests() {
    const allResults = [
      this.testThemeToggle(),
      this.testFocusOrder(),
      this.testScreenReaderSupport()
    ];

    return allResults;
  }

  // Generate report
  generateReport(results) {
    let report = '# Keyboard Navigation Accessibility Report\n\n';
    
    results.forEach(section => {
      report += `## ${section.element}\n\n`;
      section.tests.forEach(test => {
        const icon = test.status === 'PASS' ? '✅' : 
                    test.status === 'FAIL' ? '❌' : 'ℹ️';
        report += `- ${icon} **${test.test}**: ${test.message}\n`;
      });
      report += '\n';
    });

    return report;
  }
}

// Export for browser use
if (typeof window !== 'undefined') {
  window.KeyboardNavigationTester = KeyboardNavigationTester;
}

module.exports = KeyboardNavigationTester;