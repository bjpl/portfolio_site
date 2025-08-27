// CSS optimization utilities and utilities

// Critical CSS extraction
export const extractCriticalCSS = (html) => {
  // This would typically use a tool like Critical or Penthouse
  // For now, we'll define critical styles patterns
  const criticalSelectors = [
    // Layout and structure
    'html', 'body', '*',
    '.container', '.wrapper', '.main',
    
    // Above-the-fold content
    'header', 'nav', '.hero', '.banner',
    'h1', 'h2', '.title', '.subtitle',
    
    // Critical UI components
    '.btn', '.button', '.link',
    '.loading', '.spinner',
    
    // Layout utilities
    '.flex', '.grid', '.block', '.hidden',
    '.relative', '.absolute', '.fixed',
    
    // Typography
    '.text-', '.font-', '.leading-',
    
    // Colors and backgrounds
    '.bg-', '.text-white', '.text-black',
    
    // Spacing (only essential)
    '.p-0', '.m-0', '.p-4', '.m-4',
    '.px-', '.py-', '.mx-', '.my-',
    
    // Responsive utilities (mobile-first)
    '.sm\\:', '.md\\:', '.lg\\:',
  ];

  return criticalSelectors;
};

// Unused CSS detection
export const detectUnusedCSS = (css, html) => {
  const usedSelectors = new Set();
  const allSelectors = new Set();
  
  // Extract selectors from CSS
  const selectorRegex = /([^{}]+)\s*\{[^}]*\}/g;
  let match;
  
  while ((match = selectorRegex.exec(css)) !== null) {
    const selector = match[1].trim();
    allSelectors.add(selector);
    
    // Check if selector is used in HTML
    try {
      if (html.includes(selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))) {
        usedSelectors.add(selector);
      }
    } catch (e) {
      // Skip invalid selectors
      usedSelectors.add(selector);
    }
  }
  
  const unused = Array.from(allSelectors).filter(selector => !usedSelectors.has(selector));
  
  return {
    total: allSelectors.size,
    used: usedSelectors.size,
    unused: unused.length,
    unusedSelectors: unused,
    coverage: (usedSelectors.size / allSelectors.size) * 100,
  };
};

