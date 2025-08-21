// Accessibility Contrast Checker
// Tests color contrast ratios for WCAG compliance

class ContrastChecker {
  constructor() {
    this.results = [];
  }

  // Convert hex to RGB
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  // Calculate relative luminance
  getLuminance(rgb) {
    const { r, g, b } = rgb;
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }

  // Calculate contrast ratio
  getContrastRatio(color1, color2) {
    const lum1 = this.getLuminance(this.hexToRgb(color1));
    const lum2 = this.getLuminance(this.hexToRgb(color2));
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    return (brightest + 0.05) / (darkest + 0.05);
  }

  // Test color combinations
  testColors() {
    const lightTheme = {
      bg: '#ffffff',
      text: '#1a1a1a',
      primary: '#0066ff',
      secondary: '#ff0066',
      border: '#e5e5e5',
      surface: '#f8f8f8'
    };

    const darkTheme = {
      bg: '#1a1a1a',
      text: '#ffffff',
      primary: '#4d94ff',
      secondary: '#ff4d94',
      border: '#333333',
      surface: '#2a2a2a'
    };

    this.testTheme('Light Theme', lightTheme);
    this.testTheme('Dark Theme', darkTheme);
    
    return this.results;
  }

  testTheme(themeName, colors) {
    const combinations = [
      { name: 'Body Text', fg: colors.text, bg: colors.bg },
      { name: 'Primary Links', fg: colors.primary, bg: colors.bg },
      { name: 'Secondary Links', fg: colors.secondary, bg: colors.bg },
      { name: 'Surface Text', fg: colors.text, bg: colors.surface },
      { name: 'Border Contrast', fg: colors.border, bg: colors.bg }
    ];

    combinations.forEach(combo => {
      const ratio = this.getContrastRatio(combo.fg, combo.bg);
      const wcagAA = ratio >= 4.5;
      const wcagAAA = ratio >= 7;
      
      this.results.push({
        theme: themeName,
        element: combo.name,
        foreground: combo.fg,
        background: combo.bg,
        ratio: ratio.toFixed(2),
        wcagAA,
        wcagAAA,
        status: wcagAA ? 'PASS' : 'FAIL'
      });
    });
  }

  generateReport() {
    let report = '# Accessibility Contrast Report\n\n';
    
    this.results.forEach(result => {
      report += `## ${result.theme} - ${result.element}\n`;
      report += `- **Foreground**: ${result.foreground}\n`;
      report += `- **Background**: ${result.background}\n`;
      report += `- **Contrast Ratio**: ${result.ratio}:1\n`;
      report += `- **WCAG AA**: ${result.wcagAA ? '✅ PASS' : '❌ FAIL'}\n`;
      report += `- **WCAG AAA**: ${result.wcagAAA ? '✅ PASS' : '❌ FAIL'}\n\n`;
    });

    return report;
  }
}

// Run tests
const checker = new ContrastChecker();
const results = checker.testColors();
const report = checker.generateReport();

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.ContrastChecker = ContrastChecker;
  console.log(report);
}

module.exports = ContrastChecker;