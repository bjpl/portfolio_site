// Visual Accessibility Tests
// Tests for visual indicators, animations, and readability

class VisualAccessibilityTester {
  constructor() {
    this.results = [];
  }

  // Test color-only information
  testColorOnlyInformation() {
    const results = {
      element: 'Color-Only Information',
      tests: []
    };

    // Check for error states that rely only on color
    const errorElements = document.querySelectorAll('.error, [class*="error"], [style*="color: red"]');
    let hasNonColorIndicators = true;

    errorElements.forEach(element => {
      const hasIcon = element.querySelector('svg, .icon, [class*="icon"]');
      const hasText = element.textContent.toLowerCase().includes('error') || 
                     element.textContent.toLowerCase().includes('invalid');
      const hasBorder = getComputedStyle(element).borderColor !== 'initial';
      
      if (!hasIcon && !hasText && !hasBorder) {
        hasNonColorIndicators = false;
      }
    });

    results.tests.push({
      test: 'Error indicators beyond color',
      status: hasNonColorIndicators ? 'PASS' : 'FAIL',
      message: hasNonColorIndicators ? 
        'Error states have additional indicators' : 
        'Some errors rely only on color'
    });

    // Check link identification
    const links = document.querySelectorAll('a');
    let linksIdentifiable = true;

    links.forEach(link => {
      const styles = getComputedStyle(link);
      const parentStyles = getComputedStyle(link.parentElement);
      
      const hasUnderline = styles.textDecoration.includes('underline');
      const hasDifferentColor = styles.color !== parentStyles.color;
      const hasIcon = link.querySelector('svg, .icon, [class*="icon"]');
      
      if (!hasUnderline && !hasIcon) {
        // Color-only link detection
        if (hasDifferentColor && !hasUnderline) {
          linksIdentifiable = false;
        }
      }
    });

    results.tests.push({
      test: 'Link identification beyond color',
      status: linksIdentifiable ? 'PASS' : 'FAIL',
      message: linksIdentifiable ? 
        'Links identifiable without color' : 
        'Some links rely only on color'
    });

    return results;
  }

  // Test animation and motion
  testAnimationMotion() {
    const results = {
      element: 'Animation and Motion',
      tests: []
    };

    // Check for prefers-reduced-motion support
    const hasReducedMotionSupport = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const animatedElements = document.querySelectorAll('[class*="animate"], [style*="animation"], [style*="transition"]');
    
    let respectsReducedMotion = true;
    animatedElements.forEach(element => {
      const styles = getComputedStyle(element);
      if (hasReducedMotionSupport) {
        if (styles.animation !== 'none' || styles.transform !== 'none') {
          respectsReducedMotion = false;
        }
      }
    });

    results.tests.push({
      test: 'Respects prefers-reduced-motion',
      status: respectsReducedMotion ? 'PASS' : 'INFO',
      message: respectsReducedMotion ? 
        'Animations respect user preference' : 
        'Check if animations are reduced when preferred'
    });

    // Test for seizure-inducing content
    const flashingElements = document.querySelectorAll('[class*="flash"], [class*="blink"]');
    results.tests.push({
      test: 'No seizure-inducing content',
      status: flashingElements.length === 0 ? 'PASS' : 'WARN',
      message: flashingElements.length === 0 ? 
        'No flashing content detected' : 
        `Found ${flashingElements.length} potentially flashing elements`
    });

    return results;
  }