// CSS minification utilities
export const minifyCSS = (css) => {
  return css
    // Remove comments
    .replace(/\/\*[^*]*\*+([^/*][^*]*\*+)*\//g, '')
    // Remove extra whitespace
    .replace(/\s+/g, ' ')
    // Remove whitespace around certain characters
    .replace(/\s*([{}:;,>+~])\s*/g, '$1')
    // Remove trailing semicolons
    .replace(/;}/g, '}')
    // Remove empty rules
    .replace(/[^{}]+\{\}/g, '')
    // Trim
    .trim();
};

// CSS optimization strategies
export const cssOptimizations = {
  // Remove duplicate rules
  removeDuplicates: (css) => {
    const rules = new Set();
    const lines = css.split('\n');
    
    return lines.filter(line => {
      const trimmed = line.trim();
      if (trimmed && !rules.has(trimmed)) {
        rules.add(trimmed);
        return true;
      }
      return false;
    }).join('\n');
  },

  // Combine similar selectors
  combineSimilarSelectors: (css) => {
    const ruleMap = new Map();
    const selectorRegex = /([^{}]+)\{([^}]+)\}/g;
    let match;
    
    while ((match = selectorRegex.exec(css)) !== null) {
      const selector = match[1].trim();
      const rules = match[2].trim();
      
      if (ruleMap.has(rules)) {
        ruleMap.get(rules).push(selector);
      } else {
        ruleMap.set(rules, [selector]);
      }
    }
    
    let optimizedCSS = '';
    ruleMap.forEach((selectors, rules) => {
      optimizedCSS += `${selectors.join(', ')} { ${rules} }\n`;
    });
    
    return optimizedCSS;
  },

  // Optimize vendor prefixes
  optimizeVendorPrefixes: (css) => {
    // Remove unnecessary vendor prefixes based on browser support
    const unnecessaryPrefixes = [
      '-moz-border-radius', // Supported in all modern browsers
      '-webkit-border-radius',
      '-moz-box-shadow',
      '-webkit-box-shadow',
    ];
    
    let optimized = css;
    unnecessaryPrefixes.forEach(prefix => {
      const regex = new RegExp(`\\s*${prefix}:[^;]+;`, 'g');
      optimized = optimized.replace(regex, '');
    });
    
    return optimized;
  },

  // Optimize color values
  optimizeColors: (css) => {
    return css
      // Convert hex colors to shorter form when possible
      .replace(/#([a-f0-9])\1([a-f0-9])\2([a-f0-9])\3/gi, '#$1$2$3')
      // Convert rgb to hex when shorter
      .replace(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/g, (match, r, g, b) => {
        const hex = '#' + [r, g, b].map(x => {
          const hex = parseInt(x).toString(16);
          return hex.length === 1 ? '0' + hex : hex;
        }).join('');
        return hex.length <= match.length ? hex : match;
      });
  },

  // Remove unused keyframes
  removeUnusedKeyframes: (css) => {
    const keyframeNames = new Set();
    const usedKeyframes = new Set();
    
    // Find all keyframe definitions
    const keyframeDefRegex = /@keyframes\s+([^{\s]+)/g;
    let match;
    while ((match = keyframeDefRegex.exec(css)) !== null) {
      keyframeNames.add(match[1]);
    }
    
    // Find used keyframes
    const animationRegex = /animation(?:-name)?:\s*([^;,\s]+)/g;
    while ((match = animationRegex.exec(css)) !== null) {
      usedKeyframes.add(match[1]);
    }
    
    // Remove unused keyframes
    let optimized = css;
    keyframeNames.forEach(name => {
      if (!usedKeyframes.has(name)) {
        const regex = new RegExp(`@keyframes\\s+${name}\\s*\\{[^}]*\\}`, 'g');
        optimized = optimized.replace(regex, '');
      }
    });
    
    return optimized;
  },
};

// CSS loading optimization
export const cssLoadingStrategies = {
  // Preload critical CSS
  preloadCritical: (criticalCSS) => {
    const style = document.createElement('style');
    style.textContent = criticalCSS;
    style.setAttribute('data-critical', 'true');
    document.head.insertBefore(style, document.head.firstChild);
  },

  // Load non-critical CSS asynchronously
  loadNonCriticalAsync: (href) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.media = 'print';
    link.onload = function() {
      this.media = 'all';
    };
    document.head.appendChild(link);
  },

  // Progressive enhancement for CSS
  progressiveEnhancement: (basicCSS, enhancedCSS) => {
    // Load basic styles immediately
    cssLoadingStrategies.preloadCritical(basicCSS);
    
    // Load enhanced styles when page is idle
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        cssLoadingStrategies.loadNonCriticalAsync(enhancedCSS);
      });
    } else {
      setTimeout(() => {
        cssLoadingStrategies.loadNonCriticalAsync(enhancedCSS);
      }, 1000);
    }
  },
};

// CSS performance metrics
export const cssPerfMetrics = {
  // Measure CSS loading time
  measureCSSLoadTime: () => {
    const cssResources = performance.getEntriesByType('resource')
      .filter(entry => entry.name.endsWith('.css'));
    
    return cssResources.map(entry => ({
      url: entry.name,
      loadTime: entry.responseEnd - entry.requestStart,
      size: entry.transferSize || 0,
      cached: entry.transferSize === 0,
    }));
  },

  // Calculate CSS coverage
  calculateCSSCoverage: async () => {
    if ('CSS' in window && 'supports' in CSS) {
      const stylesheets = Array.from(document.styleSheets);
      let totalRules = 0;
      let usedRules = 0;
      
      for (const stylesheet of stylesheets) {
        try {
          const rules = Array.from(stylesheet.cssRules || []);
          totalRules += rules.length;
          
          for (const rule of rules) {
            if (rule.selectorText) {
              try {
                if (document.querySelector(rule.selectorText)) {
                  usedRules++;
                }
              } catch (e) {
                // Invalid selector, assume used
                usedRules++;
              }
            } else {
              // Non-style rules (imports, keyframes, etc.)
              usedRules++;
            }
          }
        } catch (e) {
          // Cross-origin stylesheets, skip
        }
      }
      
      return {
        totalRules,
        usedRules,
        unusedRules: totalRules - usedRules,
        coverage: totalRules > 0 ? (usedRules / totalRules) * 100 : 100,
      };
    }
    
    return null;
  },

  // Measure render-blocking CSS
  measureRenderBlockingCSS: () => {
    const cssLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
    const renderBlocking = cssLinks.filter(link => 
      !link.media || link.media === 'all' || link.media === 'screen'
    );
    
    return {
      total: cssLinks.length,
      renderBlocking: renderBlocking.length,
      nonBlocking: cssLinks.length - renderBlocking.length,
      renderBlockingUrls: renderBlocking.map(link => link.href),
    };
  },
};

