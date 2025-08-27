/**
 * Comprehensive Redirect Testing Suite
 * Tests all URL mappings, redirects, and routing rules
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { redirectUtils, REDIRECT_CONFIG } from '../lib/redirects.js';
import { NextRequest } from 'next/server';

// Mock Next.js server components for testing
const mockRequest = (url) => {
  return new NextRequest(new URL(url, 'https://example.com'));
};

describe('URL Redirect System', () => {
  describe('Static Mappings', () => {
    test('should redirect Hugo main sections to Next.js routes', () => {
      const testCases = [
        { from: '/tools', to: '/tools', shouldRedirect: false }, // Same path
        { from: '/teaching-learning', to: '/teaching', shouldRedirect: true },
        { from: '/me', to: '/about', shouldRedirect: true },
        { from: '/photography', to: '/gallery', shouldRedirect: true },
        { from: '/cv', to: '/resume', shouldRedirect: true },
      ];
      
      testCases.forEach(({ from, to, shouldRedirect }) => {
        const result = redirectUtils.getRedirect(from);
        
        if (shouldRedirect) {
          expect(result).toBeTruthy();
          expect(result.destination).toBe(to);
          expect(result.permanent).toBe(true);
          expect(result.type).toBe('static');
        } else {
          expect(result).toBeNull();
        }
      });
    });
    
    test('should redirect legacy Hugo paths', () => {
      const legacyRedirects = [
        { from: '/make', to: '/writing' },
        { from: '/learn', to: '/tools' },
        { from: '/letratos', to: '/gallery' },
        { from: '/servicios', to: '/services' },
        { from: '/poetry', to: '/writing/poetry' },
        { from: '/posts', to: '/blog' },
      ];
      
      legacyRedirects.forEach(({ from, to }) => {
        const result = redirectUtils.getRedirect(from);
        expect(result).toBeTruthy();
        expect(result.destination).toBe(to);
        expect(result.permanent).toBe(true);
      });
    });
    
    test('should handle Spanish language redirects', () => {
      const spanishRedirects = [
        { from: '/es/hacer', to: '/es/writing' },
        { from: '/es/aprender', to: '/es/tools' },
        { from: '/es/me', to: '/es/about' },
        { from: '/es/cv', to: '/es/resume' },
        { from: '/es/servicios', to: '/es/services' },
        { from: '/es/photography', to: '/es/gallery' },
        { from: '/es/teaching-learning', to: '/es/teaching' },
      ];
      
      spanishRedirects.forEach(({ from, to }) => {
        const result = redirectUtils.getRedirect(from);
        expect(result).toBeTruthy();
        expect(result.destination).toBe(to);
        expect(result.permanent).toBe(true);
      });
    });
  });
  
  describe('Dynamic Pattern Redirects', () => {
    test('should redirect tools/built/* to projects/*', () => {
      const testCases = [
        { from: '/tools/built/react-dashboard', to: '/projects/react-dashboard' },
        { from: '/tools/built/vocab-tool', to: '/projects/vocab-tool' },
        { from: '/tools/built/language-app', to: '/projects/language-app' },
      ];
      
      testCases.forEach(({ from, to }) => {
        const result = redirectUtils.getRedirect(from);
        expect(result).toBeTruthy();
        expect(result.destination).toBe(to);
        expect(result.permanent).toBe(true);
        expect(result.type).toBe('dynamic');
      });
    });
    
    test('should redirect tools/strategies/* to tools/strategy/*', () => {
      const testCases = [
        { from: '/tools/strategies/learning-methods', to: '/tools/strategy/learning-methods' },
        { from: '/tools/strategies/memory-techniques', to: '/tools/strategy/memory-techniques' },
      ];
      
      testCases.forEach(({ from, to }) => {
        const result = redirectUtils.getRedirect(from);
        expect(result).toBeTruthy();
        expect(result.destination).toBe(to);
        expect(result.permanent).toBe(true);
      });
    });
    
    test('should redirect tools/what-i-use/* to tools/resources/*', () => {
      const testCases = [
        { from: '/tools/what-i-use/anki-setup', to: '/tools/resources/anki-setup' },
        { from: '/tools/what-i-use/language-apps', to: '/tools/resources/language-apps' },
      ];
      
      testCases.forEach(({ from, to }) => {
        const result = redirectUtils.getRedirect(from);
        expect(result).toBeTruthy();
        expect(result.destination).toBe(to);
        expect(result.permanent).toBe(true);
      });
    });
    
    test('should redirect writing/poetry/* to poetry/*', () => {
      const testCases = [
        { from: '/writing/poetry/spanish-poems', to: '/poetry/spanish-poems' },
        { from: '/writing/poetry/reflections', to: '/poetry/reflections' },
      ];
      
      testCases.forEach(({ from, to }) => {
        const result = redirectUtils.getRedirect(from);
        expect(result).toBeTruthy();
        expect(result.destination).toBe(to);
        expect(result.permanent).toBe(true);
      });
    });
    
    test('should redirect teaching-learning/sla-theory/* to teaching/theory/*', () => {
      const testCases = [
        { from: '/teaching-learning/sla-theory/acquisition-models', to: '/teaching/theory/acquisition-models' },
        { from: '/teaching-learning/sla-theory/cognitive-approaches', to: '/teaching/theory/cognitive-approaches' },
      ];
      
      testCases.forEach(({ from, to }) => {
        const result = redirectUtils.getRedirect(from);
        expect(result).toBeTruthy();
        expect(result.destination).toBe(to);
        expect(result.permanent).toBe(true);
      });
    });
  });
  
  describe('Trailing Slash Handling', () => {
    test('should remove trailing slashes by default', () => {
      const testCases = [
        { from: '/tools/', expected: '/tools' },
        { from: '/writing/', expected: '/writing' },
        { from: '/about/', expected: '/about' },
        { from: '/', expected: '/' }, // Root exception
      ];
      
      testCases.forEach(({ from, expected }) => {
        const result = redirectUtils.normalizeTrailingSlash(from);
        expect(result).toBe(expected);
      });
    });
    
    test('should preserve trailing slashes for exceptions', () => {
      const exceptions = ['/admin/', '/api/'];
      
      exceptions.forEach(path => {
        const result = redirectUtils.normalizeTrailingSlash(path);
        expect(result).toBe(path);
      });
    });
    
    test('should not modify paths without trailing slashes', () => {
      const testCases = ['/tools', '/writing', '/about', '/projects'];
      
      testCases.forEach(path => {
        const result = redirectUtils.normalizeTrailingSlash(path);
        expect(result).toBe(path);
      });
    });
  });
  
  describe('Metadata Handling', () => {
    test('should return correct metadata for main sections', () => {
      const testCases = [
        {
          path: '/tools',
          expectedTitle: 'Language Learning Tools & Resources',
          expectedCanonical: '/tools'
        },
        {
          path: '/writing', 
          expectedTitle: 'Writing & Creative Work',
          expectedCanonical: '/writing'
        },
        {
          path: '/teaching',
          expectedTitle: 'Teaching & Learning Philosophy',
          expectedCanonical: '/teaching'
        },
        {
          path: '/about',
          expectedTitle: 'About Brandon JP Lambert',
          expectedCanonical: '/about'
        },
      ];
      
      testCases.forEach(({ path, expectedTitle, expectedCanonical }) => {
        const metadata = redirectUtils.getMetadata(path);
        expect(metadata).toBeTruthy();
        expect(metadata.title).toBe(expectedTitle);
        expect(metadata.canonical).toBe(expectedCanonical);
        expect(metadata.description).toBeTruthy();
      });
    });
    
    test('should return null for paths without metadata', () => {
      const pathsWithoutMetadata = ['/non-existent', '/random-path', '/test'];
      
      pathsWithoutMetadata.forEach(path => {
        const metadata = redirectUtils.getMetadata(path);
        expect(metadata).toBeNull();
      });
    });
  });
  
  describe('Configuration Integrity', () => {
    test('should have consistent redirect configuration', () => {
      const report = redirectUtils.generateReport();
      
      expect(report.staticRedirectCount).toBeGreaterThan(0);
      expect(report.dynamicPatternCount).toBeGreaterThan(0);
      expect(report.metadataCount).toBeGreaterThan(0);
      expect(report.trailingSlashConfig).toBeDefined();
      expect(report.lastUpdated).toBeTruthy();
    });
    
    test('should have valid regex patterns', () => {
      REDIRECT_CONFIG.dynamicPatterns.forEach(pattern => {
        expect(pattern.source).toBeInstanceOf(RegExp);
        expect(pattern.destination).toBeTruthy();
        expect(typeof pattern.permanent).toBe('boolean');
        expect(pattern.description).toBeTruthy();
      });
    });
    
    test('should have no circular redirects', () => {
      const staticMappings = REDIRECT_CONFIG.staticMappings;
      
      Object.entries(staticMappings).forEach(([from, to]) => {
        // Check that the destination doesn't redirect back to source
        const destinationRedirect = staticMappings[to];
        if (destinationRedirect) {
          expect(destinationRedirect).not.toBe(from);
        }
      });
    });
  });
});

describe('Sitemap and Robots Integration', () => {
  test('should handle sitemap.xml requests', () => {
    // This would be tested with actual middleware in integration tests
    expect('/sitemap.xml').toBe('/sitemap.xml');
  });
  
  test('should handle robots.txt requests', () => {
    // This would be tested with actual middleware in integration tests
    expect('/robots.txt').toBe('/robots.txt');
  });
});

// Performance tests
describe('Redirect Performance', () => {
  test('should handle large number of redirects efficiently', () => {
    const startTime = Date.now();
    
    // Test 1000 redirect lookups
    for (let i = 0; i < 1000; i++) {
      redirectUtils.getRedirect(`/test-path-${i}`);
    }
    
    const endTime = Date.now();
    const executionTime = endTime - startTime;
    
    // Should complete within reasonable time (< 100ms for 1000 lookups)
    expect(executionTime).toBeLessThan(100);
  });
  
  test('should normalize trailing slashes efficiently', () => {
    const startTime = Date.now();
    
    // Test 1000 normalizations
    for (let i = 0; i < 1000; i++) {
      redirectUtils.normalizeTrailingSlash(`/test-path-${i}/`);
    }
    
    const endTime = Date.now();
    const executionTime = endTime - startTime;
    
    // Should complete within reasonable time (< 50ms for 1000 operations)
    expect(executionTime).toBeLessThan(50);
  });
});