  // Test text readability
  testTextReadability() {
    const results = {
      element: 'Text Readability',
      tests: []
    };

    // Test font sizes
    const textElements = document.querySelectorAll('p, span, div, li, td, th');
    let smallTextCount = 0;
    
    textElements.forEach(element => {
      const fontSize = parseFloat(getComputedStyle(element).fontSize);
      if (fontSize < 16) {
        smallTextCount++;
      }
    });

    results.tests.push({
      test: 'Minimum font size',
      status: smallTextCount === 0 ? 'PASS' : 'WARN',
      message: smallTextCount === 0 ? 
        'All text meets minimum size' : 
        `${smallTextCount} elements with small text`
    });

    // Test line height
    let poorLineHeight = 0;
    textElements.forEach(element => {
      const lineHeight = getComputedStyle(element).lineHeight;
      const fontSize = parseFloat(getComputedStyle(element).fontSize);
      const lineHeightRatio = parseFloat(lineHeight) / fontSize;
      
      if (lineHeightRatio < 1.2) {
        poorLineHeight++;
      }
    });

    results.tests.push({
      test: 'Adequate line height',
      status: poorLineHeight === 0 ? 'PASS' : 'WARN',
      message: poorLineHeight === 0 ? 
        'All text has adequate line height' : 
        `${poorLineHeight} elements with poor line height`
    });

    return results;
  }

  // Test focus indicators in both themes
  testFocusIndicators() {
    const results = {
      element: 'Focus Indicators',
      tests: []
    };

    const focusableElements = document.querySelectorAll('a, button, input, textarea, select, [tabindex]');
    let visibleFocusCount = 0;

    focusableElements.forEach(element => {
      element.focus();
      const styles = getComputedStyle(element, ':focus');
      
      const hasOutline = styles.outline !== 'none';
      const hasBoxShadow = styles.boxShadow !== 'none';
      const hasBorder = styles.borderColor !== getComputedStyle(element).borderColor;
      const hasBackground = styles.backgroundColor !== getComputedStyle(element).backgroundColor;
      
      if (hasOutline || hasBoxShadow || hasBorder || hasBackground) {
        visibleFocusCount++;
      }
    });

    results.tests.push({
      test: 'Visible focus indicators',
      status: visibleFocusCount === focusableElements.length ? 'PASS' : 'FAIL',
      message: `${visibleFocusCount}/${focusableElements.length} elements have visible focus`
    });

    return results;
  }

  // Test theme switching accessibility
  testThemeSwitching() {
    const results = {
      element: 'Theme Switching',
      tests: []
    };

    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    
    // Test theme persistence
    const savedTheme = localStorage.getItem('theme');
    results.tests.push({
      test: 'Theme persistence',
      status: savedTheme ? 'PASS' : 'INFO',
      message: savedTheme ? 
        `Theme saved as: ${savedTheme}` : 
        'No theme preference saved'
    });

    // Test system theme respect
    const prefersColorScheme = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const systemRespected = !savedTheme && 
      ((prefersColorScheme && currentTheme === 'dark') || 
       (!prefersColorScheme && currentTheme === 'light'));

    results.tests.push({
      test: 'System theme preference',
      status: systemRespected || savedTheme ? 'PASS' : 'INFO',
      message: systemRespected ? 
        'Respects system preference' : 
        'Uses saved preference or default'
    });

    // Test smooth transitions
    const body = document.body;
    const hasTransition = getComputedStyle(body).transition.includes('color') ||
                         getComputedStyle(body).transition.includes('background');

    results.tests.push({
      test: 'Smooth theme transitions',
      status: hasTransition ? 'PASS' : 'INFO',
      message: hasTransition ? 
        'Smooth transitions enabled' : 
        'No transition animations'
    });

    return results;
  }

  // Run all visual tests
  runAllTests() {
    const allResults = [
      this.testColorOnlyInformation(),
      this.testAnimationMotion(),
      this.testTextReadability(),
      this.testFocusIndicators(),
      this.testThemeSwitching()
    ];

    return allResults;
  }

  // Generate report
  generateReport(results) {
    let report = '# Visual Accessibility Report\n\n';
    
    results.forEach(section => {
      report += `## ${section.element}\n\n`;
      section.tests.forEach(test => {
        const icon = test.status === 'PASS' ? '✅' : 
                    test.status === 'FAIL' ? '❌' : 
                    test.status === 'WARN' ? '⚠️' : 'ℹ️';
        report += `- ${icon} **${test.test}**: ${test.message}\n`;
      });
      report += '\n';
    });

    return report;
  }
}

// Export for browser use
if (typeof window !== 'undefined') {
  window.VisualAccessibilityTester = VisualAccessibilityTester;
}

module.exports = VisualAccessibilityTester;