// Tailwind CSS optimization
export const tailwindOptimizations = {
  // Generate purge configuration
  generatePurgeConfig: (contentPaths) => ({
    content: contentPaths,
    safelist: [
      // Dynamic classes that might not be detected
      /^animate-/,
      /^transition-/,
      /^duration-/,
      /^ease-/,
      /^delay-/,
      // State classes
      'hover:*',
      'focus:*',
      'active:*',
      'disabled:*',
      // Responsive classes
      'sm:*',
      'md:*',
      'lg:*',
      'xl:*',
      '2xl:*',
    ],
    defaultExtractor: (content) => {
      const broadMatches = content.match(/[^<>"'`\s]*[^<>"'`\s:]/g) || [];
      const innerMatches = content.match(/[^<>"'`\s.()]*[^<>"'`\s.():]/g) || [];
      return broadMatches.concat(innerMatches);
    },
  }),

  // Optimize Tailwind output
  optimizeTailwindCSS: (css) => {
    return css
      // Remove Tailwind's normalize if using custom
      .replace(/@tailwind\s+base;[\s\S]*?(?=@tailwind|$)/, '')
      // Remove unused utilities
      .replace(/\/\*\s*tailwind\s*\*\/[\s\S]*?\/\*\s*end\s*tailwind\s*\*\//g, '')
      // Optimize spacing
      .replace(/\s+/g, ' ')
      .trim();
  },
};

// CSS file size analysis
export const analyzeCSSFileSize = (cssFiles) => {
  const analysis = cssFiles.map(file => {
    const sizeKB = file.size / 1024;
    const gzipEstimate = sizeKB * 0.3; // Rough estimate
    
    return {
      name: file.name,
      size: file.size,
      sizeKB: Math.round(sizeKB * 100) / 100,
      gzipEstimateKB: Math.round(gzipEstimate * 100) / 100,
      loadTime: file.loadTime,
      priority: sizeKB > 100 ? 'high' : sizeKB > 50 ? 'medium' : 'low',
    };
  });
  
  const totalSize = analysis.reduce((acc, file) => acc + file.size, 0);
  const totalGzipEstimate = analysis.reduce((acc, file) => acc + file.gzipEstimateKB * 1024, 0);
  
  return {
    files: analysis.sort((a, b) => b.size - a.size),
    totalSizeKB: Math.round(totalSize / 1024 * 100) / 100,
    totalGzipEstimateKB: Math.round(totalGzipEstimate / 1024 * 100) / 100,
    recommendations: generateCSSRecommendations(analysis),
  };
};

const generateCSSRecommendations = (files) => {
  const recommendations = [];
  
  files.forEach(file => {
    if (file.sizeKB > 100) {
      recommendations.push({
        type: 'size',
        priority: 'high',
        message: `${file.name} is ${file.sizeKB}KB. Consider code splitting or removing unused styles.`,
        file: file.name,
      });
    }
    
    if (file.loadTime > 1000) {
      recommendations.push({
        type: 'performance',
        priority: 'medium',
        message: `${file.name} took ${file.loadTime}ms to load. Consider using a CDN or optimizing delivery.`,
        file: file.name,
      });
    }
  });
  
  return recommendations;
};

export default {
  extractCriticalCSS,
  detectUnusedCSS,
  minifyCSS,
  cssOptimizations,
  cssLoadingStrategies,
  cssPerfMetrics,
  tailwindOptimizations,
  analyzeCSSFileSize,
};